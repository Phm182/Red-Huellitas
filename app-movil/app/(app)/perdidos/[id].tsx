import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { perdidosApi } from '../../../src/api/perdidosApi';
import { BotonEditarPublicacion } from '../../../src/components/BotonEditarPublicacion';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Perdido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function PerdidoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [perdido, setPerdido] = useState<Perdido | null>(null);
  const [loading, setLoading] = useState(true);
  const [marcandoBusy, setMarcandoBusy] = useState(false);
  const [avisando, setAvisando] = useState(false);
  const [avisado, setAvisado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      perdidosApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setPerdido(res.data.perdido);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onMarcarReencontrado = () => {
    if (!perdido) return;
    Alert.alert(t('perdidos.reencontradoConfirmTitle'), t('perdidos.reencontradoConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('perdidos.marcarReencontradoButton'),
        onPress: async () => {
          if (marcandoBusy) return;
          setMarcandoBusy(true);
          const res = await perdidosApi.marcarReencontrado(perdido.perdidoId);
          setMarcandoBusy(false);
          if (res.success) {
            setPerdido({ ...perdido, estadoPerdido: 'reencontrado' });
          }
        },
      },
    ]);
  };

  const onViAEsteAnimal = async () => {
    if (!perdido || avisando) return;
    setAvisando(true);
    const res = await perdidosApi.avisarAvistamiento(perdido.perdidoId);
    setAvisando(false);
    if (res.success && res.data) {
      setAvisado(true);
      // Directo al chat: en un caso donde importan los minutos, hacerlo buscar
      // la conversación por su cuenta es perder el hilo.
      router.push(`/(app)/chat/${res.data.conversacionId}` as never);
    }
  };

  const onEliminar = () => {
    if (!perdido) return;
    Alert.alert(t('perdidos.deleteConfirmTitle'), t('perdidos.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await perdidosApi.eliminar(perdido.perdidoId);
          if (res.success) {
            router.replace('/(app)/perdidos');
          }
        },
      },
    ]);
  };

  if (loading || !perdido) {
    return <SkeletonList />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {perdido.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={perdido.fotos}
          keyExtractor={(f) => String(f.perdidoFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
        {t(`perdidos.tipo.${perdido.tipo}`).toUpperCase()}
        {perdido.estadoPerdido === 'reencontrado' ? ` · ${t('perdidos.estadoPerdido.reencontrado')}` : ''}
      </Text>
      <Text style={[styles.nombre, { color: colors.text }]}>{perdido.nombre}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{perdido.raza ?? perdido.especie}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>
        {perdido.ultimoLugarDescripcion} · {perdido.fechaSuceso}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{perdido.autor.username}</Text>

      {perdido.descripcion ? (
        <View style={[styles.descripcionCaja, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.descripcionTitulo, { color: colors.textMuted }]}>
            {t('perdidos.descripcionTitulo')}
          </Text>
          <Text style={[styles.descripcionTexto, { color: colors.text }]}>{perdido.descripcion}</Text>
        </View>
      ) : null}

      {perdido.whatsappNumero ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${perdido.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {perdido.esDueno ? (
        <>
          {perdido.estadoPerdido === 'activo' ? (
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={onMarcarReencontrado}
              disabled={marcandoBusy}
            >
              {marcandoBusy ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
                  {t('perdidos.marcarReencontradoButton')}
                </Text>
              )}
            </Pressable>
          ) : null}
          <BotonEditarPublicacion
            ruta="/(app)/perdidos/[id]/editar"
            id={perdido.perdidoId}
            editable={perdido.editable}
            motivoNoEditable={perdido.motivoNoEditable}
          />
          <Pressable onPress={onEliminar} style={styles.eliminarLink}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('perdidos.eliminarButton')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          {perdido.estadoPerdido === 'activo' ? (
            <Pressable
              style={[styles.button, { backgroundColor: avisado ? colors.surface : colors.primary }]}
              onPress={onViAEsteAnimal}
              disabled={avisando}
            >
              {avisando ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={{ color: avisado ? colors.primary : colors.primaryText, fontWeight: '700' }}>
                  {t(avisado ? 'perdidos.avistamientoEnviado' : 'perdidos.viAEsteAnimal')}
                </Text>
              )}
            </Pressable>
          ) : null}

          <View style={styles.denunciaRow}>
            <DenunciaButtonStub userId={perdido.autor.userId} perdidoId={perdido.perdidoId} />
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
  eliminarLink: { marginTop: 4, alignItems: 'center' },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
  descripcionCaja: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, marginBottom: 16 },
  descripcionTitulo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 5 },
  descripcionTexto: { fontSize: 15, lineHeight: 22 },
});
