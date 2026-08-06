import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/**
 * Hacia dónde apunta el teléfono, en grados desde el norte.
 *
 * **Por qué existe y no alcanza con lo que trae el mapa.** El puntito de
 * MapLibre orienta su flecha con `coords.heading`, que es el rumbo que informa
 * el GPS: la dirección en la que te estás *desplazando*. Parado no hay
 * desplazamiento, así que ese valor llega nulo y la flecha se queda clavada por
 * más que gires el teléfono en la mano. Lo que hace falta ahí es la brújula
 * —el magnetómetro—, que sí sabe hacia dónde mira el aparato aunque esté
 * quieto.
 *
 * Se prefiere `trueHeading` (norte geográfico, que es el que usa el mapa) y se
 * cae a `magHeading` (norte magnético) cuando el sistema todavía no calculó la
 * declinación: entre los dos hay unos pocos grados de diferencia, mucho menos
 * que dejar la flecha sin girar.
 *
 * Devuelve `null` mientras no haya lectura, para poder no dibujar la flecha en
 * vez de dibujarla apuntando al norte por defecto, que sería mentir.
 */
export function useBrujula(activo: boolean): number | null {
  const [grados, setGrados] = useState<number | null>(null);

  useEffect(() => {
    if (!activo) {
      setGrados(null);
      return;
    }

    let vivo = true;
    let suscripcion: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const s = await Location.watchHeadingAsync((h) => {
          if (!vivo) return;
          const valor = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (typeof valor === 'number' && !Number.isNaN(valor)) setGrados(valor);
        });
        if (vivo) suscripcion = s;
        else s.remove();
      } catch {
        // Sin magnetómetro (pasa en emuladores y en tablets baratas) no hay
        // brújula y listo: se queda en null y no se dibuja la flecha.
      }
    })();

    return () => {
      vivo = false;
      suscripcion?.remove();
    };
  }, [activo]);

  return grados;
}
