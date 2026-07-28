import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { transitoApi } from '../../../src/api/transitoApi';
import { Transito } from '../../../src/types';
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

type Solapa = 'buscar' | 'ofrecer';

/**
 * Buscar = ver hogares que otros ofrecen (tipo ofrezco).
 * Ofrecer = mis publicaciones de oferta + crear.
 */
export default function TransitoListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [solapa, setSolapa] = useState<Solapa>('buscar');
  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Transito[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((tab: Solapa, filtroRadio: RadioKm) => {
    setLoading(true);
    const soloMias = tab === 'ofrecer';
    transitoApi.listar('ofrezco', filtroRadio, null, 15, soloMias).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(solapa, radioKm);
    }, [solapa, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await transitoApi.listar('ofrezco', null, nextCursor, 15, solapa === 'ofrecer');
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await transitoApi.listar('ofrezco', radioKm, null, 15, solapa === 'ofrecer');
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opcionesDistancia: ChipOption<RadioKm>[] = [
    { valor: 20, label: '20 km', icon: 'location-outline' },
    { valor: 50, label: '50 km', icon: 'location-outline' },
    { valor: 100, label: '100 km', icon: 'location-outline' },
    { valor: null, label: t('transito.todas'), icon: 'globe-outline' },
  ];

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(listados, busqueda, (item) => [
        item.nombre,
        item.raza,
        item.razaTexto,
        item.especie,
        item.descripcion,
        item.zonaDescripcion,
        item.autor.nombreCompleto,
        item.autor.username,
      ]),
    [listados, busqueda]
  );

  const buscando = busqueda.trim().length > 0;
  const crearTipo = solapa === 'buscar' ? 'necesito' : 'ofrezco';
  const crearLabel =
    solapa === 'buscar' ? t('transito.publicarNecesito') : t('transito.publicarOfrezco');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SwipeableSolapas
        tabs={[
          { key: 'buscar', label: t('transito.solapaBuscar') },
          { key: 'ofrecer', label: t('transito.solapaOfrecer') },
        ]}
        activa={solapa}
        onChange={(key) => {
          setBusqueda('');
          setSolapa(key);
        }}
      >
        <View style={styles.filtros}>
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
            keyExtractor={(item) => String(item.transitoId)}
            refreshing={refrescando}
            onRefresh={onRefrescar}
            renderItem={({ item, index }) => (
              <ListCard
                index={index}
                titulo={item.nombre ?? item.zonaDescripcion}
                subtitulo={item.nombre ? (item.raza ?? item.especie) : (item.especie ?? item.descripcion)}
                meta={item.distanciaKm !== null ? `${item.distanciaKm} km` : null}
                fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
                iconoFallback="home-outline"
                badge={
                  item.esDueno ? <Badge label={t('transito.mia')} tono="accent" /> : undefined
                }
                onPress={() =>
                  router.push({ pathname: '/(app)/transito/[id]', params: { id: item.transitoId } })
                }
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="home-outline"
                titulo={
                  buscando
                    ? t('common.sinResultadosBusqueda')
                    : solapa === 'ofrecer'
                      ? t('transito.emptyMisOfertas')
                      : t('transito.emptyOfertas')
                }
                accionLabel={buscando ? undefined : crearLabel}
                onAccion={
                  buscando
                    ? undefined
                    : () =>
                        router.push({
                          pathname: '/(app)/transito/nueva',
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
                        pathname: '/(app)/transito/nueva',
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
