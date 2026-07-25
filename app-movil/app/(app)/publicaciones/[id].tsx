import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { publicacionesApi } from '../../../src/api/publicacionesApi';
import { PostCard } from '../../../src/components/PostCard';
import { Post } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function PublicacionDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      publicacionesApi.obtener(postId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setPost(res.data.post);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [postId])
  );

  const onEliminado = () => {
    router.replace('/(app)/(tabs)');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notFound || !post) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>{t('feed.postNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[{ padding: 16, backgroundColor: colors.background, flexGrow: 1 }, centeredContent]}>
      <PostCard post={post} onEliminado={onEliminado} />
    </ScrollView>
  );
}
