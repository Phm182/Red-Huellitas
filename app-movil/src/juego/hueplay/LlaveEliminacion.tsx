import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HuePlayTorneo, HuePlayTorneoPartida } from '../../types/hueplay';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

/** Bracket de eliminación simple: una columna por ronda, scroll horizontal.
 * Resalta la partida del usuario y el ganador de cada cruce. */
export function LlaveEliminacion({ torneo, yoId }: { torneo: HuePlayTorneo; yoId: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const rondas: HuePlayTorneoPartida[][] = [];
  for (const p of torneo.partidas) {
    (rondas[p.ronda - 1] ??= []).push(p);
  }
  rondas.forEach((r) => r.sort((a, b) => a.slot - b.slot));

  const nombreRonda = (idx: number) => {
    const restantes = rondas.length - idx;
    if (restantes === 1) return t('hueplay.torneo.final');
    if (restantes === 2) return t('hueplay.torneo.semifinal');
    if (restantes === 3) return t('hueplay.torneo.cuartos');
    return t('hueplay.torneo.rondaN', { n: idx + 1 });
  };

  const cell = (nombre: string | null, uid: number | null, ganador: number | null, esBye: boolean) => {
    const gano = uid !== null && ganador === uid;
    const perdio = ganador !== null && uid !== null && ganador !== uid;
    return (
      <View style={styles.cell}>
        <Text
          numberOfLines={1}
          style={{
            color: gano ? colors.success : perdio ? colors.textMuted : colors.text,
            fontFamily: gano ? fonts.bodySemi : fonts.body,
            fontSize: 12,
            flex: 1,
          }}
        >
          {nombre ?? (esBye ? t('hueplay.torneo.bye') : t('hueplay.torneo.aDefinir'))}
        </Text>
        {gano ? <Text style={{ color: colors.success, fontSize: 11 }}>✓</Text> : null}
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      {rondas.map((ronda, i) => (
        <View key={i} style={styles.col}>
          <Text style={[styles.rondaLabel, { color: colors.textMuted }]}>{nombreRonda(i)}</Text>
          {ronda.map((p) => {
            const soyYo = p.aUserId === yoId || p.bUserId === yoId;
            return (
              <View
                key={p.partidaId}
                style={[
                  styles.match,
                  { borderColor: soyYo ? colors.primary : colors.border, backgroundColor: colors.surface },
                ]}
              >
                {cell(p.aNombre, p.aUserId, p.ganadorUserId, p.estado === 'bye')}
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
                {cell(p.bNombre, p.bUserId, p.ganadorUserId, p.estado === 'bye' && p.bUserId === null)}
                {p.estado === 'jugando' ? (
                  <Text style={[styles.enJuego, { color: colors.primary }]}>{t('hueplay.torneo.enJuego')}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8, gap: 14 },
  col: { gap: 12, justifyContent: 'space-around', minWidth: 150 },
  rondaLabel: { fontSize: 11, textTransform: 'uppercase', fontFamily: fonts.bodySemi, textAlign: 'center' },
  match: { borderWidth: 1, borderRadius: radii.md, padding: 8, gap: 4 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sep: { height: 1, marginVertical: 1 },
  enJuego: { fontSize: 10, textAlign: 'center', marginTop: 2, textTransform: 'uppercase' },
});
