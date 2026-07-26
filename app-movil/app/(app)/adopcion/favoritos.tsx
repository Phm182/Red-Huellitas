import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { Adopcion } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

export default function AdopcionFavoritosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [favoritos, setFavoritos] = useState<Adopcion[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.misFavoritos().then((res) => {
        if (activo && res.success && res.data) {
          setFavoritos(res.data.favoritos);
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
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, centeredContent, favoritos.length === 0 && styles.listEmpty]}
      data={favoritos}
      keyExtractor={(a) => String(a.adopcionId)}
      ListEmptyComponent={<EmptyState icon="heart-outline" titulo={t('adopcion.emptyFavoritos')} />}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/(app)/adopcion/[id]', params: { id: item.adopcionId } })}
        >
          {item.fotos[0] ? (
            <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, { backgroundColor: colors.background }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.nombre}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.raza ?? item.especie}</Text>
          </View>
          <Text style={{ fontSize: 18 }}>❤️</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  foto: { width: 56, height: 56, borderRadius: 10 },
});
