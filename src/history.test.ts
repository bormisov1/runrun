import assert from 'node:assert/strict';
import test from 'node:test';
import { achievements, Run, stats } from './run';
import { createHistoryStore } from './history';

const point = (longitude: number, timestamp: number) => ({ latitude: 0, longitude, altitude: 0, timestamp, accuracy: 5, speed: null });
const run = (id: string, day: number): Run => {
  const startedAt = new Date(2026, 0, day, 8).getTime();
  return { id, startedAt, endedAt: startedAt + 300_000, points: [point(0, startedAt), point(0.009, startedAt + 300_000)] };
};

test('archiving persists a complete activity, removes it from metrics, and restores it', async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
  const first = run('first', 5), second = run('second', 6);
  const store = createHistoryStore(storage);
  await store.save(first);
  await store.save(second);
  const initialDistance = (await store.getVisible()).reduce((sum, item) => sum + stats(item).distance, 0);
  assert.ok(initialDistance > 2000);
  assert.equal(achievements(await store.getVisible()).find(a => a.id === 'day-streak-2')?.unlocked, true);

  await store.setArchived('second', true, 12345);
  const restarted = createHistoryStore(storage);
  assert.deepEqual((await restarted.getVisible()).map(item => item.id), ['first']);
  assert.deepEqual(await restarted.getArchived(), [{ ...second, archivedAt: 12345 }]);
  assert.ok((await restarted.getVisible()).reduce((sum, item) => sum + stats(item).distance, 0) < initialDistance);
  assert.ok(achievements(await restarted.getVisible()).find(a => a.id === 'total-km-10')!.progress < achievements([first, second]).find(a => a.id === 'total-km-10')!.progress);
  assert.equal(achievements(await restarted.getVisible()).find(a => a.id === 'day-streak-2')?.unlocked, false);
  assert.equal(achievements(await restarted.getAll()).find(a => a.id === 'day-streak-2')?.unlocked, false);

  await restarted.setArchived('second', false);
  assert.deepEqual(await createHistoryStore(storage).getVisible(), [second, first]);
  assert.deepEqual(await restarted.getArchived(), []);
  assert.equal(achievements(await restarted.getVisible()).find(a => a.id === 'day-streak-2')?.unlocked, true);
});

test('saving and editing another run never drops an archived activity', async () => {
  const data = new Map<string, string>();
  const store = createHistoryStore({
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
  });
  const old = run('old', 5), next = run('next', 6);
  await store.save(old);
  await store.setArchived('old', true, 555);
  await store.save(next);
  await store.update({ ...old, endedAt: old.endedAt! + 1000 });
  assert.deepEqual((await store.getArchived()).map(item => [item.id, item.archivedAt, item.endedAt]), [['old', 555, old.endedAt! + 1000]]);
  assert.deepEqual((await store.getVisible()).map(item => item.id), ['next']);
});
