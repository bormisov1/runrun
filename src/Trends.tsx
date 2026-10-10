import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { meters, paceSeconds, Run } from './run';
import { c } from './styles';

function Chart({ label, values, unit, color, formatValue = value => value.toFixed(1), lowerIsBetter = false }: {
  label: string; values: number[]; unit: string; color: string;
  formatValue?: (value: number) => string; lowerIsBetter?: boolean;
}) {
  const safe = values.filter(Number.isFinite);
  const min = Math.min(...safe), max = Math.max(...safe);
  const range = Math.max(max - min, 1);
  const path = safe.map((v, i) => `${i ? 'L' : 'M'}${(12 + i * 296 / Math.max(1, safe.length - 1)).toFixed(1)} ${(lowerIsBetter ? 18 + (v - min) / range * 76 : 94 - (v - min) / range * 76).toFixed(1)}`).join(' ');
  return <View style={{ backgroundColor: c.panel, borderRadius: 20, padding: 16, marginTop: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.white, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }}>{label}</Text><Text style={{ color, fontSize: 11, fontWeight: '800' }}>{safe.length ? `${formatValue(min)}–${formatValue(max)} ${unit}` : 'NO GPS DATA'}</Text></View>
    {safe.length > 1 ? <Svg width="100%" height={112} viewBox="0 0 320 112"><Line x1="0" x2="320" y1="100" y2="100" stroke={c.line}/><Line x1="0" x2="320" y1="60" y2="60" stroke={c.line}/><Line x1="0" x2="320" y1="20" y2="20" stroke={c.line}/><Path d={path} stroke={color} strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round"/></Svg> : <Text style={{ color: c.muted, paddingVertical: 35, textAlign: 'center' }}>Record more GPS points to see the trend.</Text>}
  </View>;
}

export const Trends = React.memo(function Trends({ run }: { run: Run }) {
  const paceValues = run.points.slice(1).map((p, i) => {
    const distance = meters(run.points[i], p);
    const seconds = (p.timestamp - run.points[i].timestamp) / 1000;
    return distance > 0 && seconds > 0 ? seconds * 1000 / distance : Infinity;
  });
  const elevation = run.points.map(p => p.altitude).filter((n): n is number => n != null && Number.isFinite(n));
  return <View style={{ marginTop: 22 }}><Text style={{ color: c.lime, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 }}>HOW YOUR RUN CHANGED</Text><Chart label="PACE OVER TIME" values={paceValues} unit="MIN/KM" color={c.cyan} formatValue={paceSeconds} lowerIsBetter/><Chart label="ELEVATION PROFILE" values={elevation} unit="M" color={c.lime}/></View>;
});
