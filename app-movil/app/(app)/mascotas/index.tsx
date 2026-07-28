import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { Mascota, VerificacionEstado } from '../../../src/types';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { rhMediaUrl } from '../../../src/utils/media';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function MisMascotasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async (activo: () => boolean) => {
    const resVer = await perfilApi.estadoVerificacion();
    if (!activo()) return;
    if (resVer.success && resVer.data) {
      setVerificacion(resVer.data);
      if (resVer.data.estadoRevision === 'aprobado') {
        const resMascotas = await mascotasApi.misMascotas();
        if (activo() && resMascotas.success && resMascotas.data) {
          setMascotas(resMascotas.data.mascotas);
        }
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      setLoading(true);
      cargar(() => vivo).finally(() => {
        if (vivo) setLoading(false);
      });
      return () => {
        vivo = false;
      };
    }, [cargar])
  );

  const onRefrescar = async () => {
    setRefrescando(true);
    await cargar(() => true);
    setRefrescando(false);
  };

  if (loading) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="shield-checkmark-outline"
          titulo={t('mascotas.verificationRequiredTitle')}
          descripcion={t('mascotas.verificationRequiredBody')}
          accionLabel={t('mascotas.goToVerification')}
          onAccion={() => router.push('/(app)/ajustes/verificacion-estado')}
        />
      </View>
    );
  }

  const filtrados = filtrarPorTexto(mascotas, busqueda, (m) => [
    m.nombre,
    m.raza,
    m.razaTexto,
    m.especie,
    m.descripcion,
  ]);
  const buscando = busqueda.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
      <FlatList
        contentContainerStyle={[styles.list, centeredContent]}
        data={filtrados}
        keyExtractor={(m) => String(m.mascotaId)}
        numColumns={2}
        columnWrapperStyle={filtrados.length > 0 ? { gap: 12 } : undefined}
        refreshing={refrescando}
        onRefresh={onRefrescar}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            titulo={buscando ? t('common.sinResultadosBusqueda') : t('mascotas.emptyState')}
            accionLabel={buscando ? undefined : t('mascotas.addPet')}
            onAccion={buscando ? undefined : () => router.push('/(app)/mascotas/nueva')}
          />
        }
        ListFooterComponent={
          filtrados.length > 0 ? (
            <ListEndAddButton
              label={t('mascotas.addPet')}
              onPress={() => router.push('/(app)/mascotas/nueva')}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).springify()} style={{ flex: 1 }}>
            <Pressable
              style={[
                styles.card,
                elevation.sm,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => router.push(`/(app)/mascota/${item.mascotaId}`)}
            >
              {(item.modoBanner === 'banner' && item.bannerPath) || (item.fotos && item.fotos[0]) ? (
                <Image
                  source={{
                    uri:
                      item.modoBanner === 'banner' && item.bannerPath
                        ? rhMediaUrl(item.bannerPath)
                        : rhMediaUrl(item.fotos![0].path),
                  }}
                  style={styles.cardPhoto}
                  contentFit="cover"
                  contentPosition={
                    item.modoBanner === 'banner' && item.bannerPath
                      ? 'center'
                      : { top: `${Math.round((item.bannerFocusY ?? 0.5) * 100)}%` }
                  }
                  transition={220}
                />
              ) : (
                <View style={[styles.cardPhoto, styles.cardPhotoVacia, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="paw" size={30} color={colors.accent} />
                </View>
              )}
              <View style={styles.cardTextos}>
                <Text style={[type.section, { color: colors.text }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.raza}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: { flex: 1, borderWidth: 1, borderRadius: radii.md, overflow: 'hidden' },
  cardPhoto: { width: '100%', height: 130 },
  cardPhotoVacia: { alignItems: 'center', justifyContent: 'center' },
  cardTextos: { padding: 10 },
});
