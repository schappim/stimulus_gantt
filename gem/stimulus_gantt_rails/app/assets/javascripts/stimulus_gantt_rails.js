// Glue between Rails Hotwire and stimulus_gantt's broadcast bus.
//
// Pinned by config/importmap.rb. Importing this module exposes a default
// `StimulusGanttRails` object with a `start(application)` method that
// registers the engine's Stimulus controllers and bridges the chart's
// outbound broadcast events to Action Cable / Turbo Streams.

const StimulusGanttRails = {
  start(application) {
    // Outbound bridge: when the chart's broadcast bus emits a message,
    // POST it to the matching route so the server fans it out via
    // Action Cable's broadcast_action_to.
    document.addEventListener('stimulus-gantt:broadcast', (event) => {
      const { detail } = event;
      const chart = event.target.closest?.('[data-controller~="gantt"]');
      const resource = chart?.dataset?.ganttBroadcastChannelValue;
      if (!resource) return;
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      fetch(`/gantts/${resource}/broadcast`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf || '',
          Accept: 'application/json',
        },
        body: JSON.stringify(detail),
      }).catch(() => { /* swallow — broadcast best-effort */ });
    });
    return application;
  },
};

if (typeof window !== 'undefined') window.StimulusGanttRails = StimulusGanttRails;

export default StimulusGanttRails;
