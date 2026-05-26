# stimulus-gantt-rails — usage skill

Use when the user is on Rails / Hotwire and wants a live multi-user
Gantt chart driven by ActiveRecord. Pair with `stimulus-gantt-js` for
the client-side concepts.

## Setup checklist

1. **Add the gem.**
   ```ruby
   gem 'stimulus_gantt_rails'
   ```
   `bundle install && bin/rails generate stimulus_gantt_rails:install`.

2. **Mount the engine + Action Cable.**
   ```ruby
   mount ActionCable.server => '/cable'
   mount StimulusGanttRails::Engine => StimulusGanttRails.mount_path
   ```

3. **Pin the JS** (`config/importmap.rb` — already shipped by the gem).

4. **Bootstrap on the JS side.**
   ```js
   import StimulusGantt from 'stimulus_gantt';
   import StimulusGanttRails from 'stimulus_gantt_rails';
   StimulusGantt.start(application);
   StimulusGanttRails.start(application);
   ```

5. **Declare a `Gantt`.**
   ```ruby
   class ProjectGantt < StimulusGanttRails::Gantt
     resource :tasks
     model    Task
     field :name, type: :string, editable: true
     field :start, type: :datetime, editable: true,
                   concurrency: :version_checked
     # ...
   end
   ```

6. **Broadcast from the model.**
   ```ruby
   class Task < ApplicationRecord
     include StimulusGanttRails::Broadcastable
     broadcasts_gantt ProjectGantt, stream: ->(_) { "project:#{Current.project.id}" }
     self.locking_column = :lock_version
   end
   ```

7. **Render in a view.**
   ```erb
   <%= render partial: "stimulus_gantt_rails/gantts/gantt",
              locals: { gantt: ProjectGantt.new(user: current_user),
                        tasks: Task.in_project(@project),
                        dependencies: Dependency.in_project(@project) } %>
   ```

## Common requests + answers

### "How do I prevent moves outside a sprint?"

Add a `before_update` proc to the `Gantt`:

```ruby
before_update ->(task, change:, user:) {
  if change[:start] && change[:start] > Sprint.current.ends_at
    raise StimulusGanttRails::Veto, "Outside sprint"
  end
}
```

The client receives a revert + a `gantt:beforeUpdate` event with
`detail.change.veto = true` so the host can flash a toast.

### "How do I limit who can move tasks?"

Use a callable `editable:` on the field:

```ruby
field :start, type: :datetime, editable: ->(task, user) { user.lead? || task.assignee_id == user.id }
```

### "How do I get optimistic concurrency?"

Add `concurrency: :version_checked` to fields that need it (typically
`start`, `end`, `progress`) and ensure the model has a `lock_version`
column.

### "How do I scale to 100K tasks?"

Use the gem's range-windowed events route. Render the initial 200 tasks
server-side, then turn on row virtualisation
(`data-gantt-row-virtualization-value="true"`). When the chart scrolls
past the loaded slice it fetches the next window via the engine's
`GET /:resource/events?after=cursor&limit=200`.

### "How do I keep it tenant-scoped?"

If you're on `acts_as_tenant` the gem auto-detects the tenant and
prefixes every Action Cable channel. For custom multi-tenancy, override
`StimulusGanttRails.streamables_for` in an initializer.

### "How do I add undo/redo?"

```sh
bin/rails stimulus_gantt_rails:install:migrations
bin/rails db:migrate
```

Adds the `stimulus_gantt_audit_events` table and turns on
`Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` via the gem's audit controller.

## Pitfalls

- Don't bypass the gem by calling `task.update_columns(...)` — the
  broadcast hooks don't fire.
- When two users drag the same task simultaneously, expect the slower
  user's change to revert (last-write-wins). Surface this with a toast
  on `gantt:scheduleConflict`.
- The engine inherits from `ApplicationController` by default; if your
  app uses a custom base, set `StimulusGanttRails.parent_controller =
  "Admin::BaseController"` in an initializer.
