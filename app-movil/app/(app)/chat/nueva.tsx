import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { usuariosApi } from '../../../src/api/usuariosApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { UsuarioResumen } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/**
 * Empezar una conversación: se busca a la persona y se abre la charla vacía.
 *
 * Abrir NO crea la conversación en el servidor: nace recién cuando se manda el
 * primer mensaje, así que si se entra y se sale sin escribir no queda nada en
 * el listado de nadie.
 */
export default function NuevaConversacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) {
      setUsuarios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await usuariosApi.buscar(texto);
      if (res.success && res.data) {
        setUsuarios(res.data.usuarios.filter((u) => u.userId !== user?.userId));
      }
      setLoading(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, user?.userId]);

  const escribio = q.trim().length >= 2;

  return (
    <Atmosphere>
      <ListSearchBar value={q} onChangeText={setQ} placeholder={t('chat.buscarPersona')} />

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}

      <FlatList
        data={usuarios}
        keyExtractor={(u) => String(u.userId)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.lista, centeredContent, usuarios.length === 0 && styles.vacia]}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="search-outline"
              titulo={escribio ? t('busqueda.emptyResults') : t('chat.buscarPersonaAyuda')}
              fillScreen={false}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              hapticLeve();
              // `replace`: al volver atrás desde la charla no se regresa a esta
              // pantalla de búsqueda sino al listado de mensajes.
              router.replace({
                pathname: '/(app)/chat/[conversacionId]',
                params: { conversacionId: 'nuevo', userId: item.userId },
              });
            }}
            style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {item.avatarPath ? (
              <Image source={{ uri: rhAvatarUrl(item.avatarPath) }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                {item.nombreCompleto}
              </Text>
              {item.username ? (
                <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  @{item.username}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
      />
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 12, gap: 8, paddingBottom: 28, flexGrow: 1 },
  vacia: { justifyContent: 'flex-start' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radii.lg, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
