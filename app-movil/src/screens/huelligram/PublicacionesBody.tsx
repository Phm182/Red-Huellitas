import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { publicacionesApi } from '../../api/publicacionesApi';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Post } from '../../types';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Solapa "Publicaciones" de Huelligram.
 *
 * No vacía el feed al cambiar de solapa: un `setLoading(true)` desmontaba el
 * FlatList y las publicaciones parpadeaban / desaparecían.
 */
export function PublicacionesBody() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const pedidoRef = useRef(0);
  const tieneDatos = useRef(false);

  const cargar = useCallback(async (opts?: { soft?: boolean }) => {
    const pedido = ++pedidoRef.current;
    const soft = opts?.soft && tieneDatos.current;
    if (soft) {
      setRefrescando(true);
    } else if (!tieneDatos.current) {
      setLoading(true);
    }

    const res = await publicacionesApi.feed();
    if (pedido !== pedidoRef.current) return;

    if (res.success && res.data) {
      setPosts(res.data.posts);
      setNextCursor(res.data.nextCursor);
      tieneDatos.current = true;
    }
    setLoading(false);
    setRefrescando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      // Soft refresh al volver a la pantalla, sin desmontar la lista.
      if (tieneDatos.current) {
        cargar({ soft: true });
      }
    }, [cargar])
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

  if (loading && posts.length === 0) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.cargando} />;
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.list, centeredContent, posts.length === 0 && styles.listEmpty]}
        data={posts}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) => <PostCard post={item} onEliminado={onEliminado} index={index} />}
        ListEmptyComponent={<EmptyState icon="paw-outline" titulo={t('feed.emptyFeed')} />}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargar({ soft: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={
          cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  cargando: { marginTop: 40 },
  list: { padding: 14, paddingBottom: 28, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
});
