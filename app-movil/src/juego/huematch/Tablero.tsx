import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { Celda } from './Celda';
import { Celda as CeldaCoord, COLUMNAS, FILAS, Tablero as TableroT } from './motor';

type Props = {
  tablero: TableroT;
  seleccionada: CeldaCoord | null;
  /** Par que acaba de rebotar por no armar línea, para marcarlo en rojo. */
  rechazadas: CeldaCoord[] | null;
  lado: number;
  onCelda: (c: CeldaCoord) => void;
  bloqueado: boolean;
};

/**
 * Dibujo del tablero.
 *
 * Es un componente aparte de la pantalla porque la pantalla ya carga con el
 * reloj, el puntaje y el envío del resultado; mezclar acá el dibujo haría un
 * archivo donde no se encuentra nada.
 */
export function TableroHueMatch({
  tablero,
  seleccionada,
  rechazadas,
  lado,
  onCelda,
  bloqueado,
}: Props) {
  const { colors } = useTheme();
  const celda = lado / COLUMNAS;

  const esRechazada = (f: number, c: number) =>
    !!rechazadas?.some((r) => r.fila === f && r.col === c);

  return (
    <View style={[styles.grilla, { width: lado, height: (lado / COLUMNAS) * FILAS }]}>
      {tablero.map((fila, f) =>
        fila.map((tipo, c) => {
          const activa = seleccionada?.fila === f && seleccionada?.col === c;
          const mal = esRechazada(f, c);
          return (
            <Pressable
              key={`${f}-${c}`}
              disabled={bloqueado}
              onPress={() => onCelda({ fila: f, col: c })}
              style={[
                styles.celda,
                {
                  width: celda,
                  height: celda,
                  left: c * celda,
                  top: f * celda,
                },
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
                <Celda tipo={tipo} lado={celda} fila={f} seleccionada={activa} />
              </View>
            </Pressable>
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
