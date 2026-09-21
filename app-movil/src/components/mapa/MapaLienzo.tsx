import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useBrujula } from '../../hooks/useBrujula';
import { MAPA_TIPO_POR_CLAVE, MAPA_TIPOS } from '../../types/mapa';
import type { MapaPunto, MapaSesion } from '../../types/mapa';

type Props = {
  sesion: MapaSesion;
  puntos: MapaPunto[];
  centro: { lat: number; lng: number };
  miUbicacion?: { lat: number; lng: number } | null;
  precisionM?: number | null;
  irA?: { lat: number; lng: number; nonce: number } | null;
  oscuro: boolean;
  onSeleccion: (puntos: MapaPunto[]) => void;
  /** Tocaron el mapa donde no hay nada: sirve para cerrar la hoja abierta. */
  onFondo?: () => void;
  onMover?: (centro: { lat: number; lng: number }) => void;
  /** Con esto la cámara acompaña al usuario mientras camina (sólo nativo). */
  seguirme?: boolean;
};

/**
 * El mapa en Android/iOS, con MapLibre nativo.
 *
 * **Por qué MapLibre y no Mapbox acá.** En web Mapbox factura por mapa creado,
 * y eso ya está topeado desde el servidor (ver `mapa_uso.php`). En móvil el
 * modelo es otro: se factura por *usuario activo mensual*, un contador que no
 * se puede frenar desde el backend como sí se frena una carga. Con la consigna
 * de no pasarse NUNCA del límite, Mapbox nativo cambiaría un riesgo controlado
 * por uno que no podemos controlar. MapLibre dibuja los mismos vector tiles,
 * es libre y no pide token: se ve igual y no hay contador que vigilar.
 *
 * A diferencia de la versión web, acá los marcadores son capas del motor y no
 * vistas de React: montar 200 marcadores de React sobre una vista nativa tira
 * los FPS al arrastrar. El agrupado lo calcula `agrupar()` (ver más abajo),
 * anclado a un punto real para que el marcador no se corra al alejar.
 *
 * El punto de "vos estás acá" lo dibuja `UserLocation`, que usa el proveedor de
 * ubicación del sistema y se refresca solo mientras el mapa está abierto. Es
 * más preciso que pintar a mano las coordenadas que llegan por props.
 */

const ESTILO_CLARO = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const ESTILO_OSCURO = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Desde qué zoom se dibujan los edificios, y con cuál se abre el mapa.
 *
 * Estaban desalineados y por eso "se perdió" el 3D: los edificios aparecían
 * recién en zoom 14 pero el mapa abría en 12.4, así que al entrar nunca se veía
 * un solo volumen. Ahora el zoom inicial cae adentro del rango.
 *
 * No se baja más el umbral porque cada nivel hacia afuera multiplica la
 * geometría de edificios que hay que bajar y dibujar.
 */
const EDIFICIOS_DESDE_ZOOM = 13;
const ZOOM_INICIAL = 13.6;

/**
 * Agrupado propio, anclado al punto.
 *
 * El agrupado nativo de MapLibre pone el grupo en el centroide de sus miembros,
 * así que al alejar el mapa el marcador se corría de donde estaba el punto. Acá
 * cada grupo se ancla a UNO de sus puntos (la "semilla") y se dibuja exactamente
 * donde esa publicación está: el marcador no se mueve de su lugar, y cuando otro
 * choca con él (dos marcadores a menos de `RADIO_AGRUPAR_PX` en pantalla) se
 * suma al mismo grupo.
 *
 * Además evita expresiones de estilo: los conteos por tipo y el color dominante
 * se calculan acá y viajan como propiedades planas. En iOS toda expresión pasa
 * por NSExpression/NSPredicate, y una con predicados compuestos (`['all', ...]`)
 * era lo que rompía el mapa (SIGSEGV en `MLNCircleStyleLayer setCircleColor:`).
 */
const AGRUPAR_HASTA_ZOOM = 17;
const RADIO_AGRUPAR_PX = 40;

type Grupo = { semilla: MapaPunto; miembros: MapaPunto[] };

function aPixeles(lat: number, lng: number, zoom: number) {
  const escala = 256 * Math.pow(2, zoom);
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * escala,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * escala,
  };
}

function agrupar(puntos: MapaPunto[], zoom: number): Grupo[] {
  if (zoom >= AGRUPAR_HASTA_ZOOM) return puntos.map((p) => ({ semilla: p, miembros: [p] }));

  // Orden estable: la semilla de un grupo no cambia de un cuadro al otro.
  const orden = [...puntos].sort((a, b) =>
    a.tipo === b.tipo ? a.id - b.id : a.tipo < b.tipo ? -1 : 1
  );
  const px = orden.map((p) => aPixeles(p.lat, p.lng, zoom));
  const celda = RADIO_AGRUPAR_PX;
  const grilla = new globalThis.Map<string, number[]>();
  px.forEach((c, i) => {
    const k = `${Math.floor(c.x / celda)}:${Math.floor(c.y / celda)}`;
    const lista = grilla.get(k);
    if (lista) lista.push(i);
    else grilla.set(k, [i]);
  });

  const usado: boolean[] = new Array(orden.length).fill(false);
  const grupos: Grupo[] = [];
  for (let i = 0; i < orden.length; i++) {
    if (usado[i]) continue;
    usado[i] = true;
    const miembros = [orden[i]!];
    const cx = Math.floor(px[i]!.x / celda);
    const cy = Math.floor(px[i]!.y / celda);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of grilla.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (usado[j]) continue;
          if (Math.hypot(px[j]!.x - px[i]!.x, px[j]!.y - px[i]!.y) <= celda) {
            usado[j] = true;
            miembros.push(orden[j]!);
          }
        }
      }
    }
    grupos.push({ semilla: orden[i]!, miembros });
  }
  return grupos;
}

function abreviar(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const IOS = Platform.OS === 'ios';

const CLAVE_MAPA_CARGANDO = '@red_huellitas/mapa_cargando';
const CLAVE_MAPA_SEGURO = '@red_huellitas/mapa_modo_seguro';
const MODO_SEGURO_MS = 24 * 60 * 60 * 1000;
const SOBREVIVIO_MS = 6000;

function versionDeApp(): string {
  return String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.version ?? '?');
}

/**
 * A qué distancia del centro del grupo se dibuja el anillo de puntitos.
 *
 * Tiene que caer por fuera del disco más grande (radio 25, ver `rh-grupos`)
 * para que los puntitos no queden apoyados encima del número.
 */
const RADIO_ANILLO = 32;

/**
 * Un puntito por capa, en anillo alrededor del grupo, girando como las lunas de
 * un planeta.
 *
 * El disco solo alcanza para decir "acá hay 12 cosas" y de qué es la mayoría,
 * pero no *qué* mezcla hay adentro: un grupo mitad perdidos mitad adopciones se
 * ve idéntico a uno de puras adopciones. El anillo lo resuelve mostrando un
 * puntito del color de cada capa presente.
 *
 * El ángulo de cada tipo es fijo *entre ellos* (siempre en el mismo orden y
 * equiespaciados) y todo el conjunto gira parejo, así que las posiciones
 * relativas no cambian nunca: el anillo se lee igual, sólo que en movimiento.
 *
 * `circle-translate` no acepta expresiones de datos, sólo un valor constante;
 * por eso el desplazamiento se calcula acá, en píxeles, y hay una capa por tipo
 * en vez de una sola capa que se acomode sola. Esa misma limitación es la que
 * obliga a animar desde JS: no hay forma de que el estilo conozca el tiempo.
 */
function anilloDeCapas(giroRad: number) {
  return MAPA_TIPOS.map((m, i) => {
    const angulo = (i / MAPA_TIPOS.length) * 2 * Math.PI + giroRad;
    return {
      tipo: m.tipo,
      color: m.color,
      // El eje Y de la pantalla crece hacia abajo: de ahí el signo invertido,
      // para que el giro se vea en sentido horario.
      offset: [
        Math.round(Math.sin(angulo) * RADIO_ANILLO * 10) / 10,
        Math.round(-Math.cos(angulo) * RADIO_ANILLO * 10) / 10,
      ] as [number, number],
    };
  });
}

/**
 * El reloj de la animación del grupo: giro del anillo y paso del brillo.
 *
 * Un solo temporizador para las dos cosas. Cada tick reescribe 9 propiedades de
 * estilo (8 puntitos + el brillo), así que el paso es de 80 ms y no de 16: a 60
 * cuadros por segundo serían 540 escrituras por segundo cruzando al motor
 * nativo mientras el mapa además dibuja tiles. A 12,5 por segundo el giro se ve
 * fluido igual porque es lento —una vuelta cada 9 s— y el costo baja a un
 * séptimo.
 *
 * El brillo no acompaña al giro: pasa una vez cada ciclo largo y el resto del
 * tiempo está apagado, que es lo que lo hace parecer un reflejo y no una luz
 * prendida.
 */
const PASO_MS = 80;
const VUELTA_MS = 9000;
const BRILLO_CADA_MS = 4500;
/** Cuánto dura el paso del brillo dentro de ese ciclo. */
const BRILLO_DURACION_MS = 900;

function useRelojGrupo(activo: boolean) {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setT((v) => v + PASO_MS), PASO_MS);
    return () => clearInterval(id);
  }, [activo]);

  const giroRad = ((t % VUELTA_MS) / VUELTA_MS) * 2 * Math.PI;

  // El brillo cruza la esfera en diagonal, de arriba-izquierda a abajo-derecha,
  // y fuera de su ventana se queda quieto y transparente.
  const fase = (t % BRILLO_CADA_MS) / BRILLO_DURACION_MS;
  const brillando = fase <= 1;
  const avance = brillando ? fase : 0;

  return {
    giroRad,
    // Se mueve dentro del disco, no fuera: es un reflejo sobre la superficie.
    brilloOffset: [-9 + avance * 18, -9 + avance * 18] as [number, number],
    // Entra y sale con una curva suave para que no aparezca de golpe.
    brilloOpacidad: brillando ? Math.sin(avance * Math.PI) * 0.5 : 0,
  };
}

/**
 * En nativo no hay instancia de mapa que sobreviva entre pantallas como en web,
 * y tampoco hace falta: MapLibre no cobra por crearla. Existe para que el
 * import funcione igual en las dos plataformas.
 */
export function sesionMapaViva(_oscuro: boolean): MapaSesion | null {
  return null;
}

export function MapaLienzo({
  puntos,
  centro,
  precisionM,
  irA,
  oscuro,
  seguirme = false,
  onSeleccion,
  onFondo,
  onMover,
}: Props) {
  const camara = useRef<CameraRef>(null);

  /**
   * Hacia dónde mira el teléfono. Va por la brújula y no por el GPS: el rumbo
   * del GPS sólo existe mientras te movés, así que parado la flecha no giraba.
   */
  const brujula = useBrujula(true);

  /**
   * Recién true cuando MapLibre terminó de cargar el estilo (tiles/sprites
   * del `mapStyle` remoto). Antes de eso, `useRelojGrupo` de abajo NO debe
   * arrancar: escribe 9 propiedades de paint por cuadro (80ms) en las capas
   * del anillo/brillo, y si esas escrituras llegan mientras el motor nativo
   * todavía está construyendo el árbol de capas del estilo, se pisa con esa
   * construcción — que es exactamente la firma del crash real reportado en
   * iOS (SIGSEGV adentro de MapLibre.framework, siempre a los pocos segundos
   * de abrir el mapa, nunca por algo que hizo el usuario). Con el mapa recién
   * montado no hay drama en perderse el giro de los primeros cuadros: el
   * anillo igual arranca en cuanto el estilo está listo.
   */
  const [estiloListo, setEstiloListo] = useState(false);

  /**
   * Red de seguridad para iOS: si el mapa se cerró de golpe mientras cargaba
   * los pines, la próxima vez abre en "modo seguro" (mapa base sin pines) en
   * vez de volver a crashear en bucle. Antes de montar los pines se deja una
   * marca; si la app muere, la marca queda. Si sobrevive unos segundos o se
   * sale del mapa normalmente, se borra. El modo seguro dura 24 h y sólo
   * para esta versión de la app, así que un build nuevo vuelve a intentar.
   * `null` = todavía leyendo el estado guardado.
   */
  const [modoSeguro, setModoSeguro] = useState<boolean | null>(IOS ? null : false);

  useEffect(() => {
    if (!IOS) return;
    let vivo = true;
    (async () => {
      try {
        const version = versionDeApp();
        const [cargando, seguro] = await Promise.all([
          AsyncStorage.getItem(CLAVE_MAPA_CARGANDO),
          AsyncStorage.getItem(CLAVE_MAPA_SEGURO),
        ]);
        const vigente = (v: string | null) => {
          const [ver, ts] = (v ?? '').split('|');
          return ver === version && Date.now() - Number(ts) < MODO_SEGURO_MS;
        };
        let esSeguro = vigente(seguro);
        if (vigente(cargando)) {
          esSeguro = true;
          await AsyncStorage.setItem(CLAVE_MAPA_SEGURO, `${version}|${Date.now()}`);
        }
        if (!esSeguro) await AsyncStorage.setItem(CLAVE_MAPA_CARGANDO, `${version}|${Date.now()}`);
        if (vivo) setModoSeguro(esSeguro);
      } catch {
        if (vivo) setModoSeguro(false);
      }
    })();
    return () => {
      vivo = false;
      AsyncStorage.removeItem(CLAVE_MAPA_CARGANDO).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!IOS || modoSeguro !== false || !estiloListo) return;
    const id = setTimeout(() => {
      AsyncStorage.removeItem(CLAVE_MAPA_CARGANDO).catch(() => {});
    }, SOBREVIVIO_MS);
    return () => clearTimeout(id);
  }, [modoSeguro, estiloListo]);

  /**
   * Zoom con el que se agrupa, en saltos de 0,5: reagrupar en cada cuadro del
   * gesto de zoom sería recalcular todo el tiempo y el mapa se sentiría lento.
   */
  const [zoomAgrupar, setZoomAgrupar] = useState(Math.round(ZOOM_INICIAL * 2) / 2);

  const agrupado = useMemo(() => {
    const indice = new globalThis.Map<string, MapaPunto[]>();
    const features = agrupar(puntos, zoomAgrupar).map((g, n) => {
      const geometry = { type: 'Point' as const, coordinates: [g.semilla.lng, g.semilla.lat] };

      if (g.miembros.length === 1) {
        const p = g.semilla;
        return {
          type: 'Feature' as const,
          id: `${p.tipo}-${p.id}`,
          properties: {
            // El punto entero viaja serializado: al tocar un pin hay que
            // devolver el objeto completo, y las propiedades de un feature
            // nativo sólo aceptan valores planos.
            punto: JSON.stringify(p),
            // Sólo los puntos sueltos tienen `tipo`: es lo que los distingue
            // de los grupos en los filtros de las capas.
            tipo: p.tipo,
            color: MAPA_TIPO_POR_CLAVE[p.tipo]?.color ?? '#4CC9F0',
          },
          geometry,
        };
      }

      const cuentas: Record<string, number> = {};
      for (const m of g.miembros) cuentas[m.tipo] = (cuentas[m.tipo] ?? 0) + 1;
      let dominante = MAPA_TIPOS[0]!;
      let mayor = -1;
      for (const t of MAPA_TIPOS) {
        const c = cuentas[t.tipo] ?? 0;
        if (c > mayor) {
          mayor = c;
          dominante = t;
        }
      }
      const id = `g${n}`;
      indice.set(id, g.miembros);
      const properties: Record<string, string | number> = {
        cluster_id: id,
        point_count: g.miembros.length,
        point_count_abbreviated: abreviar(g.miembros.length),
        colorGrupo: dominante.color,
      };
      // `n_<tipo>` sólo existe si ese tipo está en el grupo: el anillo de
      // puntitos filtra con un `has` simple, sin expresiones.
      for (const [tipo, c] of Object.entries(cuentas)) properties[`n_${tipo}`] = c;
      return { type: 'Feature' as const, id, properties, geometry };
    });
    return { coleccion: { type: 'FeatureCollection' as const, features }, indice };
  }, [puntos, zoomAgrupar]);

  // La animación sólo corre si hay algo que animar Y el estilo ya cargó.
  const hayGrupos = agrupado.indice.size > 0;
  const { giroRad, brilloOffset, brilloOpacidad } = useRelojGrupo(hayGrupos && estiloListo);
  const anillo = anilloDeCapas(giroRad);

  // Volar al punto pedido: el botón de centrarme y los "Ver en mapa".
  useEffect(() => {
    if (!irA) return;
    camara.current?.flyTo({ center: [irA.lng, irA.lat], zoom: 15.5, duration: 900 });
  }, [irA?.nonce, irA?.lat, irA?.lng]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={oscuro ? ESTILO_OSCURO : ESTILO_CLARO}
        logo={false}
        attributionPosition={{ bottom: 96, right: 8 }}
        compass
        compassPosition={{ bottom: 150, right: 10 }}
        // Tocar el mapa donde no hay nada cierra la hoja. Los toques sobre un
        // punto no llegan acá porque el handler de la fuente corta la
        // propagación; si no la cortara, abrir un grupo lo cerraría en el mismo
        // gesto.
        onPress={() => onFondo?.()}
        onRegionDidChange={(e) => {
          const c = e.nativeEvent?.center;
          if (c) onMover?.({ lat: c[1], lng: c[0] });
          const z = e.nativeEvent?.zoom;
          if (typeof z === 'number') setZoomAgrupar(Math.round(z * 2) / 2);
        }}
        onDidFinishLoadingStyle={() => setEstiloListo(true)}
      >
        <Camera
          ref={camara}
          initialViewState={{ center: [centro.lng, centro.lat], zoom: ZOOM_INICIAL, pitch: 45 }}
          // Seguir al usuario mientras camina: el pedido fue "si se mueve, que
          // se mueva también". Se apaga en cuanto arrastra el mapa a mano —lo
          // hace el propio motor— para no pelearle el control.
          trackUserLocation={seguirme ? 'default' : undefined}
        />

        {/*
          El punto de "vos estás acá". La posición la sigue manejando el
          sistema, pero las capas las dibujamos nosotros por un motivo: la
          flecha de orientación que trae el componente se orienta con
          `coords.heading`, el rumbo del GPS, que es la dirección en la que te
          estás desplazando. Parado no hay desplazamiento y ese dato llega
          nulo, así que la flecha no giraba al girar el teléfono en la mano.

          Pasándole hijos, `UserLocation` sólo aporta la posición y el orden de
          las capas queda a cargo nuestro; el ícono de la flecha lo sigue
          registrando el propio componente gracias a `heading`.
        */}
        <UserLocation animated heading minDisplacement={3}>
          {/*
            Las dos capas de abajo se montan SIEMPRE, nunca condicionalmente:
            `UserLocation` le pasa estos hijos a un `GeoJSONSource` de la
            librería que los reordena con `Children.map` cada vez que alguno
            entra o sale del array (`cloneReactChildrenWithProps` en
            @maplibre/maplibre-react-native filtra los `null` antes de
            mapear) — eso corría el índice de las capas que quedaban, y
            `useFrozenId` (que congela el `id` en el primer render de esa
            instancia) terminaba viendo la MISMA instancia reconciliada con
            un `id` distinto → `Error: \`id\` cannot be changed`, tirando
            abajo la app entera (crash real, confirmado con `dumpsys
            dropbox` en el celular). La solución no es un mejor `key` — ya
            lo tenían — es no sacarlas nunca del árbol: se ocultan con
            `layout.visibility` en vez de desmontarse.
          */}
          <Layer
            key="rh-yo-precision"
            id="rh-yo-precision"
            type="circle"
            layout={{ visibility: typeof precisionM === 'number' && precisionM > 0 ? 'visible' : 'none' }}
            paint={{
              'circle-color': '#4CC9F0',
              'circle-opacity': 0.18,
              'circle-pitch-alignment': 'map',
              'circle-radius': [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                0,
                9,
                22,
                9 + (precisionM ?? 0) * 100,
              ],
            }}
          />

          <Layer
            key="rh-yo-rumbo"
            id="rh-yo-rumbo"
            type="symbol"
            layout={{
              'icon-image': 'mlrn-user-location-puck-heading',
              'icon-allow-overlap': true,
              visibility: brujula !== null ? 'visible' : 'none',
              // Los dos en 'map' para que la flecha quede pegada al terreno:
              // si giro el mapa, la flecha sigue apuntando al mismo lugar del
              // mundo, que es lo que uno espera de una brújula.
              'icon-rotation-alignment': 'map',
              'icon-pitch-alignment': 'map',
              'icon-rotate': brujula ?? 0,
            }}
          />

          <Layer
            key="rh-yo-borde"
            id="rh-yo-borde"
            type="circle"
            paint={{ 'circle-radius': 9, 'circle-color': '#fff', 'circle-pitch-alignment': 'map' }}
          />
          <Layer
            key="rh-yo-centro"
            id="rh-yo-centro"
            type="circle"
            paint={{ 'circle-radius': 6, 'circle-color': '#4CC9F0', 'circle-pitch-alignment': 'map' }}
          />
        </UserLocation>

        {/*
          Edificios en 3D. En la web esta capa ya estaba y acá faltaba entera:
          el nativo tenía la cámara inclinada pero nada que sobresaliera, así
          que se veía plano por más `pitch` que tuviera.

          La fuente se llama `carto` porque los estilos de Carto son
          OpenMapTiles y así nombran su fuente vectorial; por eso también los
          campos son `render_height`/`render_min_height` y no `height`, que es
          la convención de Mapbox. Si algún día se cambia el estilo base hay
          que revisar los dos nombres.

          Va antes de los puntos para que los volúmenes queden por debajo de
          los marcadores y no los tapen.
        */}
        <Layer
          key="rh-edificios"
          id="rh-edificios"
          source="carto"
          source-layer="building"
          type="fill-extrusion"
          minzoom={EDIFICIOS_DESDE_ZOOM}
          paint={{
            'fill-extrusion-color': oscuro ? '#1b2540' : '#c9d4e8',
            'fill-extrusion-height': [
              'coalesce',
              ['get', 'render_height'],
              ['get', 'height'],
              6,
            ],
            'fill-extrusion-base': [
              'coalesce',
              ['get', 'render_min_height'],
              ['get', 'min_height'],
              0,
            ],
            'fill-extrusion-opacity': 0.6,
          }}
        />

        {modoSeguro === false ? (
        <GeoJSONSource
          key="rh-puntos"
          id="rh-puntos"
          data={agrupado.coleccion}
          onPress={(e: any) => {
            // Los datos del toque vienen en `nativeEvent`, no sueltos en el
            // evento: es un NativeSyntheticEvent, como cualquier evento que
            // cruza el puente. Leyéndolo mal `f` daba siempre undefined y el
            // handler cortaba en la línea de abajo, así que tocar un grupo no
            // hacía absolutamente nada. Se deja el fallback por si alguna
            // versión del paquete lo entrega plano.
            const f = e.nativeEvent?.features?.[0] ?? e.features?.[0];
            if (!f) return;

            // Sin esto el toque sigue subiendo hasta el `onPress` del mapa, que
            // cierra la hoja: abrir un grupo y cerrarlo en el mismo gesto.
            e.stopPropagation?.();

            // Grupo: se devuelven todas las publicaciones que contiene, igual
            // que en web, para que la hoja inferior las liste.
            const clusterId = f.properties?.cluster_id;
            if (clusterId != null) {
              const dentro = agrupado.indice.get(String(clusterId));
              if (dentro && dentro.length > 0) {
                onSeleccion(dentro);
                return;
              }

              // Si por algo no está, al menos acercar: al separarse quedan los
              // puntos sueltos, que sí se pueden tocar de a uno.
              const c = f.geometry?.coordinates;
              if (Array.isArray(c) && c.length === 2) {
                camara.current?.flyTo({ center: [c[0], c[1]], zoom: 16, duration: 600 });
              }
              return;
            }

            try {
              onSeleccion([JSON.parse(f.properties.punto) as MapaPunto]);
            } catch {
              // Un feature sin punto no debería existir; si pasa, se ignora.
            }
          }}
        >
          {/*
            La esfera: cuatro capas apiladas en vez de un disco plano.

            Un `circle` de MapLibre es de color liso —no hay degradado radial
            como en CSS—, así que el volumen se finge con luces y sombras
            superpuestas: una sombra oscura corrida hacia abajo, el disco de
            color, un sombreado inferior, y un reflejo arriba a la izquierda.
            El ojo lee esa secuencia como una fuente de luz desde arriba, que es
            lo que convierte el círculo en pelota.
          */}
          <Layer
            key="rh-grupos-sombra"
            id="rh-grupos-sombra"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#000',
              'circle-opacity': 0.38,
              'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 50, 25],
              'circle-blur': 0.35,
              'circle-translate': [0, 3],
              'circle-translate-anchor': 'viewport',
            }}
          />
          <Layer
            key="rh-grupos"
            id="rh-grupos"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': ['get', 'colorGrupo'],
              'circle-opacity': 0.95,
              // Crece con la cantidad, pero por escalones: sin tope, un grupo
              // de 300 taparía media pantalla. El escalón más grande queda por
              // dentro de RADIO_ANILLO para que los puntitos de las capas no se
              // apoyen encima del número.
              'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 50, 25],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,.9)',
            }}
          />
          {/* El lado en sombra: un disco negro difuminado, corrido hacia abajo
              y más chico, que oscurece la parte inferior de la pelota. */}
          <Layer
            key="rh-grupos-sombreado"
            id="rh-grupos-sombreado"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#000',
              'circle-opacity': 0.3,
              'circle-radius': ['step', ['get', 'point_count'], 13, 10, 16, 50, 19],
              'circle-blur': 1,
              'circle-translate': [1, 5],
              'circle-translate-anchor': 'viewport',
            }}
          />
          {/* El reflejo fijo, arriba a la izquierda: el brillo especular que
              termina de vender la esfera. Es el mismo lugar del que sale el
              `radial-gradient` de la web. */}
          <Layer
            key="rh-grupos-luz"
            id="rh-grupos-luz"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#fff',
              'circle-opacity': 0.3,
              'circle-radius': ['step', ['get', 'point_count'], 7, 10, 9, 50, 11],
              'circle-blur': 0.85,
              'circle-translate': [-6, -6],
              'circle-translate-anchor': 'viewport',
            }}
          />
          {/* El brillo que pasa cada tanto. Cruza la esfera en diagonal y el
              resto del tiempo está en opacidad cero: por eso se lee como un
              reflejo momentáneo y no como una luz siempre prendida. */}
          <Layer
            key="rh-grupos-brillo"
            id="rh-grupos-brillo"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#fff',
              'circle-opacity': brilloOpacidad,
              'circle-radius': ['step', ['get', 'point_count'], 6, 10, 8, 50, 10],
              'circle-blur': 0.7,
              'circle-translate': brilloOffset,
              'circle-translate-anchor': 'viewport',
            }}
          />
          <Layer
            key="rh-grupos-texto"
            id="rh-grupos-texto"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 13,
              'text-allow-overlap': true,
            }}
            paint={{ 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(0,0,0,.35)', 'text-halo-width': 1 }}
          />
          {/* El anillo va después del disco y del número para quedar encima de
              los dos; si fuera antes, el disco se lo comería. */}
          {anillo.map((p) => (
            <Layer
              key={p.tipo}
              id={`rh-grupos-capa-${p.tipo}`}
              type="circle"
              filter={['has', `n_${p.tipo}`]}
              paint={{
                'circle-color': p.color,
                'circle-radius': 4.5,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': 'rgba(255,255,255,.95)',
                'circle-translate': p.offset,
                // 'viewport' y no 'map': el mapa está inclinado 45°, así que con
                // el anclaje por defecto el anillo se deformaría en óvalo y
                // giraría con la brújula.
                'circle-translate-anchor': 'viewport',
              }}
            />
          ))}
          <Layer
            key="rh-grupos-halo"
            id="rh-grupos-halo"
            type="circle"
            filter={['has', 'point_count']}
            beforeId="rh-grupos"
            paint={{
              'circle-color': ['get', 'colorGrupo'],
              'circle-radius': ['step', ['get', 'point_count'], 32, 10, 40, 50, 50],
              'circle-blur': 0.9,
              'circle-opacity': 0.6,
            }}
          />
          {/* Dos capas por punto, como en la web: el resplandor de color y el
              disco. Separadas porque el halo tiene que quedar debajo del disco
              de los vecinos, no sólo del propio. */}
          <Layer
            key="rh-sueltos-halo"
            id="rh-sueltos-halo"
            type="circle"
            filter={['has', 'tipo']}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 21,
              'circle-blur': 1,
              'circle-opacity': 0.55,
            }}
          />
          <Layer
            key="rh-sueltos"
            id="rh-sueltos"
            type="circle"
            filter={['has', 'tipo']}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 9,
              'circle-stroke-width': 2.5,
              'circle-stroke-color': 'rgba(255,255,255,.92)',
            }}
          />
        </GeoJSONSource>
        ) : null}
      </Map>

      {modoSeguro === true ? (
        <View pointerEvents="none" style={estilos.avisoSeguro}>
          <Text style={estilos.avisoSeguroTexto}>
            Modo seguro: el mapa se cerró la última vez, así que por ahora se muestra sin los pines.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  avisoSeguro: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  avisoSeguroTexto: { color: '#fff', fontSize: 12, textAlign: 'center' },
});
