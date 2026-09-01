import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';
import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { transitoApi } from '../../../src/api/transitoApi';
import { BotonEditarPublicacion } from '../../../src/components/BotonEditarPublicacion';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { MeInteresaButton } from '../../../src/components/MeInteresaButton';
import { Transito } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function TransitoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transito, setTransito] = useState<Transito | null>(null);
  const [loading, setLoading] = useState(true);
  const [estadoBusy, setEstadoBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      transitoApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setTransito(res.data.transito);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  /**
   * Al acordar se pierde la edición y al liberar se recupera, así que hay que
   * releer del server en vez de parchear el estado local: `editable` y
   * `motivoNoEditable` los decide el backend.
   */
  const onToggleAcordado = async () => {
    if (!transito || estadoBusy) return;
    const nuevo = transito.estadoTransito === 'acordado' ? 'disponible' : 'acordado';
    setEstadoBusy(true);
    const res = await transitoApi.marcarEstado(transito.transitoId, nuevo);
    if (res.success) {
      const fresco = await transitoApi.obtener(transito.transitoId);
      if (fresco.success && fresco.data) setTransito(fresco.data.transito);
    }
    setEstadoBusy(false);
  };

  const onEliminar = () => {
    if (!transito) return;
    Alert.alert(t('transito.deleteConfirmTitle'), t('transito.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await transitoApi.eliminar(transito.transitoId);
          if (res.success) {
            router.replace('/(app)/transito');
          }
        },
      },
    ]);
  };

  if (loading || !transito) {
    return <SkeletonList />;
  }

  const especieLabel = transito.especie
    ? t(especieI18nKey(transito.especie))
    : null;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {transito.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={transito.fotos}
          keyExtractor={(f) => String(f.transitoFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
        {t(`transito.tipo.${transito.tipo}`).toUpperCase()}
        {transito.estadoTransito === 'acordado' ? ` · ${t('edicion.badgeAcordado')}` : ''}
      </Text>
      {transito.nombre ? <Text style={[styles.nombre, { color: colors.text }]}>{transito.nombre}</Text> : null}
      {transito.raza || especieLabel ? (
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{transito.raza ?? especieLabel}</Text>
      ) : null}
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{transito.zonaDescripcion}</Text>
      {transito.duracionDias !== null ? (
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>
          {t('transito.duracionDiasLabel')}: {transito.duracionDias}
        </Text>
      ) : null}
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{transito.autor.username}</Text>

      {transito.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{transito.descripcion}</Text> : null}

      {transito.whatsappNumero ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${transito.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {transito.esDueno ? (
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
                {transito.estadoTransito === 'acordado'
                  ? t('edicion.marcarDisponible')
                  : t('edicion.marcarAcordado')}
              </Text>
            )}
          </Pressable>
          <BotonEditarPublicacion
            ruta="/(app)/transito/[id]/editar"
            id={transito.transitoId}
            editable={transito.editable}
            motivoNoEditable={transito.motivoNoEditable}
          />
          <Pressable
            style={[styles.button, styles.verInteresadosButton, { borderColor: colors.primary }]}
            onPress={() => router.push(`/(app)/transito/${transito.transitoId}/interesados` as never)}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {t('transito.verInteresados')} ({transito.totalInteresados ?? 0})
            </Text>
          </Pressable>
          <Pressable onPress={onEliminar} style={styles.eliminarLink}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('transito.eliminarButton')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <MeInteresaButton
            ns="transito"
            onEnviar={(mensaje) => transitoApi.interesar(transito.transitoId, mensaje)}
          />
          <View style={styles.denunciaRow}>
            <DenunciaButtonStub userId={transito.autor.userId} transitoId={transito.transitoId} />
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
  nombre: { fontSize: 22, fontWeight: '700' },
  whatsappButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  verInteresadosButton: { backgroundColor: 'transparent', borderWidth: 1 },
  eliminarLink: { marginTop: 4, alignItems: 'center' },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
});
