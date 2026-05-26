import { describe, expect, it } from 'vitest';
import { buildArrowPath, dependencyAnchors } from '../src/lib/arrows.js';

const a = { x: 100, y: 50, width: 50, height: 20 };
const b = { x: 200, y: 90, width: 50, height: 20 };

describe('buildArrowPath', () => {
  it('orthogonal returns multi-segment path', () => {
    const anchors = dependencyAnchors(a, b, 'FS');
    const d = buildArrowPath({ ...anchors, routing: 'orthogonal' });
    expect(d.startsWith('M ')).toBe(true);
    expect(d.split('L').length).toBeGreaterThan(2);
  });

  it('smooth returns bezier', () => {
    const anchors = dependencyAnchors(a, b, 'FS');
    const d = buildArrowPath({ ...anchors, routing: 'smooth' });
    expect(d.includes(' C ')).toBe(true);
  });

  it('straight returns one line', () => {
    const anchors = dependencyAnchors(a, b, 'FS');
    const d = buildArrowPath({ ...anchors, routing: 'straight' });
    expect(d.includes('L')).toBe(true);
    expect(d.split('L').length).toBe(2);
  });
});

describe('dependencyAnchors', () => {
  it('FS uses pred-end → succ-start', () => {
    const anchors = dependencyAnchors(a, b, 'FS');
    expect(anchors.from.x).toBe(150);
    expect(anchors.to.x).toBe(200);
  });
  it('SS uses both starts', () => {
    const anchors = dependencyAnchors(a, b, 'SS');
    expect(anchors.from.x).toBe(100);
    expect(anchors.to.x).toBe(200);
  });
  it('FF uses both ends', () => {
    const anchors = dependencyAnchors(a, b, 'FF');
    expect(anchors.from.x).toBe(150);
    expect(anchors.to.x).toBe(250);
  });
});
