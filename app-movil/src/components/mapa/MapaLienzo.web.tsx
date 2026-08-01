import mapboxgl from 'mapbox-gl';
// Namespace y no default: maplibre-gl v6 no exporta default, y con `import
// maplibregl from` compila igual pero llega `undefined` en runtime — o sea que
// el respaldo recién fallaría el día que se acabe el cupo de Mapbox.
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Supercluster from 'supercluster';

// CSS de ambas librerías, estático y siempre.
//
// Con `await import('...css')` Metro tira "Requiring unknown module": no sabe
// resolver una hoja de estilos pedida en tiempo de ejecución. Y como las dos
// van juntas, cambiar a MapLibre cuando se acaba el cupo de Mapbox no necesita
// recargar nada: los estilos del reemplazo ya están puestos.
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapaPunto, MapaSesion } from '../../types/mapa';
import { MAPA_TIPO_POR_CLAVE } from '../../types/mapa';
import { rhMediaUrl } from '../../utils/media';

/**
 * MapLibre v6 es ESM-only: con Metro/Expo el worker no se resuelve solo.
 * Sin `setWorkerUrl` el mapa monta pero queda en blanco (sin tiles).
 * Los archivos viven en /public y se sirven mismo-origen en el export.
 */
let workerMapLibreListo = false;
function asegurarWorkerMapLibre() {
  if (workerMapLibreListo || typeof window === 'undefined') return;
  setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
  workerMapLibreListo = true;
}

/**
 * El mapa propiamente dicho (sólo web).
 *
 * Vive en un `.web.tsx` porque `mapbox-gl` y `maplibre-gl` son librerías de
 * DOM: importarlas desde un archivo compartido las metería también en el bundle
 * nativo, donde no existe `window` y el import revienta al arrancar.
 *
 * **Por qué los marcadores son HTML y no capas del mapa.** Mapbox sabe agrupar
 * solo con `cluster: true`, pero eso dibuja círculos de color: para poner la
 * foto de cada publicación habría que cargar cada imagen dentro del estilo con
 * `addImage`, una por una. Agrupando con `supercluster` y pintando marcadores
 * HTML, la foto es un `<img>` común y el diseño se hace con CSS.
 */

type Props = {
  sesion: MapaSesion;
  puntos: MapaPunto[];
  /** Dónde se centra el mapa y desde dónde se miden las distancias. */
  centro: { lat: number; lng: number };
  /**
   * Posición real del dispositivo, para el puntito celeste. Va aparte del
   * centro a propósito: el centro se mueve cuando el usuario arrastra el mapa
   * o cuando no hay permiso de GPS y se cae a la zona del perfil, y en esos
   * casos "vos estás acá" estaría marcando cualquier lado. Si no hay GPS, no se
   * dibuja nada — mejor ningún punto que uno que miente.
   */
  miUbicacion?: { lat: number; lng: number } | null;
  /** Radio de incerteza del GPS en metros; dibuja el halo de precisión. */
  precisionM?: number | null;
  /** Sólo nativo: la cámara sigue al usuario. En web se ignora. */
  seguirme?: boolean;
  /**
   * Pedido de centrar el mapa en un punto. El `nonce` existe para poder pedir
   * dos veces el MISMO punto: sin él, tocar "centrarme" estando ya ahí no
   * cambiaría la prop y no pasaría nada.
   */
  irA?: { lat: number; lng: number; nonce: number } | null;
  oscuro: boolean;
  /** Se dispara al tocar un pin (uno o varios apilados). */
  onSeleccion: (puntos: MapaPunto[]) => void;
  /** El usuario movió el mapa; sirve para volver a pedir puntos. */
  onMover?: (centro: { lat: number; lng: number }) => void;
};

/**
 * Mapa vivo entre navegaciones.
 *
 * Mapbox factura por `new Map()`, así que entrar y salir de la pantalla diez
 * veces son diez cargas aunque sea el mismo mapa. Guardando la instancia y su
 * contenedor acá afuera, al volver se re-engancha el mismo nodo y no se crea
 * nada: una sola carga por sesión del navegador en vez de una por visita.
 *
 * Se descarta y se rehace si cambió el motor o el estilo (tema claro/oscuro),
 * que son las dos cosas que no se pueden cambiar en caliente.
 */
type MapaVivo = { mapa: any; nodo: HTMLDivElement; clave: string; sesion: MapaSesion };

let vivo: MapaVivo | null = null;

/**
 * Creación en curso.
 *
 * React monta, desmonta y vuelve a montar en desarrollo, y el efecto de crear
 * el mapa es asíncrono (espera el `import()` de la librería). Sin esta
 * promesa compartida, los dos montajes veían `vivo === null` a la vez y
 * **creaban dos mapas** sobre el mismo contenedor. El segundo tapaba al
 * primero, la limpieza del primero le arrancaba el nodo al segundo, y un mapa
 * despegado del DOM nunca termina de cargar: el evento `load` no llegaba
 * nunca, `listo` se quedaba en false y no se dibujaba ni un marcador — ni los
 * pines ni el punto de "vos estás acá".
 *
 * Y en producción, además, el segundo mapa sería una carga de cupo regalada.
 */
let creando: Promise<MapaVivo | null> | null = null;

/** Clave de reuso: sólo el tema, que es lo único que obliga a rehacer el mapa. */
export function claveMapaVivo(oscuro: boolean): string {
  return oscuro ? 'oscuro' : 'claro';
}

/**
 * La sesión del mapa que ya está montado, si sirve para este tema.
 *
 * La pantalla la consulta ANTES de pedirle una nueva al servidor. Sin esto,
 * entrar y salir del mapa descontaba una carga cada vez aunque el mapa fuera
 * literalmente el mismo objeto: el contador se adelantaba a lo que Mapbox
 * factura de verdad y la app se pasaba a MapLibre mucho antes de tiempo.
 */
export function sesionMapaViva(oscuro: boolean): MapaSesion | null {
  return vivo && vivo.clave === claveMapaVivo(oscuro) ? vivo.sesion : null;
}

/**
 * Estilo de MapLibre cuando no hay token de Mapbox.
 *
 * Usa los mosaicos de Carto (gratis, sin cuenta) y encima les aplica un filtro
 * CSS para que peguen con la estética del resto: sin eso el fallback se ve como
 * un mapa de otra app.
 */
function estiloMapLibre(oscuro: boolean) {
  const base = oscuro
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  return base;
}

const CSS_ID = 'rh-mapa-estilos';

/** Estilos de los marcadores. Se inyectan una sola vez. */
function inyectarEstilos() {
  if (document.getElementById(CSS_ID)) return;
  const el = document.createElement('style');
  el.id = CSS_ID;
  el.textContent = `
/* Base MapLibre/Mapbox: sin esto (o sin el .css del export) el canvas queda en 0px. */
.maplibregl-map, .mapboxgl-map {
  position:relative; width:100%; height:100%; overflow:hidden;
}
.maplibregl-canvas-container, .mapboxgl-canvas-container,
.maplibregl-canvas, .mapboxgl-canvas {
  position:absolute; left:0; top:0; width:100%; height:100%;
}

.rh-pin { cursor:pointer; will-change:transform; transition:transform .18s cubic-bezier(.2,.8,.3,1); }
.rh-pin:hover { transform:scale(1.12); z-index:5; }

.rh-pin-foto {
  width:46px; height:46px; border-radius:50%;
  border:2.5px solid var(--rh-c); background:#111 center/cover no-repeat;
  box-shadow:0 0 0 3px rgba(0,0,0,.35), 0 0 18px var(--rh-c), 0 6px 14px rgba(0,0,0,.45);
  position:relative; overflow:hidden;
}
.rh-pin-foto img { width:100%; height:100%; object-fit:cover; display:block; }
.rh-pin-vacio { display:flex; align-items:center; justify-content:center; font-size:20px; }

/* Punta del pin: sale del borde de abajo del círculo. */
.rh-pin-punta {
  position:absolute; left:50%; bottom:-7px; transform:translateX(-50%) rotate(45deg);
  width:12px; height:12px; background:var(--rh-c); border-radius:2px;
}

.rh-cluster {
  width:52px; height:52px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font:700 17px/1 system-ui,sans-serif; color:#fff; cursor:pointer;
  background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.28), transparent 60%), var(--rh-c);
  box-shadow:0 0 0 4px rgba(255,255,255,.12), 0 0 26px var(--rh-c), 0 8px 18px rgba(0,0,0,.5);
  position:relative;
}
/* Anillo que late, para que se lea como "acá hay varios". */
.rh-cluster::after {
  content:''; position:absolute; inset:-6px; border-radius:50%;
  border:1.5px solid var(--rh-c); opacity:.55; animation:rh-latido 2.4s ease-out infinite;
}
@keyframes rh-latido {
  0% { transform:scale(.9); opacity:.55; }
  70% { transform:scale(1.35); opacity:0; }
  100% { transform:scale(1.35); opacity:0; }
}

/* Marcador de "vos estás acá". */
.rh-yo { width:18px; height:18px; border-radius:50%; background:#4CC9F0; position:relative;
  border:3px solid #fff; box-shadow:0 0 0 2px rgba(76,201,240,.5), 0 0 22px #4CC9F0; }
/* Latido: distingue "esta es tu posicion, en vivo" de un pin cualquiera. */
.rh-yo::after {
  content:''; position:absolute; inset:-5px; border-radius:50%;
  border:2px solid #4CC9F0; animation:rh-latido 2s ease-out infinite;
}

/* La marca de agua de Mapbox/MapLibre tapa la hoja inferior. */
.maplibregl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-left { display:none; }

/* La atribucion se achica y se apaga; los controles de zoom viven en la misma
   esquina y tienen que quedar legibles y tocables, asi que se estilan aparte. */
.maplibregl-ctrl-attrib, .mapboxgl-ctrl-attrib { opacity:.3; transform:scale(.75); transform-origin:bottom right; }
.maplibregl-ctrl-bottom-right .maplibregl-ctrl-group,
.mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group {
  /* Levantado para no quedar debajo de los chips de radio ni de la barra. */
  margin-bottom:150px; border-radius:14px; overflow:hidden;
  background:rgba(10,14,20,.72); backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.14); box-shadow:0 6px 20px rgba(0,0,0,.45);
}
.maplibregl-ctrl-bottom-right button, .mapboxgl-ctrl-bottom-right button { background:transparent; }
.maplibregl-ctrl-bottom-right button + button,
.mapboxgl-ctrl-bottom-right button + button { border-top:1px solid rgba(255,255,255,.12); }
.maplibregl-ctrl-bottom-right button span, .mapboxgl-ctrl-bottom-right button span { filter:invert(1); }
`;
  document.head.appendChild(el);
}

/**
 * Edificios en 3D.
 *
 * Es lo que más cambia la percepción de "futurista", y sale del propio estilo,
 * sin datos extra. Las dos fuentes se arman distinto y por eso hay dos ramas:
 * Mapbox usa la fuente `composite` con `height`/`min_height`, y los estilos de
 * Carto (OpenMapTiles) usan una fuente vectorial con `render_height` y
 * `render_min_height`. Hasta que esto estuvo, MapLibre se veía plano al lado
 * de Mapbox y de ahí venía la diferencia.
 */
function agregarEdificios(mapa: any, oscuro: boolean): void {
  try {
    // Con el mapa reusado la capa ya está; agregarla dos veces tira error.
    if (mapa.getLayer('rh-edificios')) return;

    const estilo = mapa.getStyle();
    const capas = estilo?.layers ?? [];
    // Debajo de las etiquetas, para no taparlas con los volúmenes.
    const etiqueta = capas.find((c: any) => c.type === 'symbol' && c.layout?.['text-field']);
    const color = oscuro ? '#1b2540' : '#c9d4e8';

    if (mapa.getSource('composite')) {
      mapa.addLayer(
        {
          id: 'rh-edificios',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.65,
          },
        },
        etiqueta?.id
      );
      return;
    }

    // Se busca la fuente vectorial en vez de asumir su nombre: Carto la llama
    // `carto`, otros proveedores de OpenMapTiles la llaman `openmaptiles`.
    const fuente = Object.keys(estilo?.sources ?? {}).find(
      (k) => (estilo.sources as any)[k]?.type === 'vector'
    );
    if (!fuente) return;

    mapa.addLayer(
      {
        id: 'rh-edificios',
        source: fuente,
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': color,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.6,
        },
      },
      etiqueta?.id
    );
  } catch {
    // Un estilo sin capa de edificios no es un error: el mapa va igual.
  }
}

export function MapaLienzo({
  sesion,
  puntos,
  centro,
  miUbicacion,
  precisionM,
  irA,
  oscuro,
  onSeleccion,
  onMover,
}: Props) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<any>(null);
  const marcadoresRef = useRef<any[]>([]);
  const marcadorYoRef = useRef<any>(null);
  const glRef = useRef<any>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los handlers cambian en cada render; el efecto que crea el mapa corre una
  // sola vez. Guardarlos en refs evita recrear el mapa por un cambio de prop
  // (y con él, gastar otra carga del cupo de Mapbox).
  const onSeleccionRef = useRef(onSeleccion);
  const onMoverRef = useRef(onMover);
  onSeleccionRef.current = onSeleccion;
  onMoverRef.current = onMover;

  // --- Crear (o recuperar) el mapa ----------------------------------------
  useEffect(() => {
    let activo = true;
    inyectarEstilos();

    // Handler estable: hay que poder desengancharlo al desmontar sin llevarse
    // puesto el mapa, que sobrevive a esta pantalla.
    const avisarMovimiento = () => {
      const m = mapaRef.current;
      if (!m) return;
      const c = m.getCenter();
      onMoverRef.current?.({ lat: c.lat, lng: c.lng });
    };

    (async () => {
      const clave = claveMapaVivo(oscuro);
      const esMapbox = sesion.motor === 'mapbox' && !!sesion.token;
      if (!esMapbox) asegurarWorkerMapLibre();
      const gl: any = esMapbox ? mapboxgl : maplibregl;
      glRef.current = gl;

      /** Crea el mapa de cero. Sólo la llama `obtener()`, y una sola vez. */
      const crear = async (): Promise<MapaVivo | null> => {
        // El anterior ya no sirve (cambió el tema o el motor).
        if (vivo) {
          vivo.mapa.remove();
          vivo.nodo.remove();
          vivo = null;
        }

        const nodo = document.createElement('div');
        nodo.style.position = 'absolute';
        nodo.style.inset = '0';
        // Se cuelga del body mientras carga: MapLibre necesita estar en el
        // documento para medir y terminar de inicializar, y el contenedor de
        // React puede no existir todavía.
        nodo.style.visibility = 'hidden';
        document.body.appendChild(nodo);

        let motorGl: any = gl;
        let estilo: string = esMapbox && sesion.estilo ? sesion.estilo : estiloMapLibre(oscuro);
        let sesionUsada = sesion;

        if (esMapbox) motorGl.accessToken = sesion.token;

        const armar = (lib: any, styleUrl: string) => {
          const mapa = new lib.Map({
            container: nodo,
            style: styleUrl,
            center: [centro.lng, centro.lat],
            zoom: 12.4,
            pitch: 45,
            bearing: -12,
            antialias: true,
            attributionControl: true,
          });
          mapa.addControl(new lib.NavigationControl({ visualizePitch: true }), 'bottom-right');
          return mapa;
        };

        let mapa: any;
        try {
          mapa = armar(motorGl, estilo);
        } catch {
          // Token/Map inválido → MapLibre + worker.
          asegurarWorkerMapLibre();
          motorGl = maplibregl;
          estilo = estiloMapLibre(oscuro);
          sesionUsada = { ...sesion, motor: 'maplibre' };
          delete (sesionUsada as { token?: string }).token;
          delete (sesionUsada as { estilo?: string }).estilo;
          mapa = armar(motorGl, estilo);
          glRef.current = motorGl;
        }

        // Mapbox montó pero el estilo no baja (URL restriction, 401…): Carto.
        if (esMapbox) {
          mapa.once('error', () => {
            try {
              asegurarWorkerMapLibre();
              mapa.setStyle(estiloMapLibre(oscuro));
            } catch {
              /* se queda el error original en consola */
            }
          });
        }

        nodo.style.visibility = '';
        vivo = { mapa, nodo, clave, sesion: sesionUsada };
        return vivo;
      };

      /** Devuelve el mapa vivo, esperando al que ya se esté creando. */
      const obtener = async (): Promise<MapaVivo | null> => {
        if (vivo && vivo.clave === clave) return vivo;
        if (creando) return creando;
        creando = crear().finally(() => {
          creando = null;
        });
        return creando;
      };

      try {
        const v = await obtener();
        if (!activo || !v) return;

        // El ref a veces no está listo justo después del await (Strict Mode /
        // remount). Reintentamos un par de frames antes de tirar el mapa.
        let host = contenedor.current;
        for (let i = 0; !host && i < 10 && activo; i++) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          host = contenedor.current;
        }
        if (!activo || !host) return;

        host.appendChild(v.nodo);
        mapaRef.current = v.mapa;
        glRef.current = (sesion.motor === 'mapbox' && sesion.token ? mapboxgl : maplibregl) as any;
        // Si crear() cayó a MapLibre, el ref ya quedó apuntando ahí.
        if (v.sesion.motor === 'maplibre') glRef.current = maplibregl as any;
        v.mapa.resize();
        v.mapa.jumpTo({ center: [centro.lng, centro.lat] });
        v.mapa.on('moveend', avisarMovimiento);

        // Ya se pueden dibujar los marcadores.
        //
        // **No se espera al evento `load`.** Los pines y el punto de "vos
        // estás acá" son nodos HTML encima del lienzo: no necesitan que las
        // baldosas del fondo hayan terminado de bajar. Atarlos a `load` los
        // dejaba invisibles cuando el proveedor de mapas tardaba o fallaba
        // —el mapa se veía vacío, sin una sola publicación— y, como ese evento
        // dispara una sola vez por instancia y el mapa se reusa entre visitas,
        // en la segunda visita no llegaba nunca.
        setListo(true);

        // Los edificios 3D sí son del estilo, así que esperan a que cargue.
        // Si nunca carga, es sólo relieve que falta: el mapa sigue usable.
        if (v.mapa.isStyleLoaded()) agregarEdificios(v.mapa, oscuro);
        else v.mapa.once('styledata', () => agregarEdificios(v.mapa, oscuro));

        // Resize cuando el contenedor ya tiene tamaño real (flex/absolute).
        requestAnimationFrame(() => {
          try {
            v.mapa.resize();
          } catch {
            /* mapa ya removido */
          }
        });
      } catch (e: any) {
        if (activo) setError(e?.message ?? 'No se pudo cargar el mapa');
      }
    })();

    return () => {
      activo = false;
      marcadoresRef.current.forEach((m) => m.remove());
      marcadoresRef.current = [];

      // El mapa NO se destruye: se desengancha y queda guardado para la próxima
      // visita. Destruirlo obligaría a un `new Map()` al volver, que es
      // justamente la operación que Mapbox factura.
      mapaRef.current?.off('moveend', avisarMovimiento);
      if (vivo?.nodo.parentElement) {
        vivo.nodo.parentElement.removeChild(vivo.nodo);
      }
      mapaRef.current = null;
    };
    // Sin dependencias: recrear el mapa gastaría otra carga del cupo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Redibujar marcadores ------------------------------------------------
  const redibujar = useCallback(() => {
    const mapa = mapaRef.current;
    const gl = glRef.current;
    if (!mapa || !gl) return;

    marcadoresRef.current.forEach((m) => m.remove());
    marcadoresRef.current = [];

    if (puntos.length === 0) return;

    const indice = new Supercluster<{ punto: MapaPunto }>({
      radius: 58,
      maxZoom: 17,
    });
    indice.load(
      puntos.map((p) => ({
        type: 'Feature' as const,
        properties: { punto: p },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      }))
    );

    const b = mapa.getBounds();
    const zoom = Math.round(mapa.getZoom());
    const grupos = indice.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom
    );

    for (const g of grupos) {
      const [lng, lat] = g.geometry.coordinates;
      const el = document.createElement('div');
      el.className = 'rh-pin';

      if ((g.properties as any).cluster) {
        const cantidad = (g.properties as any).point_count as number;
        const hijos = indice.getLeaves((g.properties as any).cluster_id, Infinity)
          .map((h: any) => h.properties.punto as MapaPunto);

        // El color del grupo es el de la capa que más aporta, para que un
        // grupo casi todo de adopciones se lea como adopciones.
        const conteo = new Map<MapaPunto['tipo'], number>();
        hijos.forEach((h) => conteo.set(h.tipo, (conteo.get(h.tipo) ?? 0) + 1));
        const dominante = [...conteo.entries()].sort((x, y) => y[1] - x[1])[0][0];

        el.innerHTML = `<div class="rh-cluster">${cantidad > 99 ? '99+' : cantidad}</div>`;
        el.style.setProperty('--rh-c', MAPA_TIPO_POR_CLAVE[dominante]?.color ?? '#4CC9F0');
        el.onclick = (ev) => {
          ev.stopPropagation();
          onSeleccionRef.current(hijos);
        };
      } else {
        const punto = (g.properties as any).punto as MapaPunto;
        const meta = MAPA_TIPO_POR_CLAVE[punto.tipo];
        const url = punto.fotoPath ? rhMediaUrl(punto.fotoPath) : null;

        el.innerHTML = `
          <div class="rh-pin-foto${url ? '' : ' rh-pin-vacio'}">
            ${url ? `<img src="${url}" alt="" loading="lazy" />` : '🐾'}
            <span class="rh-pin-punta"></span>
          </div>`;
        el.style.setProperty('--rh-c', meta?.color ?? '#4CC9F0');
        el.onclick = (ev) => {
          ev.stopPropagation();
          onSeleccionRef.current([punto]);
        };
      }

      marcadoresRef.current.push(
        new gl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(mapa)
      );
    }

  }, [puntos]);

  /**
   * "Vos estás acá", en su propio marcador y su propio efecto.
   *
   * Antes vivía dentro de `redibujar()`, que arranca con
   * `if (puntos.length === 0) return`: en una zona sin publicaciones el punto
   * azul simplemente no se dibujaba, que es justo cuando más se lo busca.
   * Además se borraba y recreaba en cada `moveend`, así que parpadeaba al
   * arrastrar el mapa.
   *
   * El círculo de precisión va aparte del punto: si el GPS dice "estás en
   * algún lugar de estas 3 cuadras", dibujar un punto chiquito y nítido
   * miente sobre lo que el teléfono realmente sabe.
   */
  useEffect(() => {
    const mapa = mapaRef.current;
    const gl = glRef.current;
    if (!listo || !mapa || !gl) return;

    if (marcadorYoRef.current) {
      marcadorYoRef.current.remove();
      marcadorYoRef.current = null;
    }
    if (!miUbicacion) return;

    const yo = document.createElement('div');
    yo.className = 'rh-yo';
    marcadorYoRef.current = new gl.Marker({ element: yo })
      .setLngLat([miUbicacion.lng, miUbicacion.lat])
      .addTo(mapa);

    return () => {
      marcadorYoRef.current?.remove();
      marcadorYoRef.current = null;
    };
  }, [listo, miUbicacion?.lat, miUbicacion?.lng]);

  // El círculo de precisión se dibuja como capa del mapa y no como marcador
  // HTML porque tiene que escalar con el zoom: son metros en el terreno, no
  // píxeles en la pantalla.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!listo || !mapa) return;

    const datos = {
      type: 'FeatureCollection' as const,
      features:
        miUbicacion && precisionM && precisionM > 25
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'Point' as const, coordinates: [miUbicacion.lng, miUbicacion.lat] },
              },
            ]
          : [],
    };

    const fuente = mapa.getSource('rh-precision');
    if (fuente) {
      fuente.setData(datos);
      return;
    }

    try {
      mapa.addSource('rh-precision', { type: 'geojson', data: datos });
      mapa.addLayer({
        id: 'rh-precision',
        type: 'circle',
        source: 'rh-precision',
        paint: {
          // El radio en metros se convierte a píxeles con la escala del zoom.
          'circle-radius': [
            'interpolate', ['exponential', 2], ['zoom'],
            10, ['/', ['literal', precisionM ?? 0], 100],
            20, ['/', ['literal', precisionM ?? 0], 0.1],
          ],
          'circle-color': '#4CC9F0',
          'circle-opacity': 0.12,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#4CC9F0',
          'circle-stroke-opacity': 0.35,
        },
      });
    } catch {
      // Si el estilo todavía no cargó, el próximo cambio de ubicación reintenta.
    }
  }, [listo, miUbicacion?.lat, miUbicacion?.lng, precisionM]);

  useEffect(() => {
    if (!listo) return;
    redibujar();
    const mapa = mapaRef.current;
    // Reagrupar al terminar de mover o hacer zoom: con otro zoom, los grupos
    // que estaban juntos se abren.
    mapa?.on('moveend', redibujar);
    mapa?.on('zoomend', redibujar);
    return () => {
      mapa?.off('moveend', redibujar);
      mapa?.off('zoomend', redibujar);
    };
  }, [listo, redibujar]);

  // Volar al punto pedido (botón "centrarme", o un resultado del listado).
  useEffect(() => {
    if (!listo || !irA || !mapaRef.current) return;
    mapaRef.current.flyTo({ center: [irA.lng, irA.lat], zoom: 15.5, duration: 900 });
  }, [listo, irA?.nonce, irA?.lat, irA?.lng]);

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ff6b6b', fontFamily: 'system-ui' }}>
        No se pudo cargar el mapa: {error}
      </div>
    );
  }

  return <div ref={contenedor} style={{ position: 'absolute', inset: 0 }} />;
}
