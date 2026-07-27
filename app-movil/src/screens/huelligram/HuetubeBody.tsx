import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View, ViewToken } from 'react-native';
import { shortsApi } from '../../api/shortsApi';
import { ShortCard } from '../../components/ShortCard';
import { EmptyState, useContentAreaHeight } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Post } from '../../types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  /** Lo que ocupa el bloque de Huellitas + solapas por encima de este feed. */
  alturaExtra?: number;
};

export function HuetubeBody({ alturaExtra = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Sin descontar el encabezado de Huelligram cada video mediría de más y el
  // snap dejaría al siguiente cortado a mitad de pantalla.
  const itemHeight = useContentAreaHeight(alturaExtra);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      shortsApi.feed().then((res) => {
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

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <View style={[styles.list, { backgroundColor: posts.length === 0 ? colors.background : '#000' }]}>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) => (
          <ShortCard
            post={item}
            onEliminado={onEliminado}
            activo={index === activeIndex}
            height={itemHeight}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={posts.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={<EmptyState icon="play-circle-outline" titulo={t('shorts.empty')} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
});
