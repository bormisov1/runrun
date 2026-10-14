import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import { c } from './styles';

type Props = {
  minimum: number;
  maximum: number;
  start: number;
  end: number;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  onPreview: (time: number) => void;
};

type Edge = 'start' | 'end';
type Drag = { anchorTime: number; anchorDx: number; lastDx: number; stillDx: number; currentTime: number; fine: boolean };

const HOLD_MS = 350;
const STILL_TOLERANCE = 3;
const FINE_SCALE = 6;
const TICK_COUNT = 32;

export function RunTrimmer(props: Props) {
  const [width, setWidth] = useState(1);
  const latest = useRef({ ...props, width });
  latest.current = { ...props, width };
  const drag = useRef<Drag | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoom = useRef(new Animated.Value(0)).current;
  const [activeEdge, setActiveEdge] = useState<Edge>('start');

  const animateZoom = (toValue: number) => {
    Animated.timing(zoom, {
      toValue,
      duration: toValue ? 230 : 180,
      easing: toValue ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const scheduleHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const currentDrag = drag.current;
    if (!currentDrag || currentDrag.fine) return;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      if (drag.current !== currentDrag) return;
      currentDrag.anchorTime = currentDrag.currentTime;
      currentDrag.anchorDx = currentDrag.lastDx;
      currentDrag.fine = true;
      animateZoom(1);
    }, HOLD_MS);
  };

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    zoom.stopAnimation();
  }, [zoom]);

  const move = (edge: Edge, dx: number) => {
    const state = drag.current;
    if (!state) return;
    const { minimum, maximum, start, end, width: trackWidth, onStartChange, onEndChange, onPreview } = latest.current;
    const span = Math.max(0, maximum - minimum);
    const gap = Math.min(1000, span);
    state.lastDx = dx;
    const proposed = state.anchorTime + (dx - state.anchorDx) * span / Math.max(trackWidth, 1) / (state.fine ? FINE_SCALE : 1);
    const value = edge === 'start'
      ? Math.max(minimum, Math.min(proposed, end - gap))
      : Math.min(maximum, Math.max(proposed, start + gap));
    state.currentTime = value;
    if (edge === 'start') onStartChange(value); else onEndChange(value);
    onPreview(value);
    if (!state.fine && Math.abs(dx - state.stillDx) > STILL_TOLERANCE) {
      state.stillDx = dx;
      scheduleHold();
    }
  };

  const makeResponder = (edge: Edge) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const time = edge === 'start' ? latest.current.start : latest.current.end;
      drag.current = { anchorTime: time, anchorDx: 0, lastDx: 0, stillDx: 0, currentTime: time, fine: false };
      setActiveEdge(edge);
      latest.current.onPreview(time);
      scheduleHold();
    },
    onPanResponderMove: (_, gesture) => move(edge, gesture.dx),
    onPanResponderRelease: endDrag,
    onPanResponderTerminate: endDrag,
  });

  function endDrag() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    drag.current = null;
    animateZoom(0);
  }

  const responders = useRef<ReturnType<typeof makeResponder> | null>(null);
  const endResponder = useRef<ReturnType<typeof makeResponder> | null>(null);
  if (!responders.current) responders.current = makeResponder('start');
  if (!endResponder.current) endResponder.current = makeResponder('end');

  const span = Math.max(1, props.maximum - props.minimum);
  const left = Math.max(0, Math.min(1, (props.start - props.minimum) / span)) * width;
  const right = Math.max(0, Math.min(1, (props.end - props.minimum) / span)) * width;
  const rulerAnchor = activeEdge === 'start' ? left : right;
  const adjust = (edge: Edge, direction: number) => {
    const step = Math.max(1000, (props.maximum - props.minimum) / 100);
    const gap = Math.min(1000, props.maximum - props.minimum);
    const value = edge === 'start'
      ? Math.max(props.minimum, Math.min(props.start + direction * step, props.end - gap))
      : Math.min(props.maximum, Math.max(props.end + direction * step, props.start + gap));
    if (edge === 'start') props.onStartChange(value); else props.onEndChange(value);
    props.onPreview(value);
  };

  const handle = (edge: Edge, x: number, responder: ReturnType<typeof makeResponder>) =>
    <View
      {...responder.panHandlers}
      accessible accessibilityRole="adjustable" accessibilityLabel={`${edge === 'start' ? 'Start' : 'Finish'} trim handle`}
      accessibilityHint="Hold briefly for precise trimming"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(100 * (x / Math.max(1, width))) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => adjust(edge, event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ position: 'absolute', left: x - 20, top: 0, width: 40, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 42, borderRadius: 5, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 2, height: 16, borderRadius: 1, backgroundColor: c.bg }} />
      </View>
    </View>;

  return <View style={{ marginHorizontal: 20, height: 52 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 36, borderRadius: 5, backgroundColor: c.line }} />
    <View style={{ position: 'absolute', left, width: Math.max(0, right - left), top: 8, height: 36, backgroundColor: '#4A581A', borderTopWidth: 2, borderBottomWidth: 2, borderColor: c.lime }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 36, overflow: 'hidden' }}>
      {Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
        const position = index * width / TICK_COUNT;
        const expandedPosition = rulerAnchor + (position - rulerAnchor) * FINE_SCALE;
        const major = index % 4 === 0;
        return <Animated.View key={index} style={{
          position: 'absolute',
          left: zoom.interpolate({ inputRange: [0, 1], outputRange: [position, expandedPosition] }),
          top: major ? 9 : 13,
          width: 1,
          height: major ? 18 : 10,
          backgroundColor: major ? '#D8FF3E99' : '#F5F7F066',
        }} />;
      })}
    </View>
    {handle('start', left, responders.current)}
    {handle('end', right, endResponder.current)}
  </View>;
}
