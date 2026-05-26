# stimulus_gantt_rails

Rails + Hotwire companion for [`stimulus_gantt`](https://github.com/schappim/stimulus_gantt).

## Install

```ruby
# Gemfile
gem 'stimulus_gantt_rails'
```

```sh
bundle install
bin/rails generate stimulus_gantt_rails:install
```

```ruby
# config/routes.rb
mount ActionCable.server => '/cable'
mount StimulusGanttRails::Engine => StimulusGanttRails.mount_path
```

```js
// app/javascript/application.js
import StimulusGantt from 'stimulus_gantt';
import StimulusGanttRails from 'stimulus_gantt_rails';
StimulusGantt.start(application);
StimulusGanttRails.start(application);
```

## Declare a Gantt

```ruby
class ProjectGantt < StimulusGanttRails::Gantt
  resource :tasks
  model    Task

  field :name,            type: :string,   editable: true
  field :start,           type: :datetime, editable: true,
                          concurrency: :version_checked
  field :end,             type: :datetime, editable: true,
                          concurrency: :version_checked
  field :progress,        type: :float,    editable: true,
                          validate: ->(v, _) { 'must be 0..1' unless (0.0..1.0).cover?(v.to_f) }
  field :resource_ids,    type: :array,    editable: ->(_t, user) { user&.lead? }

  dependency_types %i[FS SS FF SF]

  calendar :default do
    weekdays [1, 2, 3, 4, 5]
    hours    [['09:00', '17:00']]
    holidays Date.parse('2026-12-25')
  end

  before_update ->(task, change:, user:) {
    raise StimulusGanttRails::Veto, 'Out of sprint' if change[:start] && change[:start] > Sprint.current.ends_at
  }
end
```

## Broadcast from the model

```ruby
class Task < ApplicationRecord
  include StimulusGanttRails::Broadcastable
  broadcasts_gantt ProjectGantt, stream: ->(_) { "project:#{Current.project.id}" }
  self.locking_column = :lock_version
end
```

## Render in a view

```erb
<%= render partial: 'stimulus_gantt_rails/gantts/gantt',
           locals: { gantt: ProjectGantt.new(user: current_user),
                     tasks: Task.in_project(@project).order(:parent_id, :position),
                     dependencies: Dependency.in_project(@project),
                     resources: User.assignable,
                     view: 'week',
                     editable: true,
                     critical_path: true } %>
```

See [`docs/RAILS_REFERENCE.md`](../../docs/RAILS_REFERENCE.md) and
[`../../RAILS.md`](../../RAILS.md) for the full surface.

## License

MIT.
