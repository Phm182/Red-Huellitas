import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { notificacionesApi } from '../api/notificacionesApi';
import { useAuth } from '../auth/AuthProvider';
import { Contadores } from '../types';

const VACIO: Contadores = {
  notificaciones: 0,
  mascotas: 0,
  mensajes: 0,
  solicitudesChat: 0,
  solicitudesSeguir: 0,
};

const INTERVALO_MS = 30000;

/**
 * `useContadores()` sólo se usa una vez (en `FloatingDock`, el dock persiste
 * en toda la app), así que su estado vive ahí — pero cualquier OTRA pantalla
 * que cambie el estado de notificaciones (marcar leídas, entrar con "limpiar
 * al entrar" activado) necesita poder avisarle "actualizate ya" sin esperar
 * el intervalo de 30s. Sin esto la campanita seguía mostrando el número
 * viejo hasta 30 segundos después de salir de la pantalla de notificaciones.
 * Un pub-sub mínimo a nivel de módulo alcanza — no hace falta un Context para
 * un solo evento tan simple.
 */
const listeners = new Set<() => void>();

export function refrescarContadoresGlobal(): void {
  listeners.forEach((fn) => fn());
}

/**
 * Los números de las burbujas del riel de flotantes.
 *
 * Un solo endpoint y un solo intervalo para los tres badges: son burbujas que
 * se refrescan seguido y tres requests por refresco sería plata tirada. Se
 * frena cuando la app pasa a segundo plano y se refresca al volver, para no
 * seguir consultando con la pantalla apagada.
 */
export function useContadores(): { contadores: Contadores; refrescar: () => void } {
  const { token } = useAuth();
  const [contadores, setContadores] = useState<Contadores>(VACIO);

  const refrescar = useCallback(() => {
    if (!token) {
      setContadores(VACIO);
      return;
    }
    notificacionesApi.contadores().then((res) => {
      if (res.success && res.data) setContadores(res.data);
    });
  }, [token]);

  useEffect(() => {
    refrescar();
    listeners.add(refrescar);
    const id = setInterval(refrescar, INTERVALO_MS);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescar();
    });
    return () => {
      listeners.delete(refrescar);
      clearInterval(id);
      sub.remove();
    };
  }, [refrescar]);

  return { contadores, refrescar };
}
