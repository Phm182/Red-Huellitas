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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEMAS: { id: ThemePreference; labelKey: string }[] = [
  { id: 'system', labelKey: 'setup.themeSystem' },
  { id: 'light', labelKey: 'setup.themeLight' },
  { id: 'dark', labelKey: 'setup.themeDark' },
];

export default function SetupBienvenidaScreen() {
  const { t, i18n } = useTranslation();
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
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
      {/*
        Pantalla en dos partes: el contenido arriba y, FIJO abajo, la cláusula y el
        botón "Continuar". Antes todo iba dentro del scroll y el botón terminaba
        detrás de los botones de navegación de Android (o había que scrollear para
        llegar). Ahora el pie respeta el margen seguro de abajo y siempre se ve.
        El contenido está compactado para entrar sin scroll en un celular común; el
        ScrollView queda sólo como red de seguridad para pantallas muy chicas o
        con la letra grande, y para el cuadro de términos desplegado.
      */}
      <View
        style={[
          styles.pantalla,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <ScrollView
          style={styles.contenido}
          contentContainerStyle={styles.contenidoInterno}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                      fontSize: 13,
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
                      fontSize: 12,
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

          <Pressable onPress={() => setMostrarLegal((v) => !v)} style={{ marginBottom: 6 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 }}>
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
        </ScrollView>

        <View style={styles.pie}>
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
            <Text style={{ flex: 1, color: colors.text, fontSize: 13, lineHeight: 18, fontFamily: fonts.body }}>
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
        </View>
      </View>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pantalla: { flex: 1, paddingHorizontal: 20, ...centeredContent },
  contenido: { flex: 1 },
  contenidoInterno: { flexGrow: 1, justifyContent: 'center', paddingBottom: 8 },
  pie: { paddingTop: 8, gap: 10 },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 6 },
  title: { ...type.hero, fontSize: 26, textAlign: 'center', marginBottom: 4 },
  sub: { ...type.bodySm, textAlign: 'center', marginBottom: 12 },
  label: { ...type.section, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  anti: { fontSize: 12, lineHeight: 17, marginBottom: 6, fontFamily: fonts.body },
  legalBox: { borderWidth: 1, borderRadius: radii.md, padding: 10, marginBottom: 8, maxHeight: 180 },
  clause: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: radii.md, padding: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
