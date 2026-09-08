import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/typography';
import { RH_SCRABBLE_VALORES } from './constantes';

type Props = {
  letra: string;
  /** Modo "colocar en el tablero": resaltada = es la que está armada para el próximo toque. */
  resaltada?: boolean;
  /** Modo "cambiar fichas": marcada = elegida para el intercambio. */
  marcada?: boolean;
  onPress: () => void;
};

/**
 * Una ficha del atril: letra grande + su valor en punta chica, igual al
 * diseño real de las fichas de Scrabble. `'*'` es un comodín sin letra
 * asignada todavía — se muestra en blanco.
 */
export function FichaAtril({ letra, resaltada, marcada, onPress }: Props) {
  const { colors } = useTheme();
  const esComodin = letra === '*';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.ficha,
        {
          backgroundColor: '#F4E4C9',
          borderColor: resaltada || marcada ? colors.primary : 'rgba(0,0,0,0.25)',
          borderWidth: resaltada || marcada ? 3 : 1.5,
        },
      ]}
    >
      <Text style={styles.letra}>{esComodin ? '' : letra}</Text>
      {!esComodin ? <Text style={styles.valor}>{RH_SCRABBLE_VALORES[letra] ?? 0}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ficha: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: { fontFamily: fonts.displaySemi, fontSize: 18, color: '#3A2E1F' },
  valor: { position: 'absolute', bottom: 2, right: 4, fontSize: 9, color: '#6B5A3E', fontFamily: fonts.bodySemi },
});
