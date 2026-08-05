import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

/** Los tipos tienen que coincidir con el ENUM de HistoriaReaccion. */
export type ReaccionHistoria =
  | 'huella'
  | 'amor'
  | 'divertido'
  | 'asombro'
  | 'triste'
  | 'abrazo'
  | 'guau'
  | 'michi';

const EMOJI: Record<ReaccionHistoria, string> = {
  huella: '🐾',
  amor: '❤️',
  divertido: '😂',
  asombro: '😮',
  triste: '😢',
  abrazo: '🤗',
  guau: '🐶',
  michi: '🐱',
};

const ORDEN: ReaccionHistoria[] = [
  'huella',
  'amor',
  'divertido',
  'asombro',
  'triste',
  'abrazo',
  'guau',
  'michi',
];

type Props = {
  miReaccion: ReaccionHistoria | null;
  conteo: Partial<Record<ReaccionHistoria, number>>;
  onReaccionar: (tipo: ReaccionHistoria) => void;
  /** El autor no reacciona a su propia Huellita, pero sí ve los conteos. */
  soloLectura?: boolean;
};

/**
 * Barra de reacciones rápidas de una Huellita.
 *
 * Tocar una reacción distinta reemplaza la anterior y tocar la misma la saca;
 * el estado real lo resuelve el backend, acá sólo se dispara. Se marca la
 * propia con un anillo para que se entienda que ya reaccionaste.
 */
export function ReaccionesBarra({ miReaccion, conteo, onReaccionar, soloLectura }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {ORDEN.map((tipo) => {
        const mia = miReaccion === tipo;
        const n = conteo[tipo] ?? 0;
        return (
          <Pressable
            key={tipo}
            disabled={soloLectura}
            onPress={() => {
              hapticLeve();
              onReaccionar(tipo);
            }}
            accessibilityLabel={t(`historias.reacciones.${tipo}`)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: mia ? colors.primarySoft : 'rgba(0,0,0,0.35)',
                borderColor: mia ? colors.primary : 'transparent',
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.emoji}>{EMOJI[tipo]}</Text>
            {n > 0 ? <Text style={[styles.conteo, { color: colors.surface }]}>{n}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emoji: { fontSize: 20 },
  conteo: { fontSize: 12, fontWeight: '700' },
});
