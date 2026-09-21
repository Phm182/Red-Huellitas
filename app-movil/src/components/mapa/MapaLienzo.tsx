import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Images,
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
 * A diferencia de la versión web, acá el agrupado lo hace el propio motor
 * (`cluster` del GeoJSONSource): montar 200 marcadores de React sobre una vista
 * nativa tira los FPS al arrastrar, y el motor lo resuelve en la GPU.
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
 * Hasta qué zoom se agrupan los puntos.
 *
 * Va por DEBAJO de `ZOOM_INICIAL` a propósito: así al abrir el mapa ya se ven
 * los marcadores individuales, con su color por tipo y su foto. Si el umbral
 * queda por encima del zoom inicial, todo aparece agrupado y los grupos se
 * pintan de un color único, que es lo que hacía que todas las publicaciones se
 * vieran iguales.
 */
const CLUSTER_HASTA_ZOOM = 12;

/**
 * Un contador por tipo dentro de cada grupo.
 *
 * MapLibre agrupa los puntos pero pierde de vista qué había adentro: por eso el
 * grupo se dibujaba de un color fijo. Con esto cada grupo lleva `n_adopcion`,
 * `n_perdidos`, etc., y se puede pintar según lo que realmente contiene.
 *
 * Va en la forma LARGA `[operador, mapa]`, con el `['accumulated']` explícito.
 * La forma corta `['+', <mapa>]` que acepta Mapbox GL JS en web el motor
 * nativo la ignora en silencio: no tira error, simplemente deja las
 * propiedades sin calcular. Y como todas quedaban en cero, `colorDominante()`
 * caía siempre en la primera rama —adopción— y por eso en el celular TODOS los
 * grupos se veían del mismo rosa, y el anillo de capas no aparecía nunca
 * porque su filtro pide `> 0`.
 */
const CONTADORES_POR_TIPO = Object.fromEntries(
  MAPA_TIPOS.map((m) => [
    `n_${m.tipo}`,
    [
      ['+', ['accumulated'], ['get', `n_${m.tipo}`]],
      ['case', ['==', ['get', 'tipo'], m.tipo], 1, 0],
    ],
  ])
);

/**
 * Color del grupo: el del tipo más frecuente adentro.
 *
 * Es lo mismo que hace la web, que pinta el marcador con el color del tipo
 * dominante; así las dos plataformas se ven igual. La expresión se arma acá y
 * no a mano porque son 8 tipos y cada uno hay que compararlo contra los otros
 * 7: escrito a mano son 64 comparaciones que se desactualizan al agregar un
 * tipo nuevo.
 */
function colorDominante(): any {
  const ramas: any[] = ['case'];
  for (const m of MAPA_TIPOS) {
    const esElMayor: any[] = ['all'];
    for (const otro of MAPA_TIPOS) {
      if (otro.tipo === m.tipo) continue;
      esElMayor.push(['>=', ['get', `n_${m.tipo}`], ['get', `n_${otro.tipo}`]]);
    }
    ramas.push(esElMayor, m.color);
  }
  // Sin datos de tipo (no debería pasar) queda el cian de antes.
  ramas.push('#4CC9F0');
  return ramas;
}

const COLOR_GRUPO = colorDominante();

const IOS = Platform.OS === 'ios';

/**
 * Cómo se pinta en iOS lo que en Android es una expresión con predicados
 * compuestos (`['all', ...]`, `['!', ...]`).
 *
 * Diagnóstico del crash de iOS (SIGSEGV en MapLibre.framework, build 18, log
 * simbolizado contra el binario del build): la pila de llamadas es
 * `mapViewDidFinishLoadingStyle` -> `MLRNSource addToMap` -> `MLRNLayer
 * addStyles` -> `MLRNStyle setCircleColor:` -> `MLNCircleStyleLayer
 * setCircleColor:` -> adentro del C++ de MapLibre, copiando un
 * `std::unordered_map` desde un puntero inválido (`1`), con `NSCompoundPredicate`
 * en los registros. En iOS toda expresión pasa por `NSExpression`/`NSPredicate`
 * antes de llegar al motor; el primer `circle-color` que NO es un color plano es
 * `COLOR_GRUPO`, un `case` con `['all', ...]` y 56 comparaciones. Los `case` con
 * UNA sola comparación sí funcionan (los usa `clusterProperties`, que se carga
 * antes de que reviente). Android no pasa por ese camino y anda bien.
 *
 * Mientras no se confirme el arreglo en iOS, ahí los grupos van de un color
 * fijo (el anillo de puntitos igual muestra qué mezcla hay adentro).
 */
const COLOR_GRUPO_IOS = '#4CC9F0';

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
  const fuente = useRef<GeoJSONSourceRef>(null);

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

  // La animación sólo corre si hay algo que animar Y el estilo ya cargó.
  const hayGrupos = puntos.length > 1;
  const { giroRad, brilloOffset, brilloOpacidad } = useRelojGrupo(hayGrupos && estiloListo);
  const anillo = anilloDeCapas(giroRad);

  /**
   * Las fotos de las publicaciones, cargadas como imágenes del estilo.
   *
   * Es lo que hace que el mapa nativo se vea como el de la web: un círculo de
   * color dice "acá hay algo", una carita dice *qué* hay. MapLibre las baja y
   * las cachea solo; nosotros sólo declaramos el diccionario.
   *
   * DESACTIVADO A PROPÓSITO (temporal): el crash real de iOS reportado esta
   * semana (SIGSEGV en MapLibre.framework, siempre a los pocos segundos de
   * abrir el mapa) sobrevivió CUATRO versiones distintas del motor nativo
   * (6.26.0, 6.26.1, 6.28.0) con exactamente la misma firma cada vez —
   * mismo tipo de excepción, mismo `far`, misma cantidad de cuadros en la
   * pila. Eso descarta que sea un bug puntual de la librería que un cambio
   * de versión vaya a arreglar: el patrón encaja con el manejo de imágenes/
   * sprites del estilo (`ImageManager`), que es justo lo que usa este
   * diccionario. Hasta tener un fix real, se apaga la carga de fotos como
   * íconos del mapa nativo — los puntos se siguen viendo (círculo de color
   * por tipo, ver `coleccion` más abajo), sólo sin la miniatura de la foto.
   * Revertir cuando haya evidencia de que el problema real es otro.
   */
  const imagenes = useMemo<Record<string, string>>(() => ({}), []);

  const coleccion = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: puntos.map((p) => ({
        type: 'Feature' as const,
        id: `${p.tipo}-${p.id}`,
        properties: {
          // El punto entero viaja serializado: al tocar un pin hay que
          // devolver el objeto completo, y las propiedades de un feature
          // nativo sólo aceptan valores planos.
          punto: JSON.stringify(p),
          // El tipo, aparte y como valor plano. Va suelto porque
          // `CONTADORES_POR_TIPO` lo lee con `['get', 'tipo']` al agrupar, y
          // dentro del JSON de `punto` una expresión del estilo no puede
          // entrar. Faltaba: los contadores daban cero para TODOS los tipos,
          // los grupos salían siempre del color del primero de la lista y el
          // anillo de capas no aparecía nunca.
          tipo: p.tipo,
          color: MAPA_TIPO_POR_CLAVE[p.tipo]?.color ?? '#4CC9F0',
          // Cadena vacía y no null: las expresiones del estilo comparan
          // contra '' para decidir si hay foto.
          // Siempre vacío mientras las fotos-ícono estén desactivadas (ver
          // el comentario de `imagenes` más arriba) -- si acá dijera que
          // hay foto pero `imagenes` no la trae cargada, el ícono quedaría
          // pidiendo una imagen inexistente al estilo.
          foto: '',
        },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    }),
    [puntos]
  );

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

        {modoSeguro === false && !IOS ? <Images images={imagenes} /> : null}

        {modoSeguro === false ? (
        <GeoJSONSource
          ref={fuente}
          key="rh-puntos"
          id="rh-puntos"
          data={coleccion}
          cluster
          clusterRadius={58}
          // Hasta qué zoom se agrupa. Estaba en 17, que es altísimo: el mapa
          // abre en 13.6, así que TODO se veía agrupado y los grupos se pintan
          // de un color fijo. De ahí el "todos los puntos son iguales" — los
          // marcadores con color por tipo y foto existen, pero recién se
          // separaban acercando muchísimo.
          //
          // Con 12 (por debajo del zoom inicial) al entrar ya se ven los puntos
          // individuales, y el agrupado queda para cuando alejás de verdad, que
          // es cuando sirve.
          clusterMaxZoom={CLUSTER_HASTA_ZOOM}
          clusterProperties={CONTADORES_POR_TIPO}
          onPress={async (e: any) => {
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
              // Todo esto va en try/catch porque `getClusterLeaves` es nativo y
              // puede fallar. Sin el catch, un error acá se comía el toque en
              // silencio y parecía que tocar el mapa no hacía nada.
              try {
                const crudo: any = await fuente.current?.getClusterLeaves(clusterId, 200, 0);
                // El tipo dice `Feature[]`, pero la doc del método habla de una
                // FeatureCollection: según la plataforma vuelve una cosa o la
                // otra. Se aceptan las dos en vez de confiar en el tipo, que ya
                // demostró no coincidir con lo que manda el nativo.
                const hojas: any[] = Array.isArray(crudo) ? crudo : (crudo?.features ?? []);
                const dentro = hojas
                  .map((h) => {
                    try {
                      return JSON.parse((h.properties as any).punto) as MapaPunto;
                    } catch {
                      return null;
                    }
                  })
                  .filter((p): p is MapaPunto => p !== null);

                if (dentro.length > 0) {
                  onSeleccion(dentro);
                  return;
                }
              } catch {
                /* cae al acercar, abajo */
              }

              // Si no se pudo abrir el grupo, al menos acercar: al separarse
              // quedan los puntos sueltos, que sí se pueden tocar de a uno.
              // Es mejor que un toque que no hace absolutamente nada.
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
              'circle-color': IOS ? COLOR_GRUPO_IOS : COLOR_GRUPO,
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
              filter={
                IOS
                  ? ['>', ['get', `n_${p.tipo}`], 0]
                  : ['all', ['has', 'point_count'], ['>', ['get', `n_${p.tipo}`], 0]]
              }
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
              'circle-color': IOS ? COLOR_GRUPO_IOS : COLOR_GRUPO,
              'circle-radius': ['step', ['get', 'point_count'], 32, 10, 40, 50, 50],
              'circle-blur': 0.9,
              'circle-opacity': 0.6,
            }}
          />
          {/* Tres capas por punto, como en la web: el resplandor de color, el
              disco, y encima la foto. Separadas porque el halo tiene que
              quedar debajo de la foto de los vecinos, no sólo de la propia. */}
          <Layer
            key="rh-sueltos-halo"
            id="rh-sueltos-halo"
            type="circle"
            filter={IOS ? ['has', 'tipo'] : ['!', ['has', 'point_count']]}
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
            filter={IOS ? ['has', 'tipo'] : ['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              // Con foto el disco es el marco; sin foto, el pin entero.
              'circle-radius': IOS ? 9 : ['case', ['==', ['get', 'foto'], ''], 9, 15],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': 'rgba(255,255,255,.92)',
            }}
          />
          {/* Sin esta capa en iOS: las fotos-ícono están apagadas (`foto` siempre
              vacío, así que nunca dibujaría nada) y su filtro usaba `['all', ...]`. */}
          {!IOS ? (
            <Layer
              key="rh-sueltos-foto"
              id="rh-sueltos-foto"
              type="symbol"
              filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'foto'], '']]}
              layout={{
                'icon-image': ['get', 'foto'],
                // 52 px de foto reducidos al diámetro del disco.
                'icon-size': 0.52,
                'icon-allow-overlap': true,
              }}
            />
          ) : null}
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
