import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';
import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { donacionesApi } from '../../../src/api/donacionesApi';
import { BotonEditarPublicacion } from '../../../src/components/BotonEditarPublicacion';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Donacion } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function DonacionDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [donacion, setDonacion] = useState<Donacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [estadoBusy, setEstadoBusy] = useState(false);

  /**
   * Al acordar se pierde la edición y al liberar se recupera, así que hay que
   * releer del server: `editable` y `motivoNoEditable` los decide el backend.
   */
  const onToggleAcordado = async () => {
    if (!donacion || estadoBusy) return;
    const nuevo = donacion.estadoDonacion === 'acordado' ? 'disponible' : 'acordado';
    setEstadoBusy(true);
    const res = await donacionesApi.marcarEstado(donacion.donacionId, nuevo);
    if (res.success) {
      const fresco = await donacionesApi.obtener(donacion.donacionId);
      if (fresco.success && fresco.data) setDonacion(fresco.data.donacion);
    }
    setEstadoBusy(false);
  };

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      donacionesApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setDonacion(res.data.donacion);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onEliminar = () => {
    if (!donacion) return;
    Alert.alert(t('donaciones.deleteConfirmTitle'), t('donaciones.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await donacionesApi.eliminar(donacion.donacionId);
          if (res.success) {
            router.replace('/(app)/donaciones');
          }
        },
      },
    ]);
  };

  if (loading || !donacion) {
    return <SkeletonList />;
  }

  const especieLabel = donacion.especie
    ? t(especieI18nKey(donacion.especie))
    : null;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {donacion.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={donacion.fotos}
          keyExtractor={(f) => String(f.donacionFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
        {t(`donaciones.tipo.${donacion.tipo}`).toUpperCase()} · {t(`donaciones.categoria.${donacion.categoria}`)}
        {donacion.estadoDonacion === 'acordado' ? ` · ${t('edicion.badgeAcordado')}` : ''}
      </Text>
      {especieLabel ? <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{especieLabel}</Text> : null}
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{donacion.zonaDescripcion}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{donacion.autor.username}</Text>

      <Text style={{ color: colors.text, marginBottom: 16 }}>{donacion.descripcion}</Text>

      {donacion.whatsappNumero ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${donacion.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {donacion.esDueno ? (
        <>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onToggleAcordado}
            disabled={estadoBusy}
          >
            {estadoBusy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
                {donacion.estadoDonacion === 'acordado'
                  ? t('edicion.marcarDisponible')
                  : t('edicion.marcarAcordado')}
              </Text>
            )}
          </Pressable>
          <BotonEditarPublicacion
            ruta="/(app)/donaciones/[id]/editar"
            id={donacion.donacionId}
            editable={donacion.editable}
            motivoNoEditable={donacion.motivoNoEditable}
          />
          <Pressable onPress={onEliminar} style={styles.eliminarLink}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('donaciones.eliminarButton')}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={donacion.autor.userId} donacionId={donacion.donacionId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  foto: { width: 260, height: 220, borderRadius: 12, marginRight: 8 },
  whatsappButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  eliminarLink: { marginTop: 4, alignItems: 'center' },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
});
