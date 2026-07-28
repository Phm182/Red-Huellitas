import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Pantalla completa que explica por qué una publicación dejó de ser editable.
 *
 * El motivo lo escribe el backend (`motivoNoEditable`) y no la app: cada módulo
 * se bloquea por una razón distinta —una postulación en curso, un pedido sin
 * entregar, un reporte ya reencontrado— y repetir esos textos acá los dejaría
 * desincronizados apenas cambie una regla.
 */
export function EdicionBloqueada({ motivo }: { motivo?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{t('edicion.noEditableTitulo')}</Text>
      <Text style={[styles.motivo, { color: colors.textMuted }]}>{motivo || t('edicion.noEditable')}</Text>
      <Pressable onPress={() => router.back()} style={styles.boton}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.close')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { fontWeight: '700', fontSize: 17, textAlign: 'center' },
  motivo: { marginTop: 10, textAlign: 'center', lineHeight: 20 },
  boton: { marginTop: 20 },
});
