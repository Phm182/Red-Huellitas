import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { matchApi } from '../../../src/api/matchApi';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { MascotaMatch } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

export default function MisMatchesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [matches, setMatches] = useState<MascotaMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      matchApi.misMatches().then((res) => {
        if (activo && res.success && res.data) {
          setMatches(res.data.matches);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={[styles.list, centeredContent, matches.length === 0 && styles.listEmpty]}
        data={matches}
        keyExtractor={(item) => String(item.matchId)}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/(app)/match/[matchId]', params: { matchId: item.matchId } })}
          >
            {item.mascota?.fotos?.[0] ? (
              <Image source={{ uri: rhMediaUrl(item.mascota.fotos[0].path) }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, { backgroundColor: colors.background }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.mascota?.nombre ?? '—'}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
                {item.ultimoMensaje ? item.ultimoMensaje.texto : t('match.sinMensajesAun')}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="heart-outline" titulo={t('match.emptyMatches')} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  foto: { width: 56, height: 56, borderRadius: 28 },
});
