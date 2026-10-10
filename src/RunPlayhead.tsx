import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { c } from './styles';

type Props = { start: number; end: number; value: number; onChange: (time: number) => void };

const THUMB_SIZE = 28;
const STEPS = 1000;

export function RunPlayhead(props: Props) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ ...props, width });
  latest.current = { ...props, width };
  const anchorX = useRef(0);
  const pending = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const flush = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (pending.current != null) {
      latest.current.onChange(pending.current);
      pending.current = null;
    }
  };

  const changeAt = (x: number) => {
    const { start, end, width: trackWidth } = latest.current;
    const duration = Math.max(0, end - start);
    if (!duration || trackWidth <= THUMB_SIZE) return;
    const fraction = Math.max(0, Math.min(1, (x - THUMB_SIZE / 2) / (trackWidth - THUMB_SIZE)));
    const step = duration / STEPS;
    pending.current = start + Math.min(duration, Math.round(fraction * STEPS) * step);
    if (frame.current == null) frame.current = requestAnimationFrame(flush);
  };

  const responder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!responder.current) responder.current = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      anchorX.current = event.nativeEvent.locationX;
      changeAt(anchorX.current);
    },
    onPanResponderMove: (_, gesture) => changeAt(anchorX.current + gesture.dx),
    onPanResponderRelease: flush,
    onPanResponderTerminate: flush,
  });

  useEffect(() => () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
  }, []);

  const duration = Math.max(0, props.end - props.start);
  const fraction = duration ? Math.max(0, Math.min(1, (props.value - props.start) / duration)) : 0;
  const travel = Math.max(0, width - THUMB_SIZE);
  const center = THUMB_SIZE / 2 + fraction * travel;
  const adjust = (direction: number) => {
    if (duration) props.onChange(Math.max(props.start, Math.min(props.end, props.value + direction * duration / STEPS)));
  };

  return <View {...responder.current.panHandlers}
    accessible accessibilityRole="adjustable" accessibilityLabel="Run timeline playhead"
    accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => adjust(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 40, justifyContent: 'center', opacity: duration ? 1 : 0.5 }}>
    <View pointerEvents="none" style={{ height: 3, marginHorizontal: THUMB_SIZE / 2, backgroundColor: c.line, borderRadius: 2 }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: THUMB_SIZE / 2, width: fraction * travel, height: 3, backgroundColor: c.lime, borderRadius: 2 }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: center - 3, width: 6, height: THUMB_SIZE, backgroundColor: c.lime, borderRadius: 1 }} />
  </View>;
}
