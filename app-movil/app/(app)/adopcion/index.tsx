import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { Adopcion, Especie } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];

const ICONO_ESPECIE: Record<Especie, IconoChip> = {
  perro: 'paw-outline',
  gato: 'paw-outline',
  otro: 'ellipsis-horizontal-outline',
};

export default function AdopcionListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [especie, setEspecie] = useState<Especie | null>(null);
  const [listados, setListados] = useState<Adopcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: Especie | null) => {
    setLoading(true);
    adopcionApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(especie);
    }, [especie, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await adopcionApi.listar(especie ?? undefined, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await adopcionApi.listar(especie ?? undefined);
    if (res.success && res.data) {
      setListados(res.data.listados);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const opciones: ChipOption<Especie | null>[] = [
    { valor: null, label: t('adopcion.todas') },
    ...ESPECIES.map((e) => ({
      valor: e,
      label: t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`),
      icon: ICONO_ESPECIE[e],
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/adopcion/mis-postulaciones')}>
          <Ionicons name="document-text-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('adopcion.misPostulaciones')}</Text>
        </Pressable>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/adopcion/favoritos')}>
          <Ionicons name="heart-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('adopcion.misFavoritos')}</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        <ChipRow opciones={opciones} seleccionado={especie} onSelect={setEspecie} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
          keyExtractor={(a) => String(a.adopcionId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => (
            <ListCard
              index={index}
              titulo={item.nombre}
              subtitulo={item.raza ?? item.especie}
              fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
              badge={
                item.estadoAdopcion !== 'disponible' ? (
                  <Badge label={t(`adopcion.estado.${item.estadoAdopcion}`)} tono="warning" />
                ) : item.esFavorito ? (
                  <Ionicons name="heart" size={18} color={colors.primary} />
                ) : undefined
              }
              onPress={() =>
                router.push({ pathname: '/(app)/adopcion/[id]', params: { id: item.adopcionId } })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              titulo={t('adopcion.emptyLista')}
              accionLabel={t('adopcion.tituloNueva')}
              onAccion={() => router.push('/(app)/adopcion/nueva')}
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
  atajos: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filtros: { paddingVertical: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
