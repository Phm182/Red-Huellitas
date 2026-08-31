import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { COLOR_JUGADOR } from '../../../src/juego/hueludo/TableroLudo';
import { HuePlaySala, HuePlaySalasBandeja } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';

/** Bandeja de salas (HueLudo, y después HueRummy): invitaciones, armando, tu turno, esperando, terminadas. */
export default function SalasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // El juego llega por parámetro (desde la tarjeta de HueLudo o de HueRummy
  // en HuePlay): antes esta pantalla mostraba SIEMPRE los dos botones de
  // crear, sin importar desde cuál juego se entró — confuso, porque entrando
  // desde HueLudo no tiene sentido ver "Crear sala de HueRummy" ahí. La
  // bandeja de abajo sigue mostrando las salas de los dos juegos juntas: eso
  // sí tiene sentido, es "todas mis salas".
  const params = useLocalSearchParams<{ juego?: string }>();
  const juegoCodigo = params.juego === 'huerummy' ? 'huerummy' : 'hueludo';
  const [bandeja, setBandeja] = useState<HuePlaySalasBandeja | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    hueplayApi.salas().then((res) => {
      if (res.success && res.data) setBandeja(res.data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  const abrir = (s: HuePlaySala) => {
    hapticLeve();
    if (s.estado === 'esperando' || s.jugadores.find((j) => j.esYo)?.estado === 'invitado') {
      router.push({ pathname: '/(app)/hueplay/sala-lobby/[salaId]', params: { salaId: s.salaId } });
    } else {
      const pantalla = s.juegoCodigo === 'huerummy' ? '/(app)/hueplay/rummy' : '/(app)/hueplay/ludo';
      router.push({ pathname: pantalla, params: { salaId: s.salaId } });
    }
  };

  const Fila = ({ s, tono }: { s: HuePlaySala; tono: 'accion' | 'normal' }) => {
    const miAsiento = s.jugadores.find((j) => j.esYo);
    const otros = s.jugadores.filter((j) => !j.esYo);
    return (
      <Pressable
        onPress={() => abrir(s)}
        style={[styles.fila, { backgroundColor: colors.surface, borderColor: tono === 'accion' ? colors.primary : colors.border }]}
      >
        <View style={styles.puntosFila}>
          {s.jugadores.slice(0, 4).map((j) => (
            <View key={j.salaJugadorId} style={[styles.puntito, { backgroundColor: COLOR_JUGADOR[j.posicion] }]} />
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
            {(s.juegoCodigo === 'huerummy' ? t('hueplay.rummy.titulo') : t('hueplay.ludo.titulo'))} ·{' '}
            {otros.length + 1} {t('hueplay.sala.jugadoresCorto')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
            {s.estado === 'esperando'
              ? t('hueplay.sala.armando')
              : s.estado === 'terminada'
                ? s.ganadorSalaJugadorId === miAsiento?.salaJugadorId
                  ? (s.juegoCodigo === 'huerummy' ? t('hueplay.rummy.ganasteFin') : t('hueplay.ludo.ganasteFin'))
                  : (s.juegoCodigo === 'huerummy' ? t('hueplay.rummy.perdisteFin') : t('hueplay.ludo.perdisteFin'))
                : s.esMiTurno
                  ? t('hueplay.teToca')
                  : t('hueplay.esperando')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  };

  const vacio =
    !bandeja ||
    (bandeja.invitaciones.length === 0 &&
      bandeja.armando.length === 0 &&
      bandeja.miTurno.length === 0 &&
      bandeja.esperando.length === 0 &&
      bandeja.terminadas.length === 0);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <View style={styles.crearFila}>
        <Pressable
          onPress={() => {
            hapticLeve();
            router.push(`/(app)/hueplay/sala-crear?juego=${juegoCodigo}` as never);
          }}
          style={[styles.botonCrear, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add-circle" size={18} color={colors.primaryText} />
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.sala.crearSala')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapticLeve();
            router.push('/(app)/hueplay/sala-unirse' as never);
          }}
          style={[styles.botonCrear, styles.botonUnirse, { borderColor: colors.border }]}
        >
          <Ionicons name="key-outline" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.sala.tenesCodigo')}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : vacio ? (
        <EmptyState icon="dice-outline" titulo={t('hueplay.sala.sinSalas')} descripcion={t('hueplay.sala.sinSalasDesc')} />
      ) : (
        <>
          {bandeja!.invitaciones.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.primary }]}>{t('hueplay.sala.invitaciones')}</Text>
              {bandeja!.invitaciones.map((s) => (
                <Fila key={s.salaId} s={s} tono="accion" />
              ))}
            </>
          ) : null}

          {bandeja!.miTurno.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.primary }]}>{t('hueplay.teToca')}</Text>
              {bandeja!.miTurno.map((s) => (
                <Fila key={s.salaId} s={s} tono="accion" />
              ))}
            </>
          ) : null}

          {bandeja!.armando.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.sala.armando')}</Text>
              {bandeja!.armando.map((s) => (
                <Fila key={s.salaId} s={s} tono="normal" />
              ))}
            </>
          ) : null}

          {bandeja!.esperando.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.esperando')}</Text>
              {bandeja!.esperando.map((s) => (
                <Fila key={s.salaId} s={s} tono="normal" />
              ))}
            </>
          ) : null}

          {bandeja!.terminadas.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.historial')}</Text>
              {bandeja!.terminadas.map((s) => (
                <Fila key={s.salaId} s={s} tono="normal" />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  crearFila: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  botonCrear: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  botonUnirse: { backgroundColor: 'transparent', borderWidth: 1 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  puntosFila: { flexDirection: 'row', gap: 3 },
  puntito: { width: 10, height: 10, borderRadius: 5 },
});
