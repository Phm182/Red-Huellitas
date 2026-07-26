import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../../src/api/campaniaApi';
import { LogoSiluetaNegra } from '../../../../src/components/LogoImage';
import { CampaniaInscripto } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';

export default function InscripcionesRecibidasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [inscriptos, setInscriptos] = useState<CampaniaInscripto[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      campaniaApi.inscripcionesRecibidas(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setInscriptos(res.data.inscriptos);
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
      data={inscriptos}
      keyExtractor={(i) => String(i.campaniaInscripcionId)}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('campanias.emptyInscriptos')}</Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: colors.border }]}>
          {item.usuario.avatarPath ? (
            <Image source={{ uri: rhMediaUrl(item.usuario.avatarPath) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
            </View>
          )}
          <View>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{item.usuario.nombreCompleto}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{item.usuario.username}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
