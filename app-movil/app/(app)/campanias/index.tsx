import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { Campania, TipoCampania } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const TIPOS: TipoCampania[] = ['castracion', 'vacunacion'];

const ICONO_TIPO: Record<TipoCampania, IconoChip> = {
  castracion: 'medkit-outline',
  vacunacion: 'bandage-outline',
};

export default function CampaniasListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoCampania | null>(null);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: TipoCampania | null) => {
    setLoading(true);
    campaniaApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setCampanias(res.data.campanias);
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
    const res = await campaniaApi.listar(tipo ?? undefined, nextCursor);
    if (res.success && res.data) {
      setCampanias((prev) => [...prev, ...res.data!.campanias]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await campaniaApi.listar(tipo ?? undefined);
    if (res.success && res.data) {
      setCampanias(res.data.campanias);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opciones: ChipOption<TipoCampania | null>[] = [
    { valor: null, label: t('campanias.todas') },
    ...TIPOS.map((tp) => ({
      valor: tp,
      label: t(`campanias.tipo.${tp}`),
      icon: ICONO_TIPO[tp],
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/campanias/mis-inscripciones')}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('campanias.misInscripciones')}</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        <ChipRow opciones={opciones} seleccionado={tipo} onSelect={setTipo} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={campanias}
          keyExtractor={(c) => String(c.campaniaId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.titulo}
              subtitulo={`${item.fechaDesde}${item.fechaHasta ? ` – ${item.fechaHasta}` : ''} · ${item.zonaDescripcion}`}
              meta={
                item.requiereInscripcion
                  ? t('campanias.cupoDisponibleLabel', { cupo: item.cupoDisponible ?? '∞' })
                  : null
              }
              iconoFallback={ICONO_TIPO[item.tipo]}
              badge={<Badge label={t(`campanias.tipo.${item.tipo}`)} tono="accent" />}
              onPress={() =>
                router.push({ pathname: '/(app)/campanias/[id]', params: { id: item.campaniaId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="megaphone-outline"
              titulo={t('campanias.emptyLista')}
              accionLabel={t('campanias.tituloNueva')}
              onAccion={() => router.push('/(app)/campanias/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/campanias/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  atajos: { paddingHorizontal: 16, paddingTop: 12 },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filtros: { paddingVertical: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
