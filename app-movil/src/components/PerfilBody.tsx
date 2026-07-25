import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mascotasApi } from '../api/mascotasApi';
import { publicacionesApi } from '../api/publicacionesApi';
import { usuariosApi } from '../api/usuariosApi';
import { useSeguirToggle } from '../hooks/useSeguirToggle';
import { Mascota, PerfilPublico, Post } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { LogoSiluetaNegra } from './LogoImage';

interface PerfilBodyProps {
  username?: string;
  userId?: number;
}

export function PerfilBody({ username, userId }: PerfilBodyProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const { siguiendo, busy: siguiendoBusy, toggle: onToggleSeguir } = useSeguirToggle(
    perfil?.userId ?? 0,
    perfil?.siguiendoYo ?? false,
    (nuevoSiguiendo) => {
      setPerfil((prev) =>
        prev ? { ...prev, totalSeguidores: prev.totalSeguidores + (nuevoSiguiendo ? 1 : -1) } : prev
      );
    }
  );

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);

      const cargar = async () => {
        const resPerfil = username ? await usuariosApi.perfilPorUsername(username) : await usuariosApi.perfilPorId(userId!);
        if (!activo) return;
        if (resPerfil.success && resPerfil.data) {
          setPerfil(resPerfil.data);
          const [resMascotas, resPosts] = await Promise.all([
            mascotasApi.listarUsuario(resPerfil.data.userId),
            publicacionesApi.listarUsuario(resPerfil.data.userId),
          ]);
          if (activo && resMascotas.success && resMascotas.data) {
            setMascotas(resMascotas.data.mascotas);
          }
          if (activo && resPosts.success && resPosts.data) {
            setPosts(resPosts.data.posts);
          }
        }
        if (activo) setLoading(false);
      };
      cargar();

      return () => {
        activo = false;
      };
    }, [username, userId])
  );

  if (loading || !perfil) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {perfil.avatarPath ? (
          <Image source={{ uri: rhMediaUrl(perfil.avatarPath) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
            <LogoSiluetaNegra style={{ width: 36, height: 36 }} />
          </View>
        )}
        <Text style={[styles.nombre, { color: colors.text }]}>{perfil.nombreCompleto}</Text>
        <Text style={{ color: colors.textMuted }}>@{perfil.username}</Text>
        {perfil.zonaDescripcion ? (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{perfil.zonaDescripcion}</Text>
        ) : null}
        {perfil.whatsappNumero ? (
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${perfil.whatsappNumero!.replace(/\D/g, '')}`)}>
            <Text style={{ color: colors.primary, marginTop: 6, fontWeight: '600' }}>WhatsApp: {perfil.whatsappNumero}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <Pressable style={styles.stat} onPress={() => router.push(`/(app)/usuario/${perfil.username}/seguidores`)}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{perfil.totalSeguidores}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('perfil.followers')}</Text>
        </Pressable>
        <Pressable style={styles.stat} onPress={() => router.push(`/(app)/usuario/${perfil.username}/seguidos`)}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{perfil.totalSeguidos}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('perfil.following')}</Text>
        </Pressable>
      </View>

      {!perfil.esUnoMismo ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.followButton, { backgroundColor: siguiendo ? colors.border : colors.primary }]}
            onPress={onToggleSeguir}
            disabled={siguiendoBusy}
          >
            {siguiendoBusy ? (
              <ActivityIndicator color={siguiendo ? colors.text : colors.primaryText} />
            ) : (
              <Text style={{ color: siguiendo ? colors.text : colors.primaryText, fontWeight: '600' }}>
                {siguiendo ? t('perfil.unfollowButton') : t('perfil.followButton')}
              </Text>
            )}
          </Pressable>
          <DenunciaButtonStub userId={perfil.userId} />
        </View>
      ) : null}

      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('perfil.postsPlaceholderTitle')}</Text>
        {posts.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t('feed.emptyFeed')}</Text>
        ) : (
          <View style={styles.petsGrid}>
            {posts.map((p) => (
              <Pressable key={p.postId} style={styles.petCard} onPress={() => router.push(`/(app)/publicaciones/${p.postId}`)}>
                {p.fotos[0] ? (
                  <Image source={{ uri: rhMediaUrl(p.fotos[0].path) }} style={styles.petPhoto} />
                ) : (
                  <View style={[styles.petPhoto, styles.postTextPreview, { backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={4}>
                      {p.texto}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {perfil.esUnoMismo ? t('perfil.myPetsSection') : t('perfil.petsSection')}
        </Text>
        {mascotas.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>{t('mascotas.emptyState')}</Text>
        ) : (
          <View style={styles.petsGrid}>
            {mascotas.map((m) => (
              <Pressable key={m.mascotaId} style={styles.petCard} onPress={() => router.push(`/(app)/mascota/${m.mascotaId}`)}>
                {m.fotos && m.fotos[0] ? (
                  <Image source={{ uri: rhMediaUrl(m.fotos[0].path) }} style={styles.petPhoto} />
                ) : (
                  <View style={[styles.petPhoto, { backgroundColor: colors.surface }]} />
                )}
                <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                  {m.nombre}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 24, paddingTop: 60, alignItems: 'stretch' },
  header: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 18, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 16 },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  followButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center' },
  section: { borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  petsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  petCard: { width: 90 },
  petPhoto: { width: 90, height: 90, borderRadius: 10 },
  postTextPreview: { padding: 6, justifyContent: 'center' },
});
