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
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MAPA_TIPO_POR_CLAVE, MAPA_TIPOS } from '../../types/mapa';
import type { MapaPunto, MapaSesion } from '../../types/mapa';
import { rhMediaUrl } from '../../utils/media';

type Props = {
  sesion: MapaSesion;
  puntos: MapaPunto[];
  centro: { lat: number; lng: number };
  miUbicacion?: { lat: number; lng: number } | null;
  precisionM?: number | null;
  irA?: { lat: number; lng: number; nonce: number } | null;
  oscuro: boolean;
  onSeleccion: (puntos: MapaPunto[]) => void;
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
 */
const CONTADORES_POR_TIPO = Object.fromEntries(
  MAPA_TIPOS.map((m) => [
    `n_${m.tipo}`,
    ['+', ['case', ['==', ['get', 'tipo'], m.tipo], 1, 0]],
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
  irA,
  oscuro,
  seguirme = false,
  onSeleccion,
  onMover,
}: Props) {
  const camara = useRef<CameraRef>(null);
  const fuente = useRef<GeoJSONSourceRef>(null);

  /**
   * Las fotos de las publicaciones, cargadas como imágenes del estilo.
   *
   * Es lo que hace que el mapa nativo se vea como el de la web: un círculo de
   * color dice "acá hay algo", una carita dice *qué* hay. MapLibre las baja y
   * las cachea solo; nosotros sólo declaramos el diccionario.
   */
  const imagenes = useMemo(() => {
    const dic: Record<string, string> = {};
    puntos.forEach((p) => {
      if (p.fotoPath) dic[`foto-${p.tipo}-${p.id}`] = rhMediaUrl(p.fotoPath);
    });
    return dic;
  }, [puntos]);

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
          color: MAPA_TIPO_POR_CLAVE[p.tipo]?.color ?? '#4CC9F0',
          // Cadena vacía y no null: las expresiones del estilo comparan
          // contra '' para decidir si hay foto.
          foto: p.fotoPath ? `foto-${p.tipo}-${p.id}` : '',
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
        onRegionDidChange={(e) => {
          const c = e.nativeEvent?.center;
          if (c) onMover?.({ lat: c[1], lng: c[0] });
        }}
      >
        <Camera
          ref={camara}
          initialViewState={{ center: [centro.lng, centro.lat], zoom: ZOOM_INICIAL, pitch: 45 }}
          // Seguir al usuario mientras camina: el pedido fue "si se mueve, que
          // se mueva también". Se apaga en cuanto arrastra el mapa a mano —lo
          // hace el propio motor— para no pelearle el control.
          trackUserLocation={seguirme ? 'default' : undefined}
        />

        {/* El punto azul lo maneja el sistema: se actualiza solo, con la
            precisión real del GPS y el cono de orientación. `accuracy` dibuja
            el halo de incerteza, que es más honesto que un punto nítido. */}
        <UserLocation animated accuracy heading minDisplacement={3} />

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

        <Images images={imagenes} />

        <GeoJSONSource
          ref={fuente}
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
            const f = e.features?.[0];
            if (!f) return;

            // Grupo: se devuelven todas las publicaciones que contiene, igual
            // que en web, para que la hoja inferior las liste.
            const clusterId = f.properties?.cluster_id;
            if (clusterId != null) {
              // Todo esto va en try/catch porque `getClusterLeaves` es nativo y
              // puede fallar. Sin el catch, un error acá se comía el toque en
              // silencio y parecía que tocar el mapa no hacía nada.
              try {
                const hojas = await fuente.current?.getClusterLeaves(clusterId, 200, 0);
                const dentro = (hojas ?? [])
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
          <Layer
            id="rh-grupos"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': COLOR_GRUPO,
              'circle-opacity': 0.92,
              // Crece con la cantidad, pero por escalones: sin tope, un grupo
              // de 300 taparía media pantalla.
              'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,.9)',
            }}
          />
          <Layer
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
          <Layer
            id="rh-grupos-halo"
            type="circle"
            filter={['has', 'point_count']}
            beforeId="rh-grupos"
            paint={{
              'circle-color': COLOR_GRUPO,
              'circle-radius': ['step', ['get', 'point_count'], 32, 10, 40, 50, 50],
              'circle-blur': 0.9,
              'circle-opacity': 0.6,
            }}
          />
          {/* Tres capas por punto, como en la web: el resplandor de color, el
              disco, y encima la foto. Separadas porque el halo tiene que
              quedar debajo de la foto de los vecinos, no sólo de la propia. */}
          <Layer
            id="rh-sueltos-halo"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 21,
              'circle-blur': 1,
              'circle-opacity': 0.55,
            }}
          />
          <Layer
            id="rh-sueltos"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              // Con foto el disco es el marco; sin foto, el pin entero.
              'circle-radius': ['case', ['==', ['get', 'foto'], ''], 9, 15],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': 'rgba(255,255,255,.92)',
            }}
          />
          <Layer
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
        </GeoJSONSource>
      </Map>
    </View>
  );
}
