import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { donacionesApi } from '../../../src/api/donacionesApi';
import { CategoriaDonacion, Donacion } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FilterSelect } from '../../../src/components/ui/FilterSelect';
import { ListCard } from '../../../src/components/ui/ListCard';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { SwipeableSolapas } from '../../../src/components/ui/SwipeableSolapas';

type IconoChip = ChipOption<never>['icon'];
type Solapa = 'necesito' | 'ofrezco';

const CATEGORIAS: CategoriaDonacion[] = ['alimento', 'insumo', 'ropa'];

const ICONO_CAT: Record<CategoriaDonacion, IconoChip> = {
  alimento: 'nutrition-outline',
  insumo: 'cube-outline',
  ropa: 'shirt-outline',
};

/**
 * Necesito = ver lo que otros ofrecen (tipo ofrezco).
 * Ofrezco = mis publicaciones de oferta + crear.
 */
export default function DonacionesListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [solapa, setSolapa] = useState<Solapa>('necesito');
  const [categoria, setCategoria] = useState<CategoriaDonacion | null>(null);
  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Donacion[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback(
    (tab: Solapa, filtroCategoria: CategoriaDonacion | null, filtroRadio: RadioKm) => {
      setLoading(true);
      const soloMias = tab === 'ofrezco';
      donacionesApi
        .listar('ofrezco', filtroCategoria ?? undefined, filtroRadio, null, 15, soloMias)
        .then((res) => {
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
      cargar(solapa, categoria, radioKm);
    }, [solapa, categoria, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await donacionesApi.listar(
      'ofrezco',
      categoria ?? undefined,
      null,
      nextCursor,
      15,
      solapa === 'ofrezco'
    );
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await donacionesApi.listar(
      'ofrezco',
      categoria ?? undefined,
      radioKm,
      null,
      15,
      solapa === 'ofrezco'
    );
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opcionesCategoria: ChipOption<CategoriaDonacion | null>[] = [
    { valor: null, label: t('donaciones.todas'), icon: 'apps-outline' },
    ...CATEGORIAS.map((c) => ({
      valor: c,
      label: t(`donaciones.categoria.${c}`),
      icon: ICONO_CAT[c],
    })),
  ];

  const opcionesDistancia: ChipOption<RadioKm>[] = [
    { valor: 20, label: '20 km', icon: 'location-outline' },
    { valor: 50, label: '50 km', icon: 'location-outline' },
    { valor: 100, label: '100 km', icon: 'location-outline' },
    { valor: null, label: t('donaciones.todas'), icon: 'globe-outline' },
  ];

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(listados, busqueda, (item) => [
        item.descripcion,
        item.especie,
        item.zonaDescripcion,
        t(`donaciones.categoria.${item.categoria}`),
        item.autor.nombreCompleto,
        item.autor.username,
      ]),
    [listados, busqueda, t]
  );

  const buscando = busqueda.trim().length > 0;
  const crearTipo = solapa === 'necesito' ? 'necesito' : 'ofrezco';
  const crearLabel =
    solapa === 'necesito' ? t('donaciones.publicarNecesito') : t('donaciones.publicarOfrezco');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SwipeableSolapas
        tabs={[
          { key: 'necesito', label: t('donaciones.tipo.necesito') },
          { key: 'ofrezco', label: t('donaciones.tipo.ofrezco') },
        ]}
        activa={solapa}
        onChange={(key) => {
          setBusqueda('');
          setSolapa(key);
        }}
      >
        <View style={styles.filtros}>
          <FilterSelect
            label={t('common.tipo')}
            opciones={opcionesCategoria}
            seleccionado={categoria}
            onSelect={setCategoria}
          />
          <FilterSelect
            label={t('common.distancia')}
            opciones={opcionesDistancia}
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
            keyExtractor={(item) => String(item.donacionId)}
            refreshing={refrescando}
            onRefresh={onRefrescar}
            renderItem={({ item, index }) => (
              <ListCard
                index={index}
                titulo={item.descripcion}
                subtitulo={t(`donaciones.categoria.${item.categoria}`)}
                meta={item.distanciaKm !== null ? `${item.distanciaKm} km` : null}
                fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
                iconoFallback={ICONO_CAT[item.categoria]}
                badge={
                  item.esDueno ? (
                    <Badge label={t('donaciones.mia')} tono="accent" />
                  ) : undefined
                }
                onPress={() =>
                  router.push({ pathname: '/(app)/donaciones/[id]', params: { id: item.donacionId } })
                }
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="gift-outline"
                titulo={
                  buscando
                    ? t('common.sinResultadosBusqueda')
                    : solapa === 'ofrezco'
                      ? t('donaciones.emptyMisOfertas')
                      : t('donaciones.emptyOfertas')
                }
                accionLabel={buscando ? undefined : crearLabel}
                onAccion={
                  buscando
                    ? undefined
                    : () =>
                        router.push({
                          pathname: '/(app)/donaciones/nueva',
                          params: { tipo: crearTipo },
                        })
                }
              />
            }
            onEndReached={cargarMas}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              <>
                {filtrados.length > 0 ? (
                  <ListEndAddButton
                    label={crearLabel}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/donaciones/nueva',
                        params: { tipo: crearTipo },
                      })
                    }
                  />
                ) : null}
                {cargandoMas ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                ) : null}
              </>
            }
          />
        )}
      </SwipeableSolapas>
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
