import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { Mascota, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Fab } from '../../../src/components/ui/Fab';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function MisMascotasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);

      const cargar = async () => {
        const resVer = await perfilApi.estadoVerificacion();
        if (!activo) return;
        if (resVer.success && resVer.data) {
          setVerificacion(resVer.data);
          if (resVer.data.estadoRevision === 'aprobado') {
            const resMascotas = await mascotasApi.misMascotas();
            if (activo && resMascotas.success && resMascotas.data) {
              setMascotas(resMascotas.data.mascotas);
            }
          }
        }
        if (activo) setLoading(false);
      };
      cargar();

      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('mascotas.verificationRequiredTitle')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('mascotas.verificationRequiredBody')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('mascotas.goToVerification')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={[styles.list, centeredContent]}
        data={mascotas}
        keyExtractor={(m) => String(m.mascotaId)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('mascotas.emptyState')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/(app)/mascota/${item.mascotaId}`)}
          >
            {item.fotos && item.fotos[0] ? (
              <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.cardPhoto} />
            ) : (
              <View style={[styles.cardPhoto, { backgroundColor: colors.border }]} />
            )}
            <Text style={{ color: colors.text, fontWeight: '600', marginTop: 6 }} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
              {item.raza}
            </Text>
          </Pressable>
        )}
      />
      <Fab onPress={() => router.push('/(app)/mascotas/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  button: { borderRadius: 10, padding: 14, paddingHorizontal: 24, alignItems: 'center' },
  list: { padding: 24, paddingTop: 24, gap: 12 },
  card: { flex: 1, borderRadius: 12, padding: 10 },
  cardPhoto: { width: '100%', height: 110, borderRadius: 8 },
});
