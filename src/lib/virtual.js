// Row + column virtualisation.
//
// rowWindow({ count, rowHeight, scrollTop, viewport, overscan }) → { startIndex, endIndex, paddingTop, paddingBottom }
// columnWindow({ totalWidth, scrollLeft, viewport, columnWidth, overscan }) → { startCol, endCol, paddingLeft, paddingRight }

export function rowWindow({ count, rowHeight, scrollTop, viewport, overscan = 6 }) {
  if (!count || !rowHeight) {
    return { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 };
  }
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewport / rowHeight) + overscan * 2;
  const endIndex = Math.min(count, startIndex + visibleCount);
  return {
    startIndex,
    endIndex,
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, (count - endIndex) * rowHeight),
  };
}

export function columnWindow({ totalCols, scrollLeft, viewport, columnWidth, overscan = 4 }) {
  if (!totalCols || !columnWidth) {
    return { startCol: 0, endCol: 0, paddingLeft: 0, paddingRight: 0 };
  }
  const startCol = Math.max(0, Math.floor(scrollLeft / columnWidth) - overscan);
  const visibleCount = Math.ceil(viewport / columnWidth) + overscan * 2;
  const endCol = Math.min(totalCols, startCol + visibleCount);
  return {
    startCol,
    endCol,
    paddingLeft: startCol * columnWidth,
    paddingRight: Math.max(0, (totalCols - endCol) * columnWidth),
  };
}
