import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { publicacionesApi } from '../../../src/api/publicacionesApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { HistoriasBar } from '../../../src/components/HistoriasBar';
import { PostCard } from '../../../src/components/PostCard';
import { Post } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function FeedScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      publicacionesApi.feed().then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setPosts(res.data.posts);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await publicacionesApi.feed(nextCursor);
    if (res.success && res.data) {
      setPosts((prev) => [...prev, ...res.data!.posts]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onEliminado = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
  };

  if (loading) {
    return (
      <Atmosphere style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <FlatList
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.list, centeredContent]}
        data={posts}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) => (
          <PostCard post={item} onEliminado={onEliminado} index={index} />
        )}
        ListHeaderComponent={<HistoriasBar />}
          ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('feed.emptyFeed')}</Text>
          </View>
        }
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
        }
      />
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 28 },
  empty: { marginTop: 40, alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 20, textAlign: 'center' },
});
