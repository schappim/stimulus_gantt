# gem/demo — Rails example app (skeleton)

This directory is reserved for a runnable example Rails application
that exercises `stimulus_gantt_rails` end-to-end against
`stimulus_gantt`. The skeleton is intentionally minimal in v0.1.0 —
the JS package + Rails engine ship independently and the full Rails
demo lands in a follow-up PR alongside the audit-log migrations.

The expected layout once filled in:

```
gem/demo/
├── Gemfile
├── bin/setup
├── bin/dev
├── config/
│   ├── application.rb
│   ├── routes.rb           # mounts ActionCable + StimulusGanttRails::Engine
│   └── importmap.rb
├── db/
│   ├── migrate/            # 001_create_tasks.rb, 002_create_dependencies.rb
│   └── seeds.rb            # 50-task project plan with two resources
├── app/
│   ├── gantts/project_gantt.rb
│   ├── models/{task,dependency,user}.rb
│   ├── controllers/projects_controller.rb
│   └── views/projects/show.html.erb
└── README.md               # this file
```

See [`RAILS.md`](../../RAILS.md) for the wiring checklist.
