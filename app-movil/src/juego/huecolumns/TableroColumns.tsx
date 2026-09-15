import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { aclarar, oscurecer } from '../comun/blockRetro';
import { ALTO_OCULTO, ALTO_VISIBLE, ANCHO, Gema, TrioActivo, celdasTrio } from './motor';

/** Una gema romboidal biselada — mismo criterio de "un solo View con borde por lado" que `TableroTetris.tsx::Bloque`, con las esquinas redondeadas para que lea como piedra pulida en vez de un cuadrado de Tetris. */
function Gemita({ tam, color, opacidad = 1 }: { tam: number; color: string; opacidad?: number }) {
  const borde = Math.max(1, Math.round(tam * 0.14));
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: tam * 0.28,
        backgroundColor: color,
        opacity: opacidad,
        borderTopWidth: borde,
        borderLeftWidth: borde,
        borderRightWidth: borde,
        borderBottomWidth: borde,
        borderTopColor: aclarar(color, 0.5),
        borderLeftColor: aclarar(color, 0.5),
        borderRightColor: oscurecer(color, 0.45),
        borderBottomColor: oscurecer(color, 0.45),
      }}
    />
  );
}

type Props = {
  tablero: Gema[][];
  actual: TrioActivo;
  sombra: TrioActivo;
  tileSize: number;
  /** Casillas limpiadas en el último cuadro (índices VISIBLES, ya restado `ALTO_OCULTO`), `"fila,col"` — flash blanco de festejo. */
  celdasFlash: string[];
};

// `forwardRef` a propósito: lo envuelve `<GestureDetector>` en la pantalla
// (`useGestoCaida.ts`, mismo hook que HueTetris), y `GestureDetector`
// necesita poder engancharle una ref a un componente NATIVO para atar el
// handler de gestos -- ver la nota completa en `TableroTetris.tsx`, mismo
// bug real (ni tap ni arrastre respondían, en el celular Y por ADB).
export const TableroColumns = forwardRef<View, Props>(function TableroColumns(
  { tablero, actual, sombra, tileSize, celdasFlash },
  ref
) {
  const ancho = ANCHO * tileSize;
  const alto = ALTO_VISIBLE * tileSize;
  const marco = Math.max(6, Math.round(tileSize * 0.5));
  const flashSet = new Set(celdasFlash);

  const celdasFijas: { x: number; y: number; color: NonNullable<Gema> }[] = [];
  for (let f = ALTO_OCULTO; f < ALTO_OCULTO + ALTO_VISIBLE; f++) {
    for (let c = 0; c < ANCHO; c++) {
      const color = tablero[f]![c];
      if (color) celdasFijas.push({ x: c, y: f - ALTO_OCULTO, color });
    }
  }

  return (
    <View ref={ref} style={[styles.marco, { width: ancho + marco * 2, height: alto + marco * 2, borderRadius: marco * 0.6 }]}>
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
          <View key={i} style={{ position: 'absolute', left: c.x * tileSize, top: c.y * tileSize }}>
            <Gemita tam={tileSize} color={flashSet.has(`${c.y},${c.x}`) ? '#FFFFFF' : c.color} />
          </View>
        ))}

        {celdasTrio(sombra)
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
                borderRadius: tileSize * 0.28,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.35)',
              }}
            />
          ))}

        {celdasTrio(actual)
          .filter((p) => p.y >= ALTO_OCULTO)
          .map((p, i) => (
            <View key={`a${i}`} style={{ position: 'absolute', left: p.x * tileSize, top: (p.y - ALTO_OCULTO) * tileSize }}>
              <Gemita tam={tileSize} color={p.color} />
            </View>
          ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  marco: { position: 'relative', backgroundColor: '#2A5C52', borderWidth: 2, borderColor: '#173B34' },
  pano: { position: 'absolute', backgroundColor: '#0A0F0E' },
  remache: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#173B34' },
});
