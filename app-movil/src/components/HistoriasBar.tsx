import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { historiasApi } from '../api/historiasApi';
import { useAuth } from '../auth/AuthProvider';
import { HistoriaUsuarioResumen } from '../types';
import { fonts } from '../theme/typography';
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
        <View style={[styles.ring, { borderColor: colors.border, borderStyle: 'dashed' }]}>
          <View style={[styles.avatarInner, { backgroundColor: colors.primarySoft }]}>
            {subiendo ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="add" size={26} color={colors.primary} />
            )}
          </View>
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {t('historias.addLabel')}
        </Text>
      </Pressable>

      {grupos.map((grupo) => {
        const visto = grupo.todasVistas;
        return (
          <Pressable
            key={grupo.autor.userId}
            style={styles.bubbleWrap}
            onPress={() =>
              router.push({ pathname: '/(app)/historias/[userId]', params: { userId: grupo.autor.userId } })
            }
          >
            {visto ? (
              <View style={[styles.ring, { borderColor: colors.border }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.backgroundAlt }]}>
                  {grupo.autor.avatarPath ? (
                    <Image source={{ uri: rhMediaUrl(grupo.autor.avatarPath) }} style={styles.avatarImg} />
                  ) : (
                    <LogoSiluetaNegra style={{ width: 22, height: 22 }} />
                  )}
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={[colors.storyRingStart, colors.storyRingEnd, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ringGradient}
              >
                <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                  {grupo.autor.avatarPath ? (
                    <Image source={{ uri: rhMediaUrl(grupo.autor.avatarPath) }} style={styles.avatarImg} />
                  ) : (
                    <LogoSiluetaNegra style={{ width: 22, height: 22 }} />
                  )}
                </View>
              </LinearGradient>
            )}
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {grupo.autor.userId === user?.userId ? t('historias.you') : `@${grupo.autor.username}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, marginBottom: 12 },
  content: { paddingHorizontal: 2, gap: 14 },
  bubbleWrap: { alignItems: 'center', width: 72 },
  ring: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ringGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    padding: 3,
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, maxWidth: 72, textAlign: 'center' },
});
