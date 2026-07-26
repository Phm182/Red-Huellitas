import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AdopcionPostulacionPropia } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

export default function MisPostulacionesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [postulaciones, setPostulaciones] = useState<AdopcionPostulacionPropia[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.misPostulaciones().then((res) => {
        if (activo && res.success && res.data) {
          setPostulaciones(res.data.postulaciones);
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
      contentContainerStyle={[styles.list, centeredContent, postulaciones.length === 0 && styles.listEmpty]}
      data={postulaciones}
      keyExtractor={(p) => String(p.adopcionPostulacionId)}
      ListEmptyComponent={
        <EmptyState icon="document-text-outline" titulo={t('adopcion.emptyMisPostulaciones')} />
      }
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
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('adopcion.estadoRevision.' + item.estadoRevision)}
            </Text>
          </View>
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
