import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { StoryTextItem, storyFontFamily } from './storyEditorTypes';

type Props = {
  item: StoryTextItem;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  editable: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<StoryTextItem>) => void;
};

/** Texto arrastrable (PanResponder — estable en web y nativo). */
export function StoryDraggableText({
  item,
  canvasW,
  canvasH,
  selected,
  editable,
  onSelect,
  onChange,
}: Props) {
  const start = useRef({ x: item.x, y: item.y });
  const [size, setSize] = useState({ w: 0, h: 0 });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: () => editable,
        onPanResponderGrant: () => {
          onSelect(item.id);
          start.current = { x: item.x, y: item.y };
        },
        onPanResponderMove: (_evt, gesture) => {
          if (canvasW <= 0 || canvasH <= 0) return;
          onChange(item.id, {
            x: Math.min(0.95, Math.max(0.05, start.current.x + gesture.dx / canvasW)),
            y: Math.min(0.95, Math.max(0.05, start.current.y + gesture.dy / canvasH)),
          });
        },
      }),
    [editable, item.id, item.x, item.y, canvasW, canvasH, onSelect, onChange]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View
      {...(editable ? pan.panHandlers : {})}
      onLayout={onLayout}
      style={[
        styles.wrap,
        selected && editable && styles.selected,
        {
          left: item.x * canvasW - size.w / 2,
          top: item.y * canvasH - size.h / 2,
          transform: [{ rotate: `${item.rotation ?? 0}deg` }, { scale: item.scale || 1 }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: item.color,
            fontFamily: storyFontFamily(item.fontId),
          },
        ]}
      >
        {item.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  text: {
    fontSize: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    maxWidth: 320,
  },
});
