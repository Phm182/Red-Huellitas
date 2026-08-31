import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { FichaSkinSvg } from './FichaSkinSvg';
import { Cancha, FichaSoccer, TableroSoccer, Vector } from './motor';
import { PelotaSkinSvg } from './PelotaSkinSvg';
import { SkinFichaId, SkinPelotaId, VarianteSkin } from './skins';

export type Posiciones = Record<string, Vector>;

export function idFicha(f: FichaSoccer): string {
  return `f${f.j}_${f.n}`;
}

export function posicionesDeTablero(t: TableroSoccer): Posiciones {
  const p: Posiciones = {};
  for (const f of t.fichas) p[idFicha(f)] = { x: f.x, y: f.y };
  p.pelota = t.pelota;
  return p;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Reproduce una animación a partir de trayectorias (una lista de posiciones
 * por cuerpo, ver `simularTiro`). Sirve para dos casos con el mismo código:
 *
 * - **Mi propio tiro**: `trayectorias` trae la física real cuadro a cuadro
 *   (puede ser una lista larga), y se reproduce escalada a `duracionMs`
 *   fijos — no importa cuántos cuadros físicos haya, la animación siempre
 *   dura lo mismo.
 * - **El tiro del rival** (llega por polling, sin cuadros intermedios):
 *   se le arma una "trayectoria" de sólo 2 puntos (posición vieja, posición
 *   nueva) y se reproduce igual — la interpolación lineal entre esos dos
 *   puntos es, ni más ni menos, el tween directo que se documentó como
 *   simplificación aceptada (no hay forma de saber los rebotes reales que
 *   vio el rival sin reproducir la física acá también).
 *
 * Devuelve una función para cancelar (limpieza al desmontar).
 */
export function reproducir(
  trayectorias: Record<string, Vector[]>,
  duracionMs: number,
  onFrame: (pos: Posiciones) => void,
  onFin: () => void
): () => void {
  const inicio = Date.now();
  const ids = Object.keys(trayectorias);
  let cancelado = false;

  function paso() {
    if (cancelado) return;
    const t = Math.min(1, (Date.now() - inicio) / duracionMs);
    const pos: Posiciones = {};
    for (const id of ids) {
      const arr = trayectorias[id]!;
      const posIdx = t * (arr.length - 1);
      const i0 = Math.floor(posIdx);
      const i1 = Math.min(arr.length - 1, i0 + 1);
      const frac = posIdx - i0;
      const a = arr[i0]!;
      const b = arr[i1]!;
      pos[id] = { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac) };
    }
    onFrame(pos);
    if (t < 1) {
      requestAnimationFrame(paso);
    } else {
      onFin();
    }
  }
  requestAnimationFrame(paso);

  return () => {
    cancelado = true;
  };
}

export type SkinDeJugador = { skin: SkinFichaId; variante: VarianteSkin };

type Props = {
  cancha: Cancha;
  fichas: FichaSoccer[];
  posiciones: Posiciones;
  miFicha: 1 | 2;
  /** Se puede arrastrar y tirar: mi turno, y no hay una animación en curso. */
  activo: boolean;
  lado: number;
  onTiro: (fichaId: string, impulso: Vector) => void;
  skinsPorJugador: Record<1 | 2, SkinDeJugador>;
  skinPelota: SkinPelotaId;
};

/** Cuánto se estira el arrastre antes de tirar: más lejos, más potencia. */
const FACTOR_POTENCIA = 0.18;
const POTENCIA_MAXIMA = 22;
const COLOR_J1 = '#E8577E';
const COLOR_J2 = '#5B9AD6';

/** Patrón de red: unas líneas cruzadas dentro del rectángulo del arco. */
function Red({ x, y, ancho, alto }: { x: number; y: number; ancho: number; alto: number }) {
  const lineas = 6;
  const els = [];
  for (let i = 0; i <= lineas; i++) {
    const fx = x + (ancho / lineas) * i;
    els.push(<Line key={`v${i}`} x1={fx} y1={y} x2={fx} y2={y + alto} stroke="#ffffff40" strokeWidth={1} />);
  }
  const filas = 4;
  for (let i = 0; i <= filas; i++) {
    const fy = y + (alto / filas) * i;
    els.push(<Line key={`h${i}`} x1={x} y1={fy} x2={x + ancho} y2={fy} stroke="#ffffff40" strokeWidth={1} />);
  }
  return <>{els}</>;
}

/**
 * Cancha de HueSoccer y el gesto de tiro.
 *
 * A diferencia de los tableros en grilla del resto de HuePlay (que usan un
 * único `PanResponder` sobre toda la grilla, ver `huematch/Tablero.tsx` o
 * `huezip/TableroZip.tsx`), acá cada ficha es un objeto libre en el plano —
 * no hay celdas — así que cada una tiene su propio `Gesture.Pan()`, mismo
 * patrón que usa `HueGotchiExperience.tsx` para arrastrar a la mascota.
 *
 * El gesto es "hondazo": se arrastra la ficha hacia atrás (en la dirección
 * contraria a donde se quiere tirar) y al soltar sale disparada hacia el
 * lado opuesto al arrastre, con una potencia proporcional a cuánto se
 * estiró.
 *
 * La cancha de juego (`cancha.ancho x cancha.alto`) no cambia de escala —
 * la "profundidad de arco" (donde vive la pelota cuando entra a la boca
 * del arco, ver el motor) se dibuja como una franja EXTRA arriba y abajo,
 * nunca escala el resto.
 */
export function CanchaSoccer({
  cancha,
  fichas,
  posiciones,
  miFicha,
  activo,
  lado,
  onTiro,
  skinsPorJugador,
  skinPelota,
}: Props) {
  const { colors } = useTheme();
  const escala = lado / cancha.ancho;
  const altoJuego = cancha.alto * escala;
  const offsetY = cancha.profundidadArco * escala;
  const altoTotal = altoJuego + offsetY * 2;

  const [arrastre, setArrastre] = useState<{ fichaId: string; dx: number; dy: number } | null>(null);

  const px = (x: number) => x * escala;
  // Todo lo que se dibuja en coordenadas de cancha se corre `offsetY` hacia
  // abajo, para dejarle lugar a la franja del arco de arriba.
  const py = (y: number) => y * escala + offsetY;

  const gestoDe = (fichaId: string) =>
    Gesture.Pan()
      .enabled(activo)
      .onUpdate((e) => {
        runOnJS(setArrastre)({ fichaId, dx: e.translationX, dy: e.translationY });
      })
      .onEnd((e) => {
        runOnJS(setArrastre)(null);
        const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
        if (dist < 6) return; // toque sin arrastre real: no dispara nada
        const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
        // El impulso va en la dirección OPUESTA al arrastre (hondazo): se
        // tira para atrás y sale para adelante.
        const impulso = {
          x: (-e.translationX / dist) * potencia,
          y: (-e.translationY / dist) * potencia,
        };
        runOnJS(onTiro)(fichaId, impulso);
      });

  const anchoArco = cancha.ancho * 0.4;
  const arcoX = px(cancha.ancho / 2 - anchoArco / 2);
  const arcoAncho = px(anchoArco);

  // Franjas de pasto cortado, como en cualquier cancha de verdad (y en la
  // referencia de Soccer Star) — antes era un rectángulo verde parejo, que
  // sin nada más encima se leía chato.
  const FRANJAS = 9;
  const anchoFranja = lado / FRANJAS;

  return (
    <View style={[styles.cancha, { width: lado, height: altoTotal, backgroundColor: '#1F6B3A' }]}>
      <Svg width={lado} height={altoTotal} style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: FRANJAS }, (_, i) => (
          <Rect
            key={i}
            x={i * anchoFranja}
            y={offsetY}
            width={anchoFranja}
            height={altoJuego}
            fill={i % 2 === 0 ? '#1F6B3A' : '#226F3E'}
          />
        ))}

        {/* Paneles de fondo de cada arco, con el color de quien lo defiende —
            mismo lenguaje que la referencia (paneles de colores detrás de la
            red), y ayuda a leer de un vistazo cuál arco es el propio. */}
        <Rect x={arcoX} y={0} width={arcoAncho} height={offsetY} fill={COLOR_J1} opacity={0.22} />
        <Rect x={arcoX} y={offsetY + altoJuego} width={arcoAncho} height={offsetY} fill={COLOR_J2} opacity={0.22} />

        {/* Redes, detrás de cada línea de arco. */}
        <Red x={arcoX} y={0} ancho={arcoAncho} alto={offsetY} />
        <Red x={arcoX} y={offsetY + altoJuego} ancho={arcoAncho} alto={offsetY} />

        <Rect x={0} y={offsetY} width={lado} height={altoJuego} fill="none" stroke="#ffffff55" strokeWidth={2} />
        <Line x1={0} y1={offsetY + altoJuego / 2} x2={lado} y2={offsetY + altoJuego / 2} stroke="#ffffff55" strokeWidth={2} />
        <Circle cx={lado / 2} cy={offsetY + altoJuego / 2} r={px(40)} fill="none" stroke="#ffffff55" strokeWidth={2} />

        {/* Postes: el marco de cada arco. */}
        <Rect x={arcoX} y={0} width={arcoAncho} height={offsetY} fill="none" stroke="#ffffffb0" strokeWidth={3} />
        <Rect x={arcoX} y={offsetY + altoJuego} width={arcoAncho} height={offsetY} fill="none" stroke="#ffffffb0" strokeWidth={3} />
        {/* Línea de gol, arriba y abajo. */}
        <Line x1={arcoX} y1={offsetY} x2={arcoX + arcoAncho} y2={offsetY} stroke={colors.primary} strokeWidth={4} />
        <Line
          x1={arcoX}
          y1={offsetY + altoJuego}
          x2={arcoX + arcoAncho}
          y2={offsetY + altoJuego}
          stroke={colors.primary}
          strokeWidth={4}
        />
      </Svg>

      {fichas.map((f) => {
        const id = idFicha(f);
        const pos = posiciones[id] ?? { x: f.x, y: f.y };
        const esMia = f.j === miFicha;
        const off = arrastre?.fichaId === id ? { x: arrastre.dx, y: arrastre.dy } : { x: 0, y: 0 };
        const diametro = px(cancha.radioFicha) * 2;
        const left = px(pos.x) - diametro / 2 + off.x;
        const top = py(pos.y) - diametro / 2 + off.y;
        const skinInfo = skinsPorJugador[f.j];

        const ficha = (
          <View
            style={[
              styles.ficha,
              { width: diametro, height: diametro, left, top, borderColor: esMia ? colors.primary : 'transparent' },
            ]}
          >
            <FichaSkinSvg
              skin={skinInfo.skin}
              variante={skinInfo.variante}
              colorEquipo={f.j === 1 ? COLOR_J1 : COLOR_J2}
              size={diametro}
            />
          </View>
        );

        if (!esMia) return <React.Fragment key={id}>{ficha}</React.Fragment>;
        return (
          <GestureDetector key={id} gesture={gestoDe(id)}>
            {ficha}
          </GestureDetector>
        );
      })}

      {(() => {
        const pos = posiciones.pelota ?? { x: cancha.ancho / 2, y: cancha.alto / 2 };
        const diametro = px(cancha.radioPelota) * 2;
        return (
          <View
            pointerEvents="none"
            style={[styles.pelota, { width: diametro, height: diametro, left: px(pos.x) - diametro / 2, top: py(pos.y) - diametro / 2 }]}
          >
            <PelotaSkinSvg skin={skinPelota} size={diametro} />
          </View>
        );
      })()}

      {/* Flecha de tiro: aparece mientras se arrastra, apuntando hacia donde
          va a salir la ficha (el lado OPUESTO al arrastre, mismo "hondazo"
          que calcula el gesto) y creciendo con la potencia. Va en un <Svg>
          aparte, DESPUÉS de las fichas/pelota en el árbol, para pintar
          encima de todo — si viviera en el <Svg> de las líneas de cancha
          (que va antes) quedaría tapada por cualquier ficha de por medio. */}
      {arrastre ? <FlechaTiro arrastre={arrastre} fichas={fichas} posiciones={posiciones} px={px} py={py} lado={lado} altoTotal={altoTotal} /> : null}
    </View>
  );
}

/** Ver el comentario en el punto de uso, arriba. */
function FlechaTiro({
  arrastre,
  fichas,
  posiciones,
  px,
  py,
  lado,
  altoTotal,
}: {
  arrastre: { fichaId: string; dx: number; dy: number };
  fichas: FichaSoccer[];
  posiciones: Posiciones;
  px: (x: number) => number;
  py: (y: number) => number;
  lado: number;
  altoTotal: number;
}) {
  const f = fichas.find((ff) => idFicha(ff) === arrastre.fichaId);
  if (!f) return null;
  const base = posiciones[arrastre.fichaId] ?? { x: f.x, y: f.y };
  const dist = Math.sqrt(arrastre.dx ** 2 + arrastre.dy ** 2);
  if (dist < 4) return null;

  // Mismo cálculo que `onEnd` del gesto: el tiro sale al lado OPUESTO de
  // hacia dónde se arrastró, con potencia proporcional a cuánto se estiró.
  const dirX = -arrastre.dx / dist;
  const dirY = -arrastre.dy / dist;
  const potencia = Math.min(POTENCIA_MAXIMA, dist * FACTOR_POTENCIA);
  // Largo EN PANTALLA, no en unidades de física: crece con la potencia pero
  // siempre visible desde el primer milímetro de arrastre (pedido: "mientras
  // mas tires hacia atras, mas fuerte debe salir y la flecha mas larga").
  const largo = 24 + (potencia / POTENCIA_MAXIMA) * 100;

  // La ficha ya está dibujada en su posición "tirada hacia atrás" (offset =
  // arrastre.dx/dy) — la flecha arranca ahí, no en la posición de reposo.
  const cx = px(base.x) + arrastre.dx;
  const cy = py(base.y) + arrastre.dy;
  const puntaX = cx + dirX * largo;
  const puntaY = cy + dirY * largo;

  const angulo = Math.atan2(dirY, dirX);
  const alaLargo = 13;
  const alaAngulo = 0.5;
  const ala1X = puntaX - alaLargo * Math.cos(angulo - alaAngulo);
  const ala1Y = puntaY - alaLargo * Math.sin(angulo - alaAngulo);
  const ala2X = puntaX - alaLargo * Math.cos(angulo + alaAngulo);
  const ala2Y = puntaY - alaLargo * Math.sin(angulo + alaAngulo);

  // Más roja cuanto más cerca del tiro máximo — mismo lenguaje visual que el
  // resto de la app usa para "al límite" (ver el reloj de HueSoccer).
  const color = potencia >= POTENCIA_MAXIMA * 0.85 ? '#FF4136' : '#FFFFFF';

  return (
    <Svg width={lado} height={altoTotal} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line x1={cx} y1={cy} x2={puntaX} y2={puntaY} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.95} />
      <Line x1={puntaX} y1={puntaY} x2={ala1X} y2={ala1Y} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.95} />
      <Line x1={puntaX} y1={puntaY} x2={ala2X} y2={ala2Y} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.95} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  cancha: { position: 'relative', alignSelf: 'center', borderRadius: 8, overflow: 'hidden' },
  ficha: { position: 'absolute', borderWidth: 3, borderRadius: 999 },
  pelota: { position: 'absolute' },
});
