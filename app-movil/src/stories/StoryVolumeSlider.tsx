import React, { useRef } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

type Props = {
  value: number;
  onChange: (v: number) => void;
};

/** Slider de volumen 0–1 sin dependencias extra. */
export function StoryVolumeSlider({ value, onChange }: Props) {
  const widthRef = useRef(1);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        onChange(Math.min(1, Math.max(0, x / widthRef.current)));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        onChange(Math.min(1, Math.max(0, x / widthRef.current)));
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = Math.max(1, e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.track} onLayout={onLayout} {...pan.panHandlers}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%` }]} />
      <View style={[styles.thumb, { left: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    marginLeft: -9,
    top: 5,
  },
});
