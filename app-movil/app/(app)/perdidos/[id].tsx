import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { perdidosApi } from '../../../src/api/perdidosApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Perdido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

export default function PerdidoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [perdido, setPerdido] = useState<Perdido | null>(null);
  const [loading, setLoading] = useState(true);
  const [marcandoBusy, setMarcandoBusy] = useState(false);

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
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
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

      {perdido.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{perdido.descripcion}</Text> : null}

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
          <Pressable onPress={onEliminar} style={styles.eliminarLink}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('perdidos.eliminarButton')}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={perdido.autor.userId} perdidoId={perdido.perdidoId} />
        </View>
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
});
