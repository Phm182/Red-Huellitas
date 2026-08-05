import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radii } from '../theme/elevation';
import { fonts } from '../theme/typography';

type Props = {
  /** AAAA-MM-DD o '' si todavía no está completa. */
  value: string;
  onChange: (valor: string) => void;
  label?: string;
  ayuda?: string;
};

/**
 * Fecha de nacimiento en tres campos (día / mes / año).
 *
 * No se usa un date picker nativo a propósito: para elegir una fecha de hace
 * 30 años hay que recorrer 360 meses, y en web el picker de Expo se comporta
 * distinto en cada navegador. Tres campos numéricos con salto automático son
 * más rápidos de completar y se comportan igual en las tres plataformas.
 */
export function FechaNacimientoField({ value, onChange, label, ayuda }: Props) {
  const { colors } = useTheme();
  const mesRef = useRef<TextInput>(null);
  const anioRef = useRef<TextInput>(null);

  /**
   * Las tres partes viven acá y NO se derivan de `value`.
   *
   * Derivarlas del padre parecía más prolijo pero se borraba solo al escribir:
   * como hacia arriba sólo se emite la fecha completa, al tipear el primer
   * dígito el padre recibía '' y el campo se vaciaba en el mismo teclazo.
   */
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');

  // Sincroniza sólo cuando llega una fecha completa desde afuera (por ejemplo
  // al precargar un valor guardado), nunca mientras se está escribiendo.
  useEffect(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) {
      setAnio(m[1]!);
      setMes(m[2]!);
      setDia(m[3]!);
    }
  }, [value]);

  // Se emite sólo cuando las tres partes están completas; si no, la pantalla
  // recibiría '2015--' y trataría de validarlo.
  const emitir = (d: string, m: string, a: string) => {
    if (d.length > 0 && m.length > 0 && a.length === 4) {
      onChange(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else if (value !== '') {
      onChange('');
    }
  };

  const soloDigitos = (t: string, max: number) => t.replace(/[^0-9]/g, '').slice(0, max);

  const campo = (
    ref: React.RefObject<TextInput | null> | null,
    valor: string,
    placeholder: string,
    max: number,
    onNuevo: (v: string) => void,
    ancho: number
  ) => (
    <TextInput
      ref={ref ?? undefined}
      style={[
        styles.input,
        { width: ancho, borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
      ]}
      value={valor}
      onChangeText={(t) => onNuevo(soloDigitos(t, max))}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType="number-pad"
      maxLength={max}
      inputMode="numeric"
    />
  );

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <View style={styles.fila}>
        {campo(null, dia, 'DD', 2, (v) => {
          setDia(v);
          emitir(v, mes, anio);
          if (v.length === 2) mesRef.current?.focus();
        }, 62)}
        <Text style={[styles.sep, { color: colors.textMuted }]}>/</Text>
        {campo(mesRef, mes, 'MM', 2, (v) => {
          setMes(v);
          emitir(dia, v, anio);
          if (v.length === 2) anioRef.current?.focus();
        }, 62)}
        <Text style={[styles.sep, { color: colors.textMuted }]}>/</Text>
        {campo(anioRef, anio, 'AAAA', 4, (v) => {
          setAnio(v);
          emitir(dia, mes, v);
        }, 86)}
      </View>
      {ayuda ? <Text style={[styles.ayuda, { color: colors.textMuted }]}>{ayuda}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontFamily: fonts.bodySemi, marginBottom: 6, fontSize: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sep: { fontSize: 18 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  ayuda: { fontSize: 12, marginTop: 6 },
});
