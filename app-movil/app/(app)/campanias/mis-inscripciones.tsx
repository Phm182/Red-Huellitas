import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { CampaniaInscripcionPropia } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function MisInscripcionesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [inscripciones, setInscripciones] = useState<CampaniaInscripcionPropia[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      campaniaApi.misInscripciones().then((res) => {
        if (activo && res.success && res.data) {
          setInscripciones(res.data.inscripciones);
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
      contentContainerStyle={[styles.list, centeredContent]}
      data={inscripciones}
      keyExtractor={(i) => String(i.campaniaInscripcionId)}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('campanias.emptyMisInscripciones')}</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/(app)/campanias/[id]', params: { id: item.campaniaId } })}
        >
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            {t(`campanias.tipo.${item.tipo}`).toUpperCase()}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{item.titulo}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {item.fechaDesde}{item.fechaHasta ? ` – ${item.fechaHasta}` : ''} · {item.zonaDescripcion}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
});
