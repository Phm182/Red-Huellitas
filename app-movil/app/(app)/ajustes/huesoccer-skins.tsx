import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { FichaSkinSvg } from '../../../src/juego/huesoccer/FichaSkinSvg';
import { PelotaSkinSvg } from '../../../src/juego/huesoccer/PelotaSkinSvg';
import {
  SKINS_FICHA,
  SKINS_PELOTA,
  SKIN_FICHA_DEFAULT,
  SKIN_PELOTA_DEFAULT,
  SkinFichaId,
  SkinPelotaId,
} from '../../../src/juego/huesoccer/skins';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { radii } from '../../../src/theme/elevation';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';

const COLOR_MUESTRA = '#E8577E';
const TAMANO_MUESTRA = 52;

/**
 * Elección de skin de ficha/pelota de HueSoccer. Es una preferencia FIJA de
 * cuenta (no por partida) — ver `plans/starry-brewing-kazoo.md`, decisión ya
 * cerrada con el usuario. Molde de `ajustes/whatsapp.tsx`.
 */
export default function HueSoccerSkinsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, actualizarUsuario } = useAuth();

  const [skinFicha, setSkinFicha] = useState<SkinFichaId>((user?.huesoccerSkinFicha as SkinFichaId) ?? SKIN_FICHA_DEFAULT);
  const [skinPelota, setSkinPelota] = useState<SkinPelotaId>((user?.huesoccerSkinPelota as SkinPelotaId) ?? SKIN_PELOTA_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegirFicha = async (id: SkinFichaId) => {
    if (id === skinFicha || loading) return;
    hapticLeve();
    setSkinFicha(id);
    await guardar(id, skinPelota);
  };

  const elegirPelota = async (id: SkinPelotaId) => {
    if (id === skinPelota || loading) return;
    hapticLeve();
    setSkinPelota(id);
    await guardar(skinFicha, id);
  };

  const guardar = async (nuevaFicha: SkinFichaId, nuevaPelota: SkinPelotaId) => {
    setError(null);
    setMensaje(null);
    setLoading(true);
    const res = await hueplayApi.guardarHueSoccerSkin(nuevaFicha, nuevaPelota);
    setLoading(false);
    if (res.success && res.data && user) {
      actualizarUsuario({ ...user, huesoccerSkinFicha: res.data.skinFicha, huesoccerSkinPelota: res.data.skinPelota });
      setMensaje(t('common.changesSaved'));
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, centeredContent]} style={{ backgroundColor: colors.background }}>
      <Text style={[type.titleSm, { color: colors.text, marginBottom: 4 }]}>{t('hueplay.soccer.skinsTitulo')}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>{t('hueplay.soccer.skinsAyuda')}</Text>

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
              <FichaSkinSvg skin={s.id} variante="primaria" colorEquipo={COLOR_MUESTRA} size={TAMANO_MUESTRA} />
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
