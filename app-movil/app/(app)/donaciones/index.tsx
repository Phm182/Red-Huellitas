import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { donacionesApi } from '../../../src/api/donacionesApi';
import { CategoriaDonacion, Donacion, TipoDonacion } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow, RadioChips, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>["icon"];

const TIPOS: TipoDonacion[] = ['necesito', 'ofrezco'];
const CATEGORIAS: CategoriaDonacion[] = ['alimento', 'insumo'];

export default function DonacionesListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoDonacion | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDonacion | null>(null);
  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Donacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback(
    (filtroTipo: TipoDonacion | null, filtroCategoria: CategoriaDonacion | null, filtroRadio: RadioKm) => {
      setLoading(true);
      donacionesApi.listar(filtroTipo ?? undefined, filtroCategoria ?? undefined, filtroRadio).then((res) => {
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
      cargar(tipo, categoria, radioKm);
    }, [tipo, categoria, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await donacionesApi.listar(tipo ?? undefined, categoria ?? undefined, null, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await donacionesApi.listar(tipo ?? undefined, categoria ?? undefined, radioKm);
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opcionesTipo: ChipOption<TipoDonacion | null>[] = [
    { valor: null, label: t('donaciones.todas') },
    ...TIPOS.map((tp) => ({
      valor: tp,
      label: t(`donaciones.tipo.${tp}`),
      icon: (tp === 'necesito' ? 'hand-left-outline' : 'gift-outline') as IconoChip,
    })),
  ];

  const opcionesCategoria: ChipOption<CategoriaDonacion | null>[] = [
    { valor: null, label: t('donaciones.todas') },
    ...CATEGORIAS.map((c) => ({
      valor: c,
      label: t(`donaciones.categoria.${c}`),
      icon: (c === 'alimento' ? 'nutrition-outline' : 'cube-outline') as IconoChip,
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <ChipRow opciones={opcionesTipo} seleccionado={tipo} onSelect={setTipo} />
        <ChipRow opciones={opcionesCategoria} seleccionado={categoria} onSelect={setCategoria} />
        <RadioChips valor={radioKm} onSelect={setRadioKm} labelTodos={t('donaciones.todas')} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
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
              iconoFallback={item.categoria === 'alimento' ? 'nutrition-outline' : 'cube-outline'}
              badge={
                <Badge
                  label={t(`donaciones.tipo.${item.tipo}`)}
                  tono={item.tipo === 'necesito' ? 'primary' : 'accent'}
                />
              }
              onPress={() =>
                router.push({ pathname: '/(app)/donaciones/[id]', params: { id: item.donacionId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="gift-outline"
              titulo={t('donaciones.emptyLista')}
              accionLabel={t('donaciones.tituloNueva')}
              onAccion={() => router.push('/(app)/donaciones/nueva')}
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
  filtros: { paddingVertical: 6, gap: 4 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
