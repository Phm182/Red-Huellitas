import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { refugiosApi } from '../../../src/api/saludApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { RefugioResumen } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/**
 * Refugios y protectoras registradas.
 *
 * No hay tabla nueva: un refugio es un usuario con tipo de cuenta 'refugio',
 * que ya existía desde el registro pero no se usaba en ningún lado.
 */
export default function RefugiosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [items, setItems] = useState<RefugioResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      refugiosApi.listar().then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setItems(res.data.refugios);
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
    const res = await refugiosApi.listar(nextCursor);
    if (res.success && res.data) {
      setItems((prev) => [...prev, ...res.data!.refugios]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  if (loading) {
    return (
      <Atmosphere style={styles.centrado}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  const filtrados = filtrarPorTexto(items, busqueda, (r) => [
    r.nombreCompleto,
    r.username,
    r.zonaDescripcion,
  ]);
  const buscando = busqueda.trim().length > 0;

  return (
    <Atmosphere>
      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
      <FlatList
        data={filtrados}
        keyExtractor={(r) => String(r.userId)}
        contentContainerStyle={[styles.lista, centeredContent, filtrados.length === 0 && styles.vacia]}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            titulo={buscando ? t('common.sinResultadosBusqueda') : t('refugios.emptyLista')}
            descripcion={buscando ? undefined : t('refugios.emptyDesc')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              hapticLeve();
              if (item.username) router.push(`/(app)/usuario/${item.username}`);
            }}
            style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {item.avatarPath ? (
              <Image
                source={{ uri: rhAvatarUrl(item.avatarPath, item.avatarBust ?? undefined) }}
                style={styles.avatar}
                contentFit="cover"
                transition={160}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="business" size={20} color={colors.accent} />
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                {item.nombreCompleto}
              </Text>
              <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {item.username ? `@${item.username}` : ''}
                {item.zonaDescripcion ? ` · ${item.zonaDescripcion}` : ''}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
        }
      />
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  centrado: { alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 14, gap: 8, paddingBottom: 28, flexGrow: 1 },
  vacia: { justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radii.lg, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
