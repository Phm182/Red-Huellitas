import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { FichaSkinSvg } from '../../../src/juego/huesoccer/FichaSkinSvg';
import { PelotaSkinSvg } from '../../../src/juego/huesoccer/PelotaSkinSvg';
import {
  COLOR_FICHA_DEFAULT,
  ColorFichaId,
  PALETA_FICHA,
  SKINS_FICHA,
  SKINS_PELOTA,
  SKIN_FICHA_DEFAULT,
  SKIN_PELOTA_DEFAULT,
  SkinFichaId,
  SkinPelotaId,
  hexDeColorFicha,
} from '../../../src/juego/huesoccer/skins';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { radii } from '../../../src/theme/elevation';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';

const TAMANO_MUESTRA = 52;

/**
 * Elección de skin de ficha/pelota/color de HueSoccer. Es una preferencia
 * FIJA de cuenta (no por partida) — decisión ya cerrada con el usuario.
 * Molde de `ajustes/whatsapp.tsx`.
 */
export default function HueSoccerSkinsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, actualizarUsuario } = useAuth();

  const [skinFicha, setSkinFicha] = useState<SkinFichaId>((user?.huesoccerSkinFicha as SkinFichaId) ?? SKIN_FICHA_DEFAULT);
  const [skinPelota, setSkinPelota] = useState<SkinPelotaId>((user?.huesoccerSkinPelota as SkinPelotaId) ?? SKIN_PELOTA_DEFAULT);
  const [colorFicha, setColorFicha] = useState<ColorFichaId>(
    (user?.huesoccerColorFicha as ColorFichaId) ?? COLOR_FICHA_DEFAULT
  );
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegirColor = async (id: ColorFichaId) => {
    if (id === colorFicha || loading) return;
    hapticLeve();
    setColorFicha(id);
    await guardar(skinFicha, skinPelota, id);
  };

  const elegirFicha = async (id: SkinFichaId) => {
    if (id === skinFicha || loading) return;
    hapticLeve();
    setSkinFicha(id);
    await guardar(id, skinPelota, colorFicha);
  };

  const elegirPelota = async (id: SkinPelotaId) => {
    if (id === skinPelota || loading) return;
    hapticLeve();
    setSkinPelota(id);
    await guardar(skinFicha, id, colorFicha);
  };

  const guardar = async (nuevaFicha: SkinFichaId, nuevaPelota: SkinPelotaId, nuevoColor: ColorFichaId) => {
    setError(null);
    setMensaje(null);
    setLoading(true);
    const res = await hueplayApi.guardarHueSoccerSkin(nuevaFicha, nuevaPelota, nuevoColor);
    setLoading(false);
    if (res.success && res.data && user) {
      actualizarUsuario({
        ...user,
        huesoccerSkinFicha: res.data.skinFicha,
        huesoccerSkinPelota: res.data.skinPelota,
        huesoccerColorFicha: res.data.colorFicha,
      });
      setMensaje(t('common.changesSaved'));
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, centeredContent]} style={{ backgroundColor: colors.background }}>
      <Text style={[type.titleSm, { color: colors.text, marginBottom: 4 }]}>{t('hueplay.soccer.skinsTitulo')}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>{t('hueplay.soccer.skinsAyuda')}</Text>

      {/* El color es lo primero que se elige: es lo que de verdad distingue
          a un jugador del otro en la cancha (si coinciden, el rival se ve
          en el complementario — ver `resolverColorFicha`). El patrón de
          abajo es un adorno encima. */}
      <Text style={[styles.label, { color: colors.text }]}>{t('hueplay.soccer.colorFichaTitulo')}</Text>
      <View style={styles.grillaColores}>
        {PALETA_FICHA.map((c) => {
          const activo = c.id === colorFicha;
          return (
            <Pressable
              key={c.id}
              onPress={() => elegirColor(c.id)}
              style={[
                styles.swatch,
                { backgroundColor: c.hex, borderColor: activo ? colors.primary : 'rgba(255,255,255,0.25)' },
              ]}
              accessibilityLabel={t(c.claveI18n)}
            >
              {activo ? <View style={styles.swatchCheck} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, marginBottom: 16 }}>
        {t(PALETA_FICHA.find((c) => c.id === colorFicha)?.claveI18n ?? '')}
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>{t('hueplay.soccer.skinsFichaTitulo')}</Text>
      <View style={styles.grilla}>
        {SKINS_FICHA.map((s) => {
          const activo = s.id === skinFicha;
          return (
            <Pressable
              key={s.id}
              onPress={() => elegirFicha(s.id)}
              style={[
                styles.tarjeta,
                { borderColor: activo ? colors.primary : colors.border, backgroundColor: colors.surface },
              ]}
            >
              <FichaSkinSvg skin={s.id} colorEquipo={hexDeColorFicha(colorFicha)} size={TAMANO_MUESTRA} idInstancia={`preview_${s.id}`} />
              <Text style={[styles.tarjetaTexto, { color: activo ? colors.primary : colors.text }]}>{t(s.claveI18n)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>{t('hueplay.soccer.skinsPelotaTitulo')}</Text>
      <View style={styles.grilla}>
        {SKINS_PELOTA.map((s) => {
          const activo = s.id === skinPelota;
          return (
            <Pressable
              key={s.id}
              onPress={() => elegirPelota(s.id)}
              style={[
                styles.tarjeta,
                { borderColor: activo ? colors.primary : colors.border, backgroundColor: colors.surface },
              ]}
            >
              <PelotaSkinSvg skin={s.id} size={TAMANO_MUESTRA} />
              <Text style={[styles.tarjetaTexto, { color: activo ? colors.primary : colors.text }]}>{t(s.claveI18n)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.pie}>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {mensaje ? <Text style={{ color: colors.success }}>{mensaje}</Text> : null}
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, marginBottom: 10 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grillaColores: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  tarjeta: {
    width: 92,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  tarjetaTexto: { fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center' },
  pie: { marginTop: 20, alignItems: 'center', gap: 8 },
});
