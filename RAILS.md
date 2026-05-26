# stimulus_gantt — Hotwire-Native build checklist

Steps to drop `stimulus_gantt` into a Rails app, with the optional
`stimulus_gantt_rails` companion. The chart works fine without the gem,
but the gem buys you live multi-user sync, server-side scheduling and
workflow hooks.

## 0 · Pre-flight

- Rails ≥ 7.1
- Hotwire (`turbo-rails` ≥ 2.0, `stimulus-rails` ≥ 1.3,
  `importmap-rails` ≥ 2.0)
- `ActionCable` mounted (`config/routes.rb`)

## 1 · Install

```sh
bundle add stimulus_gantt_rails
bin/rails generate stimulus_gantt_rails:install
```

(The install generator only adds a stylesheet pin and an example Gantt
file — it does **not** add a migration. The opt-in audit log lives behind
`bin/rails stimulus_gantt_rails:install:migrations`.)

## 2 · Mount routes + cable

```ruby
# config/routes.rb
mount ActionCable.server => "/cable"
mount StimulusGanttRails::Engine => StimulusGanttRails.mount_path
```

`mount_path` defaults to `"/gantts"`. Override in an initializer:

```ruby
# config/initializers/stimulus_gantt_rails.rb
StimulusGanttRails.mount_path = "/admin/gantts"
StimulusGanttRails.parent_controller = "Admin::BaseController"
```

## 3 · Pin JS

```js
// app/javascript/application.js
import "@hotwired/turbo-rails";
import { Application } from "@hotwired/stimulus";
import StimulusGantt from "stimulus_gantt";
import StimulusGanttRails from "stimulus_gantt_rails";

const application = Application.start();
StimulusGantt.start(application);
StimulusGanttRails.start(application);
```

`config/importmap.rb` pins the gem's vendored ESM bundle of
`stimulus_gantt` so you don't pay the npm tax.

## 4 · Declare a Gantt

```ruby
# app/gantts/project_gantt.rb
class ProjectGantt < StimulusGanttRails::Gantt
  resource :tasks
  model    Task

  field :name,            type: :string,   editable: true
  field :start,           type: :datetime, editable: true, concurrency: :version_checked
  field :end,             type: :datetime, editable: true, concurrency: :version_checked
  field :duration,        type: :duration, editable: true
  field :progress,        type: :float,    editable: true,
                          validate: ->(v, _) { "must be 0..1" unless (0.0..1.0).cover?(v.to_f) }
  field :resource_ids,    type: :array,    editable: ->(_t, user) { user&.lead? }
  field :constraint_type, type: :enum,
                          values: %i[asap alap mso mfo snlt fnet],
                          editable: true

  dependency_types %i[FS SS FF SF]

  calendar :default do
    weekdays [1, 2, 3, 4, 5]
    hours    [["09:00", "17:00"]]
    holidays Date.parse("2026-12-25"), Date.parse("2026-12-26")
  end

  before_update ->(task, change:, user:) {
    if change[:start] && change[:start] > Sprint.current.ends_at
      raise StimulusGanttRails::Veto, "Outside sprint"
    end
  }
end
```

## 5 · Wire up the model

```ruby
# app/models/task.rb
class Task < ApplicationRecord
  include StimulusGanttRails::Broadcastable

  broadcasts_gantt ProjectGantt, stream: ->(_t) { "project:#{Current.project.id}" }
  self.locking_column = :lock_version
end
```

## 6 · Render in a view

```erb
<%= render partial: "stimulus_gantt_rails/gantts/gantt",
           locals: { gantt: ProjectGantt.new(user: current_user),
                     tasks: Task.in_project(@project)
                                .order(:parent_id, :position),
                     dependencies: Dependency.in_project(@project),
                     resources: User.assignable,
                     view: "week",
                     task_selection: "multiple",
                     editable: true,
                     critical_path: true } %>
```

The partial renders the same `<ol class="sg-tasks">` the JS contract
expects, plus the Turbo Stream signing tag, plus the broadcast channel
config — drop in `data-controller="gantt"` and the chart hydrates.

## 7 · Bulk operations + audit log (opt-in)

```sh
bin/rails stimulus_gantt_rails:install:migrations
bin/rails db:migrate
```

Adds `stimulus_gantt_audit_events` for per-edit history. With it on,
`Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` route through the gem.

## 8 · Tenant isolation

If you're on `acts_as_tenant`, the gem detects the current tenant and
scopes its broadcast channels — no extra config needed. Multi-tenant
without ActsAsTenant: override `StimulusGanttRails.streamables_for` in
an initializer.

## 9 · Server-side scheduling

The gem ships a Ruby CPM scheduler that mirrors `lib/schedule.js`. When
`auto_schedule_strategy` is set on a `Gantt`, every move/resize triggers
the server-side pass and broadcasts the recomputed `early_start` /
`early_finish` / `slack` per task. The JS chart applies them in place
— the host doesn't have to re-fetch.

## 10 · Workflow hooks

`before_update` callbacks raise `StimulusGanttRails::Veto` to refuse a
change; the client sees a `gantt:beforeUpdate` revert round-trip. Pair
with `concurrency: :version_checked` on time fields and you get
optimistic-edit-with-rollback essentially for free.

## 11 · Multi-row windowing (50–100K+ tasks)

For very large plans, render a viewport-windowed batch from the server
on demand. The JS row virtualiser exposes scroll events that the gem
maps to range-queried fetches (`/gantts/tasks?after=cursor&limit=200`).

## 12 · Production checklist

- [ ] Add `csp-meta-tag` to the view if your CSP forbids inline styles
      (the chart uses inline width / position styles for absolute bars).
- [ ] Add `stimulus_gantt_rails` JS to `Rails.application.config.assets.precompile`
      if you're on Sprockets.
- [ ] Configure Action Cable's broadcast back-end (Redis recommended for
      multi-server).
- [ ] Set up GUC/CSRF protection on `/gantts` routes — the engine
      inherits from `parent_controller`.
- [ ] Add an authorisation policy (e.g. Pundit `ProjectPolicy#edit?`)
      and gate the partial render on it.
