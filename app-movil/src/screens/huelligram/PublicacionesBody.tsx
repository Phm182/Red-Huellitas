import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { publicacionesApi } from '../../api/publicacionesApi';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListSearchBar } from '../../components/ui/ListSearchBar';
import { Post } from '../../types';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { filtrarPorTexto } from '../../utils/filtrarPorTexto';

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
  const [busqueda, setBusqueda] = useState('');
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
      if (tieneDatos.current) {
        cargar({ soft: true });
      }
    }, [cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || busqueda.trim()) return;
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

  const postsFiltrados = useMemo(
    () => filtrarPorTexto(posts, busqueda, (p) => [p.texto, p.autor?.username, p.autor?.nombreCompleto]),
    [posts, busqueda]
  );

  if (loading && posts.length === 0) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.cargando} />;
  }

  return (
    <View style={styles.wrap}>
      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
      <FlatList
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.list, centeredContent, postsFiltrados.length === 0 && styles.listEmpty]}
        data={postsFiltrados}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) => <PostCard post={item} onEliminado={onEliminado} index={index} />}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            titulo={busqueda.trim() ? t('common.sinResultadosBusqueda') : t('feed.emptyFeed')}
            accionLabel={busqueda.trim() ? undefined : t('feed.createTitle')}
            onAccion={busqueda.trim() ? undefined : () => router.push('/(app)/publicaciones/nueva')}
          />
        }
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
  wrap: { flex: 1, width: '100%' },
  cargando: { marginTop: 40 },
  list: { padding: 14, paddingBottom: 28, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
});
