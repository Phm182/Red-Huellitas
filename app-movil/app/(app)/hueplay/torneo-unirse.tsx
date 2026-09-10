import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { radii } from '../../../src/theme/elevation';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticError, hapticExito, hapticMedio } from '../../../src/utils/haptics';

/** Sumarse a un torneo con el código que te compartieron. */
export default function TorneoUnirseScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ codigo?: string }>();
  const [codigo, setCodigo] = useState(params.codigo ? params.codigo.toUpperCase() : '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unirse = async () => {
    if (codigo.trim().length < 4) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.unirseTorneo(codigo.trim());
    setEnviando(false);
    if (res.success && res.data) {
      hapticExito();
      const t2 = res.data.torneo;
      const destino = t2.estado === 'inscripcion' ? '/(app)/hueplay/torneo-lobby/[torneoId]' : '/(app)/hueplay/torneo/[torneoId]';
      router.replace({ pathname: destino, params: { torneoId: t2.torneoId } });
    } else {
      hapticError();
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <View style={[styles.contenido, { backgroundColor: colors.background }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.torneo.tenesCodigo')}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
        {t('hueplay.torneo.pegaElCodigo')}
      </Text>

      <TextInput
        value={codigo}
        onChangeText={(v) => setCodigo(v.toUpperCase())}
        placeholder={t('hueplay.sala.codigoPlaceholder')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      <Pressable
        disabled={enviando || codigo.trim().length < 4}
        onPress={unirse}
        style={[styles.boton, { backgroundColor: colors.primary, opacity: enviando || codigo.trim().length < 4 ? 0.6 : 1 }]}
      >
        {enviando ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>{t('hueplay.torneo.unirse')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 20, fontFamily: fonts.bodySemi, marginBottom: 6, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    width: '100%',
    maxWidth: 280,
  },
  boton: { borderRadius: radii.pill, paddingVertical: 14, paddingHorizontal: 40, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
});
