import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  Map,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MAPA_TIPO_POR_CLAVE } from '../../types/mapa';
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
  onMover?: (centro: { lat: number; lng: number }) => void;
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
  miUbicacion,
  irA,
  oscuro,
  onSeleccion,
  onMover,
}: Props) {
  const camara = useRef<CameraRef>(null);
  const fuente = useRef<GeoJSONSourceRef>(null);

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
          initialViewState={{ center: [centro.lng, centro.lat], zoom: 12.4, pitch: 45 }}
        />

        {/* El punto azul lo maneja el sistema: se actualiza solo y con la
            precisión real del GPS, sin que tengamos que re-renderizar. */}
        {miUbicacion ? <UserLocation animated accuracy heading /> : null}

        <GeoJSONSource
          ref={fuente}
          id="rh-puntos"
          data={coleccion}
          cluster
          clusterRadius={58}
          clusterMaxZoom={17}
          onPress={async (e: any) => {
            const f = e.features?.[0];
            if (!f) return;

            // Grupo: se devuelven todas las publicaciones que contiene, igual
            // que en web, para que la hoja inferior las liste.
            const clusterId = f.properties?.cluster_id;
            if (clusterId != null) {
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
              if (dentro.length > 0) onSeleccion(dentro);
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
              'circle-color': '#4CC9F0',
              'circle-opacity': 0.85,
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
            paint={{ 'text-color': '#06202E' }}
          />
          <Layer
            id="rh-sueltos"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 9,
              'circle-stroke-width': 2.5,
              'circle-stroke-color': 'rgba(255,255,255,.92)',
            }}
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}
