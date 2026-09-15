import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { aclarar, oscurecer } from '../comun/blockRetro';
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
  /** Filas (índice VISIBLE, ya restado `ALTO_OCULTO`) limpiadas en el último cuadro — flash blanco de festejo. */
  filasFlash: number[];
};

/**
 * El tablero de HueTetris: marco metálico con remaches en las esquinas
 * (réplica del look de consola pedido), paño negro, y los bloques encima.
 * Sólo se dibujan las `ALTO_VISIBLE` filas de abajo — las `ALTO_OCULTO` de
 * arriba son colchón interno del motor para que una pieza recién aparecida
 * nunca choque contra el techo antes de poder moverse.
 *
 * `forwardRef` a propósito: lo envuelve `<GestureDetector>` en la pantalla
 * (`useGestoCaida.ts`), y `GestureDetector` necesita poder engancharle una
 * ref a un componente NATIVO para atar el handler de gestos. Un componente
 * de función común no acepta ref (queda `null`), así que el gesto nunca se
 * ataba a nada -- ni tap ni arrastre respondían, en el celular real Y con
 * `adb shell input` (que despacha por el mismo camino de hit-testing), sin
 * ningún error ni warning visible en producción (los botones de al lado sí
 * andaban porque son `Pressable` normales, sin este problema).
 */
export const TableroTetris = forwardRef<View, Props>(function TableroTetris(
  { tablero, actual, sombra, tileSize, filasFlash },
  ref
) {
  const ancho = ANCHO * tileSize;
  const alto = ALTO_VISIBLE * tileSize;
  const marco = Math.max(6, Math.round(tileSize * 0.5));

  const celdasFijas: { x: number; y: number; color: string }[] = [];
  for (let f = ALTO_OCULTO; f < ALTO_OCULTO + ALTO_VISIBLE; f++) {
    for (let c = 0; c < ANCHO; c++) {
      const tipo = tablero[f]![c];
      if (tipo) celdasFijas.push({ x: c, y: f - ALTO_OCULTO, color: COLOR_PIEZA[tipo] });
    }
  }

  const flashSet = new Set(filasFlash);

  return (
    <View ref={ref} style={[styles.marco, { width: ancho + marco * 2, height: alto + marco * 2, borderRadius: marco * 0.6 }]}>
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
            style={{ position: 'absolute', left: c.x * tileSize, top: c.y * tileSize }}
          >
            <Bloque tam={tileSize} color={flashSet.has(c.y) ? '#FFFFFF' : c.color} />
          </View>
        ))}

        {/* Sombra fantasma: sólo el contorno, donde caería la pieza si se soltara. */}
        {celdasPieza(sombra)
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
          ))}

        {celdasPieza(actual)
          .filter((p) => p.y >= ALTO_OCULTO)
          .map((p, i) => (
            <View key={`a${i}`} style={{ position: 'absolute', left: p.x * tileSize, top: (p.y - ALTO_OCULTO) * tileSize }}>
              <Bloque tam={tileSize} color={COLOR_PIEZA[actual.tipo]} />
            </View>
          ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  marco: {
    position: 'relative',
    backgroundColor: '#8A94A6',
    borderWidth: 2,
    borderColor: '#4A5266',
  },
  pano: { position: 'absolute', backgroundColor: '#0A0A0F' },
  remache: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A4050' },
});
