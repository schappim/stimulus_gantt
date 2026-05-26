// SVG dependency arrow routing.
//
// Three routing modes: "orthogonal" (default), "smooth" (bezier),
// "straight". Each one takes two anchor points (px, in chart-content
// coordinates) + endpoint sides (start = "start"|"end", end =
// "start"|"end") and returns a path `d` string.

export function buildArrowPath({ from, to, fromSide = 'end', toSide = 'start', routing = 'orthogonal' }) {
  switch (routing) {
    case 'straight': return straight(from, to);
    case 'smooth':   return smooth(from, to, fromSide, toSide);
    case 'orthogonal':
    default:         return orthogonal(from, to, fromSide, toSide);
  }
}

function straight({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  return `M ${x1},${y1} L ${x2},${y2}`;
}

function smooth({ x: x1, y: y1 }, { x: x2, y: y2 }, fromSide, toSide) {
  const dx = Math.abs(x2 - x1);
  const cx = Math.max(dx * 0.5, 24);
  const c1x = fromSide === 'end' ? x1 + cx : x1 - cx;
  const c2x = toSide === 'start' ? x2 - cx : x2 + cx;
  return `M ${x1},${y1} C ${c1x},${y1} ${c2x},${y2} ${x2},${y2}`;
}

function orthogonal({ x: x1, y: y1 }, { x: x2, y: y2 }, fromSide, toSide) {
  const HOP = 12;
  const startX = fromSide === 'end' ? x1 + HOP : x1 - HOP;
  const endX = toSide === 'start' ? x2 - HOP : x2 + HOP;
  // Simple two-bend orthogonal.
  if ((fromSide === 'end' && startX < endX) || (fromSide === 'start' && startX > endX)) {
    const midX = (startX + endX) / 2;
    return [
      `M ${x1},${y1}`,
      `L ${startX},${y1}`,
      `L ${midX},${y1}`,
      `L ${midX},${y2}`,
      `L ${endX},${y2}`,
      `L ${x2},${y2}`,
    ].join(' ');
  }
  // Successor before predecessor → wrap.
  const wrapY = (y1 + y2) / 2;
  return [
    `M ${x1},${y1}`,
    `L ${startX},${y1}`,
    `L ${startX},${wrapY}`,
    `L ${endX},${wrapY}`,
    `L ${endX},${y2}`,
    `L ${x2},${y2}`,
  ].join(' ');
}

// Pick anchor points for a dependency given two bar rectangles and a type.
// Each bar: { x, y, width, height }. y is row centre line of the bar.
export function dependencyAnchors(predRect, succRect, type) {
  switch (type) {
    case 'SS':
      return {
        from: { x: predRect.x, y: predRect.y + predRect.height / 2 },
        to:   { x: succRect.x, y: succRect.y + succRect.height / 2 },
        fromSide: 'start', toSide: 'start',
      };
    case 'FF':
      return {
        from: { x: predRect.x + predRect.width, y: predRect.y + predRect.height / 2 },
        to:   { x: succRect.x + succRect.width, y: succRect.y + succRect.height / 2 },
        fromSide: 'end', toSide: 'end',
      };
    case 'SF':
      return {
        from: { x: predRect.x, y: predRect.y + predRect.height / 2 },
        to:   { x: succRect.x + succRect.width, y: succRect.y + succRect.height / 2 },
        fromSide: 'start', toSide: 'end',
      };
    case 'FS':
    default:
      return {
        from: { x: predRect.x + predRect.width, y: predRect.y + predRect.height / 2 },
        to:   { x: succRect.x, y: succRect.y + succRect.height / 2 },
        fromSide: 'end', toSide: 'start',
      };
  }
}
