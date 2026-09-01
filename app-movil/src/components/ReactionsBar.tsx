import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { REACCIONES, reaccionConteoKey } from '../constants/reacciones';
import { PostConteos, ReaccionTipo } from '../types';
import { elevation, radii } from '../theme/elevation';
import { fonts } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

type Props = {
  miReaccion: ReaccionTipo | null;
  conteos: PostConteos;
  busy?: boolean;
  onReaccionar: (tipo: ReaccionTipo) => void;
  /** Variante oscura para Huetube. */
  oscuro?: boolean;
  /** Columna vertical (Huetube). */
  vertical?: boolean;
  /** Para achicar la barra cuando comparte fila con otros botones (ej. PostCard). */
  style?: StyleProp<ViewStyle>;
};

const VISIBLES = 4;

/**
 * Barra de reacciones: las más usadas a la vista + “más” con el catálogo completo.
 */
export function ReactionsBar({
  miReaccion,
  conteos,
  busy,
  onReaccionar,
  oscuro,
  vertical,
  style,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [picker, setPicker] = useState(false);

  const colorMute = oscuro ? 'rgba(255,255,255,0.7)' : colors.textMuted;
  const colorActivo = colors.primary;

  const principales = REACCIONES.slice(0, vertical ? 2 : VISIBLES);
  const restoActivo = miReaccion != null && !principales.some((r) => r.tipo === miReaccion);

  const botones = (
    <>
      {principales.map((r) => {
        const activa = miReaccion === r.tipo;
        const n = conteos[reaccionConteoKey(r.tipo)] ?? 0;
        return (
          <Pressable
            key={r.tipo}
            style={[styles.btn, vertical && styles.btnVertical]}
            disabled={busy}
            onPress={() => {
              hapticLeve();
              onReaccionar(r.tipo);
            }}
            accessibilityLabel={t(`feed.reaccion.${r.labelKey}`)}
          >
            {r.emoji && activa ? (
              <Text style={{ fontSize: vertical ? 26 : 20 }}>{r.emoji}</Text>
            ) : (
              <Ionicons
                name={activa ? r.icon : r.iconOutline}
                size={vertical ? 28 : 22}
                color={activa ? colorActivo : colorMute}
              />
            )}
            {n > 0 ? <Text style={[styles.count, { color: colorMute }]}>{n}</Text> : null}
          </Pressable>
        );
      })}

      <Pressable
        style={[
          styles.btn,
          styles.mas,
          vertical && styles.btnVertical,
          {
            borderColor: restoActivo
              ? colors.primary
              : oscuro
                ? 'rgba(255,255,255,0.25)'
                : colors.border,
            backgroundColor: restoActivo ? colors.primarySoft : 'transparent',
          },
        ]}
        onPress={() => {
          hapticLeve();
          setPicker(true);
        }}
        accessibilityLabel={t('feed.masReacciones')}
      >
        {restoActivo ? (
          <Text style={{ fontSize: vertical ? 22 : 16 }}>
            {REACCIONES.find((r) => r.tipo === miReaccion)?.emoji ?? '✨'}
          </Text>
        ) : (
          <Ionicons name="add-circle-outline" size={vertical ? 28 : 22} color={colorMute} />
        )}
      </Pressable>
    </>
  );

  return (
    <>
      {vertical ? (
        <View style={[styles.columna, style]}>{botones}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fila}
          style={[styles.scroll, style]}
        >
          {botones}
        </ScrollView>
      )}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(false)} />
          <View
            style={[
              styles.sheet,
              elevation.md,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.titulo, { color: colors.text }]}>{t('feed.elegirReaccion')}</Text>
            <View style={styles.grid}>
              {REACCIONES.map((r) => {
                const activa = miReaccion === r.tipo;
                const n = conteos[reaccionConteoKey(r.tipo)] ?? 0;
                return (
                  <Pressable
                    key={r.tipo}
                    onPress={() => {
                      hapticLeve();
                      onReaccionar(r.tipo);
                      setPicker(false);
                    }}
                    style={[
                      styles.celda,
                      {
                        borderColor: activa ? colors.primary : colors.border,
                        backgroundColor: activa ? colors.primarySoft : colors.backgroundAlt,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 26 }}>{r.emoji ?? '❤️'}</Text>
                    <Text style={[styles.celdaLabel, { color: colors.text }]} numberOfLines={1}>
                      {t(`feed.reaccion.${r.labelKey}`)}
                    </Text>
                    {n > 0 ? (
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{n}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  columna: { alignItems: 'center', gap: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  btnVertical: {
    flexDirection: 'column',
    paddingHorizontal: 4,
  },
  mas: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
  },
  count: { fontSize: 12, fontFamily: fonts.bodySemi },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
  },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celda: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  celdaLabel: { fontSize: 11, fontFamily: fonts.bodySemi, textAlign: 'center' },
});
