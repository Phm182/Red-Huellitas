import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { equiposApi, DatosEquipo } from '../../../src/api/equiposApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EquipoForm } from '../../../src/components/EquipoForm';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { TipoEquipo } from '../../../src/types/equipo';

/**
 * Alta de un equipo.
 *
 * El backend rechaza los nombres repetidos y devuelve el id del que ya
 * existe: dos equipos con el mismo nombre son casi siempre la misma
 * organización cargada dos veces, así que en vez de dejarlo pasar se ofrece
 * ir al que ya está y pedir unirse.
 */
export default function EquipoNuevoScreen() {
  const { t } = useTranslation();
  const [tipos, setTipos] = useState<TipoEquipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    equiposApi.mis().then((res) => {
      if (res.success && res.data) setTipos(res.data.tipos);
      setCargando(false);
    });
  }, []);

  const crear = async (datos: DatosEquipo) => {
    setGuardando(true);
    const res = await equiposApi.crear(datos);
    setGuardando(false);

    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/equipos/[id]', params: { id: res.data.equipo.equipoId } });
      return;
    }

    const existente = (res.data as { equipoIdExistente?: number } | null)?.equipoIdExistente;
    if (existente) {
      Alert.alert(t('equipos.duplicadoTitulo'), res.message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('equipos.verElQueExiste'),
          onPress: () => router.replace({ pathname: '/(app)/equipos/[id]', params: { id: existente } }),
        },
      ]);
      return;
    }

    Alert.alert(t('common.error'), res.message);
  };

  if (cargando) {
    return <SkeletonList />;
  }

  return (
    <Atmosphere>
      <EquipoForm
        tipos={tipos}
        guardando={guardando}
        labelGuardar={t('equipos.crear')}
        onSubmit={crear}
      />
    </Atmosphere>
  );
}
