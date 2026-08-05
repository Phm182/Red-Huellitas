import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { fonts } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { STICKERS, StickerId } from './stickers';

/**
 * Emojis frecuentes en un chat de mascotas.
 *
 * Es una lista corta y curada, no un teclado de emojis completo: el teclado del
 * sistema ya tiene todos, y meter un picker de 3000 emojis sólo agrega peso y
 * scroll. Esto es el atajo a los que se usan siempre.
 */
const EMOJIS = [
  '🐶', '🐱', '🐾', '❤️', '😂', '🥰', '😍', '🙌',
  '👏', '🎾', '🦴', '🏠', '💉', '🩺', '🌟', '🎉',
  '😢', '😮', '🤗', '👍', '🙏', '☀️', '🌙', '🐕',
];

type Props = {
  onSticker: (id: StickerId) => void;
  onEmoji: (emoji: string) => void;
  onCerrar: () => void;
};

export function StickerPicker({ onSticker, onEmoji, onCerrar }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'stickers' | 'emojis'>('stickers');

  const solapa = (id: 'stickers' | 'emojis', label: string) => {
    const on = tab === id;
    return (
      <Pressable
        key={id}
        onPress={() => setTab(id)}
        style={[styles.solapa, on && { backgroundColor: colors.primarySoft }]}
      >
        <Text style={{ color: on ? colors.primary : colors.textMuted, fontFamily: fonts.bodySemi, fontSize: 13 }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cabecera}>
        <View style={styles.solapas}>
          {solapa('stickers', t('chat.stickersTab'))}
          {solapa('emojis', t('chat.emojisTab'))}
        </View>
        <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel={t('common.close')}>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>×</Text>
        </Pressable>
      </View>

      {tab === 'stickers' ? (
        <ScrollView contentContainerStyle={styles.grilla} keyboardShouldPersistTaps="handled">
          {STICKERS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSticker(s.id)}
              style={({ pressed }) => [
                styles.celdaSticker,
                { backgroundColor: pressed ? colors.primarySoft : 'transparent' },
              ]}
              accessibilityLabel={t(s.labelKey)}
            >
              {s.render(58)}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.grilla} keyboardShouldPersistTaps="handled">
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => onEmoji(e)}
              style={({ pressed }) => [
                styles.celdaEmoji,
                { backgroundColor: pressed ? colors.primarySoft : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 28 }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderColor: 'transparent',
    height: 232,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  solapas: { flexDirection: 'row', gap: 6 },
  solapa: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
  },
  celdaSticker: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  celdaEmoji: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
});
