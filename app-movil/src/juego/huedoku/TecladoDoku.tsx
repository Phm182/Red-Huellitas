import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  n: number;
  onDigito: (d: number) => void;
  onBorrar: () => void;
  deshabilitado: boolean;
};

/** Fila de dígitos 1..n debajo del tablero, más un botón de borrar. */
export function TecladoDoku({ n, onDigito, onBorrar, deshabilitado }: Props) {
  const { colors } = useTheme();
  const digitos = Array.from({ length: n }, (_, i) => i + 1);

  return (
    <View style={styles.fila}>
      {digitos.map((d) => (
        <Pressable
          key={d}
          disabled={deshabilitado}
          onPress={() => onDigito(d)}
          style={[styles.tecla, { backgroundColor: colors.primarySoft, opacity: deshabilitado ? 0.4 : 1 }]}
        >
          <Text style={[styles.numero, { color: colors.primary }]}>{d}</Text>
        </Pressable>
      ))}
      <Pressable
        disabled={deshabilitado}
        onPress={onBorrar}
        style={[styles.tecla, { backgroundColor: colors.border, opacity: deshabilitado ? 0.4 : 1 }]}
      >
        <Ionicons name="backspace-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 16 },
  tecla: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontSize: 17, fontFamily: fonts.bodySemi },
});
