import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogoImage } from '../../src/components/LogoImage';
import { Atmosphere } from '../../src/components/Atmosphere';
import { AppButton } from '../../src/components/AppButton';
import { RESUMEN_ANTI_CRIADEROS, TERMINOS_Y_CONDICIONES } from '../../src/legal/terminos';
import { isSetupCompleto, marcarSetupCompleto } from '../../src/legal/setupStorage';
import { cambiarIdioma, IDIOMAS_DISPONIBLES } from '../../src/i18n/i18n';
import { radii } from '../../src/theme/elevation';
import { centeredContent } from '../../src/theme/layout';
import { fonts, type } from '../../src/theme/typography';
import { ThemePreference, useTheme } from '../../src/theme/ThemeProvider';

const TEMAS: { id: ThemePreference; labelKey: string }[] = [
  { id: 'system', labelKey: 'setup.themeSystem' },
  { id: 'light', labelKey: 'setup.themeLight' },
  { id: 'dark', labelKey: 'setup.themeDark' },
];

export default function SetupBienvenidaScreen() {
  const { t, i18n } = useTranslation();
  const { colors, preference, setPreference } = useTheme();
  const [checking, setChecking] = useState(true);
  const [acepta, setAcepta] = useState(false);
  const [mostrarLegal, setMostrarLegal] = useState(false);

  useEffect(() => {
    isSetupCompleto().then((ok) => {
      if (ok) {
        router.replace('/(auth)/login');
      } else {
        setChecking(false);
      }
    });
  }, []);

  const onContinuar = async () => {
    if (!acepta) return;
    await marcarSetupCompleto();
    router.replace('/(auth)/login');
  };

  if (checking) {
    return (
      <Atmosphere style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  return (
    <Atmosphere intensity="auth">
      <ScrollView contentContainerStyle={[styles.container]} keyboardShouldPersistTaps="handled">
        <LogoImage style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Red Huellitas</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{t('setup.subtitle')}</Text>

        <Text style={[styles.label, { color: colors.text }]}>{t('setup.themeLabel')}</Text>
        <View style={styles.chipRow}>
          {TEMAS.map((tema) => {
            const activo = preference === tema.id;
            return (
              <Pressable
                key={tema.id}
                onPress={() => setPreference(tema.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.primary,
                    backgroundColor: activo ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: activo ? colors.primaryText : colors.primary,
                    fontFamily: fonts.bodySemi,
                  }}
                >
                  {t(tema.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>{t('setup.languageLabel')}</Text>
        <View style={styles.chipRow}>
          {IDIOMAS_DISPONIBLES.map((idioma) => {
            const activo = i18n.language === idioma.codigo;
            return (
              <Pressable
                key={idioma.codigo}
                onPress={() => cambiarIdioma(idioma.codigo)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.primary,
                    backgroundColor: activo ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: activo ? colors.primaryText : colors.primary,
                    fontFamily: fonts.bodySemi,
                    fontSize: 13,
                  }}
                >
                  {idioma.nombreNativo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>{t('setup.legalLabel')}</Text>
        <Text style={[styles.anti, { color: colors.textMuted }]}>{RESUMEN_ANTI_CRIADEROS}</Text>

        <Pressable onPress={() => setMostrarLegal((v) => !v)} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
            {mostrarLegal ? t('setup.hideTerms') : t('setup.readTerms')}
          </Text>
        </Pressable>

        {mostrarLegal ? (
          <View style={[styles.legalBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: fonts.body }}>
              {TERMINOS_Y_CONDICIONES}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.clause, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setAcepta((v) => !v)}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.primary,
                backgroundColor: acepta ? colors.primary : 'transparent',
              },
            ]}
          >
            {acepta ? <Text style={{ color: colors.primaryText }}>✓</Text> : null}
          </View>
          <Text style={{ flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontFamily: fonts.body }}>
            {t('setup.acceptTerms')}
          </Text>
        </Pressable>

        {/* No se le pasa `disabled` al AppButton a propósito: con Reanimated 4 +
            Fabric el prop `disabled` de un AnimatedPressable queda "pegado" al
            valor del primer render y nunca se vuelve a evaluar — el botón se
            monta con `acepta=false` y se queda sordo a los toques para
            siempre, aunque el checkbox de arriba sí se marque bien. El gate
            real es el `if (!acepta) return` de `onContinuar`; acá sólo se
            imita el look apagado mientras no se aceptó. */}
        <AppButton
          label={t('setup.continue')}
          onPress={onContinuar}
          style={{ opacity: acepta ? 1 : 0.5 }}
        />
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 24, paddingBottom: 48, ...centeredContent },
  logo: { width: 112, height: 112, alignSelf: 'center', marginBottom: 12 },
  title: { ...type.hero, textAlign: 'center', marginBottom: 8 },
  sub: { ...type.bodySm, textAlign: 'center', marginBottom: 24 },
  label: { ...type.section, marginBottom: 10, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  anti: { fontSize: 13, lineHeight: 19, marginBottom: 10, fontFamily: fonts.body },
  legalBox: { borderWidth: 1, borderRadius: radii.md, padding: 12, marginBottom: 16, maxHeight: 220 },
  clause: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: radii.md, padding: 12, marginBottom: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
