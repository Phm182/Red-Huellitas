import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UsuarioResumen } from '../types';
import { radii } from '../theme/elevation';
import { centeredContent } from '../theme/layout';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface ListaUsuariosProps {
  cargar: () => Promise<UsuarioResumen[]>;
  emptyLabel: string;
}

export function ListaUsuarios({ cargar, emptyLabel }: ListaUsuariosProps) {
  const { colors } = useTheme();
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      cargar().then((lista) => {
        if (activo) {
          setUsuarios(lista);
          setLoading(false);
        }
      });
      return () => {
        activo = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.skeletons, { backgroundColor: colors.background }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.skeletonFila}>
            <Skeleton width={46} height={46} radius={radii.pill} />
            <View style={{ flex: 1 }}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={11} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, centeredContent]}
      data={usuarios}
      keyExtractor={(u) => String(u.userId)}
      ListEmptyComponent={<EmptyState icon="people-outline" titulo={emptyLabel} />}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              { borderColor: colors.border, backgroundColor: pressed ? colors.backgroundAlt : 'transparent' },
            ]}
            onPress={() => router.push(`/(app)/usuario/${item.username}`)}
          >
            {item.avatarPath ? (
              <Image
                source={{ uri: rhMediaUrl(item.avatarPath) }}
                style={styles.avatar}
                contentFit="cover"
                transition={180}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person" size={20} color={colors.accent} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={[type.section, { color: colors.text }]} numberOfLines={1}>
                {item.nombreCompleto}
              </Text>
              <Text style={[type.bodySm, { color: colors.textMuted }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  skeletons: { flex: 1, padding: 16, gap: 18 },
  skeletonFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { padding: 16, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  avatar: { width: 46, height: 46, borderRadius: radii.pill },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
