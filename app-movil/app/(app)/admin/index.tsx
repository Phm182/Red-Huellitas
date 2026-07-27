import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { adminApi } from '../../../src/api/adminApi';
import { AdminResumen } from '../../../src/types';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TarjetaProps {
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descripcion: string;
  pendientes: number;
  onPress: () => void;
  index: number;
}

function TarjetaBandeja({ icon, titulo, descripcion, pendientes, onPress, index }: TarjetaProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify()}>
      <AnimatedPressable
        onPress={() => {
          hapticLeve();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 340 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 240 });
        }}
        style={[
          styles.tarjeta,
          elevation.sm,
          { borderColor: colors.border, backgroundColor: colors.surface },
          animStyle,
        ]}
      >
        <View
          style={[
            styles.icono,
            { backgroundColor: pendientes > 0 ? colors.primarySoft : colors.accentSoft },
          ]}
        >
          <Ionicons name={icon} size={22} color={pendientes > 0 ? colors.primary : colors.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[type.section, { color: colors.text }]}>{titulo}</Text>
          <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]}>{descripcion}</Text>
        </View>

        {pendientes > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[type.label, { color: colors.primaryText }]}>{pendientes}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

/**
 * Hub del panel de moderación: las tres bandejas con su contador de
 * pendientes. El acceso real lo controla el backend (rh_require_admin); si un
 * usuario común llega acá igual no ve nada.
 */
export default function AdminHubScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [resumen, setResumen] = useState<AdminResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      adminApi.resumen().then((res) => {
        if (res.success && res.data) {
          setResumen(res.data);
          setError(null);
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
    }, [])
  );

  const tarjetas: Omit<TarjetaProps, 'index'>[] = [
    {
      icon: 'shield-checkmark-outline',
      titulo: t('admin.verificacionesTitulo'),
      descripcion: t('admin.verificacionesDescripcion'),
      pendientes: resumen?.verificacionesPendientes ?? 0,
      onPress: () => router.push('/(app)/admin/verificaciones'),
    },
    {
      icon: 'flag-outline',
      titulo: t('admin.denunciasTitulo'),
      descripcion: t('admin.denunciasDescripcion'),
      pendientes: resumen?.denunciasPendientes ?? 0,
      onPress: () => router.push('/(app)/admin/denuncias'),
    },
    {
      icon: 'chatbox-ellipses-outline',
      titulo: t('admin.reportesTitulo'),
      descripcion: t('admin.reportesDescripcion'),
      pendientes: resumen?.reportesPendientes ?? 0,
      onPress: () => router.push('/(app)/admin/reportes'),
    },
    {
      icon: 'diamond-outline',
      titulo: 'Planes HuePlus',
      descripcion: 'Nombre, precio, beneficios y planes nuevos',
      pendientes: 0,
      onPress: () => router.push('/(app)/admin/planes'),
    },
  ];

  if (loading) {
    return <SkeletonList cantidad={3} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState icon="lock-closed-outline" titulo={error} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.contenedor, centeredContent, { backgroundColor: colors.background }]}>
      {tarjetas.map((tarjeta, i) => (
        <TarjetaBandeja key={tarjeta.titulo} {...tarjeta} index={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, flexGrow: 1 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  icono: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { minWidth: 30, borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center' },
});
