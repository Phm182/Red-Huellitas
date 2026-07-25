import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminApi } from '../../../src/api/adminApi';
import { AdminResumen } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

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

  const tarjetas = [
    {
      key: 'verificaciones',
      titulo: t('admin.verificacionesTitulo'),
      descripcion: t('admin.verificacionesDescripcion'),
      pendientes: resumen?.verificacionesPendientes ?? 0,
      ruta: '/(app)/admin/verificaciones' as const,
    },
    {
      key: 'denuncias',
      titulo: t('admin.denunciasTitulo'),
      descripcion: t('admin.denunciasDescripcion'),
      pendientes: resumen?.denunciasPendientes ?? 0,
      ruta: '/(app)/admin/denuncias' as const,
    },
    {
      key: 'reportes',
      titulo: t('admin.reportesTitulo'),
      descripcion: t('admin.reportesDescripcion'),
      pendientes: resumen?.reportesPendientes ?? 0,
      ruta: '/(app)/admin/reportes' as const,
    },
  ];

  if (loading) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.contenedor, { backgroundColor: colors.background }]}>
      {tarjetas.map((tarjeta) => (
        <Pressable
          key={tarjeta.key}
          style={[styles.tarjeta, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => router.push(tarjeta.ruta)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>{tarjeta.titulo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{tarjeta.descripcion}</Text>
          </View>
          {tarjeta.pendientes > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primaryText, fontWeight: '700' }}>{tarjeta.pendientes}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { padding: 16, ...centeredContent },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tarjetaTitulo: { fontSize: 16, fontWeight: '700' },
  badge: { minWidth: 32, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center' },
});
