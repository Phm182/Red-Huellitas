import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { ObjetivoNuevo, escucharObjetivos } from '../utils/avisoObjetivos';
import { hapticExito } from '../utils/haptics';

/**
 * Cartel "¡Objetivo cumplido!" que baja desde arriba unos segundos. Está
 * montado una sola vez en la raíz y escucha `avisoObjetivos`.
 */
export function AvisoObjetivos() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ titulo: string; xp: number } | null>(null);
  const cola = useRef<ObjetivoNuevo[][]>([]);
  const mostrando = useRef(false);
  const y = useRef(new Animated.Value(-140)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  const nombreDe = (o: ObjetivoNuevo): string => {
    if (o.codigo.startsWith('d_')) return t(`hueplay.obj.d.${o.codigo}`);
    const i = o.codigo.lastIndexOf('_');
    return `${t(`hueplay.obj.f.${o.codigo.slice(0, i)}`)}: ${o.codigo.slice(i + 1)}`;
  };

  const siguiente = useRef<() => void>(() => {});
  siguiente.current = () => {
    const lote = cola.current.shift();
    if (!lote) {
      mostrando.current = false;
      return;
    }
    mostrando.current = true;
    const xp = lote.reduce((n, o) => n + o.xp, 0);
    setAviso({
      titulo: lote.length === 1 ? nombreDe(lote[0]!) : t('hueplay.obj.variosCumplidos', { n: lote.length }),
      xp,
    });
    hapticExito();
    y.setValue(-140);
    opacidad.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacidad, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(y, { toValue: -140, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(opacidad, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => siguiente.current());
      }, 3200);
    });
  };

  useEffect(
    () =>
      escucharObjetivos((nuevos) => {
        cola.current.push(nuevos);
        if (!mostrando.current) siguiente.current();
      }),
    []
  );

  if (!aviso) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 8, opacity: opacidad, transform: [{ translateY: y }] }]}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
        <View style={[styles.icono, { backgroundColor: colors.primary }]}>
          <Ionicons name="flag" size={18} color={colors.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 }}>
            {t('hueplay.obj.cumplido').toUpperCase()}
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }} numberOfLines={2}>
            {aviso.titulo}
          </Text>
        </View>
        <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 15 }}>+{aviso.xp} XP</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 9999, elevation: 30 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  icono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
