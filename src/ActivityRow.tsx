import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clock, km, Run, stats } from './run';
import { c, st } from './styles';
import { ARCHIVE_ACTION_WIDTH, archiveSwipeOutcome } from './archiveSwipe';

export function ActivityRow({ run, index, onOpen, onArchive, onSwipeChange }: {
  run: Run; index: number; onOpen: () => void; onArchive: () => void; onSwipeChange: (active: boolean) => void;
}) {
  const offset = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const start = useRef(0);
  const width = useRef(320);
  const settle = (show: boolean) => {
    open.current = show;
    Animated.spring(offset, { toValue: show ? -ARCHIVE_ACTION_WIDTH : 0, useNativeDriver: true, bounciness: 0 }).start();
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1 && (gesture.dx < 0 || open.current),
    onPanResponderGrant: () => { start.current = open.current ? -ARCHIVE_ACTION_WIDTH : 0; offset.stopAnimation(); onSwipeChange(true); },
    onPanResponderMove: (_, gesture) => offset.setValue(Math.max(-width.current, Math.min(0, start.current + gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      onSwipeChange(false);
      const outcome = archiveSwipeOutcome(start.current, gesture.dx, gesture.vx, width.current);
      if (outcome === 'archive') onArchive();
      else settle(outcome === 'open');
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => { onSwipeChange(false); settle(open.current); },
  }), [offset, onArchive, onSwipeChange]);
  const data = stats(run);
  return <View onLayout={event => { width.current = event.nativeEvent.layout.width; }} style={{ borderRadius: 19, marginBottom: 10, overflow: 'hidden', backgroundColor: '#58636C' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Archive activity from ${new Date(run.startedAt).toLocaleDateString()}`} onPress={onArchive}
      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ARCHIVE_ACTION_WIDTH, backgroundColor: '#58636C', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
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
