import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../../src/api/adopcionApi';
import { chatApi } from '../../../../src/api/chatApi';
import { LogoSiluetaNegra } from '../../../../src/components/LogoImage';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { AdopcionPostulacionRecibida } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

export default function PostulacionesRecibidasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [postulaciones, setPostulaciones] = useState<AdopcionPostulacionRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatBusy, setChatBusy] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.postulacionesRecibidas(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setPostulaciones(res.data.postulaciones);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const abrirChat = async (userId: number) => {
    if (chatBusy) return;
    setChatBusy(userId);
    const res = await chatApi.abrir({ userId });
    setChatBusy(null);
    if (res.success && res.data) {
      router.push(`/(app)/chat/${res.data.conversacionId}` as never);
    }
  };

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, centeredContent, postulaciones.length === 0 && styles.listEmpty]}
      data={postulaciones}
      keyExtractor={(p) => String(p.adopcionPostulacionId)}
      ListEmptyComponent={
        <EmptyState icon="people-outline" titulo={t('adopcion.emptyPostulaciones')} />
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.autorRow}>
            {item.adoptante.avatarPath ? (
              <Image source={{ uri: rhMediaUrl(item.adoptante.avatarPath) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.adoptante.nombreCompleto}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{item.adoptante.username}</Text>
            </View>
            <Pressable
              onPress={() => abrirChat(item.adoptante.userId)}
              disabled={chatBusy === item.adoptante.userId}
              style={[styles.chatBtn, { borderColor: colors.primary }]}
            >
              {chatBusy === item.adoptante.userId ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {t('adopcion.chatearPostulante')}
                </Text>
              )}
            </Pressable>
          </View>

          {item.respuestas.map((r, index) => (
            <View key={index} style={styles.respuestaBlock}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{r.preguntaTexto}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.respuesta}</Text>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  respuestaBlock: { marginBottom: 8 },
  chatBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
