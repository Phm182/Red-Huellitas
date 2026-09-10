import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { PinchRotateTarget, StoryStickerItem } from './storyEditorTypes';
import { StoryTransformable } from './StoryTransformable';

type Props = {
  item: StoryStickerItem;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  editable: boolean;
  targetInfo: SharedValue<PinchRotateTarget>;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onChange: (id: string, patch: Partial<StoryStickerItem>) => void;
};

/**
 * Sticker/emoji arrastrable/pellizcable/rotable — mismo gesto que el texto
 * (`StoryTransformable`). Antes de esto, un sticker agregado quedaba pegado
 * al centro para siempre: `StoryOverlayLayer` (que lo pintaba) tiene
 * `pointerEvents="none"` a propósito, porque ese componente es el que
 * también dibuja el visor final (ahí no hace falta interactividad) — en el
 * editor hace falta este wrapper aparte, mismo criterio que ya usa el
 * texto (que tampoco se pinta con `StoryOverlayLayer` en el editor).
 */
export function StoryDraggableSticker({
  item,
  canvasW,
  canvasH,
  selected,
  editable,
  targetInfo,
  onSelect,
  onDeselect,
  onChange,
}: Props) {
  return (
    <StoryTransformable
      x={item.x}
      y={item.y}
      scale={item.scale || 1}
      rotation={item.rotation ?? 0}
      canvasW={canvasW}
      canvasH={canvasH}
      selected={selected}
      editable={editable}
      kind="sticker"
      id={item.id}
      targetInfo={targetInfo}
      onSelect={() => onSelect(item.id)}
      onDeselect={onDeselect}
      onChange={(patch) => onChange(item.id, patch)}
    >
      <Text style={styles.sticker}>{item.emoji}</Text>
    </StoryTransformable>
  );
}

const styles = StyleSheet.create({
  sticker: { fontSize: 56 },
});
