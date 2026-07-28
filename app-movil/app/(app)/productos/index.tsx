import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { productosApi } from '../../../src/api/productosApi';
import { Especie, Producto, ProductoCategoriaItem, TipoListado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhMediaUrl } from '../../../src/utils/media';
import { ChipOption, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FilterSelect } from '../../../src/components/ui/FilterSelect';
import { ListCard } from '../../../src/components/ui/ListCard';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const TIPOS: TipoListado[] = ['producto', 'servicio'];
import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';

const ICONO_TIPO: Record<TipoListado, IconoChip> = {
  producto: 'cube-outline',
  servicio: 'construct-outline',
};

export default function ProductosListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [categorias, setCategorias] = useState<ProductoCategoriaItem[]>([]);
  const [tipoListado, setTipoListado] = useState<TipoListado | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [radioKm, setRadioKm] = useState<RadioKm>(null);

  const [listados, setListados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useEffect(() => {
    productosApi.categorias().then((res) => {
      if (res.success && res.data) {
        setCategorias(res.data.categorias);
      }
    });
  }, []);

  const cargar = useCallback(
    (tl: TipoListado | null, cat: number | null, esp: Especie | null, radio: RadioKm) => {
      setLoading(true);
      productosApi.listar(tl ?? undefined, cat ?? undefined, esp ?? undefined, radio).then((res) => {
        if (res.success && res.data) {
          setListados(res.data.listados);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      cargar(tipoListado, categoriaId, especie, radioKm);
    }, [tipoListado, categoriaId, especie, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await productosApi.listar(
      tipoListado ?? undefined,
      categoriaId ?? undefined,
      especie ?? undefined,
      null,
      nextCursor
    );
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await productosApi.listar(
      tipoListado ?? undefined,
      categoriaId ?? undefined,
      especie ?? undefined,
      radioKm
    );
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opcionesTipo: ChipOption<TipoListado | null>[] = [
    { valor: null, label: t('productos.todos') },
    ...TIPOS.map((tp) => ({
      valor: tp,
      label: t(`productos.tipoListado.${tp}`),
      icon: ICONO_TIPO[tp],
    })),
  ];

  const opcionesCategoria: ChipOption<number | null>[] = [
    { valor: null, label: t('productos.todos') },
    ...categorias.map((c) => ({ valor: c.categoriaId, label: c.nombre })),
  ];

  const opcionesEspecie: ChipOption<Especie | null>[] = [
    { valor: null, label: t('productos.todos') },
    ...ESPECIES.map((e) => ({
      valor: e,
      label: t(especieI18nKey(e)),
    })),
  ];

  /**
   * Favorito desde la lista, sin entrar a la publicación.
   *
   * Se actualiza el estado local antes de que conteste el servidor: esperar la
   * respuesta para pintar el corazón hace que el toque se sienta roto. Si falla,
   * se vuelve atrás.
   */
  const alternarFavorito = useCallback(async (item: Producto) => {
    hapticLeve();
    const eraFavorito = item.esFavorito;
    setListados((prev) =>
      prev.map((p) => (p.productoId === item.productoId ? { ...p, esFavorito: !eraFavorito } : p))
    );
    const res = eraFavorito
      ? await productosApi.favoritoQuitar(item.productoId)
      : await productosApi.favoritoAgregar(item.productoId);
    if (!res.success) {
      setListados((prev) =>
        prev.map((p) => (p.productoId === item.productoId ? { ...p, esFavorito: eraFavorito } : p))
      );
    }
  }, []);

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(listados, busqueda, (item) => [
        item.nombre,
        item.descripcion,
        item.categoria?.nombre,
        item.zonaDescripcion,
        t(`productos.tipoListado.${item.tipoListado}`),
        item.autor.nombreCompleto,
        item.autor.username,
      ]),
    [listados, busqueda, t]
  );

  const buscando = busqueda.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/productos/favoritos')}>
          <Ionicons name="heart-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('productos.misFavoritos')}</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        <FilterSelect
          label={t('common.tipo')}
          opciones={opcionesTipo}
          seleccionado={tipoListado}
          onSelect={setTipoListado}
        />
        {categorias.length > 0 ? (
          <FilterSelect
            label={t('common.categoria')}
            opciones={opcionesCategoria}
            seleccionado={categoriaId}
            onSelect={setCategoriaId}
          />
        ) : null}
        <FilterSelect
          label={t('common.especie')}
          opciones={opcionesEspecie}
          seleccionado={especie}
          onSelect={setEspecie}
        />
        <FilterSelect
          label={t('common.distancia')}
          opciones={[
            { valor: 20 as RadioKm, label: '20 km', icon: 'location-outline' },
            { valor: 50 as RadioKm, label: '50 km', icon: 'location-outline' },
            { valor: 100 as RadioKm, label: '100 km', icon: 'location-outline' },
            { valor: null as RadioKm, label: t('productos.todos'), icon: 'globe-outline' },
          ]}
          seleccionado={radioKm}
          onSelect={setRadioKm}
        />
      </View>

      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={filtrados}
          keyExtractor={(item) => String(item.productoId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.nombre}
              subtitulo={`$${item.precio.toLocaleString()}`}
              // El tipo va primero: sin él, un servicio y un producto se ven
              // igual en la lista y el precio se lee distinto en cada caso.
              meta={`${t(`productos.tipoListado.${item.tipoListado}`)} · ${item.categoria?.nombre ?? ''}${
                item.distanciaKm !== null ? ` · ${item.distanciaKm} km` : ''
              }`}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              iconoFallback={ICONO_TIPO[item.tipoListado]}
              badge={
                <Pressable
                  onPress={() => alternarFavorito(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t(item.esFavorito ? 'productos.quitarFavorito' : 'productos.agregarFavorito')}
                >
                  <Ionicons
                    name={item.esFavorito ? 'heart' : 'heart-outline'}
                    size={20}
                    color={item.esFavorito ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              }
              onPress={() =>
                router.push({ pathname: '/(app)/productos/[id]', params: { id: item.productoId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              titulo={buscando ? t('common.sinResultadosBusqueda') : t('productos.emptyLista')}
              accionLabel={buscando ? undefined : t('productos.tituloNueva')}
              onAccion={buscando ? undefined : () => router.push('/(app)/productos/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <>
              {filtrados.length > 0 ? (
                <ListEndAddButton
                  label={t('productos.tituloNueva')}
                  onPress={() => router.push('/(app)/productos/nueva')}
                />
              ) : null}
              {cargandoMas ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
              ) : null}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  atajos: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
