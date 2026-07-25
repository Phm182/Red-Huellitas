import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { historiasApi } from '../api/historiasApi';
import { useAuth } from '../auth/AuthProvider';
import { HistoriaUsuarioResumen } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { LogoSiluetaNegra } from './LogoImage';

export function HistoriasBar() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [grupos, setGrupos] = useState<HistoriaUsuarioResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(() => {
    historiasApi.feed().then((res) => {
      if (res.success && res.data) {
        setGrupos(res.data.usuarios);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const onAgregar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSubiendo(true);
    const esVideo = (asset.mimeType ?? '').startsWith('video');
    const res = esVideo
      ? await historiasApi.crear('video', asset.uri, Math.round((asset.duration ?? 0) / 1000), asset.mimeType)
      : await historiasApi.crear('foto', asset.uri);
    setSubiendo(false);
    if (res.success) {
      cargar();
    }
  };

  if (loading) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      <Pressable style={styles.bubbleWrap} onPress={onAgregar} disabled={subiendo}>
        <View style={[styles.avatar, styles.addAvatar, { borderColor: colors.border }]}>
          {subiendo ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontSize: 22 }}>+</Text>
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
          {t('historias.addLabel')}
        </Text>
      </Pressable>

      {grupos.map((grupo) => (
        <Pressable
          key={grupo.autor.userId}
          style={styles.bubbleWrap}
          onPress={() =>
            router.push({ pathname: '/(app)/historias/[userId]', params: { userId: grupo.autor.userId } })
          }
        >
          <View
            style={[
              styles.avatar,
              { borderColor: grupo.todasVistas ? colors.border : colors.primary, borderWidth: 2 },
            ]}
          >
            {grupo.autor.avatarPath ? (
              <Image source={{ uri: rhMediaUrl(grupo.autor.avatarPath) }} style={styles.avatarImg} />
            ) : (
              <LogoSiluetaNegra style={{ width: 20, height: 20 }} />
            )}
          </View>
          <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={1}>
            {grupo.autor.userId === user?.userId ? t('historias.you') : `@${grupo.autor.username}`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, marginBottom: 8 },
  content: { paddingHorizontal: 4, gap: 12 },
  bubbleWrap: { alignItems: 'center', width: 64 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  addAvatar: { borderWidth: 1, borderStyle: 'dashed' },
  avatarImg: { width: '100%', height: '100%' },
});
