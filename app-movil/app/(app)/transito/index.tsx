import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { transitoApi } from '../../../src/api/transitoApi';
import { TipoTransito, Transito } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow, RadioChips, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>["icon"];

const TIPOS: TipoTransito[] = ['necesito', 'ofrezco'];

export default function TransitoListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoTransito | null>(null);
  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Transito[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtroTipo: TipoTransito | null, filtroRadio: RadioKm) => {
    setLoading(true);
    transitoApi.listar(filtroTipo ?? undefined, filtroRadio).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(tipo, radioKm);
    }, [tipo, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await transitoApi.listar(tipo ?? undefined, null, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await transitoApi.listar(tipo ?? undefined, radioKm);
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opcionesTipo: ChipOption<TipoTransito | null>[] = [
    { valor: null, label: t('transito.todas') },
    ...TIPOS.map((tp) => ({
      valor: tp,
      label: t(`transito.tipo.${tp}`),
      icon: (tp === 'necesito' ? 'hand-left-outline' : 'home-outline') as IconoChip,
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <ChipRow opciones={opcionesTipo} seleccionado={tipo} onSelect={setTipo} />
        <RadioChips valor={radioKm} onSelect={setRadioKm} labelTodos={t('transito.todas')} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
          keyExtractor={(item) => String(item.transitoId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              /* "Ofrezco tránsito" no tiene animal, así que no hay nombre: en
                 ese caso el título es la zona, porque repetir el tipo (que ya
                 está en el badge de la derecha) no aporta nada. */
              titulo={item.nombre ?? item.zonaDescripcion}
              subtitulo={item.nombre ? (item.raza ?? item.especie) : (item.especie ?? item.descripcion)}
              meta={item.distanciaKm !== null ? `${item.distanciaKm} km` : null}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              iconoFallback={item.tipo === 'necesito' ? 'hand-left-outline' : 'home-outline'}
              badge={
                <Badge
                  label={t(`transito.tipo.${item.tipo}`)}
                  tono={item.tipo === 'necesito' ? 'primary' : 'accent'}
                />
              }
              onPress={() =>
                router.push({ pathname: '/(app)/transito/[id]', params: { id: item.transitoId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              titulo={t('transito.emptyLista')}
              accionLabel={t('transito.tituloNueva')}
              onAccion={() => router.push('/(app)/transito/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/transito/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { paddingVertical: 6, gap: 4 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
