import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Fijacion = {
  lat: number;
  lng: number;
  /** Radio de incerteza en metros que informa el propio GPS. */
  precisionM: number;
  /** Cuándo se tomó. Un fix viejo puede ser de otra ciudad. */
  tomadaEn: number;
};

export type EstadoUbicacion =
  | 'inactivo'
  | 'buscando'
  /** Hay posición y el GPS se sigue escuchando. */
  | 'siguiendo'
  /** Hay posición pero con mucho error: alcanza para la zona, no para la esquina. */
  | 'vaga'
  | 'denegada'
  /** Android dio permiso pero sólo aproximado (el switch de "ubicación precisa"). */
  | 'solo_aproximada'
  /** El GPS del teléfono está apagado. */
  | 'servicios_apagados'
  | 'error';

/** Por debajo de esto ya podemos mostrar el punto sin aclarar nada. */
const PRECISION_BUENA_M = 30;

/**
 * A partir de acá el punto ya no dice "estás parado acá" sino "estás en esta
 * zona", y hay que avisarlo.
 *
 * **No se descarta la lectura.** Se probó rechazarlas y el resultado fue peor:
 * en una notebook la ubicación sale de wifi o de la IP, con kilómetros de
 * error, así que el filtro dejaba la pantalla sin ningún punto para siempre.
 * Mejor mostrar lo que hay con su halo de incerteza —que se ve enorme, y eso
 * ya comunica el problema— y seguir buscando algo mejor.
 */
const PRECISION_VAGA_M = 200;

/** Un fix de hace más de 30 s no dice dónde estás ahora si venís caminando. */
const ANTIGUEDAD_MAXIMA_MS = 30000;

/**
 * La ubicación del usuario: la busca bien y después la sigue.
 *
 * **Por qué no alcanza con pedirla una vez.** `getCurrentPositionAsync()`
 * devuelve la primera lectura que consigue, y en Android esa casi siempre es
 * la de red —torres y wifi— con cientos de metros de error. Por eso el punto
 * caía lejos: no era un problema de dibujo, era creerle a la primera
 * respuesta.
 *
 * Acá se **escucha** el flujo de posiciones con `BestForNavigation`. El GPS
 * arranca impreciso y va afinando a medida que engancha satélites: la regla es
 * mostrar siempre lo mejor que llegó y no retroceder nunca a algo peor, que es
 * lo que hacía saltar el punto de vuelta lejos.
 *
 * **Y después no se corta.** Mientras la pantalla esté abierta el watch sigue
 * vivo con `distanceInterval: 4`, así que si el usuario camina, el punto
 * camina. Cortar a los pocos segundos dejaba un punto congelado donde estabas
 * cuando abriste el mapa.
 *
 * Los estados `solo_aproximada` y `servicios_apagados` existen para poder
 * decirle a la persona *qué* tiene que tocar: en Android 12+ se puede dar
 * permiso de ubicación y aun así tener apagado el switch de "ubicación
 * precisa", y ahí ninguna cantidad de reintentos mejora nada.
 */
export function useMiUbicacion() {
  const [fijacion, setFijacion] = useState<Fijacion | null>(null);
  const [estado, setEstado] = useState<EstadoUbicacion>('inactivo');

  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const mejorRef = useRef<Fijacion | null>(null);
  const vivoRef = useRef(true);

  const cortar = useCallback(() => {
    suscripcionRef.current?.remove();
    suscripcionRef.current = null;
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      cortar();
    };
  }, [cortar]);

  /**
   * Pide permiso y arranca a seguir la ubicación.
   *
   * En web el permiso sólo se puede pedir desde un gesto del usuario, así que
   * esto se llama también desde el botón y no sólo al montar la pantalla.
   *
   * Devuelve la primera fijación usable, para que quien llama pueda centrar el
   * mapa; después sigue actualizando por su cuenta.
   */
  const buscar = useCallback(async (): Promise<Fijacion | null> => {
    cortar();
    setEstado('buscando');

    let permiso: Location.LocationPermissionResponse;
    try {
      permiso = await Location.requestForegroundPermissionsAsync();
    } catch {
      setEstado('denegada');
      return null;
    }

    if (!permiso.granted) {
      setEstado('denegada');
      return null;
    }

    // Android 12+: se puede tener permiso y aun así estar en "aproximada".
    if (permiso.android?.accuracy === 'coarse') {
      setEstado('solo_aproximada');
      // No se corta: con aproximada igual se muestra algo, pero avisado.
    }

    if (Platform.OS === 'android') {
      try {
        // Ofrece prender el modo de alta precisión (Google Play Services).
        // Es el diálogo del sistema; si lo rechaza, se sigue con lo que haya.
        await Location.enableNetworkProviderAsync();
      } catch {
        // Lo rechazó o no hay Play Services.
      }
    }

    // Sólo en el teléfono: en el navegador no existe el concepto de "servicios
    // de ubicación del sistema", y preguntarlo devolvía `false` y cortaba la
    // búsqueda antes de empezar.
    if (Platform.OS !== 'web') {
      try {
        if (!(await Location.hasServicesEnabledAsync())) {
          setEstado('servicios_apagados');
          return null;
        }
      } catch {
        // Si no se puede consultar, se intenta igual.
      }
    }

    return new Promise<Fijacion | null>((resolver) => {
      let entregado = false;

      // Si en 20 s no llegó nada usable, se contesta para que quien esperaba
      // no quede colgado. El watch **sigue vivo**: puede mejorar después.
      const reloj = setTimeout(() => {
        if (entregado) return;
        entregado = true;
        if (vivoRef.current && !mejorRef.current) setEstado('error');
        resolver(mejorRef.current);
      }, 20000);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          // Cada 4 metros: es lo que hace que el punto acompañe al que camina
          // sin despertar el GPS por cada temblor de la mano.
          distanceInterval: 4,
          timeInterval: 1000,
          mayShowUserSettingsDialog: true,
        },
        (pos) => {
          const nueva: Fijacion = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precisionM: pos.coords.accuracy ?? 9999,
            tomadaEn: pos.timestamp ?? Date.now(),
          };

          const mejor = mejorRef.current;

          // El primer callback de Android suele ser la última posición
          // conocida, que puede ser de otro barrio y de hace horas. Se ignora
          // sólo si ya tenemos algo: si es lo único que hay, algo es mejor que
          // nada y el halo va a mostrar cuánto no sabemos.
          if (mejor && Date.now() - nueva.tomadaEn > ANTIGUEDAD_MAXIMA_MS) return;

          // Teniendo ya una lectura buena no se retrocede a una peor: eso es
          // lo que hacía saltar el punto de vuelta lejos. Pero si la que hay
          // es mala, cualquier cosa nueva sirve —incluso otra mala, porque al
          // menos es de ahora.
          const retrocede =
            mejor !== null &&
            mejor.precisionM <= PRECISION_BUENA_M &&
            nueva.precisionM > mejor.precisionM * 2;
          if (retrocede) return;

          mejorRef.current = nueva;
          if (vivoRef.current) {
            setFijacion(nueva);
            setEstado((prev) => {
              // Un permiso aproximado no se "arregla" con una lectura buena.
              if (prev === 'solo_aproximada') return prev;
              return nueva.precisionM > PRECISION_VAGA_M ? 'vaga' : 'siguiendo';
            });
          }

          if (!entregado) {
            entregado = true;
            clearTimeout(reloj);
            resolver(nueva);
          }
        }
      )
        .then((sub) => {
          if (!vivoRef.current) {
            sub.remove();
            return;
          }
          suscripcionRef.current = sub;
        })
        .catch(() => {
          clearTimeout(reloj);
          if (!entregado) {
            entregado = true;
            if (vivoRef.current) setEstado('error');
            resolver(null);
          }
        });
    });
  }, [cortar]);

  return { fijacion, estado, buscar, detener: cortar };
}
