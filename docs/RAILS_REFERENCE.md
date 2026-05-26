# stimulus_gantt_rails — reference

The Rails engine that pairs with `stimulus_gantt`. Lives under
`gem/stimulus_gantt_rails/`.

## DSL

```ruby
class ProjectGantt < StimulusGanttRails::Gantt
  resource :tasks                  # plural symbol; routes mounted under /:resource
  model    Task                    # ActiveRecord class

  # Field declarations.
  field :name,            type: :string,   editable: true
  field :start,           type: :datetime, editable: true,
                          concurrency: :version_checked
  field :end,             type: :datetime, editable: true,
                          concurrency: :version_checked
  field :duration,        type: :duration, editable: true
  field :progress,        type: :float,    editable: true,
                          validate: ->(value, _task) { ... }
  field :resource_ids,    type: :array,    editable: ->(_task, user) { user&.lead? }
  field :constraint_type, type: :enum,
                          values: %i[asap alap mso mfo snlt fnet],
                          editable: true

  # Dependency type whitelist.
  dependency_types %i[FS SS FF SF]

  # Calendar registry.
  calendar :default do
    weekdays [1, 2, 3, 4, 5]
    hours    [["09:00", "17:00"]]
    holidays Date.parse("2026-12-25"), Date.parse("2026-12-26")
  end

  # Workflow hooks.
  before_update ->(task, change:, user:) {
    raise StimulusGanttRails::Veto, "Out of sprint" if change[:start] && change[:start] > Sprint.current.ends_at
  }
end
```

### `field` options

| Option | Notes |
|---|---|
| `type:` | `:string`, `:integer`, `:float`, `:boolean`, `:date`, `:datetime`, `:duration`, `:array`, `:enum` |
| `editable:` | `true` / `false` / `->(task, user) { ... }` |
| `concurrency:` | `:version_checked` to gate moves by `lock_version` |
| `validate:` | proc returning an error message or `nil` |
| `values:` | for `:enum`, the allowed set |

## Broadcasting

```ruby
class Task < ApplicationRecord
  include StimulusGanttRails::Broadcastable

  broadcasts_gantt ProjectGantt,
    stream: ->(t) { "project:#{t.project_id}" },
    on: :update                       # default: :create, :update, :destroy
end
```

`broadcasts_gantt` adds AR callbacks that:

1. Compute the change set.
2. Run `gantt.before_update(task, change:, user:)` callbacks.
3. Persist (if allowed).
4. Render the matching Turbo Stream action and fan it out to every
   subscribed channel.

Streamables are tenant-scoped automatically when ActsAsTenant is
present.

## Routes

The engine mounts at `StimulusGanttRails.mount_path` (default
`/gantts`):

```
GET    /:resource/events                — range-windowed task fetch
POST   /:resource/events                — create task
PATCH  /:resource/events/:id            — update task
DELETE /:resource/events/:id            — destroy task
DELETE /:resource/events/bulk           — bulk destroy
POST   /:resource/bulk                  — bulk transaction
GET    /:resource/resources             — resource list
```

## Turbo Stream actions

| Action | Payload |
|---|---|
| `gantt-task-add` | `{ task: TaskPayload }` |
| `gantt-task-update` | `{ task: TaskPayload }` |
| `gantt-task-remove` | `{ taskId }` |
| `gantt-dependency-add` | `{ dependency }` |
| `gantt-dependency-remove` | `{ dependencyId }` |
| `gantt-bulk` | `{ add?, update?, remove? }` |
| `gantt-conflict` | `{ taskId, reason, attempted }` |

The custom actions are picked up by the JS `turbo-stream` broadcast
adapter — you don't need to register them manually.

## Importmap pins

```ruby
# config/importmap.rb
pin "stimulus_gantt",       to: "stimulus_gantt.js",       preload: true
pin "stimulus_gantt_rails", to: "stimulus_gantt_rails.js", preload: true
```

The engine's `app/assets/javascripts/` directory contains the vendored
ESM bundles.

## Concurrency

Fields declared with `concurrency: :version_checked` participate in
optimistic locking. The client sends `lock_version`; if it doesn't
match the server, the engine emits `gantt-conflict` instead of
applying.

## Audit log (opt-in)

```sh
bin/rails stimulus_gantt_rails:install:migrations
bin/rails db:migrate
```

Creates `stimulus_gantt_audit_events` (one row per applied change) and
turns on `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` via the gem's audit
controller.

## Multi-tenancy

```ruby
# config/initializers/stimulus_gantt_rails.rb
StimulusGanttRails.streamables_for = ->(resource, *extra) {
  ["org:#{Current.org.id}", "scr-gantt:#{resource}", *extra].compact
}
```

ActsAsTenant: detected automatically — `acts_as_tenant :organization`
adds the org token to every stream identifier.

## Authorisation

The engine inherits from `StimulusGanttRails.parent_controller`
(`"ApplicationController"` by default). Override per-resource hooks in
your own concern:

```ruby
StimulusGanttRails::Engine.config.to_prepare do
  StimulusGanttRails::EventsController.class_eval do
    before_action :authorize_project
    private
    def authorize_project
      head :forbidden unless current_user.can_edit?(@project)
    end
  end
end
```
