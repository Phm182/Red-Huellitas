import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { usuariosApi } from '../../../src/api/usuariosApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Mascota } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function MascotaDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mascotaId = Number(id);

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carnetUri, setCarnetUri] = useState<string | null>(null);
  const [carnetLoading, setCarnetLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      mascotasApi.obtener(mascotaId).then(async (res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setMascota(res.data.mascota);
          const perfilOwner = await usuariosApi.perfilPorId(res.data.mascota.userId);
          if (activo && perfilOwner.success && perfilOwner.data) {
            setOwnerUsername(perfilOwner.data.username);
          }
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [mascotaId])
  );

  const verCarnet = async () => {
    setCarnetLoading(true);
    const uri = await mascotasApi.verCarnetUri(mascotaId, token);
    setCarnetUri(uri);
    setCarnetLoading(false);
  };

  if (loading || !mascota) {
    return <SkeletonList />;
  }

  const edad = [
    mascota.edadAnios ? `${mascota.edadAnios} ${t('mascotas.edadAnios').toLowerCase()}` : null,
    mascota.edadMeses ? `${mascota.edadMeses} ${t('mascotas.edadMeses').toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {mascota.fotos && mascota.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={mascota.fotos}
          keyExtractor={(f) => String(f.mascotaFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
          style={styles.galeria}
        />
      ) : (
        <View style={[styles.foto, { backgroundColor: colors.surface }]} />
      )}

      <Text style={[styles.nombre, { color: colors.text }]}>{mascota.nombre}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
        {t(mascota.sexo === 'macho' ? 'mascotas.sexoMacho' : 'mascotas.sexoHembra')}
        {edad ? ` · ${edad}` : ''} · {mascota.raza}
      </Text>

      {ownerUsername ? (
        <Pressable onPress={() => router.push(`/(app)/usuario/${ownerUsername}`)} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.primary }}>
            {t('mascotas.owner')}: @{ownerUsername}
          </Text>
        </Pressable>
      ) : null}

      {mascota.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{mascota.descripcion}</Text> : null}

      {mascota.disponibleParaMatch ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '600' }}>
            {t('mascotas.disponibleParaMatch')}
          </Text>
        </View>
      ) : null}

      {mascota.carnetDisponible ? (
        mascota.tengoAccesoCarnet ? (
          carnetUri ? (
            <Image source={{ uri: carnetUri }} style={styles.carnet} />
          ) : (
            <Pressable
              style={[styles.button, styles.outlineButton, { borderColor: colors.primary }]}
              onPress={verCarnet}
              disabled={carnetLoading}
            >
              {carnetLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('mascotas.carnetView')}</Text>
              )}
            </Pressable>
          )
        ) : (
          <Text style={{ color: colors.textMuted, marginBottom: 12 }}>{t('mascotas.carnetNoAccess')}</Text>
        )
      ) : null}

      {mascota.esDueno ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 20 }]}
          onPress={() => router.push(`/(app)/mascotas/${mascota.mascotaId}/editar`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('mascotas.editButton')}</Text>
        </Pressable>
      ) : (
        <View style={{ marginTop: 20 }}>
          <DenunciaButtonStub userId={mascota.userId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 24, ...centeredContent },
  galeria: { marginBottom: 16 },
  foto: { width: 260, height: 220, borderRadius: 12, marginRight: 8 },
  nombre: { fontSize: 22, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 16 },
  carnet: { width: '100%', height: 260, borderRadius: 12, marginBottom: 16, resizeMode: 'contain' },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
  outlineButton: { borderWidth: 1 },
});
