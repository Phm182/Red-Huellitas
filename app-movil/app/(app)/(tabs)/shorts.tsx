import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { shortsApi } from '../../../src/api/shortsApi';
import { ShortCard } from '../../../src/components/ShortCard';
import { Post } from '../../../src/types';
import { useTheme } from '../../../src/theme/ThemeProvider';

const { height: ALTURA_PANTALLA } = Dimensions.get('window');

export default function ShortsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
    return (
      <View style={[styles.centered, { backgroundColor: '#000' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.postId)}
        renderItem={({ item, index }) => (
          <ShortCard post={item} onEliminado={onEliminado} activo={index === activeIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ALTURA_PANTALLA}
        decelerationRate="fast"
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={[styles.centered, { height: ALTURA_PANTALLA }]}>
            <Text style={{ color: '#fff' }}>{t('shorts.empty')}</Text>
          </View>
        }
      />
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(app)/publicaciones/nueva_video')}
      >
        <Text style={{ color: colors.primaryText, fontSize: 24, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, backgroundColor: '#000' },
  fab: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
