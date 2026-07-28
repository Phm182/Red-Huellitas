import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  /** Ruta de la pantalla de edición, ej: '/(app)/transito/[id]/editar'. */
  ruta: string;
  id: number;
  /** `editable` del serializer. undefined = no vino (no sos el dueño). */
  editable?: boolean;
  motivoNoEditable?: string | null;
}

/**
 * Botón "Editar publicación" para el dueño, que se convierte en un cartel
 * explicativo cuando la publicación quedó bloqueada.
 *
 * Se muestra el motivo en el detalle y no recién al entrar a editar para que el
 * dueño entienda por qué no puede tocarla sin tener que chocarse con un error.
 */
export function BotonEditarPublicacion({ ruta, id, editable, motivoNoEditable }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (editable === false) {
    return (
      <View style={[styles.lockBox, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('edicion.noEditableTitulo')}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>
          {motivoNoEditable || t('edicion.noEditable')}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary }]}
      onPress={() => router.push({ pathname: ruta as never, params: { id } as never })}
    >
      <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('edicion.titulo')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, borderWidth: 1, padding: 14, alignItems: 'center', marginTop: 8 },
  lockBox: { borderRadius: 10, borderWidth: 1, padding: 14, marginTop: 8 },
});
