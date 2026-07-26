import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { publicacionesApi } from '../../api/publicacionesApi';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Post } from '../../types';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Solapa "Publicaciones" de Huelligram.
 *
 * La barra de Huellitas ya no vive acá adentro: se subió al host, arriba de
 * las solapas, para que no se vaya con el scroll de una sola de las tres.
 */
export function PublicacionesBody() {
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
    return <ActivityIndicator color={colors.primary} size="large" style={styles.cargando} />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={[styles.list, centeredContent, posts.length === 0 && styles.listEmpty]}
      data={posts}
      keyExtractor={(p) => String(p.postId)}
      renderItem={({ item, index }) => <PostCard post={item} onEliminado={onEliminado} index={index} />}
      ListEmptyComponent={<EmptyState icon="paw-outline" titulo={t('feed.emptyFeed')} />}
      onEndReached={cargarMas}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  cargando: { marginTop: 40 },
  list: { padding: 14, paddingBottom: 28 },
  listEmpty: { flexGrow: 1 },
});
