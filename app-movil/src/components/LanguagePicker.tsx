import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { cambiarIdioma, IDIOMAS_DISPONIBLES } from '../i18n/i18n';
import { elevation, radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const idiomaActual = IDIOMAS_DISPONIBLES.find((i) => i.codigo === i18n.language);

  const onElegir = (codigo: string) => {
    hapticLeve();
    cambiarIdioma(codigo);
    setVisible(false);
  };

  return (
    <>
      <Pressable style={styles.row} onPress={() => setVisible(true)}>
        <View style={styles.rowIzq}>
          <Ionicons name="language-outline" size={18} color={colors.textMuted} />
          <Text style={[type.body, { color: colors.text }]}>{t('settings.language')}</Text>
        </View>
        <View style={styles.rowDer}>
          <Text style={[type.label, { color: colors.primary }]}>
            {idiomaActual?.nombreNativo ?? i18n.language.toUpperCase()}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
        <Animated.View entering={FadeIn.duration(160)} style={styles.overlayWrap}>
          <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setVisible(false)}>
            {/* El Pressable interno frena la propagación: tocar dentro de la
                hoja no debería cerrarla. */}
            <Pressable onPress={() => {}}>
              <Animated.View
                entering={FadeInDown.springify().damping(18)}
                style={[
                  styles.card,
                  elevation.lg,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <Text style={[type.titleSm, { color: colors.text, marginBottom: 12 }]}>
                  {t('settings.language')}
                </Text>

                <FlatList
                  data={IDIOMAS_DISPONIBLES}
                  keyExtractor={(item) => item.codigo}
                  renderItem={({ item }) => {
                    const activo = item.codigo === i18n.language;
                    return (
                      <Pressable
                        style={[
                          styles.option,
                          {
                            backgroundColor: activo ? colors.primarySoft : 'transparent',
                            borderColor: activo ? colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => onElegir(item.codigo)}
                      >
                        <Text style={[type.body, { color: activo ? colors.primary : colors.text }]}>
                          {item.nombreNativo}
                        </Text>
                        {activo ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  }}
                />
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIzq: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowDer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overlayWrap: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: 460,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
});
