import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { hapticLeve } from '../utils/haptics';

/** Ancho de cada manija, en px. */
const MANIJA = 18;

/** Cuántas miniaturas se intentan sacar a lo largo del video. */
const MINIATURAS = 10;

/** Un recorte más corto que esto no se puede ver: se ignora el gesto. */
const MIN_DURACION_SEG = 1;

/** Qué se está arrastrando ahora mismo. */
type Arrastre = 'inicio' | 'fin' | 'cabezal' | null;

type Props = {
  uri: string;
  duracionSegundos: number;
  inicioSeg: number;
  finSeg: number;
  sinAudio: boolean;
  /** 0.5 / 1 / 2. Se aplica al reproducir, no re-encodea (ver sql/024). */
  velocidad: number;
  /** Segundo que se está reproduciendo, para dibujar el cabezal. */
  posicionSeg: number;
  onChange: (inicioSeg: number, finSeg: number) => void;
  /**
   * Segundo que hay que mostrar mientras se arrastra; `null` al soltar.
   * El editor lo usa para pausar el video y saltar al frame exacto, así se ve
   * dónde se está cortando en vez de tener que publicar para enterarse.
   */
  onScrub: (seg: number | null) => void;
  onToggleAudio: () => void;
  onToggleVelocidad: () => void;
};

const acotar = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Timeline para recortar el video y elegir desde dónde reproducirlo.
 *
 * El recorte es **no destructivo**: no se re-encodea nada, se elige un tramo y
 * el reproductor arranca y corta ahí. Recortar de verdad exigiría build nativo
 * (ffmpeg-kit fue retirado en 2025), y para una historia que vence a las 24hs
 * no vale la pena: el archivo pesa igual pero dura lo que el usuario eligió.
 *
 * Además del tramo hay un **cabezal**: tocar o arrastrar sobre la pista salta a
 * ese segundo. Sirve para revisar un momento puntual sin bancarse el video
 * entero cada vez que se corrige el recorte.
 *
 * Las miniaturas sólo se pueden extraer en web (canvas sobre el <video>). En
 * nativo se muestra una regla de tiempo, que cumple la misma función de
 * referencia sin depender de una librería de thumbnails.
 */
export function StoryTrimBar({
  uri,
  duracionSegundos,
  inicioSeg,
  finSeg,
  sinAudio,
  velocidad,
  posicionSeg,
  onChange,
  onScrub,
  onToggleAudio,
  onToggleVelocidad,
}: Props) {
  const [ancho, setAncho] = useState(0);
  const pistaRef = useRef<View | null>(null);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const [arrastre, setArrastre] = useState<Arrastre>(null);
  const [burbujaSeg, setBurbujaSeg] = useState(0);

  /**
   * Todo lo que los gestos necesitan leer vive acá.
   *
   * Es a propósito: si los PanResponder dependieran de props, se recrearían en
   * cada frame del arrastre (las props cambian con cada `onChange`) y React
   * Native re-registraría los handlers en medio del gesto — que es exactamente
   * lo que hacía que el recorte se trabara a mitad de camino.
   */
  const est = useRef({ inicio: inicioSeg, fin: finSeg, dur: duracionSegundos, ancho: 0 });
  est.current.inicio = inicioSeg;
  est.current.fin = finSeg;
  est.current.dur = duracionSegundos;
  est.current.ancho = ancho;

  const cbs = useRef({ onChange, onScrub });
  cbs.current.onChange = onChange;
  cbs.current.onScrub = onScrub;

  /** Valor del elemento arrastrado al empezar el gesto. */
  const base = useRef(0);

  const medir = useCallback((w: number) => {
    if (w > 0) setAncho((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  }, []);

  /**
   * `onLayout` no es confiable acá: el panel de recorte aparece de golpe sobre
   * una pantalla ya montada y, según cuándo caiga el primer layout, llega con
   * ancho 0 y no vuelve a dispararse. Con ancho 0 los segundos por píxel dan 0
   * y el arrastre se ignora entero — eso era lo que hacía que el recorte
   * anduviera a veces sí y a veces no. Medimos también a mano hasta tener un
   * ancho real.
   */
  useEffect(() => {
    let intentos = 0;
    const id = setInterval(() => {
      intentos++;
      const nodo = pistaRef.current;
      if (nodo) {
        nodo.measure?.((_x, _y, w) => medir(w));
      }
      if (est.current.ancho > 0 || intentos > 20) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [medir]);

  useEffect(() => {
    if (Platform.OS !== 'web' || duracionSegundos <= 0) return;
    let cancelado = false;

    // Un <video> fuera del DOM: se lo posiciona en N instantes y se copia cada
    // frame a un canvas. Es la única forma de sacar miniaturas en web sin
    // sumar dependencias.
    (async () => {
      const video = document.createElement('video');
      video.src = uri;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('no se pudo leer el video'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 110;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frames: string[] = [];
        for (let i = 0; i < MINIATURAS; i++) {
          if (cancelado) return;
          const t = (duracionSegundos / MINIATURAS) * i;
          video.currentTime = t;
          await new Promise<void>((resolve) => {
            video.onseeked = () => resolve();
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.5));
        }
        if (!cancelado) setMiniaturas(frames);
      } catch {
        // Sin miniaturas la barra sigue siendo usable: se ve la regla.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [uri, duracionSegundos]);

  const segPorPx = () => (est.current.dur > 0 && est.current.ancho > 0 ? est.current.dur / est.current.ancho : 0);

  const empezar = (que: Exclude<Arrastre, null>, valor: number) => {
    base.current = valor;
    setArrastre(que);
    setBurbujaSeg(valor);
    hapticLeve();
    cbs.current.onScrub(valor);
  };

  const terminar = () => {
    setArrastre(null);
    cbs.current.onScrub(null);
  };

  // Deps vacías a propósito: se crean una sola vez y leen todo de los refs.
  const panInicio = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => empezar('inicio', est.current.inicio),
        onPanResponderMove: (_e, gesto) => {
          const spp = segPorPx();
          if (spp === 0) return;
          const nuevo = acotar(base.current + gesto.dx * spp, 0, est.current.fin - MIN_DURACION_SEG);
          cbs.current.onChange(nuevo, est.current.fin);
          setBurbujaSeg(nuevo);
          cbs.current.onScrub(nuevo);
        },
        onPanResponderRelease: terminar,
        onPanResponderTerminate: terminar,
      }),
    []
  );

  const panFin = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => empezar('fin', est.current.fin),
        onPanResponderMove: (_e, gesto) => {
          const spp = segPorPx();
          if (spp === 0) return;
          const nuevo = acotar(
            base.current + gesto.dx * spp,
            est.current.inicio + MIN_DURACION_SEG,
            est.current.dur
          );
          cbs.current.onChange(est.current.inicio, nuevo);
          setBurbujaSeg(nuevo);
          cbs.current.onScrub(nuevo);
        },
        onPanResponderRelease: terminar,
        onPanResponderTerminate: terminar,
      }),
    []
  );

  /**
   * La pista entera es scrubbable: tocar salta a ese segundo y arrastrar
   * recorre el video. Las manijas son hijas de la pista, así que ganan la
   * negociación del gesto cuando se toca justo encima de ellas.
   */
  const panPista = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const spp = segPorPx();
          if (spp === 0) return;
          const t = acotar(e.nativeEvent.locationX * spp, est.current.inicio, est.current.fin);
          empezar('cabezal', t);
        },
        onPanResponderMove: (_e, gesto) => {
          const spp = segPorPx();
          if (spp === 0) return;
          const t = acotar(base.current + gesto.dx * spp, est.current.inicio, est.current.fin);
          setBurbujaSeg(t);
          cbs.current.onScrub(t);
        },
        onPanResponderRelease: terminar,
        onPanResponderTerminate: terminar,
      }),
    []
  );

  if (duracionSegundos <= 0) return null;

  const aPx = (seg: number) => (ancho > 0 ? (seg / duracionSegundos) * ancho : 0);
  const izquierda = aPx(inicioSeg);
  const derecha = aPx(finSeg);
  const seleccionado = Math.max(0, finSeg - inicioSeg);

  // Mientras se arrastra manda la burbuja: el cabezal tiene que seguir al dedo
  // sin esperar a que el reproductor confirme el salto.
  const cabezalSeg = arrastre ? burbujaSeg : acotar(posicionSeg, inicioSeg, finSeg);
  const cabezalX = aPx(cabezalSeg);

  const miniBurbuja =
    miniaturas.length > 0
      ? miniaturas[acotar(Math.floor((burbujaSeg / duracionSegundos) * MINIATURAS), 0, miniaturas.length - 1)]
      : null;

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={[type.caption, styles.duracion]}>
          {seleccionado.toFixed(1)}s de {duracionSegundos.toFixed(1)}s
        </Text>
        <View style={styles.botonera}>
          <Pressable
            onPress={() => {
              hapticLeve();
              onToggleVelocidad();
            }}
            style={[styles.audioBtn, velocidad !== 1 && styles.audioBtnActivo]}
            hitSlop={8}
          >
            <Ionicons name="speedometer-outline" size={15} color="#fff" />
            <Text style={[type.caption, styles.audioLabel]}>{velocidad}x</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticLeve();
              onToggleAudio();
            }}
            style={[styles.audioBtn, sinAudio && styles.audioBtnActivo]}
            hitSlop={8}
          >
            <Ionicons name={sinAudio ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
            <Text style={[type.caption, styles.audioLabel]}>{sinAudio ? 'Sin audio' : 'Con audio'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Frame y segundo exactos de lo que se está tocando. Sin esto el recorte
          es a ciegas: se elige un número y recién al publicar se ve dónde cayó. */}
      {arrastre ? (
        <View
          style={[styles.burbuja, { left: acotar(cabezalX - 34, 0, Math.max(0, ancho - 68)) }]}
          pointerEvents="none"
        >
          {miniBurbuja ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <img src={miniBurbuja} style={{ width: 60, height: 84, objectFit: 'cover', borderRadius: 6 } as any} alt="" />
          ) : null}
          <Text style={styles.burbujaTexto}>
            {burbujaSeg.toFixed(1)}s
          </Text>
        </View>
      ) : null}

      <View
        ref={pistaRef}
        style={styles.pista}
        onLayout={(e) => medir(e.nativeEvent.layout.width)}
        {...panPista.panHandlers}
      >
        {miniaturas.length > 0 ? (
          <View style={styles.miniaturas} pointerEvents="none">
            {miniaturas.map((src, i) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <img key={i} src={src} style={{ flex: 1, height: '100%', objectFit: 'cover' } as any} alt="" />
            ))}
          </View>
        ) : (
          <View style={styles.regla} pointerEvents="none">
            {Array.from({ length: MINIATURAS }).map((_, i) => (
              <View key={i} style={styles.reglaMarca}>
                <Text style={styles.reglaTexto}>
                  {Math.round((duracionSegundos / MINIATURAS) * i)}s
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Zonas descartadas: oscurecidas, para que se lea de un vistazo qué
            queda afuera del recorte. */}
        <View style={[styles.descartado, { left: 0, width: izquierda }]} pointerEvents="none" />
        <View style={[styles.descartado, { left: derecha, right: 0 }]} pointerEvents="none" />

        <View
          style={[styles.seleccion, { left: izquierda, width: Math.max(0, derecha - izquierda) }]}
          pointerEvents="none"
        />

        <View style={[styles.cabezal, { left: cabezalX - 1 }]} pointerEvents="none">
          <View style={styles.cabezalPunta} />
        </View>

        <View {...panInicio.panHandlers} style={[styles.manija, { left: izquierda - MANIJA / 2 }]}>
          <View style={styles.manijaLinea} />
        </View>
        <View {...panFin.panHandlers} style={[styles.manija, { left: derecha - MANIJA / 2 }]}>
          <View style={styles.manijaLinea} />
        </View>
      </View>

      <Text style={[type.caption, styles.ayuda]}>
        Tocá la barra para ver desde ahí · arrastrá los bordes para recortar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { paddingHorizontal: 16, paddingVertical: 10 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  duracion: { color: '#fff' },
  botonera: { flexDirection: 'row', gap: 6 },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  audioBtnActivo: { backgroundColor: 'rgba(255,92,106,0.85)' },
  audioLabel: { color: '#fff' },
  burbuja: {
    position: 'absolute',
    bottom: 92,
    width: 68,
    alignItems: 'center',
    gap: 3,
    padding: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 5,
  },
  burbujaTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pista: {
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  miniaturas: { flexDirection: 'row', height: '100%' },
  regla: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  reglaMarca: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' },
  reglaTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  descartado: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  seleccion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FF5C6A',
    borderRadius: radii.sm,
  },
  cabezal: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff' },
  cabezalPunta: {
    position: 'absolute',
    top: -3,
    left: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  manija: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MANIJA,
    backgroundColor: '#FF5C6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manijaLinea: { width: 2, height: 18, borderRadius: 1, backgroundColor: '#fff' },
  ayuda: { color: 'rgba(255,255,255,0.55)', marginTop: 6, textAlign: 'center' },
});
