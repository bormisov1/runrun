import { meters, Point, pointsBetween, Run } from './run';

export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function retainRecentPoints(points: Point[], now = Date.now()): Point[] {
  const cutoff = now - RECENT_WINDOW_MS;
  return points.filter(point => point.timestamp >= cutoff && point.timestamp <= now + 60_000);
}

// Remove the middle point of a nearly straight segment. Coordinates are
// projected locally into metres so this works at different latitudes.
export function appendRecentPoint(points: Point[], point: Point, now = Date.now()): Point[] {
  const kept = retainRecentPoints(points, now);
  const accuracy = point.accuracy ?? 20;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.timestamp) || point.timestamp < now - RECENT_WINDOW_MS ||
      point.timestamp > now + 60_000 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 ||
      (kept.length > 0 && point.timestamp <= kept[kept.length - 1].timestamp)) return kept;
  const previous = kept.at(-1);
  if (previous && meters(previous, point) < 8) return kept;
  if (kept.length < 2) return [...kept, point];
  const first = kept[kept.length - 2];
  const middle = kept[kept.length - 1];
  const east = Math.cos(middle.latitude * Math.PI / 180) * 111_320;
  const north = 111_320;
  const ax = (middle.longitude - first.longitude) * east;
  const ay = (middle.latitude - first.latitude) * north;
  const bx = (point.longitude - first.longitude) * east;
  const by = (point.latitude - first.latitude) * north;
  const lengthSquared = bx * bx + by * by;
  const fraction = lengthSquared ? (ax * bx + ay * by) / lengthSquared : -1;
  const deviation = Math.hypot(ax - fraction * bx, ay - fraction * by);
  if (fraction > 0 && fraction < 1 && deviation <= 5) return [...kept.slice(0, -1), point];
  return [...kept, point];
}

export function recentActivity(points: Point[], start: number, end: number, now = Date.now()): Run | null {
  const available = retainRecentPoints(points, now);
  if (available.length < 2 || start < now - RECENT_WINDOW_MS || end > now || end - start < 1000) return null;
  const selected = pointsBetween(available, start, end);
  if (selected.length < 2) return null;
  return { id: `recent-${now}`, startedAt: selected[0].timestamp,
    endedAt: selected[selected.length - 1].timestamp, points: selected };
}
