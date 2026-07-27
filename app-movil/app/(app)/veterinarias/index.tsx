import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { veterinariasApi } from '../../../src/api/veterinariasApi';
import { Veterinaria } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { RadioChips, RadioKm } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function VeterinariasListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [radioKm, setRadioKm] = useState<RadioKm>(20);
  const [listados, setListados] = useState<Veterinaria[]>([]);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <RadioChips valor={radioKm} onSelect={setRadioKm} labelTodos={t('veterinarias.todas')} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
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
              titulo={t('veterinarias.emptyLista')}
              accionLabel={t('veterinarias.tituloNueva')}
              onAccion={() => router.push('/(app)/veterinarias/nueva')}
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
  filtros: { paddingVertical: 6 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
