import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { centeredContent } from '../../../src/theme/layout';
import { radii } from '../../../src/theme/elevation';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';

type JuegoDef = {
  id: string;
  titulo: string;
  bajada: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  ruta?: string;
};

/**
 * Catálogo de HuePlay.
 *
 * HuePlay es la sección; los juegos van adentro. HueGotchi es el primero, así
 * que esta pantalla existe para que sumar el segundo sea agregar una entrada
 * acá y no rehacer la navegación.
 */
const JUEGOS: JuegoDef[] = [
  {
    id: 'huegotchi',
    titulo: 'HueGotchi',
    bajada: 'Cuidá a tu mascota: alimentala, jugá, bañala y enseñale trucos.',
    icono: 'paw',
    color: '#E8577E',
    ruta: '/(app)/juego/mascotas',
  },
];

const PROXIMAMENTE: JuegoDef[] = [
  {
    id: 'memoria',
    titulo: 'HueMemo',
    bajada: 'Juego de memoria con las fotos de tus mascotas.',
    icono: 'grid',
    color: '#5B9AD6',
  },
  {
    id: 'trivia',
    titulo: 'HueTrivia',
    bajada: 'Preguntas sobre cuidado animal para ganar XP.',
    icono: 'help-circle',
    color: '#E8A54C',
  },
];

export default function HuePlayCatalogoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <Text style={[styles.titulo, { color: colors.text }]}>HuePlay</Text>
      <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('juego.hub.bajada')}</Text>

      {JUEGOS.map((j) => (
        <Pressable
          key={j.id}
          onPress={() => j.ruta && router.push(j.ruta as never)}
          style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.icono, { backgroundColor: `${j.color}22` }]}>
            <Ionicons name={j.icono} size={26} color={j.color} />
          </View>
          <View style={styles.texto}>
            <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>{j.titulo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{j.bajada}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('juego.hub.proximamente')}</Text>
      {PROXIMAMENTE.map((j) => (
        <View
          key={j.id}
          style={[styles.tarjeta, styles.tarjetaOff, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.icono, { backgroundColor: `${j.color}18` }]}>
            <Ionicons name={j.icono} size={26} color={j.color} />
          </View>
          <View style={styles.texto}>
            <Text style={[styles.tarjetaTitulo, { color: colors.textMuted }]}>{j.titulo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{j.bajada}</Text>
          </View>
          <View style={[styles.badge, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>{t('juego.hub.pronto')}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  titulo: { fontSize: 26, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  seccion: {
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    marginTop: 22,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  tarjetaOff: { opacity: 0.6 },
  icono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1 },
  tarjetaTitulo: { fontSize: 16, fontFamily: fonts.bodySemi, marginBottom: 2 },
  badge: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
