import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { perdidosApi } from '../../../src/api/perdidosApi';
import { Perdido, TipoPerdido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const TIPOS: TipoPerdido[] = ['perdido', 'encontrado'];

const ICONO_TIPO: Record<TipoPerdido, IconoChip> = {
  perdido: 'alert-circle-outline',
  encontrado: 'checkmark-circle-outline',
};

export default function PerdidosListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoPerdido | null>(null);
  const [reportes, setReportes] = useState<Perdido[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: TipoPerdido | null) => {
    setLoading(true);
    perdidosApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setReportes(res.data.reportes);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(tipo);
    }, [tipo, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await perdidosApi.listar(tipo ?? undefined, nextCursor);
    if (res.success && res.data) {
      setReportes((prev) => [...prev, ...res.data!.reportes]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await perdidosApi.listar(tipo ?? undefined);
    if (res.success && res.data) {
      setReportes(res.data.reportes);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opciones: ChipOption<TipoPerdido | null>[] = [
    { valor: null, label: t('perdidos.todas') },
    ...TIPOS.map((tp) => ({
      valor: tp,
      label: t(`perdidos.tipo.${tp}`),
      icon: ICONO_TIPO[tp],
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <ChipRow opciones={opciones} seleccionado={tipo} onSelect={setTipo} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={reportes}
          keyExtractor={(p) => String(p.perdidoId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.nombre}
              subtitulo={item.raza ?? item.especie}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              iconoFallback={ICONO_TIPO[item.tipo]}
              badge={
                <Badge
                  label={t(`perdidos.tipo.${item.tipo}`)}
                  tono={item.tipo === 'perdido' ? 'danger' : 'success'}
                />
              }
              onPress={() =>
                router.push({ pathname: '/(app)/perdidos/[id]', params: { id: item.perdidoId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              titulo={t('perdidos.emptyLista')}
              accionLabel={t('perdidos.tituloNueva')}
              onAccion={() => router.push('/(app)/perdidos/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/perdidos/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { paddingVertical: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
