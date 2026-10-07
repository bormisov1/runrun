import React from 'react';
import { Platform, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import Svg, { Circle, Path } from 'react-native-svg';
import { Point, Run, pointAt, routePath } from './run';
import { c } from './styles';

type Props = { original: Run; selected: Run; time: number; height?: number };
const AppleMaps: typeof import('expo-maps').AppleMaps | null = Platform.OS === 'ios' && Number(Platform.Version) >= 17 && requireOptionalNativeModule('ExpoMaps') ? require('expo-maps').AppleMaps : null;

function cameraFor(points: Point[]) {
  const latitudes = points.map(p => p.latitude), longitudes = points.map(p => p.longitude);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  const span = Math.max((maxLat - minLat) * 1.7, (maxLon - minLon) * 1.4, 0.002);
  return { coordinates: { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 },
    zoom: Math.max(3, Math.min(18, Math.log2(360 / span) - 1.8)) };
}

export function RunMap({ original, selected, time, height = 260 }: Props) {
  if (!original.points.length) return <View style={{ height, backgroundColor: c.panel, borderRadius: 20 }} />;
  const position = pointAt(original.points, time);
  if (!AppleMaps) {
    const full = routePath(original.points, 320, height, 24);
    const selectedPath = routePath(selected.points, 320, height, 24, original.points);
    const dot = position && routePath([position], 320, height, 24, original.points).match(/M([\d.]+) ([\d.]+)/);
    return <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: c.panel }}><Svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
      <Path d={full} stroke={c.muted} strokeWidth={4} fill="none"/>
      <Path d={selectedPath} stroke={c.lime} strokeWidth={5} fill="none"/>
      {dot && <Circle cx={Number(dot[1])} cy={Number(dot[2])} r={7} fill={c.lime}/>}
    </Svg></View>;
  }
  const coordinates = (points: Point[]) => points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  const polylines = [
    { id: 'full', coordinates: coordinates(original.points), color: '#81909888', width: 4 },
    { id: 'selected', coordinates: coordinates(selected.points), color: c.lime, width: 6 },
  ].filter(line => line.coordinates.length > 1);
  const latitudes = original.points.map(p => p.latitude), longitudes = original.points.map(p => p.longitude);
  const spanMeters = Math.max(
    (Math.max(...latitudes) - Math.min(...latitudes)) * 111000,
    (Math.max(...longitudes) - Math.min(...longitudes)) * 111000 * Math.cos(original.points[0].latitude * Math.PI / 180),
  );
  const circles = position ? [{ id: 'playhead', center: { latitude: position.latitude, longitude: position.longitude },
    radius: Math.max(8, spanMeters / 65), color: c.lime, lineColor: c.white, lineWidth: 2 }] : [];
  return <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: c.panel }}>
    <AppleMaps.View style={{ flex: 1 }} colorScheme={AppleMaps.MapColorScheme.DARK}
      cameraPosition={cameraFor(original.points)} polylines={polylines} circles={circles}
      properties={{ mapType: AppleMaps.MapType.STANDARD, pointsOfInterest: { including: [] } }} />
  </View>;
}
