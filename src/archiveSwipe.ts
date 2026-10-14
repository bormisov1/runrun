export const ARCHIVE_ACTION_WIDTH = 96;

export function archiveSwipeOutcome(start: number, dx: number, vx: number, rowWidth: number): 'archive' | 'open' | 'close' {
  const position = start + dx;
  if (position <= -Math.max(160, rowWidth * 0.55)) return 'archive';
  if (vx > 0.5) return 'close';
  if (vx < -0.5 || position < -ARCHIVE_ACTION_WIDTH / 2) return 'open';
  return 'close';
}
