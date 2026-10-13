import { Run } from './run';

const HISTORY = 'runrun.history.v1';
type Storage = Pick<typeof import('@react-native-async-storage/async-storage').default, 'getItem' | 'setItem'>;

export const visibleRuns = (runs: Run[]) => runs.filter(run => run.archivedAt == null);
export const archivedRuns = (runs: Run[]) => runs.filter(run => run.archivedAt != null);

// Keep the existing storage key and full run payload, including route points.
export function createHistoryStore(storage: Storage) {
  let pending: Promise<unknown> = Promise.resolve();
  const locked = <T>(work: () => Promise<T>): Promise<T> => {
    const next = pending.catch(() => {}).then(work);
    pending = next.catch(() => {});
    return next;
  };
  const read = async (): Promise<Run[]> => {
    const raw = await storage.getItem(HISTORY);
    return raw ? JSON.parse(raw) : [];
  };
  const write = (runs: Run[]) => storage.setItem(HISTORY, JSON.stringify(runs));

  return {
    getAll: () => locked(read),
    getVisible: () => locked(async () => visibleRuns(await read())),
    getArchived: () => locked(async () => archivedRuns(await read())),
    save: (run: Run) => locked(async () => { await write([run, ...await read()]); }),
    update: (run: Run) => locked(async () => {
      const runs = await read();
      await write(runs.map(item => item.id === run.id ? { ...run, archivedAt: item.archivedAt } : item));
    }),
    setArchived: (id: string, archived: boolean, at = Date.now()) => locked(async () => {
      const runs = await read();
      if (!runs.some(run => run.id === id)) throw new Error('Activity was not found.');
      await write(runs.map(run => {
        if (run.id !== id) return run;
        if (archived) return { ...run, archivedAt: run.archivedAt ?? at };
        const { archivedAt: _archivedAt, ...restored } = run;
        return restored;
      }));
    }),
  };
}
