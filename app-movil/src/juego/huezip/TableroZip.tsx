import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { Celda, Puzzle } from './motor';

type Props = {
  puzzle: Puzzle;
  visitadas: Celda[];
  /** Última celda tocada que se rechazó (número fuera de orden), para el destello rojo. */
  rechazada: Celda | null;
  lado: number;
  /** Primer toque de un gesto nuevo (dedo baja) — puede significar "reiniciar" si es la celda 1. */
  onInicioToque: (c: Celda) => void;
  /** Cada celda nueva que el dedo visita mientras arrastra (incluye la del `onInicioToque`, salvo la propia pantalla decida ignorarla). */
  onCelda: (c: Celda) => void;
  bloqueado: boolean;
};

/**
 * Dibujo del tablero de HueZip y el gesto de arrastre.
 *
 * Mismo truco que `huematch/Tablero.tsx`: un solo `PanResponder` sobre toda
 * la grilla (no un `Pressable` por celda), porque el `locationX/Y` que llega
 * ahí ya está medido contra la grilla entera. La diferencia con HueMatch es
 * que acá no se mueve una ficha a la vecina: se va ACUMULANDO la secuencia
 * de celdas por las que pasó el dedo, reportando cada celda nueva en cuanto
 * el dedo entra en ella (no recién al soltar) — así la línea se dibuja en
 * vivo, como en el juego real.
 */
export function TableroZip({ puzzle, visitadas, rechazada, lado, onInicioToque, onCelda, bloqueado }: Props) {
  const { colors } = useTheme();
  const { n } = puzzle;
  const celda = lado / n;

  const vivo = useRef({ celda, n, bloqueado, onInicioToque, onCelda });
  vivo.current = { celda, n, bloqueado, onInicioToque, onCelda };

  // Última celda reportada durante el arrastre en curso, para no llamar a
  // onCelda de nuevo mientras el dedo sigue sobre la misma celda.
  const ultimaReportada = useRef<Celda | null>(null);

  const celdaDesdeToque = (locationX: number, locationY: number, c: number, n2: number): Celda => ({
    fila: Math.min(n2 - 1, Math.max(0, Math.floor(locationY / c))),
    col: Math.min(n2 - 1, Math.max(0, Math.floor(locationX / c))),
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          if (vivo.current.bloqueado) return;
          const { locationX, locationY } = e.nativeEvent;
          const c = celdaDesdeToque(locationX, locationY, vivo.current.celda, vivo.current.n);
          ultimaReportada.current = c;
          vivo.current.onInicioToque(c);
        },
        onPanResponderMove: (e) => {
          if (vivo.current.bloqueado) return;
          const { locationX, locationY } = e.nativeEvent;
          const c = celdaDesdeToque(locationX, locationY, vivo.current.celda, vivo.current.n);
          const ult = ultimaReportada.current;
          if (ult && ult.fila === c.fila && ult.col === c.col) return;
          ultimaReportada.current = c;
          vivo.current.onCelda(c);
        },
        onPanResponderRelease: () => {
          ultimaReportada.current = null;
        },
        onPanResponderTerminate: () => {
          ultimaReportada.current = null;
        },
      }),
    []
  );

  const centro = (c: Celda) => ({ x: c.col * celda + celda / 2, y: c.fila * celda + celda / 2 });

  const esVisitada = (f: number, c: number) => visitadas.some((v) => v.fila === f && v.col === c);
  const esRechazada = (f: number, c: number) => rechazada?.fila === f && rechazada?.col === c;
  const esActual = (f: number, c: number) => {
    const ult = visitadas[visitadas.length - 1];
    return ult?.fila === f && ult?.col === c;
  };

  return (
    <View {...pan.panHandlers} style={[styles.grilla, { width: lado, height: lado }]}>
      {puzzle.celdas.map((fila, f) =>
        fila.map((cp, c) => {
          const visitada = esVisitada(f, c);
          const mal = esRechazada(f, c);
          const actual = esActual(f, c);
          return (
            <View
              key={`${f}-${c}`}
              pointerEvents="none"
              style={[styles.celda, { width: celda, height: celda, left: c * celda, top: f * celda }]}
            >
              <View
                style={[
                  styles.fondo,
                  {
                    backgroundColor: mal
                      ? 'rgba(220,60,60,0.28)'
                      : visitada
                        ? colors.primarySoft
                        : colors.surface,
                    borderColor: actual ? colors.primary : colors.border,
                    borderWidth: actual ? 3 : 1,
                  },
                ]}
              >
                {cp.tipo === 'numero' ? (
                  <View
                    style={[
                      styles.numeroCirculo,
                      {
                        backgroundColor: visitada ? colors.primary : colors.background,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numero,
                        { color: visitada ? colors.primaryText : colors.primary },
                      ]}
                    >
                      {cp.numero}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      {/* La línea va DESPUÉS de las celdas a propósito: cada celda tiene un
          fondo opaco (`styles.fondo`), así que si el <Svg> se dibuja antes
          en el árbol queda TAPADO por esos fondos y sólo se le ve un
          pedacito por la rendija del 8% de margen entre celdas — que es
          justo lo que pasaba antes ("no hace la línea que atraviesa los
          cuadrados"). Pintándola encima sí cruza cada celda de punta a
          punta, bien visible. `pointerEvents="none"` para que el gesto de
          abajo le siga llegando a la grilla sin que este overlay lo tape. */}
      {visitadas.length > 1 ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Un segmento por tramo, con el matiz avanzando de a poco (0°→300°)
              a lo largo de todo el camino — así el color de cada tramo marca
              en qué parte del recorrido total va el dedo, no sólo "visitado
              sí/no" (pedido: "linea interna... de colores tipo arcoiris que
              ayude a ver bien claro el camino"). */}
          {visitadas.slice(1).map((c, i) => {
            const a = centro(visitadas[i]!);
            const b = centro(c);
            const hue = Math.round((i / Math.max(1, puzzle.totalCeldas - 1)) * 300);
            return (
              <Line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={`hsl(${hue}, 85%, 55%)`}
                strokeWidth={celda * 0.14}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { position: 'relative', alignSelf: 'center' },
  celda: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fondo: {
    width: '92%',
    height: '92%',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroCirculo: {
    width: '54%',
    height: '54%',
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
