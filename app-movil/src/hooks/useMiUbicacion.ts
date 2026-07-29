import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Fijacion = {
  lat: number;
  lng: number;
  /** Radio de incerteza en metros que informa el propio GPS. */
  precisionM: number;
  /** Cuándo se tomó. Un fix viejo puede ser de otra ciudad. */
  tomadaEn: number;
};

export type EstadoUbicacion = 'inactivo' | 'buscando' | 'lista' | 'denegada' | 'error';

/** Peor precisión que aceptamos como "ya está, no busques más". */
const PRECISION_BUENA_M = 35;

/** Cuánto seguimos escuchando antes de conformarnos con lo mejor que llegó. */
const ESPERA_MAXIMA_MS = 12000;

/** Un fix de hace más de 2 minutos no dice dónde estás ahora. */
const ANTIGUEDAD_MAXIMA_MS = 120000;

/**
 * La ubicación del usuario, buscando de verdad la buena.
 *
 * El problema que resuelve: `getCurrentPositionAsync()` devuelve **la primera
 * lectura que consigue**, y en Android esa casi siempre es la de red —torres y
 * wifi— con 500 a 2000 metros de error. Por eso el punto azul aparecía "a
 * varias cuadras": no era un bug de dibujo, era que le creíamos a la primera
 * respuesta.
 *
 * Acá se **escucha** el flujo de posiciones y se guarda sólo la mejor: el GPS
 * arranca impreciso y va afinando a medida que engancha satélites. Se corta
 * apenas baja de `PRECISION_BUENA_M`, o a los `ESPERA_MAXIMA_MS` con lo mejor
 * que haya llegado — quedarse escuchando para siempre gastaría batería sin que
 * el usuario gane nada.
 *
 * `precisionM` se expone a propósito: el mapa dibuja el halo de incerteza con
 * ese radio. Es más honesto que un punto nítido en un lugar que el teléfono no
 * sabe con esa exactitud.
 */
export function useMiUbicacion() {
  const [fijacion, setFijacion] = useState<Fijacion | null>(null);
  const [estado, setEstado] = useState<EstadoUbicacion>('inactivo');

  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const relojRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mejorRef = useRef<Fijacion | null>(null);
  const vivoRef = useRef(true);

  const cortar = useCallback(() => {
    suscripcionRef.current?.remove();
    suscripcionRef.current = null;
    if (relojRef.current) {
      clearTimeout(relojRef.current);
      relojRef.current = null;
    }
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      cortar();
    };
  }, [cortar]);

  /**
   * Pide (o vuelve a pedir) la ubicación.
   *
   * En web el permiso sólo se puede pedir desde un gesto del usuario, así que
   * esto se llama desde el botón y no al montar la pantalla.
   */
  const buscar = useCallback(async (): Promise<Fijacion | null> => {
    cortar();
    mejorRef.current = null;
    setEstado('buscando');

    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setEstado('denegada');
        return null;
      }
    } catch {
      setEstado('denegada');
      return null;
    }

    return new Promise<Fijacion | null>((resolver) => {
      let resuelto = false;

      const terminar = () => {
        if (resuelto) return;
        resuelto = true;
        cortar();

        const mejor = mejorRef.current;
        if (!vivoRef.current) {
          resolver(mejor);
          return;
        }
        if (mejor) {
          setFijacion(mejor);
          setEstado('lista');
        } else {
          setEstado('error');
        }
        resolver(mejor);
      };

      relojRef.current = setTimeout(terminar, ESPERA_MAXIMA_MS);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          // Sin intervalos largos: queremos las lecturas a medida que afinan,
          // y cortamos nosotros apenas alcanza.
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (pos) => {
          const nueva: Fijacion = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precisionM: pos.coords.accuracy ?? 9999,
            tomadaEn: pos.timestamp ?? Date.now(),
          };

          // Se descarta un fix viejo: en Android el primer callback suele ser
          // la última posición conocida, que puede ser de ayer y de otro barrio.
          if (Date.now() - nueva.tomadaEn > ANTIGUEDAD_MAXIMA_MS) return;

          const mejor = mejorRef.current;
          if (!mejor || nueva.precisionM < mejor.precisionM) {
            mejorRef.current = nueva;
            // Se va mostrando lo mejor que hay mientras sigue afinando: mejor
            // un punto aproximado ya en pantalla que nada durante 12 segundos.
            if (vivoRef.current) setFijacion(nueva);
          }

          if (nueva.precisionM <= PRECISION_BUENA_M) terminar();
        }
      )
        .then((sub) => {
          if (resuelto) {
            sub.remove();
            return;
          }
          suscripcionRef.current = sub;
        })
        .catch(() => {
          if (!resuelto) {
            resuelto = true;
            cortar();
            if (vivoRef.current) setEstado('error');
            resolver(null);
          }
        });
    });
  }, [cortar]);

  return { fijacion, estado, buscar };
}
