import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { noticiasApi } from '../../api/noticiasApi';
import { NoticiaExternaCard } from '../../components/NoticiaExternaCard';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoticiaExterna, Post, TipoUsuarioCatalogoItem } from '../../types';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';

const GENERAL = '__general__';

export function NoticiasBody() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipos, setTipos] = useState<TipoUsuarioCatalogoItem[]>([]);
  const [subtab, setSubtab] = useState<string>(GENERAL);

  const [noticias, setNoticias] = useState<NoticiaExterna[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pedidoRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      noticiasApi.tipos().then((res) => {
        if (res.success && res.data) {
          setTipos(res.data.tipos);
        }
      });
    }, [])
  );

  const cargar = useCallback((tab: string, opts?: { soft?: boolean }) => {
    const pedido = ++pedidoRef.current;
    if (opts?.soft) {
      setRefrescando(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setNextCursor(null);

    const fin = () => {
      if (pedido !== pedidoRef.current) return;
      setLoading(false);
      setRefrescando(false);
    };

    if (tab === GENERAL) {
      noticiasApi.listar().then((res) => {
        if (pedido !== pedidoRef.current) return;
        if (res.success && res.data) {
          setNoticias(res.data.noticias);
          setPosts([]);
          setNextCursor(res.data.nextCursor);
          setError(null);
        } else {
          setNoticias([]);
          setError(res.message || t('noticias.emptyGeneral'));
        }
        fin();
      });
    } else {
      noticiasApi.listarPorTipo(tab).then((res) => {
        if (pedido !== pedidoRef.current) return;
        if (res.success && res.data) {
          setPosts(res.data.posts);
          setNoticias([]);
          setNextCursor(res.data.nextCursor);
          setError(null);
        } else {
          setPosts([]);
          setError(res.message || t('noticias.emptyTipo'));
        }
        fin();
      });
    }
  }, [t]);

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
          contentContainerStyle={[styles.list, centeredContent, noticias.length === 0 && styles.listEmpty]}
          data={noticias}
          keyExtractor={(n) => String(n.noticiaExternaId)}
          renderItem={({ item, index }) => <NoticiaExternaCard noticia={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              titulo={error || t('noticias.emptyGeneral')}
              accionLabel={t('common.retry')}
              onAccion={() => cargar(GENERAL)}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          refreshing={refrescando}
          onRefresh={() => cargar(GENERAL, { soft: true })}
        />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent, posts.length === 0 && styles.listEmpty]}
          data={posts}
          keyExtractor={(p) => String(p.postId)}
          renderItem={({ item }) => <PostCard post={item} onEliminado={onEliminado} />}
          ListEmptyComponent={
            <EmptyState
              icon="paw-outline"
              titulo={error || t('noticias.emptyTipo')}
              accionLabel={t('common.retry')}
              onAccion={() => cargar(subtab)}
            />
          }
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
  // `flexShrink: 0` + `zIndex`: sin eso la fila se achicaba al crecer la lista
  // y las tarjetas de noticias le pasaban por encima.
  subtabsBar: { flexGrow: 0, flexShrink: 0, zIndex: 2, paddingHorizontal: 12, paddingVertical: 10 },
  subtabChip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
});
