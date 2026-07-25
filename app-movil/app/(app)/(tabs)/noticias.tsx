import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { noticiasApi } from '../../../src/api/noticiasApi';
import { NoticiaExternaCard } from '../../../src/components/NoticiaExternaCard';
import { PostCard } from '../../../src/components/PostCard';
import { NoticiaExterna, Post, TipoUsuarioCatalogoItem } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

const GENERAL = '__general__';

export default function NoticiasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipos, setTipos] = useState<TipoUsuarioCatalogoItem[]>([]);
  const [subtab, setSubtab] = useState<string>(GENERAL);

  const [noticias, setNoticias] = useState<NoticiaExterna[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      noticiasApi.tipos().then((res) => {
        if (res.success && res.data) {
          setTipos(res.data.tipos);
        }
      });
    }, [])
  );

  const cargar = useCallback((tab: string) => {
    setLoading(true);
    setNextCursor(null);
    if (tab === GENERAL) {
      noticiasApi.listar().then((res) => {
        if (res.success && res.data) {
          setNoticias(res.data.noticias);
          setPosts([]);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
    } else {
      noticiasApi.listarPorTipo(tab).then((res) => {
        if (res.success && res.data) {
          setPosts(res.data.posts);
          setNoticias([]);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(subtab);
    }, [subtab, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    if (subtab === GENERAL) {
      const res = await noticiasApi.listar(nextCursor);
      if (res.success && res.data) {
        setNoticias((prev) => [...prev, ...res.data!.noticias]);
        setNextCursor(res.data.nextCursor);
      }
    } else {
      const res = await noticiasApi.listarPorTipo(subtab, nextCursor);
      if (res.success && res.data) {
        setPosts((prev) => [...prev, ...res.data!.posts]);
        setNextCursor(res.data.nextCursor);
      }
    }
    setCargandoMas(false);
  };

  const onEliminado = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subtabsBar}>
        <Pressable
          onPress={() => setSubtab(GENERAL)}
          style={[
            styles.subtabChip,
            { borderColor: colors.primary, backgroundColor: subtab === GENERAL ? colors.primary : 'transparent' },
          ]}
        >
          <Text style={{ color: subtab === GENERAL ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('noticias.subtabGeneral')}
          </Text>
        </Pressable>
        {tipos.map((tipo) => {
          const activo = subtab === tipo.codigo;
          return (
            <Pressable
              key={tipo.codigo}
              onPress={() => setSubtab(tipo.codigo)}
              style={[
                styles.subtabChip,
                { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`tipoUsuario.${tipo.codigo}`, tipo.nombre)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : subtab === GENERAL ? (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={noticias}
          keyExtractor={(n) => String(n.noticiaExternaId)}
          renderItem={({ item }) => <NoticiaExternaCard noticia={item} />}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('noticias.emptyGeneral')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={posts}
          keyExtractor={(p) => String(p.postId)}
          renderItem={({ item }) => <PostCard post={item} onEliminado={onEliminado} />}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('noticias.emptyTipo')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtabsBar: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10 },
  subtabChip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  list: { padding: 16 },
});
