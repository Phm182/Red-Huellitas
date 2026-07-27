import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { notificacionesApi } from '../../../src/api/notificacionesApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Notificacion } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';

/** Ícono por tipo, para reconocer de un vistazo de qué se trata. */
const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  seguidor_nuevo: 'person-add-outline',
  seguimiento_solicitud: 'person-add-outline',
  seguimiento_aceptada: 'checkmark-circle-outline',
  match_nuevo: 'heart-outline',
  match_mensaje: 'chatbubble-outline',
  campania_nueva: 'megaphone-outline',
  perdido_cerca: 'alert-circle-outline',
  juego_recordatorio: 'game-controller-outline',
  cadena_continuada: 'link-outline',
  historia_respuesta: 'chatbubble-ellipses-outline',
};

function haceCuanto(iso: string, t: (k: string) => string): string {
  const ms = Date.now() - new Date(iso.replace(' ', 'T')).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  return `hace ${dias} d`;
}

export default function NotificacionesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [items, setItems] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      notificacionesApi.listar().then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setItems(res.data.notificaciones);
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
    const res = await notificacionesApi.listar(nextCursor);
    if (res.success && res.data) {
      setItems((prev) => [...prev, ...res.data!.notificaciones]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const marcarTodas = async () => {
    hapticLeve();
    await notificacionesApi.marcarLeidas();
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const abrir = async (n: Notificacion) => {
    hapticLeve();
    if (!n.leida) {
      void notificacionesApi.marcarLeidas({ notificacionId: n.notificacionId });
      setItems((prev) =>
        prev.map((x) => (x.notificacionId === n.notificacionId ? { ...x, leida: true } : x))
      );
    }
    if (n.ruta) router.push(n.ruta as never);
  };

  const hayNoLeidas = items.some((n) => !n.leida);

  if (loading) {
    return (
      <Atmosphere style={styles.centrado}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.notificacionId)}
        contentContainerStyle={[styles.lista, centeredContent, items.length === 0 && styles.vacia]}
        ListHeaderComponent={
          hayNoLeidas ? (
            <Pressable onPress={marcarTodas} style={styles.marcarTodas}>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
              <Text style={[type.label, { color: colors.primary }]}>{t('notificaciones.marcarLeidas')}</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            titulo={t('notificaciones.vacio')}
            descripcion={t('notificaciones.vacioDesc')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => abrir(item)}
            style={[
              styles.fila,
              {
                backgroundColor: item.leida ? colors.surface : colors.primarySoft,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.icono, { backgroundColor: colors.background }]}>
              <Ionicons
                name={ICONOS[item.tipo] ?? 'notifications-outline'}
                size={18}
                color={item.leida ? colors.textMuted : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titulo, { color: colors.text }]} numberOfLines={1}>
                {item.titulo}
              </Text>
              <Text style={[type.bodySm, { color: colors.textMuted }]} numberOfLines={2}>
                {item.cuerpo}
              </Text>
              <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {haceCuanto(item.createdAt, t)}
              </Text>
            </View>
            {item.ruta ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
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
  lista: { padding: 14, gap: 8, paddingBottom: 28 },
  vacia: { flexGrow: 1, justifyContent: 'center' },
  marcarTodas: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', padding: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
  },
  icono: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
