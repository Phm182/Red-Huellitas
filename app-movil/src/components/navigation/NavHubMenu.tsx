import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import type { Hub } from '../../navigation/hubs';
import { elevation, radii } from '../../theme/elevation';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

type Props = {
  hub: Hub | null;
  /** Centro horizontal del ítem tocado, para anclar la tarjeta ahí. */
  anclaX: number;
  /** Desde qué altura sube la tarjeta (arriba de la barra). */
  desdeAbajo: number;
  onCerrar: () => void;
};

const ANCHO = 232;

/**
 * Menú de atajos al mantener apretado un ítem de la barra, como el click
 * derecho de Windows: muestra qué hay adentro del hub y deja entrar directo
 * sin pasar por la pantalla intermedia.
 *
 * Las opciones salen de `hub.items`, la misma lista que dibuja la grilla del
 * hub, así que no pueden decir cosas distintas.
 */
export function NavHubMenu({ hub, anclaX, desdeAbajo, onCerrar }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // En web el gesto no cancela con Escape solo; sin esto quedás encerrado en
  // el menú si no acertás a tocar afuera.
  useEffect(() => {
    if (Platform.OS !== 'web' || !hub || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hub, onCerrar]);

  if (!hub) return null;

  const izquierda = Math.max(12, anclaX - ANCHO / 2);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onCerrar}>
      <Pressable style={styles.telon} onPress={onCerrar} accessibilityLabel={t('common.close')}>
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.tarjeta,
            elevation.lg,
            {
              left: izquierda,
              bottom: desdeAbajo,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[type.label, styles.titulo, { color: colors.textMuted }]}>{t(hub.labelKey)}</Text>

          {hub.items.map((item, i) => (
            <Pressable
              key={item.key}
              style={[
                styles.fila,
                i < hub.items.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                hapticLeve();
                onCerrar();
                router.push(item.route as never);
              }}
            >
              <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={item.icon} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.texto, { color: colors.text }]} numberOfLines={1}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  telon: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  tarjeta: {
    position: 'absolute',
    width: ANCHO,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  titulo: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  icono: { width: 28, height: 28, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14 },
});
