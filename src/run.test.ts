import test from 'node:test';
import assert from 'node:assert/strict';
import { appendPoint, achievements, cropRun, meters, originalRun, pointAt, routePath, Run, stats } from './run';

const point = (latitude: number, longitude: number, timestamp: number, altitude = 0) => ({ latitude, longitude, timestamp, altitude, accuracy: 5, speed: null });

test('distance, average speed, and elevation gain use recorded coordinates', () => {
  const start = 1_000_000;
  const run: Run = { id: 'one', startedAt: start, endedAt: start + 300_000, points: [point(0, 0, start, 10), point(0, 0.008993, start + 300_000, 20)] };
  const result = stats(run);
  assert.ok(Math.abs(result.distance - 1000) < 2);
  assert.ok(Math.abs(result.avgSpeed * 3.6 - 12) < 0.05);
  assert.equal(result.ascent, 10);
  assert.equal(result.seconds, 300);
  assert.ok(routePath(run.points, 320, 220).startsWith('M'));
});

test('cropping interpolates GPS boundaries and recalculates run statistics', () => {
  const points = [0, 10, 20].map((seconds): Run['points'][number] => ({
    latitude: 0, longitude: seconds / 10000, altitude: seconds, timestamp: seconds * 1000,
    accuracy: 5, speed: null,
  }));
  const run: Run = { id: 'crop', startedAt: 0, endedAt: 20000, points };
  const cropped = cropRun(run, 5000, 15000);
  assert.deepEqual(cropped.points.map(p => p.timestamp), [5000, 10000, 15000]);
  assert.equal(pointAt(points, 5000)?.longitude, 0.0005);
  assert.equal(stats(cropped).seconds, 10);
  assert.ok(Math.abs(stats(cropped).distance - meters(points[0], points[2]) / 2) < 0.01);
  assert.deepEqual(originalRun(cropRun(cropped, 0, 20000)).points, points);
});

test('bad GPS accuracy and impossible jumps are excluded', () => {
  let run: Run = { id: 'two', startedAt: 0, points: [] };
  run = appendPoint(run, { ...point(0, 0, 0), accuracy: 100 });
  assert.equal(run.points.length, 0);
  run = appendPoint(run, point(0, 0, 0));
  run = appendPoint(run, point(0, 1, 1000));
  assert.equal(run.points.length, 1);
  assert.ok(meters(point(0, 0, 0), point(0, 1, 1000)) > 100_000);
});

test('achievement progress remains bounded', () => {
  const run: Run = { id: 'three', startedAt: 0, endedAt: 5000, points: [] };
  const awards = achievements([run]);
  assert.equal(awards.find(a => a.id === 'first')?.unlocked, true);
  assert.ok(awards.every(a => a.progress >= 0 && a.progress <= 1));
});

test('awards handle a long recorded route without overflowing the call stack', () => {
  const points = Array.from({ length: 200_000 }, (_, i) => point(0, 0, i * 1000, i % 20));
  const run: Run = { id: 'long', startedAt: 0, endedAt: points.at(-1)!.timestamp, points };
  const awards = achievements([run]);
  assert.ok(awards.length >= 200);
  assert.equal(new Set(awards.map(award => award.id)).size, awards.length);
  assert.equal(awards.find(a => a.id === 'first')?.unlocked, true);
});

test('best efforts use the fastest recorded distance window', () => {
  const start = new Date(2026, 0, 1, 8).getTime();
  const run: Run = { id: 'fast-km', startedAt: start, endedAt: start + 1_200_000, points: [
    point(0, 0, start),
    point(0, .01, start + 360_000),
    point(0, .02, start + 1_200_000),
  ] };
  const awards = achievements([run]);
  assert.equal(awards.find(a => a.id === 'pace-1000-8')?.unlocked, true);
  assert.equal(awards.find(a => a.id === 'pace-1000-5')?.unlocked, false);
  assert.equal(awards.find(a => a.id === 'distance-5000')?.unlocked, false);
});

test('weekly streaks and training blocks use calendar periods', () => {
  const makeRun = (day: number): Run => {
    const start = new Date(2026, 0, day, 8).getTime();
    return { id: String(day), startedAt: start, endedAt: start + 1_800_000, points: [] };
  };
  const awards = achievements([makeRun(5), makeRun(6), makeRun(12)]);
  assert.equal(awards.find(a => a.id === 'day-streak-2')?.unlocked, true);
  assert.equal(awards.find(a => a.id === 'day-streak-3')?.unlocked, false);
  assert.equal(awards.find(a => a.id === 'week-streak-2')?.unlocked, true);
  assert.equal(awards.find(a => a.id === 'week-runs-2')?.unlocked, true);
  assert.equal(awards.find(a => a.id === 'week-runs-3')?.unlocked, false);
});
