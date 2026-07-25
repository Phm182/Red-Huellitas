import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { UsuarioResumen } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { LogoSiluetaNegra } from './LogoImage';

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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={usuarios}
      keyExtractor={(u) => String(u.userId)}
      ListEmptyComponent={<Text style={{ color: colors.textMuted, padding: 24 }}>{emptyLabel}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.row, { borderColor: colors.border }]}
          onPress={() => router.push(`/(app)/usuario/${item.username}`)}
        >
          {item.avatarPath ? (
            <Image source={{ uri: rhMediaUrl(item.avatarPath) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <LogoSiluetaNegra style={{ width: 18, height: 18 }} />
            </View>
          )}
          <View>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{item.nombreCompleto}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>@{item.username}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 24, paddingTop: 24, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
