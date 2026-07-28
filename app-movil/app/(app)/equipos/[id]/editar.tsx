import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { equiposApi, DatosEquipo } from '../../../../src/api/equiposApi';
import { Atmosphere } from '../../../../src/components/Atmosphere';
import { EquipoForm } from '../../../../src/components/EquipoForm';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { Equipo, TipoEquipo } from '../../../../src/types/equipo';

export default function EquipoEditarScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const equipoId = Number(id);

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [tipos, setTipos] = useState<TipoEquipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([equiposApi.obtener(equipoId), equiposApi.mis()]).then(([det, mis]) => {
      if (det.success && det.data) setEquipo(det.data.equipo);
      if (mis.success && mis.data) setTipos(mis.data.tipos);
      setCargando(false);
    });
  }, [equipoId]);

  if (cargando || !equipo) {
    return <SkeletonList />;
  }

  const guardar = async (datos: DatosEquipo) => {
    setGuardando(true);
    const res = await equiposApi.actualizar(equipoId, datos);
    setGuardando(false);

    if (res.success) {
      router.back();
      return;
    }
    Alert.alert(t('common.error'), res.message);
  };

  return (
    <Atmosphere>
      <EquipoForm
        tipos={tipos}
        guardando={guardando}
        labelGuardar={t('common.save')}
        inicial={{
          nombre: equipo.nombre,
          tipo: equipo.tipo.codigo,
          descripcion: equipo.descripcion ?? undefined,
          email: equipo.email ?? undefined,
          telefono: equipo.telefono ?? undefined,
          sitioWeb: equipo.sitioWeb ?? undefined,
          direccion: equipo.direccion ?? undefined,
          zonaDescripcion: equipo.zonaDescripcion ?? undefined,
          zonaLat: equipo.zonaLat,
          zonaLng: equipo.zonaLng,
        }}
        onSubmit={guardar}
      />
    </Atmosphere>
  );
}
