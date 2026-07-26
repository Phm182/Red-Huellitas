import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../../src/api/adopcionApi';
import { LogoSiluetaNegra } from '../../../../src/components/LogoImage';
import { AdopcionPostulacionRecibida } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';

export default function PostulacionesRecibidasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [postulaciones, setPostulaciones] = useState<AdopcionPostulacionRecibida[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.postulacionesRecibidas(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setPostulaciones(res.data.postulaciones);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, centeredContent]}
      data={postulaciones}
      keyExtractor={(p) => String(p.adopcionPostulacionId)}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('adopcion.emptyPostulaciones')}</Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.autorRow}>
            {item.adoptante.avatarPath ? (
              <Image source={{ uri: rhMediaUrl(item.adoptante.avatarPath) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
              </View>
            )}
            <View>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.adoptante.nombreCompleto}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{item.adoptante.username}</Text>
            </View>
          </View>

          {item.respuestas.map((r, index) => (
            <View key={index} style={styles.respuestaBlock}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{r.preguntaTexto}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.respuesta}</Text>
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  respuestaBlock: { marginBottom: 8 },
});
