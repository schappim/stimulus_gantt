import { describe, expect, it } from 'vitest';
import { getBarRenderer, getLabelRenderer, getMilestoneRenderer, registerBarRenderer } from '../src/lib/renderers.js';

describe('renderers', () => {
  it('default bar renderer emits .sg-bar', () => {
    const node = getBarRenderer('default')({ id: '1', name: 'Test', progress: 0.4 });
    expect(node.classList.contains('sg-bar')).toBe(true);
    expect(node.querySelector('.sg-bar-label').textContent).toBe('Test');
  });

  it('progress-stripe sets --progress', () => {
    const node = getBarRenderer('progress-stripe')({ id: '1', name: 'Test', progress: 0.4 });
    expect(node.style.getPropertyValue('--progress')).toBe('40%');
  });

  it('milestone renders SVG diamond', () => {
    const node = getMilestoneRenderer('default')({ id: '1', name: 'Launch' });
    expect(node.querySelector('svg')).toBeTruthy();
  });

  it('label renderer default emits name', () => {
    const node = getLabelRenderer('default')({ id: '1', name: 'Step', path: [1] }, { wbsNumbering: true, wbsNumber: '1' });
    expect(node.textContent).toContain('Step');
  });

  it('register custom renderer + retrieve', () => {
    registerBarRenderer('custom-test', (t) => {
      const el = document.createElement('div');
      el.dataset.taskId = t.id;
      el.dataset.custom = 'yes';
      return el;
    });
    const node = getBarRenderer('custom-test')({ id: 'x' });
    expect(node.dataset.custom).toBe('yes');
  });
});
