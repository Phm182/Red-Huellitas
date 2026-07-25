import { useEffect, useState } from 'react';
import { seguimientoApi } from '../api/seguimientoApi';

/**
 * Lógica compartida de seguir/dejar de seguir a un usuario, extraída de
 * PerfilBody para reusar también en PostCard (cada card puede mostrar un
 * autor distinto, cada uno con su propio estado seguido/no-seguido).
 */
export function useSeguirToggle(userId: number, siguiendoInicial: boolean, onCambio?: (siguiendo: boolean) => void) {
  const [siguiendo, setSiguiendo] = useState(siguiendoInicial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSiguiendo(siguiendoInicial);
  }, [siguiendoInicial, userId]);

  const toggle = async () => {
    setBusy(true);
    const res = siguiendo ? await seguimientoApi.dejarDeSeguir(userId) : await seguimientoApi.seguir(userId);
    if (res.success) {
      const nuevoValor = !siguiendo;
      setSiguiendo(nuevoValor);
      onCambio?.(nuevoValor);
    }
    setBusy(false);
  };

  return { siguiendo, busy, toggle };
}
