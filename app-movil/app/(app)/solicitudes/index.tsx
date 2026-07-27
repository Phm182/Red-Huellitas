import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { solicitudesApi } from '../../../src/api/notificacionesApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SolicitudSeguimiento } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticExito, hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/** Quiénes pidieron seguirte, cuando tu cuenta es privada. */
export default function SolicitudesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [items, setItems] = useState<SolicitudSeguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolviendo, setResolviendo] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      solicitudesApi.listar().then((res) => {
        if (!activo) return;
        if (res.success && res.data) setItems(res.data.solicitudes);
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const resolver = async (s: SolicitudSeguimiento, accion: 'aceptar' | 'rechazar') => {
    if (resolviendo !== null) return;
    setResolviendo(s.solicitudId);
    const res = await solicitudesApi.resolver(s.solicitudId, accion);
    setResolviendo(null);
    if (res.success) {
      if (accion === 'aceptar') hapticExito();
      else hapticLeve();
      // Se saca de la lista en vez de marcarla: ya no hay nada que decidir.
      setItems((prev) => prev.filter((x) => x.solicitudId !== s.solicitudId));
    }
  };

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
        keyExtractor={(s) => String(s.solicitudId)}
        contentContainerStyle={[styles.lista, centeredContent, items.length === 0 && styles.vacia]}
        ListEmptyComponent={
          <EmptyState icon="person-add-outline" titulo={t('chat.sinSolicitudes')} />
        }
        renderItem={({ item }) => (
          <View style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={styles.usuario}
              onPress={() => item.usuario.username && router.push(`/(app)/usuario/${item.usuario.username}`)}
            >
              {item.usuario.avatarPath ? (
                <Image
                  source={{ uri: rhAvatarUrl(item.usuario.avatarPath, item.usuario.avatarBust ?? undefined) }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={160}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                  {item.usuario.nombreCompleto}
                </Text>
                <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.usuario.username ? `@${item.usuario.username}` : ''}
                  {item.usuario.zonaDescripcion ? ` · ${item.usuario.zonaDescripcion}` : ''}
                </Text>
              </View>
            </Pressable>

            <View style={styles.acciones}>
              <Pressable
                onPress={() => resolver(item, 'aceptar')}
                disabled={resolviendo !== null}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.btnTexto, { color: colors.primaryText }]}>{t('chat.aceptar')}</Text>
              </Pressable>
              <Pressable
                onPress={() => resolver(item, 'rechazar')}
                disabled={resolviendo !== null}
                style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.btnTexto, { color: colors.textMuted }]}>{t('chat.rechazar')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  centrado: { alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 14, gap: 10, paddingBottom: 28 },
  vacia: { flexGrow: 1, justifyContent: 'center' },
  fila: { borderWidth: 1, borderRadius: radii.lg, padding: 12, gap: 10 },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 15 },
  acciones: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: radii.md, paddingVertical: 9, alignItems: 'center' },
  btnTexto: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
