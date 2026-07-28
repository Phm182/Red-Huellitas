import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { Adopcion, Especie } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { rhMediaUrl } from '../../../src/utils/media';
import { Badge } from '../../../src/components/ui/Badge';
import { ChipOption, ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';

/** El nombre de icono que acepta ChipOption (Ionicons). */
type IconoChip = ChipOption<never>['icon'];

const ICONO_ESPECIE: Record<Especie, IconoChip> = {
  perro: 'paw-outline',
  gato: 'paw-outline',
  conejo: 'paw-outline',
  ave: 'paw-outline',
  pez: 'paw-outline',
  hamster: 'paw-outline',
  cobayo: 'paw-outline',
  tortuga: 'paw-outline',
  huron: 'paw-outline',
  otro: 'ellipsis-horizontal-outline',
};

function labelEspecie(especie: Especie, t: (k: string) => string): string {
  return t(especieI18nKey(especie));
}

function labelEdad(item: Adopcion, t: (k: string) => string): string | null {
  const partes: string[] = [];
  if (item.edadAnios != null) {
    partes.push(`${item.edadAnios} ${t('mascotas.edadAnios').toLowerCase()}`);
  }
  if (item.edadMeses != null && item.edadMeses > 0) {
    partes.push(`${item.edadMeses} ${t('mascotas.edadMeses').toLowerCase()}`);
  }
  return partes.length > 0 ? partes.join(' ') : null;
}

export default function AdopcionListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [especie, setEspecie] = useState<Especie | null>(null);
  const [listados, setListados] = useState<Adopcion[]>([]);
  const [busqueda, setBusqueda] = useState('');
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
      label: labelEspecie(e, t),
      icon: ICONO_ESPECIE[e],
    })),
  ];

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(listados, busqueda, (a) => [
        a.nombre,
        a.raza,
        a.razaTexto,
        a.especie,
        labelEspecie(a.especie, t),
        a.descripcion,
        a.zonaDescripcion,
        a.autor.nombreCompleto,
        a.autor.username,
      ]),
    [listados, busqueda, t]
  );

  const buscando = busqueda.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable style={styles.atajo} onPress={() => router.push('/(app)/adopcion/mis-publicaciones')}>
          <Ionicons name="list-outline" size={15} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('adopcion.misPublicaciones')}</Text>
        </Pressable>
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

      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={filtrados}
          keyExtractor={(a) => String(a.adopcionId)}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          renderItem={({ item, index }) => {
            const especieLabel = labelEspecie(item.especie, t);
            const edad = labelEdad(item, t);
            const subtitulo = [especieLabel, item.raza, edad].filter(Boolean).join(' · ');

            return (
              <ListCard
                index={index}
                titulo={item.nombre}
                subtitulo={subtitulo || null}
                meta={item.zonaDescripcion}
                fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
                iconoFallback={ICONO_ESPECIE[item.especie]}
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
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              titulo={buscando ? t('common.sinResultadosBusqueda') : t('adopcion.emptyLista')}
              accionLabel={buscando ? undefined : t('adopcion.tituloNueva')}
              onAccion={buscando ? undefined : () => router.push('/(app)/adopcion/nueva')}
            />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <>
              {filtrados.length > 0 ? (
                <ListEndAddButton
                  label={t('adopcion.tituloNueva')}
                  onPress={() => router.push('/(app)/adopcion/nueva')}
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
  atajos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filtros: { paddingVertical: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
