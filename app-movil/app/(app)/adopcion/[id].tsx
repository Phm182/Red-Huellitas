import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Adopcion, EstadoAdopcion } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

const ESTADOS: EstadoAdopcion[] = ['disponible', 'en_proceso', 'adoptado'];

export default function AdopcionDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [adopcion, setAdopcion] = useState<Adopcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoritoBusy, setFavoritoBusy] = useState(false);
  const [estadoBusy, setEstadoBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setAdopcion(res.data.adopcion);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onToggleFavorito = async () => {
    if (!adopcion || favoritoBusy) return;
    setFavoritoBusy(true);
    const res = adopcion.esFavorito
      ? await adopcionApi.favoritoQuitar(adopcion.adopcionId)
      : await adopcionApi.favoritoAgregar(adopcion.adopcionId);
    if (res.success) {
      setAdopcion({ ...adopcion, esFavorito: !adopcion.esFavorito });
    }
    setFavoritoBusy(false);
  };

  const onCambiarEstado = async (estadoAdopcion: EstadoAdopcion) => {
    if (!adopcion || estadoBusy) return;
    setEstadoBusy(true);
    const res = await adopcionApi.actualizarEstado(adopcion.adopcionId, estadoAdopcion);
    if (res.success) {
      setAdopcion({ ...adopcion, estadoAdopcion });
    }
    setEstadoBusy(false);
  };

  if (loading || !adopcion) {
    return <SkeletonList />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {adopcion.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={adopcion.fotos}
          keyExtractor={(f) => String(f.adopcionFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.nombre, { color: colors.text }]}>{adopcion.nombre}</Text>
        <Pressable onPress={onToggleFavorito} disabled={favoritoBusy}>
          <Text style={{ fontSize: 26 }}>{adopcion.esFavorito ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>
        {adopcion.raza ?? t(`mascotas.especie${adopcion.especie.charAt(0).toUpperCase()}${adopcion.especie.slice(1)}`)}
        {adopcion.edadAnios !== null ? ` · ${adopcion.edadAnios} ${t('mascotas.edadAnios').toLowerCase()}` : ''}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{adopcion.autor.username}</Text>

      {adopcion.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{adopcion.descripcion}</Text> : null}

      {adopcion.whatsappNumero ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${adopcion.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {adopcion.esDueno ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>{t('adopcion.estadoLabel')}</Text>
          <View style={styles.segmented}>
            {ESTADOS.map((e) => {
              const activo = adopcion.estadoAdopcion === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => onCambiarEstado(e)}
                  disabled={estadoBusy}
                  style={[
                    styles.segment,
                    { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                  ]}
                >
                  <Text style={{ color: activo ? colors.primaryText : colors.primary, fontSize: 12, fontWeight: '600' }}>
                    {t(`adopcion.estado.${e}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(app)/adopcion/[id]/postulaciones', params: { id: adopcion.adopcionId } })}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
              {t('adopcion.verPostulaciones')} ({adopcion.totalPostulaciones ?? 0})
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(app)/adopcion/[id]/postular', params: { id: adopcion.adopcionId } })}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.postularmeButton')}</Text>
          </Pressable>
          <View style={styles.denunciaRow}>
            <DenunciaButtonStub userId={adopcion.autor.userId} adopcionId={adopcion.adopcionId} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  foto: { width: 260, height: 220, borderRadius: 12, marginRight: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: 22, fontWeight: '700' },
  whatsappButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
});
