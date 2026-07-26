import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { veterinariasApi } from '../../../src/api/veterinariasApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Veterinaria } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function VeterinariaDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [veterinaria, setVeterinaria] = useState<Veterinaria | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      veterinariasApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setVeterinaria(res.data.veterinaria);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onEliminar = () => {
    if (!veterinaria) return;
    Alert.alert(t('veterinarias.deleteConfirmTitle'), t('veterinarias.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await veterinariasApi.eliminar(veterinaria.veterinariaId);
          if (res.success) {
            router.replace('/(app)/veterinarias');
          }
        },
      },
    ]);
  };

  if (loading || !veterinaria) {
    return <SkeletonList />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {veterinaria.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={veterinaria.fotos}
          keyExtractor={(f) => String(f.veterinariaFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20, marginBottom: 6 }}>{veterinaria.nombre}</Text>
      {veterinaria.horario ? (
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{veterinaria.horario}</Text>
      ) : null}
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
        {veterinaria.zonaDescripcion}
        {veterinaria.distanciaKm !== null ? ` · ${veterinaria.distanciaKm}km` : ''}
      </Text>

      {veterinaria.descripcion ? (
        <Text style={{ color: colors.text, marginBottom: 16 }}>{veterinaria.descripcion}</Text>
      ) : null}

      {veterinaria.telefono ? (
        <Pressable
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`tel:${veterinaria.telefono}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('veterinarias.llamarButton')}</Text>
        </Pressable>
      ) : null}

      {veterinaria.whatsappNumero ? (
        <Pressable
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${veterinaria.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {veterinaria.esDueno ? (
        <Pressable onPress={onEliminar} style={styles.eliminarLink}>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{t('veterinarias.eliminarButton')}</Text>
        </Pressable>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={veterinaria.autorUserId} veterinariaId={veterinaria.veterinariaId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  foto: { width: 260, height: 220, borderRadius: 12, marginRight: 8 },
  contactButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  eliminarLink: { marginTop: 4, alignItems: 'center' },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
});
