import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { hueplayApi } from '../../api/hueplayApi';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

type Props = {
  juegoCodigo: string;
  esFavorito: boolean;
  /** El padre guarda la lista de favoritos — acá sólo se avisa el cambio, optimista, antes de que conteste el servidor. */
  onCambiar: (juegoCodigo: string, favorito: boolean) => void;
  size?: number;
};

/**
 * Estrella para marcar/desmarcar un juego como favorito. Sin estado propio
 * de "guardando": el padre ya actualiza de una (optimista) y si el POST
 * falla no hay mucho que perder — es sólo orden de una lista, se corrige
 * solo la próxima vez que se recargue `perfil()`.
 */
export function BotonFavorito({ juegoCodigo, esFavorito, onCambiar, size = 20 }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      hitSlop={10}
      onPress={(e) => {
        e.stopPropagation?.();
        hapticLeve();
        onCambiar(juegoCodigo, !esFavorito);
        const req = esFavorito ? hueplayApi.favoritoQuitar(juegoCodigo) : hueplayApi.favoritoAgregar(juegoCodigo);
        req.then((res) => {
          if (!res.success) onCambiar(juegoCodigo, esFavorito); // revierte si falló
        });
      }}
      style={styles.boton}
    >
      <Ionicons
        name={esFavorito ? 'star' : 'star-outline'}
        size={size}
        color={esFavorito ? '#F0A830' : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { padding: 4 },
});
