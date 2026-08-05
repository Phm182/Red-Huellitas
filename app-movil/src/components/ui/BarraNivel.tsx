import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import type { HuePlayProgreso } from '../../types/hueplay';

type Props = {
  progreso: HuePlayProgreso;
  /** Etiqueta a la izquierda: "Nivel 5", "HueMatch nivel 3"… */
  etiqueta?: string;
  /** `compacta` para las tarjetas del catálogo, donde hay poco alto. */
  compacta?: boolean;
  color?: string;
};

/**
 * Barra de progreso hacia el nivel siguiente.
 *
 * Se usa en tres lugares con la misma forma: el nivel de cuenta en el hub, el
 * nivel de cada juego en su tarjeta, y adentro de HueGotchi. Por eso recibe un
 * `HuePlayProgreso` entero en vez de números sueltos: el cálculo de qué
 * fracción va llena vive en un solo lado y no se puede desalinear entre
 * pantallas.
 */
export function BarraNivel({ progreso, etiqueta, compacta, color }: Props) {
  const { colors } = useTheme();
  const c = color ?? colors.primary;

  const rango = Math.max(1, progreso.nivelHasta - progreso.nivelDesde);
  const hecho = progreso.puntos - progreso.nivelDesde;
  const pct = Math.max(0, Math.min(100, (hecho / rango) * 100));

  return (
    <View style={compacta ? styles.wrapCompacto : styles.wrap}>
      {etiqueta ? (
        <View style={styles.fila}>
          <Text
            style={[
              compacta ? styles.etiquetaCompacta : styles.etiqueta,
              { color: colors.text },
            ]}
            numberOfLines={1}
          >
            {etiqueta}
          </Text>
          <Text style={[styles.faltan, { color: colors.textMuted }]}>
            {progreso.puntos} / {progreso.nivelHasta}
          </Text>
        </View>
      ) : null}

      <View style={[compacta ? styles.pistaCompacta : styles.pista, { backgroundColor: colors.border }]}>
        <View style={[styles.llena, { backgroundColor: c, width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  wrapCompacto: { gap: 3, marginTop: 5 },
  fila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  etiqueta: { fontFamily: fonts.bodySemi, fontSize: 14, flexShrink: 1 },
  etiquetaCompacta: { fontFamily: fonts.bodySemi, fontSize: 11, flexShrink: 1 },
  faltan: { fontSize: 10 },
  pista: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  pistaCompacta: { height: 5, borderRadius: radii.pill, overflow: 'hidden' },
  llena: { height: '100%', borderRadius: radii.pill },
});
