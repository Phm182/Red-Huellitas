import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { productosApi } from '../../../src/api/productosApi';
import { Especie, Producto, ProductoCategoriaItem, TipoListado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { ChipOption, ChipRow, RadioChips, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const TIPOS: TipoListado[] = ['producto', 'servicio'];
const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];

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
      label: t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`),
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/productos/favoritos')}>
          <Ionicons name="heart-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('productos.misFavoritos')}</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        <ChipRow opciones={opcionesTipo} seleccionado={tipoListado} onSelect={setTipoListado} />
        {categorias.length > 0 ? (
          <ChipRow opciones={opcionesCategoria} seleccionado={categoriaId} onSelect={setCategoriaId} />
        ) : null}
        <ChipRow opciones={opcionesEspecie} seleccionado={especie} onSelect={setEspecie} />
        <RadioChips valor={radioKm} onSelect={setRadioKm} labelTodos={t('productos.todos')} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
          keyExtractor={(item) => String(item.productoId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.nombre}
              subtitulo={`$${item.precio.toLocaleString()}`}
              meta={`${item.categoria?.nombre ?? ''}${item.distanciaKm !== null ? ` · ${item.distanciaKm} km` : ''}`}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              iconoFallback={ICONO_TIPO[item.tipoListado]}
              badge={item.esFavorito ? <Ionicons name="heart" size={18} color={colors.primary} /> : undefined}
              onPress={() =>
                router.push({ pathname: '/(app)/productos/[id]', params: { id: item.productoId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              titulo={t('productos.emptyLista')}
              accionLabel={t('productos.tituloNueva')}
              onAccion={() => router.push('/(app)/productos/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <>
              {listados.length > 0 ? (
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
  filtros: { paddingVertical: 6, gap: 4 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
