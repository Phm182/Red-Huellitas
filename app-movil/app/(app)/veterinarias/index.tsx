import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { veterinariasApi } from '../../../src/api/veterinariasApi';
import { Veterinaria } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { rhMediaUrl } from '../../../src/utils/media';
import { RadioChips, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function VeterinariasListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Veterinaria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtroRadio: RadioKm) => {
    setLoading(true);
    veterinariasApi.listar(filtroRadio).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(radioKm);
    }, [radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await veterinariasApi.listar(null, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await veterinariasApi.listar(radioKm);
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(listados, busqueda, (item) => [
        item.nombre,
        item.descripcion,
        item.zonaDescripcion,
        item.telefono,
        item.horario,
      ]),
    [listados, busqueda]
  );

  const buscando = busqueda.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <RadioChips valor={radioKm} onSelect={setRadioKm} labelTodos={t('veterinarias.todas')} />
      </View>

      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={filtrados}
          keyExtractor={(item) => String(item.veterinariaId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.nombre}
              subtitulo={item.zonaDescripcion}
              meta={item.distanciaKm !== null ? `${item.distanciaKm} km` : null}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              iconoFallback="medkit-outline"
              onPress={() =>
                router.push({ pathname: '/(app)/veterinarias/[id]', params: { id: item.veterinariaId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="medkit-outline"
              titulo={buscando ? t('common.sinResultadosBusqueda') : t('veterinarias.emptyLista')}
              accionLabel={buscando ? undefined : t('veterinarias.tituloNueva')}
              onAccion={buscando ? undefined : () => router.push('/(app)/veterinarias/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <>
              {filtrados.length > 0 ? (
                <ListEndAddButton
                  label={t('veterinarias.tituloNueva')}
                  onPress={() => router.push('/(app)/veterinarias/nueva')}
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
  filtros: { paddingVertical: 6 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
