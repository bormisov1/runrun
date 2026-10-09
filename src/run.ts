import type * as Location from 'expo-location';

export type Point = { latitude: number; longitude: number; altitude: number | null; timestamp: number; accuracy: number | null; speed: number | null };
export type Run = { id: string; startedAt: number; endedAt?: number; points: Point[]; source?: { startedAt: number; endedAt: number; points: Point[] } };
export type Stats = { distance: number; seconds: number; avgSpeed: number; currentSpeed: number; maxSpeed: number; ascent: number; descent: number; minAltitude: number | null; maxAltitude: number | null };

export function fromLocation(location: Location.LocationObject): Point {
  const { latitude, longitude, altitude, accuracy, speed } = location.coords;
  return { latitude, longitude, altitude, accuracy, speed, timestamp: location.timestamp };
}

export function meters(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

export function appendPoint(run: Run, point: Point): Run {
  // Core Location reports an uncertainty radius; weak fixes make both the route
  // and accumulated distance worse, even when their coordinates look plausible.
  const accuracy = point.accuracy ?? 15;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.timestamp) || point.timestamp < run.startedAt - 5000 ||
      !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 35) return run;
  const last = run.points.at(-1);
  if (last) {
    const dt = (point.timestamp - last.timestamp) / 1000;
    const distance = meters(last, point);
    if (dt <= 0 || distance / dt > 8.5) return run;
    const speed = point.speed != null && point.speed >= 0 && Number.isFinite(point.speed) ? point.speed : null;
    const uncertainty = Math.max(accuracy, last.accuracy ?? 15);
    // A stationary phone can wander several metres inside its accuracy radius.
    if (speed != null && speed < 0.7 && distance < Math.max(15, uncertainty * 2)) return run;
    if (speed == null && distance < Math.max(5, uncertainty * 0.8)) return run;
    if (distance < 3) return run;

    // Smooth ordinary fixes, but follow a sustained change in direction quickly.
    // This avoids shaving corners while reducing the side-to-side GPS zigzag.
    const previous = run.points.at(-2);
    let gain = Math.max(0.5, Math.min(0.85, (distance + 5) / (distance + accuracy + 5)));
    if (previous) {
      const eastScale = Math.cos(last.latitude * Math.PI / 180);
      const ax = (last.longitude - previous.longitude) * eastScale;
      const ay = last.latitude - previous.latitude;
      const bx = (point.longitude - last.longitude) * eastScale;
      const by = point.latitude - last.latitude;
      const lengths = Math.hypot(ax, ay) * Math.hypot(bx, by);
      const turn = lengths > 0 ? (ax * bx + ay * by) / lengths : 1;
      if (turn < 0.7 && distance > accuracy * 1.5 && meters(previous, last) > accuracy * 1.5) gain = 0.9;
    }
    if (dt > 30) gain = 1;
    point = { ...point,
      latitude: last.latitude + (point.latitude - last.latitude) * gain,
      longitude: last.longitude + (point.longitude - last.longitude) * gain };
  }
  return { ...run, points: [...run.points, point] };
}

export function stats(run: Run, now = Date.now()): Stats {
  const points = run.points;
  let distance = 0, ascent = 0, descent = 0, maxSpeed = 0;
  let lastElevation: number | null = null, minAltitude: number | null = null, maxAltitude: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.altitude != null && Number.isFinite(p.altitude)) {
      minAltitude = minAltitude == null ? p.altitude : Math.min(minAltitude, p.altitude);
      maxAltitude = maxAltitude == null ? p.altitude : Math.max(maxAltitude, p.altitude);
      if (lastElevation != null) {
        const delta = p.altitude - lastElevation;
        if (Math.abs(delta) >= 3) { if (delta > 0) ascent += delta; else descent -= delta; lastElevation = p.altitude; }
      } else lastElevation = p.altitude;
    }
    if (i === 0) continue;
    const segment = meters(points[i - 1], p);
    distance += segment;
    const speed = segment / ((p.timestamp - points[i - 1].timestamp) / 1000);
    if (Number.isFinite(speed)) maxSpeed = Math.max(maxSpeed, speed);
  }
  const seconds = Math.max(0, ((run.endedAt ?? now) - run.startedAt) / 1000);
  const recent = points.length > 1 ? points.slice(-2) : [];
  const currentSpeed = recent.length === 2 && now - recent[1].timestamp < 12000
    ? meters(recent[0], recent[1]) / Math.max(1, (recent[1].timestamp - recent[0].timestamp) / 1000) : 0;
  return { distance, seconds, avgSpeed: seconds ? distance / seconds : 0, currentSpeed, maxSpeed, ascent, descent,
    minAltitude, maxAltitude };
}

export const km = (m: number) => (m / 1000).toFixed(2);
export function paceSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
export const pace = (metersPerSecond: number) => paceSeconds(1000 / metersPerSecond);
export function clock(seconds: number) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export type Achievement = { id: string; category: string; title: string; detail: string; icon: string; unlocked: boolean; progress: number };

// These are the running distances used by Strava's Best Efforts. RUNRUN awards
// are independent achievements calculated only from runs recorded in this app.
const effortDistances = [
  [400, '400 M'], [804.672, 'HALF MILE'], [1000, '1 KM'], [1609.344, '1 MILE'],
  [3218.688, '2 MILES'], [5000, '5 KM'], [10000, '10 KM'], [15000, '15 KM'],
  [16093.44, '10 MILES'], [20000, '20 KM'], [21097.5, 'HALF MARATHON'],
  [30000, '30 KM'], [42195, 'MARATHON'], [50000, '50 KM'],
] as const;

function bestEffortTimes(run: Run, distance: number): Map<number, number> {
  const result = new Map<number, number>();
  if (run.points.length < 2 || distance < effortDistances[0][0]) return result;
  const points = run.points;
  const covered = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) covered[i] = covered[i - 1] + meters(points[i - 1], points[i]);
  for (const [target] of effortDistances) {
    if (distance + 0.01 < target) continue;
    let start = 0, best = Infinity;
    for (let end = 1; end < points.length; end++) {
      const startDistance = covered[end] - target;
      if (startDistance < 0) continue;
      while (start + 1 < end && covered[start + 1] <= startDistance) start++;
      const span = covered[start + 1] - covered[start];
      const fraction = span > 0 ? (startDistance - covered[start]) / span : 0;
      const startTime = points[start].timestamp + fraction * (points[start + 1].timestamp - points[start].timestamp);
      const seconds = (points[end].timestamp - startTime) / 1000;
      if (seconds > 0) best = Math.min(best, seconds);
    }
    if (Number.isFinite(best)) result.set(target, best);
  }
  return result;
}

function longestStreak(values: Set<number>): number {
  let longest = 0, current = 0, previous = -Infinity;
  for (const value of [...values].sort((a, b) => a - b)) {
    current = value === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  }
  return longest;
}

export function achievements(runs: Run[]): Achievement[] {
  const finished = runs.filter(run => run.endedAt != null && run.endedAt >= run.startedAt);
  let totalDistance = 0, totalSeconds = 0, totalAscent = 0;
  let longestDistance = 0, longestDuration = 0, highestAscent = 0;
  let morningRuns = 0, weekendRuns = 0;
  const days = new Set<number>(), weeks = new Set<number>(), months = new Set<number>();
  const weeklyDistance = new Map<number, number>(), monthlyDistance = new Map<number, number>();
  const weeklyRuns = new Map<number, number>(), monthlyRuns = new Map<number, number>();
  const monthlyDays = new Map<number, Set<number>>();
  const efforts = new Map<number, number>();

  for (const run of finished) {
    const data = stats(run);
    totalDistance += data.distance;
    totalSeconds += data.seconds;
    totalAscent += data.ascent;
    longestDistance = Math.max(longestDistance, data.distance);
    longestDuration = Math.max(longestDuration, data.seconds);
    highestAscent = Math.max(highestAscent, data.ascent);
    const date = new Date(run.startedAt);
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
    const week = day - ((date.getDay() + 6) % 7);
    const month = date.getFullYear() * 12 + date.getMonth();
    days.add(day); weeks.add(week); months.add(month);
    weeklyDistance.set(week, (weeklyDistance.get(week) ?? 0) + data.distance);
    monthlyDistance.set(month, (monthlyDistance.get(month) ?? 0) + data.distance);
    weeklyRuns.set(week, (weeklyRuns.get(week) ?? 0) + 1);
    monthlyRuns.set(month, (monthlyRuns.get(month) ?? 0) + 1);
    if (!monthlyDays.has(month)) monthlyDays.set(month, new Set());
    monthlyDays.get(month)!.add(day);
    if (date.getHours() >= 5 && date.getHours() < 10) morningRuns++;
    if (date.getDay() === 0 || date.getDay() === 6) weekendRuns++;
    for (const [target, seconds] of bestEffortTimes(run, data.distance))
      efforts.set(target, Math.min(efforts.get(target) ?? Infinity, seconds));
  }

  const max = (values: Iterable<number>) => Math.max(0, ...values);
  const awards: Achievement[] = [];
  const add = (id: string, category: string, title: string, detail: string, icon: string, value: number, target: number) => {
    const progress = Math.max(0, Math.min(1, value / target));
    awards.push({ id, category, title, detail, icon, unlocked: value >= target, progress });
  };
  const series = (id: string, category: string, title: string, detail: string, icon: string, value: number, targets: readonly number[], unit = '') => {
    for (const target of targets) {
      const label = `${target}${unit}`;
      add(`${id}-${target}`, category, `${title} ${label}`, `${detail} ${label}`, icon, value, target);
    }
  };

  add('first', 'GET STARTED', 'FIRST STRIDE', 'Finish your first run', 'flash', finished.length, 1);
  series('runs', 'CONSISTENCY', 'RUNS', 'Finish', 'footsteps', finished.length,
    [5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000], ' runs');
  series('days', 'CONSISTENCY', 'ACTIVE DAYS', 'Run on', 'calendar', days.size,
    [5, 10, 25, 50, 100, 150, 250, 365, 500, 750, 1000], ' days');
  series('day-streak', 'CONSISTENCY', 'DAY STREAK', 'Run on', 'flame', longestStreak(days),
    [2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100], ' straight days');
  series('week-streak', 'CONSISTENCY', 'WEEK STREAK', 'Run in', 'repeat', longestStreak(new Set([...weeks].map(week => week / 7))),
    [2, 4, 8, 12, 26, 52, 78, 104], ' straight weeks');
  series('month-streak', 'CONSISTENCY', 'MONTH STREAK', 'Run in', 'calendar-outline', longestStreak(months),
    [2, 3, 6, 9, 12, 18, 24, 36], ' straight months');

  series('total-km', 'LIFETIME', 'TOTAL DISTANCE', 'Run a lifetime total of', 'navigate', totalDistance / 1000,
    [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000], ' km');
  series('total-hours', 'LIFETIME', 'TOTAL TIME', 'Record a lifetime total of', 'time', totalSeconds / 3600,
    [5, 10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000], ' hours');
  series('total-climb', 'LIFETIME', 'TOTAL CLIMB', 'Gain a lifetime total of', 'trending-up', totalAscent,
    [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000], ' m');

  for (const [distance, label] of effortDistances)
    add(`distance-${distance}`, 'SINGLE RUN', label, `Cover ${label.toLowerCase()} in one run`, 'ribbon', longestDistance, distance);
  series('long-run-km', 'SINGLE RUN', 'LONG RUN', 'Cover', 'trail-sign', longestDistance / 1000,
    [60, 75, 100], ' km in one run');
  series('run-minutes', 'SINGLE RUN', 'TIME ON FEET', 'Stay out for', 'time-outline', longestDuration / 60,
    [15, 30, 45, 60, 90, 120, 180, 240, 360, 480], ' minutes in one run');
  series('run-climb', 'SINGLE RUN', 'HILL SESSION', 'Gain', 'trending-up', highestAscent,
    [50, 100, 200, 300, 500, 750, 1000, 1500, 2000], ' m in one run');

  series('week-km', 'TRAINING BLOCK', 'WEEKLY DISTANCE', 'Cover', 'barbell', max(weeklyDistance.values()) / 1000,
    [10, 20, 30, 40, 50, 70, 100, 150, 200], ' km in one week');
  series('month-km', 'TRAINING BLOCK', 'MONTHLY DISTANCE', 'Cover', 'bar-chart', max(monthlyDistance.values()) / 1000,
    [25, 50, 75, 100, 150, 200, 300, 400, 500, 750], ' km in one month');
  series('week-runs', 'TRAINING BLOCK', 'WEEKLY RUNS', 'Complete', 'calendar', max(weeklyRuns.values()),
    [2, 3, 4, 5, 6, 7], ' runs in one week');
  series('month-runs', 'TRAINING BLOCK', 'MONTHLY RUNS', 'Complete', 'calendar-outline', max(monthlyRuns.values()),
    [5, 10, 15, 20, 25, 30], ' runs in one month');
  series('month-days', 'TRAINING BLOCK', 'MONTHLY ACTIVE DAYS', 'Run on', 'sunny', max([...monthlyDays.values()].map(d => d.size)),
    [5, 10, 15, 20, 25, 30], ' days in one month');
  series('morning', 'ROUTINE', 'EARLY START', 'Start', 'sunny', morningRuns,
    [1, 5, 10, 25, 50, 100, 200], ' runs between 5 and 10 AM');
  series('weekend', 'ROUTINE', 'WEEKEND RUNNER', 'Finish', 'sunny-outline', weekendRuns,
    [1, 5, 10, 25, 50, 100, 200], ' weekend runs');

  const paceGoals: [number, readonly number[]][] = [
    [1000, [8, 7, 6, 5, 4, 3]],
    [5000, [40, 35, 30, 25, 22, 20, 18, 15]],
    [10000, [80, 70, 60, 50, 45, 40, 35]],
    [21097.5, [150, 135, 120, 105, 90, 80]],
    [42195, [300, 270, 240, 210, 180, 150]],
  ];
  for (const [distance, goals] of paceGoals) {
    const label = effortDistances.find(([meters]) => meters === distance)![1];
    const best = efforts.get(distance) ?? Infinity;
    for (const minutes of goals) {
      const target = minutes * 60;
      awards.push({ id: `pace-${distance}-${minutes}`, category: 'BEST EFFORT', title: `${label} IN ${minutes} MIN`, detail: `Cover ${label.toLowerCase()} in ${minutes} minutes or less`, icon: 'speedometer', unlocked: best <= target, progress: Number.isFinite(best) ? Math.min(1, target / best) : 0 });
    }
  }
  return awards;
}

export function routePath(points: Point[], width: number, height: number, padding = 18, bounds = points): string {
  if (!points.length) return '';
  const referenceXs = bounds.map(p => p.longitude * Math.cos(p.latitude * Math.PI / 180));
  const referenceYs = bounds.map(p => p.latitude);
  const xs = points.map(p => p.longitude * Math.cos(p.latitude * Math.PI / 180));
  const ys = points.map(p => p.latitude);
  const minX = Math.min(...referenceXs), maxX = Math.max(...referenceXs), minY = Math.min(...referenceYs), maxY = Math.max(...referenceYs);
  const scale = Math.min((width - 2 * padding) / Math.max(maxX - minX, 0.0001), (height - 2 * padding) / Math.max(maxY - minY, 0.0001));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return points.map((_, i) => `${i ? 'L' : 'M'}${(width / 2 + (xs[i] - cx) * scale).toFixed(1)} ${(height / 2 - (ys[i] - cy) * scale).toFixed(1)}`).join(' ');
}

export function originalRun(run: Run): Run {
  return run.source ? { id: run.id, ...run.source } : run;
}

export function pointAt(points: Point[], time: number): Point | null {
  if (!points.length) return null;
  if (time <= points[0].timestamp) return points[0];
  if (time >= points[points.length - 1].timestamp) return points[points.length - 1];
  let lo = 0, hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].timestamp <= time) lo = mid; else hi = mid;
  }
  const a = points[lo], b = points[hi];
  const fraction = (time - a.timestamp) / (b.timestamp - a.timestamp);
  const between = (x: number | null, y: number | null) => x == null || y == null ? null : x + (y - x) * fraction;
  return { latitude: a.latitude + (b.latitude - a.latitude) * fraction,
    longitude: a.longitude + (b.longitude - a.longitude) * fraction,
    altitude: between(a.altitude, b.altitude), accuracy: between(a.accuracy, b.accuracy),
    speed: between(a.speed, b.speed), timestamp: time };
}

export function pointsBetween(points: Point[], start: number, end: number): Point[] {
  if (!points.length || end <= start) return [];
  const first = pointAt(points, start);
  const last = pointAt(points, end);
  if (!first || !last || last.timestamp <= first.timestamp) return [];
  return [first, ...points.filter(p => p.timestamp > first.timestamp && p.timestamp < last.timestamp), last];
}

export function cropRun(run: Run, start: number, end: number): Run {
  const original = originalRun(run);
  const finish = original.endedAt ?? Date.now();
  const from = Math.max(original.startedAt, Math.min(start, finish));
  const to = Math.max(from, Math.min(end, finish));
  const points = original.points.filter(p => p.timestamp >= from && p.timestamp <= to);
  const first = pointAt(original.points, from);
  const last = pointAt(original.points, to);
  if (first && first.timestamp >= from && first.timestamp <= to && points[0]?.timestamp !== first.timestamp) points.unshift(first);
  if (last && last.timestamp >= from && last.timestamp <= to && points.at(-1)?.timestamp !== last.timestamp) points.push(last);
  return { id: run.id, startedAt: from, endedAt: to, points,
    source: { startedAt: original.startedAt, endedAt: finish, points: original.points } };
}
