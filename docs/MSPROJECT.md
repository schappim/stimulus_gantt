# MS Project XML round-trip

`stimulus_gantt` ships a deliberately lossy MS Project XML
import/export — enough to round-trip the documented fixture set, not a
full implementation of MS Project's schema.

## Export

```js
const xml = chart.ganttApi.getDataAsMsProjectXml();
```

Produces a `<Project xmlns="http://schemas.microsoft.com/project">`
document containing:

- `<Tasks>` — one `<Task>` per task with `<UID>`, `<ID>`, `<Name>`,
  `<Start>`, `<Finish>`, `<PercentComplete>`, `<Milestone>`,
  `<Summary>`, `<OutlineLevel>`.
- `<PredecessorLink>` children for each inbound dependency:
  `<PredecessorUID>`, `<Type>` (MS-Project integer code),
  `<LinkLag>` (in tenths of a minute as MS Project expects).
- `<Resources>` — one `<Resource>` per resource with `<UID>`,
  `<ID>`, `<Name>`, `<MaxUnits>`.

## Import

```js
chart.ganttApi.setTaskDataFromMsProjectXml(xml);
```

Reads the elements above and converts back to the chart's internal
shape.

## Type-code table

The MS Project integer codes for dependency types:

| Code | Type |
|---|---|
| 0 | FF |
| 1 | FS (default) |
| 2 | SF |
| 3 | SS |

## Lossy round-trip

The exporter does **not** emit:

- Calendars (the chart's named calendar registry doesn't map cleanly to
  MS Project's per-task calendars — you'd want a 1:1 calendar UID
  table, which is a larger surface than the chart needs).
- Assignments (the resource ↔ task many-to-many table is partial — units
  default to `1`).
- Baselines (round-tripped via JSON instead).
- Custom fields, OBS codes, ENT_* outline values.
- Subprojects.

If your host needs any of these, the simplest path is to keep an MS
Project XML fixture on the server, render the chart from the parsed
subset, and write changes back through the host's own MS Project
adapter. The chart never holds itself out as the system of record.

## Reference fixtures

`test/export.test.js` exercises a small two-task + one-dependency
fixture. Hosts that want to assert against larger plans can drop more
fixtures alongside; the test layout is open-ended.
