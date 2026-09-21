import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mascotasApi } from '../api/mascotasApi';
import { elevation, radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { UsuarioResumen } from '../types';
import { rhAvatarUrl, rhMediaUrl } from '../utils/media';

type Props = {
  autor: UsuarioResumen | null;
  /** true si la publicación trata de un animal: se muestra su foto en vez de la de quien publica. */
  esAnimal?: boolean;
  /** Mascota registrada, si la publicación nació de una. */
  mascotaId?: number | null;
  /** Nombre del animal (o del ítem) para el título. */
  nombre?: string | null;
  /** Primera foto de la propia publicación: sirve de foto del animal si no hay mascota. */
  fotoPublicacion?: string | null;
};

/**
 * Cabecera de toda publicación: foto redonda + nombre + quién publica.
 * Animal → foto de la mascota (o, si no está registrada, la de la publicación).
 * Cualquier otra cosa → foto del usuario que publica. Al tocarla lleva a la
 * mascota o al perfil.
 */
export function CabeceraPublicacion({ autor, esAnimal = false, mascotaId = null, nombre, fotoPublicacion }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [fotoMascota, setFotoMascota] = useState<string | null>(null);

  useEffect(() => {
    if (!esAnimal || !mascotaId) return;
    let activo = true;
    mascotasApi.obtener(mascotaId).then((res) => {
      if (activo && res.success && res.data?.mascota.fotos?.[0]) setFotoMascota(res.data.mascota.fotos[0].path);
    });
    return () => {
      activo = false;
    };
  }, [esAnimal, mascotaId]);

  if (!autor) return null;

  const uri = esAnimal
    ? (fotoMascota ?? fotoPublicacion)
      ? rhMediaUrl((fotoMascota ?? fotoPublicacion)!)
      : null
    : autor.avatarPath
      ? rhAvatarUrl(autor.avatarPath, (autor as { avatarBust?: number | null }).avatarBust ?? undefined)
      : null;

  const titulo = esAnimal && nombre ? nombre : autor.nombreCompleto;
  const abrir = () => {
    if (esAnimal && mascotaId) router.push(`/(app)/mascota/${mascotaId}` as never);
    else if (autor.username) router.push(`/(app)/usuario/${autor.username}` as never);
  };

  return (
    <Pressable
      onPress={abrir}
      style={[styles.fila, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="button"
    >
      {uri ? (
        <Image source={{ uri }} style={styles.foto} contentFit="cover" />
      ) : (
        <View style={[styles.foto, styles.sinFoto, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={esAnimal ? 'paw' : 'person'} size={24} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[type.label, { color: colors.text, fontSize: 16, fontWeight: '800' }]} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {esAnimal ? t('common.publicadoPor', { usuario: autor.username ?? autor.nombreCompleto }) : `@${autor.username ?? ''}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginBottom: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  foto: { width: 56, height: 56, borderRadius: 28 },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
});
