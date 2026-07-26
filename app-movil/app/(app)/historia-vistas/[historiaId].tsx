import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { historiasApi } from '../../../src/api/historiasApi';
import { HistoriaVistaItem } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Skeleton } from '../../../src/components/ui/Skeleton';

/**
 * Quién vio una historia. El backend responde 403 si no sos el autor, así que
 * el error se muestra tal cual viene en vez de inventar una pantalla vacía.
 */
export default function HistoriaVistasScreen() {
  const { colors } = useTheme();
  const { historiaId } = useLocalSearchParams<{ historiaId: string }>();

  const [vistas, setVistas] = useState<HistoriaVistaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    historiasApi.vistas(Number(historiaId)).then((res) => {
      if (res.success && res.data) {
        setVistas(res.data.vistas);
        setError(null);
      } else {
        setError(res.message);
      }
      setLoading(false);
    });
  }, [historiaId]);

  if (loading) {
    return (
      <View style={[styles.skeletons, { backgroundColor: colors.background }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.skeletonFila}>
            <Skeleton width={44} height={44} radius={radii.pill} />
            <View style={{ flex: 1 }}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="30%" height={11} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState icon="lock-closed-outline" titulo={error} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.lista, centeredContent]}
      data={vistas}
      keyExtractor={(v) => String(v.userId)}
      ListHeaderComponent={
        vistas.length > 0 ? (
          <Text style={[type.section, { color: colors.textMuted, marginBottom: 12 }]}>
            {vistas.length} {vistas.length === 1 ? 'persona vio' : 'personas vieron'} tu historia
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="eye-outline"
          titulo="Todavía no la vio nadie"
          descripcion="Cuando alguien mire tu historia, va a aparecer acá."
        />
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
          <Pressable
            style={styles.fila}
            onPress={() => item.username && router.push(`/(app)/usuario/${item.username}`)}
          >
            {item.avatarPath ? (
              <Image
                source={{ uri: rhMediaUrl(item.avatarPath) }}
                style={styles.avatar}
                contentFit="cover"
                transition={180}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person" size={20} color={colors.accent} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[type.section, { color: colors.text }]} numberOfLines={1}>
                {item.nombreCompleto}
              </Text>
              <Text style={[type.caption, { color: colors.textMuted }]}>{item.vistaEn}</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  skeletons: { flex: 1, padding: 16, gap: 18 },
  skeletonFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lista: { padding: 16, flexGrow: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: { width: 44, height: 44, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
});
