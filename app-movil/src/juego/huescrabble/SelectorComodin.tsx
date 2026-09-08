import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { elevation, radii } from '../../theme/elevation';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';
import { RH_SCRABBLE_ALFABETO } from './constantes';

type Props = {
  visible: boolean;
  onElegir: (letra: string) => void;
  onCancelar: () => void;
};

/** Modal chico para elegir qué letra representa un comodín al colocarlo. */
export function SelectorComodin({ visible, onElegir, onCancelar }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancelar} />
        <View style={[styles.dialog, elevation.lg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[type.titleSm, { color: colors.text, marginBottom: 12 }]}>
            {t('hueplay.scrabble.elegiComodin')}
          </Text>
          <View style={styles.grilla}>
            {RH_SCRABBLE_ALFABETO.map((letra) => (
              <Pressable
                key={letra}
                onPress={() => {
                  hapticLeve();
                  onElegir(letra);
                }}
                style={[styles.letra, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              >
                <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 16 }}>{letra}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radii.lg, borderWidth: 1, padding: 20 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  letra: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
