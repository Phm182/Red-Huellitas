import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { HuePlayTorneo } from '../../types/hueplay';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

/** Tabla de posiciones + fixture por fecha para un torneo formato liga. */
export function TablaLiga({ torneo, yoId }: { torneo: HuePlayTorneo; yoId: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const tabla = [...torneo.participantes].sort((a, b) => {
    if (b.puntosLiga !== a.puntosLiga) return b.puntosLiga - a.puntosLiga;
    return b.ganadas - a.ganadas;
  });

  const fechas: HuePlayTorneo['partidas'][] = [];
  for (const p of torneo.partidas) {
    (fechas[p.ronda - 1] ??= []).push(p);
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.filaHead}>
          <Text style={[styles.hCell, styles.pos, { color: colors.textMuted }]}>#</Text>
          <Text style={[styles.hCell, { color: colors.textMuted, flex: 1 }]}>{t('hueplay.torneo.jugador')}</Text>
          <Text style={[styles.hCell, styles.num, { color: colors.textMuted }]}>{t('hueplay.torneo.pj')}</Text>
          <Text style={[styles.hCell, styles.num, { color: colors.textMuted }]}>{t('hueplay.torneo.pts')}</Text>
        </View>
        {tabla.map((p, i) => (
          <View
            key={p.userId}
            style={[styles.fila, p.userId === yoId && { backgroundColor: colors.primarySoft, borderRadius: radii.sm }]}
          >
            <Text style={[styles.pos, { color: i === 0 ? colors.primary : colors.textMuted }]}>{i + 1}</Text>
            <Text style={{ color: colors.text, flex: 1, fontSize: 13 }} numberOfLines={1}>
              {p.nombre}
              {p.estado === 'campeon' ? ' 👑' : ''}
            </Text>
            <Text style={[styles.num, { color: colors.textMuted, fontSize: 12 }]}>{p.ganadas + p.perdidas}</Text>
            <Text style={[styles.num, { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }]}>{p.puntosLiga}</Text>
          </View>
        ))}
      </View>

      {fechas.map((partidasFecha, i) => (
        <View key={i}>
          <Text style={[styles.fechaLabel, { color: colors.textMuted }]}>{t('hueplay.torneo.fechaN', { n: i + 1 })}</Text>
          {partidasFecha
            .sort((a, b) => a.slot - b.slot)
            .map((p) => (
              <View key={p.partidaId} style={[styles.cruce, { borderColor: colors.border }]}>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, textAlign: 'right', fontSize: 12, color: p.ganadorUserId === p.aUserId ? colors.success : colors.text }}
                >
                  {p.aNombre}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginHorizontal: 8 }}>
                  {p.estado === 'terminada' ? t('hueplay.torneo.vs') : p.estado === 'jugando' ? '·' : t('hueplay.torneo.vs')}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 12, color: p.ganadorUserId === p.bUserId ? colors.success : colors.text }}
                >
                  {p.bNombre}
                </Text>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: 10 },
  filaHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, gap: 6 },
  hCell: { fontSize: 10, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 6 },
  pos: { width: 22, textAlign: 'center', fontSize: 12 },
  num: { width: 34, textAlign: 'center' },
  fechaLabel: { fontSize: 11, textTransform: 'uppercase', fontFamily: fonts.bodySemi, marginBottom: 6 },
  cruce: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6 },
});
