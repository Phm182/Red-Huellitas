import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { chatApi } from '../../../src/api/chatApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ChatConversacion } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

type Solapa = 'activa' | 'solicitud';

function hora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  if (mismoDia) return d.toTimeString().slice(0, 5);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Lista de charlas, con la bandeja de solicitudes en una solapa aparte.
 *
 * La simpleza de WhatsApp: avatar, nombre, última línea y hora. Lo del MSN es
 * el mensaje personal debajo del nombre.
 */
export default function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [solapa, setSolapa] = useState<Solapa>('activa');
  const [items, setItems] = useState<ChatConversacion[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback((cual: Solapa) => {
    setLoading(true);
    chatApi.conversaciones(cual).then((res) => {
      if (res.success && res.data) setItems(res.data.conversaciones);
      setLoading(false);
    });
    // El número de la solapa de solicitudes se pide siempre, para que se vea
    // que hay algo esperando aunque estés parado en las charlas.
    chatApi.conversaciones('solicitud').then((res) => {
      if (res.success && res.data) setPendientes(res.data.conversaciones.length);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(solapa);
    }, [cargar, solapa])
  );

  return (
    <Atmosphere>
      <View style={[styles.solapas, { borderBottomColor: colors.border }]}>
        {(['activa', 'solicitud'] as Solapa[]).map((s) => {
          const activa = solapa === s;
          return (
            <Pressable
              key={s}
              onPress={() => {
                hapticLeve();
                setSolapa(s);
              }}
              style={[styles.solapa, activa && { borderBottomColor: colors.primary }]}
            >
              <Text
                style={[styles.solapaLabel, { color: activa ? colors.primary : colors.textMuted }]}
              >
                {s === 'activa' ? t('chat.charlas') : t('chat.solicitudes')}
              </Text>
              {s === 'solicitud' && pendientes > 0 ? (
                <View style={[styles.pill, { backgroundColor: colors.danger }]}>
                  <Text style={styles.pillTexto}>{pendientes}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.conversacionId)}
          contentContainerStyle={[styles.lista, centeredContent, items.length === 0 && styles.vacia]}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              titulo={solapa === 'activa' ? t('chat.vacio') : t('chat.sinSolicitudes')}
              descripcion={solapa === 'activa' ? t('chat.vacioDesc') : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                hapticLeve();
                router.push(`/(app)/chat/${item.conversacionId}` as never);
              }}
              style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {item.otro.avatarPath ? (
                <Image
                  source={{ uri: rhAvatarUrl(item.otro.avatarPath, item.otro.avatarBust ?? undefined) }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={160}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                  {item.otro.nombreCompleto}
                </Text>
                {item.otro.mensajePersonal ? (
                  <Text style={[type.caption, { color: colors.accent }]} numberOfLines={1}>
                    {item.otro.mensajePersonal}
                  </Text>
                ) : null}
                <Text style={[type.bodySm, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.ultimoTipo === 'zumbido' ? `⚡ ${t('chat.zumbido')}` : item.ultimoTexto ?? ''}
                </Text>
              </View>

              <View style={styles.derecha}>
                <Text style={[type.caption, { color: colors.textMuted }]}>{hora(item.ultimoMensajeEn)}</Text>
                {item.noLeidos > 0 ? (
                  <View style={[styles.pill, { backgroundColor: colors.primary }]}>
                    <Text style={styles.pillTexto}>{item.noLeidos}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  solapas: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  solapa: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  solapaLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  lista: { padding: 12, gap: 8, paddingBottom: 28 },
  vacia: { flexGrow: 1, justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radii.lg, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 15 },
  derecha: { alignItems: 'flex-end', gap: 6 },
  pill: { minWidth: 20, height: 20, borderRadius: radii.pill, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  pillTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
});
