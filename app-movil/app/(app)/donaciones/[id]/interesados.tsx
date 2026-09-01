import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { donacionesApi } from '../../../../src/api/donacionesApi';
import { chatApi } from '../../../../src/api/chatApi';
import { LogoSiluetaNegra } from '../../../../src/components/LogoImage';
import { EmptyState } from '../../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { DonacionInteresado } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

/** Molde recortado de adopcion/[id]/postulaciones.tsx, sin bloque de preguntas. */
export default function DonacionInteresadosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [interesados, setInteresados] = useState<DonacionInteresado[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatBusy, setChatBusy] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      donacionesApi.interesadosListar(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setInteresados(res.data.interesados);
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
      contentContainerStyle={[styles.list, centeredContent, interesados.length === 0 && styles.listEmpty]}
      data={interesados}
      keyExtractor={(i) => String(i.donacionInteresId)}
      ListEmptyComponent={<EmptyState icon="hand-left-outline" titulo={t('donaciones.emptyInteresados')} />}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.autorRow}>
            {item.usuario.avatarPath ? (
              <Image source={{ uri: rhMediaUrl(item.usuario.avatarPath) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.usuario.nombreCompleto}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{item.usuario.username}</Text>
            </View>
            <Pressable
              onPress={() => abrirChat(item.usuario.userId)}
              disabled={chatBusy === item.usuario.userId}
              style={[styles.chatBtn, { borderColor: colors.primary }]}
            >
              {chatBusy === item.usuario.userId ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {t('donaciones.chatearInteresado')}
                </Text>
              )}
            </Pressable>
          </View>

          {item.mensaje ? <Text style={{ color: colors.text, fontSize: 13 }}>{item.mensaje}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  chatBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
