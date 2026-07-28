import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, LayoutChangeEvent, StyleSheet, View, ViewToken } from 'react-native';
import { shortsApi } from '../../api/shortsApi';
import { ShortCard } from '../../components/ShortCard';
import { EmptyState, useContentAreaHeight } from '../../components/ui/EmptyState';
import { ListSearchBar } from '../../components/ui/ListSearchBar';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Post } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';
import { filtrarPorTexto } from '../../utils/filtrarPorTexto';

type Props = {
  /** Lo que ocupa el bloque de Huellitas + solapas por encima de este feed. */
  alturaExtra?: number;
};

/**
 * Soft-refresh: no pone loading=true si ya hay videos (evita parpadeo al swipe).
 */
export function HuetubeBody({ alturaExtra = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [searchH, setSearchH] = useState(48);
  const itemHeight = useContentAreaHeight(alturaExtra + searchH);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const tieneDatos = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const soft = tieneDatos.current;
      if (!soft) setLoading(true);
      shortsApi.feed().then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setPosts(res.data.posts);
          setNextCursor(res.data.nextCursor);
          tieneDatos.current = true;
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const onSearchLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== searchH) setSearchH(h);
  }, [searchH]);

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || busqueda.trim()) return;
    setCargandoMas(true);
    const res = await shortsApi.feed(nextCursor);
    if (res.success && res.data) {
      setPosts((prev) => [...prev, ...res.data!.posts]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onEliminado = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null && viewableItems[0].index !== undefined) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const postsFiltrados = useMemo(
    () =>
      filtrarPorTexto(posts, busqueda, (p) => [p.texto, p.autor?.username, p.autor?.nombreCompleto]),
    [posts, busqueda]
  );

  if (loading && posts.length === 0) {
    return <SkeletonList />;
  }

  const buscando = busqueda.trim().length > 0;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: postsFiltrados.length === 0 || buscando ? colors.background : '#000' },
      ]}
    >
      <View onLayout={onSearchLayout}>
        <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
      </View>
      <FlatList
        style={styles.lista}
        data={postsFiltrados}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) =>
          buscando ? (
            <View style={{ minHeight: 120, justifyContent: 'center' }}>
              <ShortCard
                post={item}
                onEliminado={onEliminado}
                activo={false}
                height={Math.min(itemHeight, 280)}
              />
            </View>
          ) : (
            <ShortCard
              post={item}
              onEliminado={onEliminado}
              activo={index === activeIndex}
              height={itemHeight}
            />
          )
        }
        pagingEnabled={!buscando}
        showsVerticalScrollIndicator={false}
        snapToInterval={buscando ? undefined : itemHeight}
        decelerationRate="fast"
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={postsFiltrados.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="play-circle-outline"
            titulo={buscando ? t('common.sinResultadosBusqueda') : t('shorts.empty')}
            accionLabel={buscando ? undefined : t('feed.createTitle')}
            onAccion={buscando ? undefined : () => router.push('/(app)/publicaciones/nueva_video')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%' },
  lista: { flex: 1, width: '100%' },
});
