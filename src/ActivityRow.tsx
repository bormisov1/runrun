import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clock, km, Run, stats } from './run';
import { c, st } from './styles';

export function ActivityRow({ run, index, onOpen, onArchive }: {
  run: Run; index: number; onOpen: () => void; onArchive: () => void;
}) {
  const offset = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const start = useRef(0);
  const settle = (show: boolean) => {
    open.current = show;
    Animated.spring(offset, { toValue: show ? -96 : 0, useNativeDriver: true, bounciness: 0 }).start();
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderGrant: () => { start.current = open.current ? -96 : 0; offset.stopAnimation(); },
    onPanResponderMove: (_, gesture) => offset.setValue(Math.max(-96, Math.min(0, start.current + gesture.dx))),
    onPanResponderRelease: (_, gesture) => settle(start.current + gesture.dx < -48),
    onPanResponderTerminate: () => settle(open.current),
  }), [offset]);
  const data = stats(run);
  return <View style={{ borderRadius: 19, marginBottom: 10, overflow: 'hidden', backgroundColor: c.panel }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Archive activity from ${new Date(run.startedAt).toLocaleDateString()}`} onPress={onArchive}
      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 96, backgroundColor: '#58636C', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Ionicons name="archive-outline" size={22} color={c.white}/><Text style={{ color: c.white, fontSize: 11, fontWeight: '700' }}>Archive</Text>
    </Pressable>
    <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: offset }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open activity from ${new Date(run.startedAt).toLocaleDateString()}`} style={[st.historyCard, { marginBottom: 0 }]} onPress={() => open.current ? settle(false) : onOpen()}>
        <View style={st.historyIndex}><Text style={st.historyIndexText}>{String(index).padStart(2, '0')}</Text></View>
        <View style={{ flex: 1 }}><Text style={st.historyTitle}>{new Date(run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} RUN</Text><Text style={st.historyMeta}>{km(data.distance)} KM  ·  {clock(data.seconds)}  ·  +{Math.round(data.ascent)} M</Text></View>
        <Ionicons name="chevron-forward" size={20} color={c.muted}/>
      </Pressable>
    </Animated.View>
  </View>;
}
