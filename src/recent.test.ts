import test from 'node:test';
import assert from 'node:assert/strict';
import { Point, pointAt, pointsBetween } from './run';
import { appendRecentPoint, recentActivity, RECENT_WINDOW_MS, retainRecentPoints } from './recent';

const fix = (latitude: number, longitude: number, timestamp: number) =>
  ({ latitude, longitude, timestamp, altitude: 0, accuracy: 5, speed: 3 });

test('straight GPS segments keep their ends, preserve turns, and interpolate playhead positions', () => {
  const now = 1_000_000;
  const fixes = [
    fix(0, 0, now - 40_000),
    fix(0, 0.0001, now - 30_000),
    fix(0, 0.0002, now - 20_000),
    fix(0.0001, 0.0002, now - 10_000),
  ];
  const points = fixes.reduce<Point[]>((saved, point) => appendRecentPoint(saved, point, now), []);
  assert.deepEqual(points.map(point => point.timestamp), [now - 40_000, now - 20_000, now - 10_000]);
  assert.equal(pointAt(points, now - 30_000)?.longitude, 0.0001);
  assert.ok(Math.abs(pointsBetween(points, now - 35_000, now - 25_000).at(-1)!.longitude - 0.00015) < 1e-10);
});

test('the rolling window expires old points and only creates activities inside 24 hours', () => {
  const now = 100_000_000;
  const points = [fix(0, 0, now - RECENT_WINDOW_MS - 1), fix(0, 0.001, now - 20_000), fix(0, 0.002, now - 10_000)];
  assert.equal(retainRecentPoints(points, now).length, 2);
  assert.equal(recentActivity(points, now - RECENT_WINDOW_MS - 1, now - 10_000, now), null);
  const activity = recentActivity(points, now - 18_000, now - 12_000, now);
  assert.ok(activity);
  assert.equal(activity.points.length, 2);
  assert.equal(activity.source, undefined);
  assert.ok(Math.abs(activity.points[0].longitude - 0.0012) < 1e-10);
});
