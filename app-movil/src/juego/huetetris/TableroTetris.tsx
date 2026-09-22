import React from 'react';
import { PanResponderInstance, StyleSheet, Text, View } from 'react-native';
import { aclarar, oscurecer } from '../comun/blockRetro';
import { Cuadro, easeOut } from '../comun/secuenciaAnim';
import { ALTO_OCULTO, ALTO_VISIBLE, ANCHO, COLOR_PIEZA, PiezaActiva, TipoPieza, celdasPieza } from './motor';

/** Un bloque biselado de consola de 16 bits — ver `comun/blockRetro.ts`. */
function Bloque({ tam, color, opacidad = 1 }: { tam: number; color: string; opacidad?: number }) {
  const borde = Math.max(1, Math.round(tam * 0.12));
  return (
    <View
      style={{
        width: tam,
        height: tam,
        backgroundColor: color,
        opacity: opacidad,
        borderTopWidth: borde,
        borderLeftWidth: borde,
        borderRightWidth: borde,
        borderBottomWidth: borde,
        borderTopColor: aclarar(color, 0.45),
        borderLeftColor: aclarar(color, 0.45),
        borderRightColor: oscurecer(color, 0.4),
        borderBottomColor: oscurecer(color, 0.4),
      }}
    />
  );
}

type Props = {
  tablero: (TipoPieza | null)[][];
  actual: PiezaActiva;
  sombra: PiezaActiva;
  siguiente: TipoPieza;
  tileSize: number;
  /** Qué se está animando ahora (caída rápida, limpieza, caída de lo que quedó). null = tablero normal. */
  cuadro: Cuadro<TipoPieza, PiezaActiva> | null;
  /** Cartel de festejo ("¡DOBLE!", "¡TETRIS!") mientras dura la limpieza. */
  etiqueta?: string | null;
  /** `.panHandlers` de `useGestoCaida` (PanResponder) — se aplican directo sobre el marco. */
  panHandlers?: PanResponderInstance['panHandlers'];
};

/**
 * El tablero de HueTetris: marco metálico con remaches en las esquinas
 * (réplica del look de consola pedido), paño negro, y los bloques encima.
 * Sólo se dibujan las `ALTO_VISIBLE` filas de abajo — las `ALTO_OCULTO` de
 * arriba son colchón interno del motor para que una pieza recién aparecida
 * nunca choque contra el techo antes de poder moverse.
 *
 * `panHandlers` (de `useGestoCaida`, un `PanResponder`) se aplica directo
 * sobre el `View` del marco -- no hace falta envolver en nada (a diferencia
 * de `GestureDetector` de `react-native-gesture-handler`, que se probó
 * primero y nunca recibió un solo toque en este build; ver la nota larga en
 * `useGestoCaida.ts`).
 */
export function TableroTetris({ tablero, actual, sombra, tileSize, cuadro, etiqueta, panHandlers }: Props) {
  const ancho = ANCHO * tileSize;
  const alto = ALTO_VISIBLE * tileSize;
  const marco = Math.max(6, Math.round(tileSize * 0.5));

  // Durante la limpieza se dibuja el tablero de ANTES de borrar; durante la
  // caída de lo que quedó, el de DESPUÉS, con cada bloque desplazado hacia arriba
  // lo que cayó y volviendo a su lugar.
  const enLimpia = cuadro?.tipo === 'limpia' ? cuadro : null;
  const enCae = cuadro?.tipo === 'cae' ? cuadro : null;
  const enCaida = cuadro?.tipo === 'caida' ? cuadro : null;
  const base = enLimpia ? enLimpia.paso.tablero : enCae ? enCae.paso.despues : tablero;
  const borrar = enLimpia ? new Set(enLimpia.paso.limpiar) : null;

  const celdasFijas: { x: number; y: number; color: string; opacidad: number; escala: number; dy: number }[] = [];
  for (let f = ALTO_OCULTO - 4; f < ALTO_OCULTO + ALTO_VISIBLE; f++) {
    if (f < 0) continue;
    for (let c = 0; c < ANCHO; c++) {
      const tipo = base[f]![c];
      if (!tipo) continue;
      let color = COLOR_PIEZA[tipo];
      let opacidad = 1;
      let escala = 1;
      let dy = 0;
      if (enLimpia && borrar!.has(`${f},${c}`)) {
        const p = enLimpia.p;
        if (p < 0.3) {
          color = '#FFFFFF';
          escala = 1 + 0.12 * (p / 0.3);
        } else {
          const q = (p - 0.3) / 0.7;
          color = '#FFFFFF';
          opacidad = 1 - q;
          escala = 1.12 - 0.62 * q;
        }
      } else if (enCae) {
        const cay = enCae.paso.caidas[f]![c] ?? 0;
        dy = -cay * tileSize * (1 - easeOut(enCae.p));
      }
      if (f < ALTO_OCULTO && !enCae) continue;
      celdasFijas.push({ x: c, y: f - ALTO_OCULTO, color, opacidad, escala, dy });
    }
  }

  return (
    <View
      {...panHandlers}
      style={[styles.marco, { width: ancho + marco * 2, height: alto + marco * 2, borderRadius: marco * 0.6 }]}
    >
      {/* Remaches — 4 esquinas, decorativos, mismo look que la mesa de HuePool. */}
      {[
        { top: 3, left: 3 },
        { top: 3, right: 3 },
        { bottom: 3, left: 3 },
        { bottom: 3, right: 3 },
      ].map((pos, i) => (
        <View key={i} style={[styles.remache, pos as object]} />
      ))}

      <View style={[styles.pano, { width: ancho, height: alto, top: marco, left: marco }]}>
        {celdasFijas.map((c, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: c.x * tileSize,
              top: c.y * tileSize,
              opacity: c.opacidad,
              transform: [{ translateY: c.dy }, { scale: c.escala }],
            }}
          >
            <Bloque tam={tileSize} color={c.color} />
          </View>
        ))}

        {/* Sombra fantasma: sólo el contorno, donde caería la pieza si se soltara. */}
        {!cuadro
          ? celdasPieza(sombra)
              .filter((p) => p.y >= ALTO_OCULTO)
              .map((p, i) => (
                <View
                  key={`s${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: p.x * tileSize,
                    top: (p.y - ALTO_OCULTO) * tileSize,
                    width: tileSize,
                    height: tileSize,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.35)',
                  }}
                />
              ))
          : null}

        {!cuadro
          ? celdasPieza(actual)
              .filter((p) => p.y >= ALTO_OCULTO)
              .map((p, i) => (
                <View key={`a${i}`} style={{ position: 'absolute', left: p.x * tileSize, top: (p.y - ALTO_OCULTO) * tileSize }}>
                  <Bloque tam={tileSize} color={COLOR_PIEZA[actual.tipo]} />
                </View>
              ))
          : null}

        {/* Caída rápida: la pieza baja de golpe dejando una estela que se desvanece. */}
        {enCaida
          ? [3, 2, 1, 0].map((k) =>
              celdasPieza({ ...enCaida.pieza, y: 0 }).map((p, i) => {
                const yPieza = enCaida.y - k * 0.9;
                if (yPieza < enCaida.desdeY) return null;
                const y = yPieza + p.y;
                if (y < ALTO_OCULTO - 1) return null;
                return (
                  <View
                    key={`c${k}_${i}`}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: p.x * tileSize,
                      top: (y - ALTO_OCULTO) * tileSize,
                      opacity: k === 0 ? 1 : 0.16 * (4 - k),
                    }}
                  >
                    <Bloque tam={tileSize} color={COLOR_PIEZA[enCaida.pieza.tipo]} />
                  </View>
                );
              })
            )
          : null}

        {etiqueta && enLimpia ? (
          <View pointerEvents="none" style={styles.etiquetaWrap}>
            <Text
              style={[
                styles.etiqueta,
                {
                  fontSize: Math.max(16, tileSize * 1.1),
                  opacity: Math.min(1, enLimpia.p * 4) * (1 - Math.max(0, enLimpia.p - 0.7) / 0.3),
                  transform: [{ scale: 0.8 + 0.4 * Math.min(1, enLimpia.p * 3) }],
                },
              ]}
            >
              {etiqueta}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    position: 'relative',
    backgroundColor: '#8A94A6',
    borderWidth: 2,
    borderColor: '#4A5266',
  },
  pano: { position: 'absolute', backgroundColor: '#0A0A0F', overflow: 'hidden' },
  etiquetaWrap: { position: 'absolute', left: 0, right: 0, top: '30%', alignItems: 'center' },
  etiqueta: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  remache: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A4050' },
});
