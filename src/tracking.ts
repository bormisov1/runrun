import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { appendPoint, fromLocation, Point, Run } from './run';
import { appendRecentPoint, retainRecentPoints } from './recent';
import { createHistoryStore } from './history';

const ACTIVE = 'runrun.active.v1';
const historyStore = createHistoryStore(AsyncStorage);
const RECENT = 'runrun.recent.v1';
const RECENT_ENABLED = 'runrun.recent.enabled.v1';
export const TASK = 'runrun.location.v1';
let pendingLocations: Promise<unknown> = Promise.resolve();
function withLocationLock<T>(work: () => Promise<T>): Promise<T> {
  const next = pendingLocations.catch(() => {}).then(work);
  pendingLocations = next.catch(() => {});
  return next;
}

export async function isRecentEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(RECENT_ENABLED)) !== 'false';
}
export async function setRecentEnabled(enabled: boolean) {
  await withLocationLock(async () => {
    await AsyncStorage.setItem(RECENT_ENABLED, String(enabled));
    if (!enabled) await AsyncStorage.removeItem(RECENT);
  });
}
export async function getRecentPoints(now = Date.now()): Promise<Point[]> {
  return withLocationLock(async () => {
    if (!await isRecentEnabled()) { await AsyncStorage.removeItem(RECENT); return []; }
    const raw = await AsyncStorage.getItem(RECENT);
    const points: Point[] = raw ? JSON.parse(raw) : [];
    const kept = retainRecentPoints(points, now);
    if (kept.length !== points.length) await AsyncStorage.setItem(RECENT, JSON.stringify(kept));
    return kept;
  });
}

export async function getActive(): Promise<Run | null> {
  const raw = await AsyncStorage.getItem(ACTIVE);
  return raw ? JSON.parse(raw) : null;
}
export async function getHistory(): Promise<Run[]> {
  return historyStore.getVisible();
}
export const getArchivedHistory = () => historyStore.getArchived();
export const setRunArchived = (id: string, archived: boolean) => historyStore.setArchived(id, archived);
export async function setActive(run: Run | null) {
  if (run) await AsyncStorage.setItem(ACTIVE, JSON.stringify(run));
  else await AsyncStorage.removeItem(ACTIVE);
}
export async function saveRun(run: Run) {
  await historyStore.save(run);
}
export async function updateRun(run: Run) {
  await historyStore.update(run);
}
export async function addLocations(locations: Location.LocationObject[]) {
  await withLocationLock(async () => {
    const enabled = await isRecentEnabled();
    let run = await getActive();
    const raw = enabled ? await AsyncStorage.getItem(RECENT) : null;
    let recent: Point[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    for (const item of [...locations].sort((a, b) => a.timestamp - b.timestamp)) {
      const point = fromLocation(item);
      if (run) run = appendPoint(run, point);
      if (enabled) recent = appendRecentPoint(recent, point, now);
    }
    if (run) await setActive(run);
    if (enabled) await AsyncStorage.setItem(RECENT, JSON.stringify(retainRecentPoints(recent, now)));
  });
}

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations;
  if (locations?.length) await addLocations(locations);
});

export async function startTracking(allowBackground = true): Promise<'background' | 'foreground'> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('Location permission is needed to record routes.');
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) return 'background';
  let backgroundGranted = false;
  try { if (allowBackground) backgroundGranted = (await Location.requestBackgroundPermissionsAsync()).granted; }
  catch { /* Expo Go can only use foreground tracking. */ }
  if (backgroundGranted) {
    try {
      const recentEnabled = await isRecentEnabled();
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.High, distanceInterval: 10,
        activityType: Location.ActivityType.Other, pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: recentEnabled ? 'RUNRUN location history' : 'RUNRUN recording',
          notificationBody: recentEnabled ? 'Saving your last 24 hours of location.' : 'Your run is being tracked.' },
      });
      return 'background';
    } catch { /* Expo Go has no iOS background task. */ }
  }
  return 'foreground';
}
export async function stopTracking() {
  if (await isRecentEnabled()) return;
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(TASK);
}
