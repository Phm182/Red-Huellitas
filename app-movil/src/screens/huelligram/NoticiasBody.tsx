import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { campaniaApi } from '../../api/campaniaApi';
import { noticiasApi } from '../../api/noticiasApi';
import { NoticiaExternaCard } from '../../components/NoticiaExternaCard';
import { PostCard } from '../../components/PostCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListSearchBar } from '../../components/ui/ListSearchBar';
import { Campania, NoticiaExterna, Post } from '../../types';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { filtrarPorTexto } from '../../utils/filtrarPorTexto';
import { Badge } from '../../components/ui/Badge';
import { ListCard } from '../../components/ui/ListCard';

type Subtab = 'general' | 'campanias' | 'refugios';

/**
 * Solapa Noticias de Huelligram.
 * General = noticias externas; Campañas = campañas de salud;
 * Refugios = publicaciones de cuentas refugio/protectora.
 */
export function NoticiasBody() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [subtab, setSubtab] = useState<Subtab>('general');

  const [noticias, setNoticias] = useState<NoticiaExterna[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const pedidoRef = useRef(0);
  const tieneDatos = useRef(false);

  const cargar = useCallback(
    (tab: Subtab, opts?: { soft?: boolean }) => {
      const pedido = ++pedidoRef.current;
      const soft = opts?.soft && tieneDatos.current;
      if (soft) {
        setRefrescando(true);
      } else if (!tieneDatos.current) {
        setLoading(true);
      }
      setError(null);
      setNextCursor(null);

      const fin = () => {
        if (pedido !== pedidoRef.current) return;
        setLoading(false);
        setRefrescando(false);
      };

      if (tab === 'general') {
        noticiasApi.listar().then((res) => {
          if (pedido !== pedidoRef.current) return;
          if (res.success && res.data) {
            setNoticias(res.data.noticias);
            setPosts([]);
            setCampanias([]);
            setNextCursor(res.data.nextCursor);
            setError(null);
            tieneDatos.current = true;
          } else {
            setNoticias([]);
            setError(res.message || t('noticias.emptyGeneral'));
          }
          fin();
        });
      } else if (tab === 'campanias') {
        campaniaApi.listar().then((res) => {
          if (pedido !== pedidoRef.current) return;
          if (res.success && res.data) {
            setCampanias(res.data.campanias);
            setNoticias([]);
            setPosts([]);
            setNextCursor(res.data.nextCursor);
            setError(null);
            tieneDatos.current = true;
          } else {
            setCampanias([]);
            setError(res.message || t('noticias.emptyCampanias'));
          }
          fin();
        });
      } else {
        noticiasApi.listarPorTipo('refugio').then((res) => {
          if (pedido !== pedidoRef.current) return;
          if (res.success && res.data) {
            setPosts(res.data.posts);
            setNoticias([]);
            setCampanias([]);
            setNextCursor(res.data.nextCursor);
            setError(null);
            tieneDatos.current = true;
          } else {
            setPosts([]);
            setError(res.message || t('noticias.emptyRefugio'));
          }
          fin();
        });
      }
    },
    [t]
  );

  useEffect(() => {
    tieneDatos.current = false;
    setBusqueda('');
    cargar(subtab);
  }, [subtab, cargar]);

  useFocusEffect(
    useCallback(() => {
      if (tieneDatos.current) {
        cargar(subtab, { soft: true });
      }
    }, [subtab, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || busqueda.trim()) return;
    setCargandoMas(true);
    if (subtab === 'general') {
      const res = await noticiasApi.listar(nextCursor);
      if (res.success && res.data) {
        setNoticias((prev) => [...prev, ...res.data!.noticias]);
        setNextCursor(res.data.nextCursor);
      }
    } else if (subtab === 'campanias') {
      const res = await campaniaApi.listar(undefined, nextCursor);
      if (res.success && res.data) {
        setCampanias((prev) => [...prev, ...res.data!.campanias]);
        setNextCursor(res.data.nextCursor);
      }
    } else {
      const res = await noticiasApi.listarPorTipo('refugio', nextCursor);
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

  const noticiasFiltradas = useMemo(
    () =>
      filtrarPorTexto(noticias, busqueda, (n) => [n.titulo, n.resumen, n.fuente, n.urlOriginal]),
    [noticias, busqueda]
  );

  const postsFiltrados = useMemo(
    () =>
      filtrarPorTexto(posts, busqueda, (p) => [p.texto, p.autor?.username, p.autor?.nombreCompleto]),
    [posts, busqueda]
  );

  const campaniasFiltradas = useMemo(
    () =>
      filtrarPorTexto(campanias, busqueda, (c) => [
        c.titulo,
        c.descripcion,
        c.zonaDescripcion,
        t(`campanias.tipo.${c.tipo}`),
        c.autor.nombreCompleto,
        c.autor.username,
      ]),
    [campanias, busqueda, t]
  );

  const vacio = loading && !tieneDatos.current;

  const chips: { key: Subtab; label: string }[] = [
    { key: 'general', label: t('noticias.subtabGeneral') },
    { key: 'campanias', label: t('noticias.subtabCampanias') },
    { key: 'refugios', label: t('noticias.subtabRefugios') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, width: '100%' }}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subtabsBar}
          contentContainerStyle={styles.subtabsContent}
        >
          {chips.map((chip) => {
            const activo = subtab === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setSubtab(chip.key)}
                style={[
                  styles.subtabChip,
                  {
                    borderColor: colors.primary,
                    backgroundColor: activo ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => {
            setBuscarAbierto((v) => {
              if (v) setBusqueda('');
              return !v;
            });
          }}
          style={[
            styles.buscarBtn,
            {
              borderColor: buscarAbierto || busqueda ? colors.primary : colors.border,
              backgroundColor: buscarAbierto || busqueda ? colors.primarySoft : colors.surface,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.buscarEnLista')}
        >
          <Ionicons
            name={buscarAbierto ? 'close' : 'search-outline'}
            size={18}
            color={buscarAbierto || busqueda ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>

      {buscarAbierto ? <ListSearchBar value={busqueda} onChangeText={setBusqueda} /> : null}

      {vacio ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : subtab === 'general' ? (
        <FlatList
          style={styles.lista}
          contentContainerStyle={[
            styles.list,
            centeredContent,
            noticiasFiltradas.length === 0 && styles.listEmpty,
          ]}
          data={noticiasFiltradas}
          keyExtractor={(n) => String(n.noticiaExternaId)}
          renderItem={({ item, index }) => <NoticiaExternaCard noticia={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              titulo={
                busqueda.trim() ? t('common.sinResultadosBusqueda') : error || t('noticias.emptyGeneral')
              }
              accionLabel={busqueda.trim() ? undefined : t('common.retry')}
              onAccion={busqueda.trim() ? undefined : () => cargar('general')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => cargar('general', { soft: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : subtab === 'campanias' ? (
        <FlatList
          style={styles.lista}
          contentContainerStyle={[
            styles.list,
            centeredContent,
            campaniasFiltradas.length === 0 && styles.listEmpty,
          ]}
          data={campaniasFiltradas}
          keyExtractor={(c) => String(c.campaniaId)}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.titulo}
              subtitulo={t(`campanias.tipo.${item.tipo}`)}
              meta={item.zonaDescripcion}
              iconoFallback={item.tipo === 'vacunacion' ? 'bandage-outline' : 'medkit-outline'}
              badge={
                item.requiereInscripcion ? (
                  <Badge label={t('campanias.requiereInscripcionLabel')} tono="accent" />
                ) : undefined
              }
              onPress={() =>
                router.push({ pathname: '/(app)/campanias/[id]', params: { id: item.campaniaId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              titulo={
                busqueda.trim()
                  ? t('common.sinResultadosBusqueda')
                  : error || t('noticias.emptyCampanias')
              }
              accionLabel={busqueda.trim() ? undefined : t('campanias.tituloNueva')}
              onAccion={
                busqueda.trim() ? undefined : () => router.push('/(app)/campanias/nueva')
              }
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => cargar('campanias', { soft: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          style={styles.lista}
          contentContainerStyle={[
            styles.list,
            centeredContent,
            postsFiltrados.length === 0 && styles.listEmpty,
          ]}
          data={postsFiltrados}
          keyExtractor={(p) => String(p.postId)}
          renderItem={({ item, index }) => (
            <PostCard post={item} onEliminado={onEliminado} index={index} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              titulo={
                busqueda.trim() ? t('common.sinResultadosBusqueda') : error || t('noticias.emptyRefugio')
              }
              accionLabel={busqueda.trim() ? undefined : t('common.retry')}
              onAccion={busqueda.trim() ? undefined : () => cargar('refugios')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => cargar('refugios', { soft: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    marginBottom: 4,
    flexGrow: 0,
    flexShrink: 0,
    zIndex: 2,
  },
  subtabsBar: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  subtabsContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  buscarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  subtabChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    alignSelf: 'center',
  },
  lista: { flex: 1, width: '100%' },
  list: { padding: 14, paddingBottom: 28, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
