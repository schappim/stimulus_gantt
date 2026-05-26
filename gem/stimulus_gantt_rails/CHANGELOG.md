# Changelog — stimulus_gantt_rails

## [0.1.0] — 2026-05-26

- Initial release alongside `stimulus_gantt` v0.1.0.
- Declarative `StimulusGanttRails::Gantt` DSL: `field`, `dependency_types`,
  `calendar`, `before_update`.
- `StimulusGanttRails::Broadcastable` ActiveRecord concern.
- Custom Turbo Stream actions for task / dependency / bulk / conflict.
- Importmap pins for `stimulus_gantt` + `stimulus_gantt_rails`.
- Tenant-scoped streams (ActsAsTenant integration point).
- Engine mounted at `StimulusGanttRails.mount_path` (default
  `/gantts`).
