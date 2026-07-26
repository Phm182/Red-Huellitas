import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { STORY_FILTERS, StoryOverlay, storyFontFamily } from './storyEditorTypes';

type Props = {
  overlay: StoryOverlay;
  width: number;
  height: number;
};

function pointsToSvg(points: { x: number; y: number }[], w: number, h: number): string {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * w} ${p.y * h}`)
    .join(' ');
}

const TEXT_MAX_W = Dimensions.get('window').width * 0.85;

/** Capa de filtro + textos + trazos encima del media (visor y editor). */
export function StoryOverlayLayer({ overlay, width, height }: Props) {
  if (width <= 0 || height <= 0) return null;
  const filter = STORY_FILTERS.find((f) => f.id === overlay.filter) ?? STORY_FILTERS[0];
  const useCss = Platform.OS === 'web' && !!filter.cssFilter;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* En web el CSS filter se aplica al media; acá refuerzo con capas. */}
      {!useCss
        ? filter.layers.map((layer, i) => (
            <View key={`${filter.id}_${i}`} style={[StyleSheet.absoluteFill, { backgroundColor: layer.color }]} />
          ))
        : filter.layers.slice(0, 1).map((layer, i) => (
            <View key={`${filter.id}_${i}`} style={[StyleSheet.absoluteFill, { backgroundColor: layer.color }]} />
          ))}

      {overlay.paths.length > 0 ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {overlay.paths.map((path) => (
            <Path
              key={path.id}
              d={pointsToSvg(path.points, width, height)}
              stroke={path.color}
              strokeWidth={path.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      ) : null}

      {(overlay.stickers ?? []).map((item) => (
        <View
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x * width,
            top: item.y * height,
            transform: [
              { translateX: '-50%' },
              { translateY: '-50%' },
              { rotate: `${item.rotation ?? 0}deg` },
              { scale: item.scale || 1 },
            ],
          }}
        >
          <Text style={styles.sticker}>{item.emoji}</Text>
        </View>
      ))}

      {overlay.texts.map((item) => (
        <View
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x * width,
            top: item.y * height,
            transform: [
              { translateX: '-50%' },
              { translateY: '-50%' },
              { rotate: `${item.rotation ?? 0}deg` },
              { scale: item.scale || 1 },
            ],
          }}
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
      ))}
    </View>
  );
}

/** Estilo CSS filter para envolver el media en web. */
export function storyFilterCss(filterId: StoryOverlay['filter']): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  return STORY_FILTERS.find((f) => f.id === filterId)?.cssFilter;
}

const styles = StyleSheet.create({
  sticker: { fontSize: 56 },
  text: {
    fontSize: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    maxWidth: TEXT_MAX_W,
  },
});
