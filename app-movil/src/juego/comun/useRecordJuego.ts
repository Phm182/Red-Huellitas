import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { hueplayApi } from '../../api/hueplayApi';

/**
 * Récord personal en un juego de puntaje, para mostrarlo arriba de todo antes
 * de arrancar — 0 si nunca se jugó. Se re-pide cada vez que la pantalla vuelve
 * a foco (después de jugar una partida, el récord recién guardado tiene que
 * verse la próxima vez que se entra) y cada vez que cambia `codigo` (los
 * juegos con variantes, como HueDoku, tienen un récord por variante).
 */
export function useRecordJuego(codigo: string): number | null {
  const [record, setRecord] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      hueplayApi.record(codigo).then((res) => {
        if (activo && res.success && res.data) setRecord(res.data.record);
      });
      return () => {
        activo = false;
      };
    }, [codigo])
  );

  return record;
}
