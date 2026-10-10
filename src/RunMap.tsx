import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Point, Run, pointAt, pointsBetween, routePath } from './run';
import { c } from './styles';

type Props = { original: Run; selected: Run; time: number; height?: number };
// react-native-maps uses MapKit on iOS and is available in Expo Go as well as TestFlight.
const maps: typeof import('react-native-maps') | null = Platform.OS === 'ios' ? require('react-native-maps') : null;

function regionFor(points: Point[]) {
  const latitudes = points.map(p => p.latitude), longitudes = points.map(p => p.longitude);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.7, 0.003),
    longitudeDelta: Math.max((maxLon - minLon) * 1.7, 0.003),
  };
}

export const RunMap = React.memo(function RunMap({ original, selected, time, height = 260 }: Props) {
  const base = useMemo(() => original.points.length ? {
    region: regionFor(original.points),
    coordinates: original.points.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
    path: routePath(original.points, 320, height, 24),
  } : null, [original.points, height]);
  if (!original.points.length) return <View style={{ height, backgroundColor: c.panel, borderRadius: 20 }} />;
  const position = pointAt(original.points, time);
  const progress = pointsBetween(original.points, selected.startedAt, Math.min(time, selected.endedAt ?? time));
  if (!maps) {
    const progressPath = routePath(progress, 320, height, 24, original.points);
    const dot = position && routePath([position], 320, height, 24, original.points).match(/M([\d.]+) ([\d.]+)/);
    return <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: c.panel }}><Svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
      <Path d={base!.path} stroke={c.muted} strokeWidth={4} fill="none"/>
      <Path d={progressPath} stroke={c.lime} strokeWidth={5} fill="none"/>
      {dot && <Circle cx={Number(dot[1])} cy={Number(dot[2])} r={7} fill={c.lime}/>}
    </Svg></View>;
  }
  const { default: MapView, Polyline, Marker } = maps;
  const progressCoordinates = progress.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  return <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: c.panel }}>
    <MapView style={{ flex: 1 }} region={base!.region} userInterfaceStyle="dark"
      scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      showsCompass={false} showsPointsOfInterests={false}>
      {original.points.length > 1 && <Polyline coordinates={base!.coordinates} strokeColor="#465158" strokeWidth={5} />}
      {progress.length > 1 && <Polyline coordinates={progressCoordinates} strokeColor={c.lime} strokeWidth={5} />}
      {position && <Marker coordinate={{ latitude: position.latitude, longitude: position.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.lime, borderColor: c.white, borderWidth: 2 }}/>
      </Marker>}
    </MapView>
  </View>;
});
