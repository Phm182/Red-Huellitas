import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { Celda } from './Celda';
import { Celda as CeldaCoord, COLUMNAS, FILAS, Tablero as TableroT } from './motor';

/** Hacia dónde arrastró el dedo, en filas y columnas. */
export type Direccion = { df: number; dc: number };

type Props = {
  tablero: TableroT;
  seleccionada: CeldaCoord | null;
  /** Par que acaba de rebotar por no armar línea, para marcarlo en rojo. */
  rechazadas: CeldaCoord[] | null;
  lado: number;
  /** Las dos fichas que están viajando una al lugar de la otra. */
  movimiento: { a: CeldaCoord; b: CeldaCoord } | null;
  onCelda: (c: CeldaCoord) => void;
  /** Arrastre: la ficha de `desde` se cambia con la vecina en esa dirección. */
  onDeslizar: (desde: CeldaCoord, dir: Direccion) => void;
  bloqueado: boolean;
};

/**
 * Dibujo del tablero y los dos gestos.
 *
 * Es un componente aparte de la pantalla porque la pantalla ya carga con el
 * reloj, el puntaje y el envío del resultado; mezclar acá el dibujo haría un
 * archivo donde no se encuentra nada.
 *
 * **Un solo responder para toda la grilla, sin `Pressable` por celda.** Se
 * probó lo contrario —celdas tocables más un responder encima para el
 * arrastre— y el problema es de coordenadas: cuando el toque cae sobre una
 * celda hija, el `locationX` que llega está medido contra esa celda y no
 * contra la grilla, así que para saber de qué casilla salió el dedo habría que
 * medir la posición de la grilla en pantalla. Escuchando en la grilla, el
 * `locationX` ya viene en el sistema que se necesita y una división da la
 * casilla. De paso, tocar y arrastrar quedan en el mismo lugar y no compiten.
 */
export function TableroHueMatch({
  tablero,
  seleccionada,
  rechazadas,
  lado,
  movimiento,
  onCelda,
  onDeslizar,
  bloqueado,
}: Props) {
  const { colors } = useTheme();
  const celda = lado / COLUMNAS;

  // El PanResponder se crea UNA vez y lee todo desde este ref. Si dependiera
  // de las props se recrearía a mitad del arrastre —el tablero cambia con cada
  // jugada— y React Native volvería a registrar los handlers en el medio.
  const vivo = useRef({ celda, bloqueado, onCelda, onDeslizar });
  vivo.current = { celda, bloqueado, onCelda, onDeslizar };

  const desde = useRef<CeldaCoord | null>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Nadie más debería robarnos el gesto una vez empezado.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { celda: c } = vivo.current;
          const { locationX, locationY } = e.nativeEvent;
          desde.current = {
            fila: Math.min(FILAS - 1, Math.max(0, Math.floor(locationY / c))),
            col: Math.min(COLUMNAS - 1, Math.max(0, Math.floor(locationX / c))),
          };
        },
        onPanResponderRelease: (_e, g) => {
          const origen = desde.current;
          desde.current = null;
          if (!origen) return;

          const { celda: c, bloqueado: bloq, onCelda: tocar, onDeslizar: deslizar } = vivo.current;
          if (bloq) return;

          // Umbral relativo al tamaño de la celda y no en píxeles fijos: en una
          // tablet las celdas son más grandes y un movimiento chico sigue
          // siendo un toque, no un arrastre.
          const umbral = c * 0.3;
          if (Math.abs(g.dx) < umbral && Math.abs(g.dy) < umbral) {
            tocar(origen);
            return;
          }

          // Gana el eje que más se movió: un arrastre nunca sale perfectamente
          // recto y hay que decidirse por uno.
          const dir: Direccion =
            Math.abs(g.dx) > Math.abs(g.dy)
              ? { df: 0, dc: g.dx > 0 ? 1 : -1 }
              : { df: g.dy > 0 ? 1 : -1, dc: 0 };
          deslizar(origen, dir);
        },
      }),
    []
  );

  const esRechazada = (f: number, c: number) =>
    !!rechazadas?.some((r) => r.fila === f && r.col === c);

  /** Cada una de las dos viaja hacia la otra, así que el signo se invierte. */
  const desplazamiento = (f: number, c: number) => {
    if (!movimiento) return null;
    const { a, b } = movimiento;
    if (a.fila === f && a.col === c) return { dx: b.col - a.col, dy: b.fila - a.fila };
    if (b.fila === f && b.col === c) return { dx: a.col - b.col, dy: a.fila - b.fila };
    return null;
  };

  return (
    <View
      {...pan.panHandlers}
      style={[styles.grilla, { width: lado, height: celda * FILAS }]}
    >
      {tablero.map((fila, f) =>
        fila.map((tipo, c) => {
          const activa = seleccionada?.fila === f && seleccionada?.col === c;
          const mal = esRechazada(f, c);
          return (
            <View
              key={`${f}-${c}`}
              // Sin captar toques: los maneja la grilla entera.
              pointerEvents="none"
              style={[
                styles.celda,
                { width: celda, height: celda, left: c * celda, top: f * celda },
              ]}
            >
              <View
                style={[
                  styles.fondo,
                  {
                    backgroundColor: activa
                      ? colors.primarySoft
                      : mal
                        ? 'rgba(220,60,60,0.22)'
                        : 'transparent',
                    borderColor: activa ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Celda
                  tipo={tipo}
                  lado={celda}
                  fila={f}
                  seleccionada={activa}
                  desplaza={desplazamiento(f, c)}
                />
              </View>
            </View>
          );
        })
      )}
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
