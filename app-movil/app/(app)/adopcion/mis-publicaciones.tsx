import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { Badge } from '../../../src/components/ui/Badge';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListCard } from '../../../src/components/ui/ListCard';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { Adopcion, Especie } from '../../../src/types';
import { especieI18nKey } from '../../../src/constants/especies';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

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

export default function MisPublicacionesAdopcionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [listados, setListados] = useState<Adopcion[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.listar(undefined, null, 50, true).then((res) => {
        if (activo && res.success && res.data) {
          setListados(res.data.listados);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, centeredContent, listados.length === 0 && styles.listEmpty]}
      data={listados}
      keyExtractor={(a) => String(a.adopcionId)}
      ListEmptyComponent={
        <EmptyState
          icon="paw-outline"
          titulo={t('adopcion.emptyMisPublicaciones')}
          accionLabel={t('adopcion.tituloNueva')}
          onAccion={() => router.push('/(app)/adopcion/nueva')}
        />
      }
      renderItem={({ item, index }) => {
        const especie = labelEspecie(item.especie, t);
        const edad = labelEdad(item, t);
        const subtitulo = [especie, item.raza, edad].filter(Boolean).join(' · ');
        const metaPartes = [
          item.zonaDescripcion,
          item.totalPostulaciones != null
            ? t('adopcion.postulacionesCount', { count: item.totalPostulaciones })
            : null,
        ].filter(Boolean);

        return (
          <ListCard
            index={index}
            titulo={item.nombre}
            subtitulo={subtitulo || null}
            meta={metaPartes.length > 0 ? metaPartes.join(' · ') : null}
            fotoUri={item.fotos[0] ? rhMediaUrl(item.fotos[0].path) : null}
            badge={
              <Badge
                label={t(`adopcion.estado.${item.estadoAdopcion}`)}
                tono={
                  item.estadoAdopcion === 'adoptado'
                    ? 'success'
                    : item.estadoAdopcion === 'en_proceso'
                      ? 'warning'
                      : 'primary'
                }
              />
            }
            onPress={() =>
              router.push({ pathname: '/(app)/adopcion/[id]', params: { id: item.adopcionId } })
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
});
