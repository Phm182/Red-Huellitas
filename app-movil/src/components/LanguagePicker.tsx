import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { cambiarIdioma, IDIOMAS_DISPONIBLES } from '../i18n/i18n';
import { useTheme } from '../theme/ThemeProvider';

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const idiomaActual = IDIOMAS_DISPONIBLES.find((i) => i.codigo === i18n.language);

  const onElegir = (codigo: string) => {
    cambiarIdioma(codigo);
    setVisible(false);
  };

  return (
    <>
      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => setVisible(true)}>
        <Text style={{ color: colors.text }}>{t('settings.language')}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {idiomaActual?.nombreNativo ?? i18n.language.toUpperCase()}
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('settings.language')}</Text>
            <FlatList
              data={IDIOMAS_DISPONIBLES}
              keyExtractor={(item) => item.codigo}
              renderItem={({ item }) => {
                const activo = item.codigo === i18n.language;
                return (
                  <Pressable
                    style={[styles.option, { borderColor: colors.border }]}
                    onPress={() => onElegir(item.codigo)}
                  >
                    <Text style={{ color: activo ? colors.primary : colors.text, fontWeight: activo ? '700' : '400' }}>
                      {item.nombreNativo}
                    </Text>
                    {activo ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '85%', maxWidth: 360, maxHeight: '70%', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
});
