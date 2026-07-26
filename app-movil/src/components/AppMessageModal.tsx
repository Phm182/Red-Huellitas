import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { elevation, radii } from '../theme/elevation';
import { fonts, type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { AppButton } from './AppButton';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmLabel?: string;
};

/**
 * Diálogo centrado al estilo de la app (reemplaza window.alert / Alert nativo en web).
 */
export function AppMessageModal({ visible, title, message, onClose, confirmLabel }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.card,
            elevation.md,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          <AppButton
            label={confirmLabel || t('common.close')}
            onPress={onClose}
            style={{ alignSelf: 'stretch', marginTop: 8 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 10,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
  },
  message: {
    ...type.body,
    lineHeight: 22,
  },
});
