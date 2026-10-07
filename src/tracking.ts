import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { appendPoint, fromLocation, Run } from './run';

const ACTIVE = 'runrun.active.v1';
const HISTORY = 'runrun.history.v1';
export const TASK = 'runrun.location.v1';

export async function getActive(): Promise<Run | null> {
  const raw = await AsyncStorage.getItem(ACTIVE);
  return raw ? JSON.parse(raw) : null;
}
export async function getHistory(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(HISTORY);
  return raw ? JSON.parse(raw) : [];
}
export async function setActive(run: Run | null) {
  if (run) await AsyncStorage.setItem(ACTIVE, JSON.stringify(run));
  else await AsyncStorage.removeItem(ACTIVE);
}
export async function saveRun(run: Run) {
  const history = await getHistory();
  await AsyncStorage.setItem(HISTORY, JSON.stringify([run, ...history]));
}
export async function updateRun(run: Run) {
  const history = await getHistory();
  await AsyncStorage.setItem(HISTORY, JSON.stringify(history.map(item => item.id === run.id ? run : item)));
}
export async function addLocations(locations: Location.LocationObject[]) {
  let run = await getActive();
  if (!run) return;
  for (const item of locations) run = appendPoint(run, fromLocation(item));
  await setActive(run);
}

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations;
  if (locations?.length) await addLocations(locations);
});

export async function startTracking(): Promise<'background' | 'foreground'> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('Location permission is needed to record a run.');
  let backgroundGranted = false;
  try { backgroundGranted = (await Location.requestBackgroundPermissionsAsync()).granted; }
  catch { /* Expo Go can only use foreground tracking. */ }
  if (backgroundGranted) {
    try {
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3,
        activityType: Location.ActivityType.Fitness, pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: 'RUNRUN recording', notificationBody: 'Your route is being tracked.' },
      });
      return 'background';
    } catch { /* Expo Go has no iOS background task. */ }
  }
  return 'foreground';
}
export async function stopTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(TASK);
}
