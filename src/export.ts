import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Run } from './run';

export async function exportGpx(run: Run) {
  const points = run.points.map(p => `<trkpt lat="${p.latitude}" lon="${p.longitude}">${p.altitude == null ? '' : `<ele>${p.altitude}</ele>`}<time>${new Date(p.timestamp).toISOString()}</time></trkpt>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RUNRUN" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>RUNRUN ${new Date(run.startedAt).toISOString()}</name><trkseg>${points}</trkseg></trk></gpx>`;
  const file = new File(Paths.cache, `runrun-${run.id}.gpx`);
  file.write(xml);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx', dialogTitle: 'Export GPX route' });
}
