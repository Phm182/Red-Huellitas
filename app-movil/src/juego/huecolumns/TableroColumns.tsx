import React from 'react';
import { PanResponderInstance, StyleSheet, Text, View } from 'react-native';
import { aclarar, oscurecer } from '../comun/blockRetro';
import { Cuadro, easeOut } from '../comun/secuenciaAnim';
import { ALTO_OCULTO, ALTO_VISIBLE, ANCHO, ColorGema, Gema, TrioActivo, celdasTrio } from './motor';

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
  /** Qué se está animando ahora (caída rápida, limpieza, caída de lo que quedó). null = tablero normal. */
  cuadro: Cuadro<ColorGema, TrioActivo> | null;
  /** Texto del cartel de combo ("COMBO x2") para el paso actual; sólo se muestra desde el 2º paso. */
  comboTexto?: string;
  /** `.panHandlers` de `useGestoCaida` (PanResponder) — se aplican directo sobre el marco. */
  panHandlers?: PanResponderInstance['panHandlers'];
};

// `panHandlers` (de `useGestoCaida`, un `PanResponder`) se aplica directo
// sobre el `View` del marco -- ver la nota larga en `useGestoCaida.ts` de
// por qué ya no es `GestureDetector` de `react-native-gesture-handler`
// (nunca recibió un solo toque en este build).
export function TableroColumns({ tablero, actual, sombra, tileSize, cuadro, comboTexto, panHandlers }: Props) {
  const ancho = ANCHO * tileSize;
  const alto = ALTO_VISIBLE * tileSize;
  const marco = Math.max(6, Math.round(tileSize * 0.5));

  // Limpieza: se dibuja el tablero de ANTES con las gemas del combo brillando y
  // desvaneciéndose. Caída: el de DESPUÉS, con cada gema volviendo desde donde
  // estaba. Así cada paso de la cascada se entiende por separado.
  const enLimpia = cuadro?.tipo === 'limpia' ? cuadro : null;
  const enCae = cuadro?.tipo === 'cae' ? cuadro : null;
  const enCaida = cuadro?.tipo === 'caida' ? cuadro : null;
  const base = enLimpia ? enLimpia.paso.tablero : enCae ? enCae.paso.despues : tablero;
  const borrar = enLimpia ? new Set(enLimpia.paso.limpiar) : null;

  const celdasFijas: { x: number; y: number; color: string; opacidad: number; escala: number; dy: number }[] = [];
  for (let f = enCae ? 0 : ALTO_OCULTO; f < ALTO_OCULTO + ALTO_VISIBLE; f++) {
    for (let c = 0; c < ANCHO; c++) {
      const gema = base[f]![c];
      if (!gema) continue;
      let color: string = gema;
      let opacidad = 1;
      let escala = 1;
      let dy = 0;
      if (enLimpia && borrar!.has(`${f},${c}`)) {
        const p = enLimpia.p;
        color = '#FFFFFF';
        if (p < 0.3) {
          escala = 1 + 0.18 * (p / 0.3);
        } else {
          const q = (p - 0.3) / 0.7;
          opacidad = 1 - q;
          escala = 1.18 - 0.7 * q;
        }
      } else if (enCae) {
        dy = -(enCae.paso.caidas[f]![c] ?? 0) * tileSize * (1 - easeOut(enCae.p));
      }
      if (f < ALTO_OCULTO && !enCae) continue;
      celdasFijas.push({ x: c, y: f - ALTO_OCULTO, color, opacidad, escala, dy });
    }
  }
  const comboNro = enLimpia ? enLimpia.nro : 0;

  return (
    <View
      {...panHandlers}
      style={[styles.marco, { width: ancho + marco * 2, height: alto + marco * 2, borderRadius: marco * 0.6 }]}
    >
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
            <Gemita tam={tileSize} color={c.color} />
          </View>
        ))}

        {!cuadro
          ? celdasTrio(sombra)
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
              ))
          : null}

        {!cuadro
          ? celdasTrio(actual)
              .filter((p) => p.y >= ALTO_OCULTO)
              .map((p, i) => (
                <View key={`a${i}`} style={{ position: 'absolute', left: p.x * tileSize, top: (p.y - ALTO_OCULTO) * tileSize }}>
                  <Gemita tam={tileSize} color={p.color} />
                </View>
              ))
          : null}

        {/* Caída rápida del trío, con estela que se desvanece. */}
        {enCaida
          ? [3, 2, 1, 0].map((k) =>
              celdasTrio({ ...enCaida.pieza, y: 0 }).map((p, i) => {
                const yTrio = enCaida.y - k * 0.9;
                if (yTrio < enCaida.desdeY) return null;
                const y = yTrio + p.y;
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
                    <Gemita tam={tileSize} color={p.color} />
                  </View>
                );
              })
            )
          : null}

        {/* Cartel de combo desde la 2ª cascada. */}
        {enLimpia && comboNro >= 2 && comboTexto ? (
          <View pointerEvents="none" style={styles.comboWrap}>
            <Text
              style={[
                styles.combo,
                {
                  fontSize: Math.max(16, tileSize * 0.95),
                  opacity: Math.min(1, enLimpia.p * 4) * (1 - Math.max(0, enLimpia.p - 0.7) / 0.3),
                  transform: [{ scale: 0.8 + 0.4 * Math.min(1, enLimpia.p * 3) }],
                },
              ]}
            >
              {comboTexto}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { position: 'relative', backgroundColor: '#2A5C52', borderWidth: 2, borderColor: '#173B34' },
  pano: { position: 'absolute', backgroundColor: '#0A0F0E', overflow: 'hidden' },
  comboWrap: { position: 'absolute', left: 0, right: 0, top: '32%', alignItems: 'center' },
  combo: {
    color: '#FFE27A',
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  remache: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#173B34' },
});
