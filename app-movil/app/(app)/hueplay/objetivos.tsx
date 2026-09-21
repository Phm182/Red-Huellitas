import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { HuePlayObjetivos } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';

/**
 * Objetivos de HuePlay. El nivel de la cuenta sube con la XP que dan: los
 * diarios (se renuevan cada día) y los logros (escalones que se cumplen una vez
 * y cada vez exigen más).
 */
export default function ObjetivosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [data, setData] = useState<HuePlayObjetivos | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      hueplayApi.objetivos().then((res) => {
        if (!activo) return;
        if (res.success && res.data) setData(res.data);
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading || !data) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const p = data.progreso;
  const pct = Math.min(100, ((p.puntos - p.nivelDesde) / Math.max(1, p.nivelHasta - p.nivelDesde)) * 100);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.cont, centeredContent]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.fila}>
          <View style={[styles.nivelBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.nivelNum, { color: colors.primaryText }]}>{p.nivel}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16 }}>
              {t('hueplay.nivel', { n: p.nivel })}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('hueplay.obj.xpTotal', { xp: p.puntos })}
            </Text>
          </View>
        </View>
        <Barra pct={pct} color={colors.primary} fondo={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          {t('hueplay.obj.faltanXp', { n: p.faltan, nivel: p.nivel + 1 })}
        </Text>
      </View>

      <Text style={[styles.seccion, { color: colors.text }]}>{t('hueplay.obj.hoy')}</Text>
      {data.diarios.map((d) => (
        <View key={d.codigo} style={[styles.item, { backgroundColor: colors.surface, borderColor: d.cumplido ? colors.success : colors.border }]}>
          <View style={[styles.icono, { backgroundColor: d.cumplido ? colors.success : colors.primarySoft }]}>
            <Ionicons
              name={d.cumplido ? 'checkmark' : (d.icono as keyof typeof Ionicons.glyphMap)}
              size={20}
              color={d.cumplido ? '#fff' : colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>
              {t(`hueplay.obj.d.${d.codigo}`)}
            </Text>
            <Barra pct={(d.valor / d.meta) * 100} color={d.cumplido ? colors.success : colors.primary} fondo={colors.border} />
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {d.valor}/{d.meta}
            </Text>
          </View>
          <Text style={[styles.xp, { color: d.cumplido ? colors.success : colors.primary }]}>+{d.xp} XP</Text>
        </View>
      ))}

      <Text style={[styles.seccion, { color: colors.text }]}>{t('hueplay.obj.logros')}</Text>
      {data.logros.map((l) => {
        const siguiente = l.escalones.find((e) => !e.cumplido);
        const previo = [...l.escalones].reverse().find((e) => e.cumplido);
        const base = previo?.meta ?? 0;
        const pctLogro = siguiente
          ? Math.min(100, ((l.valor - base) / Math.max(1, siguiente.meta - base)) * 100)
          : 100;
        return (
          <View key={l.familia} style={[styles.logro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fila}>
              <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={l.icono as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>
                  {t(`hueplay.obj.f.${l.familia}`)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  {siguiente
                    ? t('hueplay.obj.progresoLogro', { valor: l.valor, meta: siguiente.meta, xp: siguiente.xp })
                    : t('hueplay.obj.completo')}
                </Text>
              </View>
            </View>
            <Barra pct={pctLogro} color={colors.primary} fondo={colors.border} />
            <View style={styles.escalones}>
              {l.escalones.map((e) => (
                <View
                  key={e.meta}
                  style={[
                    styles.escalon,
                    {
                      backgroundColor: e.cumplido ? colors.primary : 'transparent',
                      borderColor: e.cumplido ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: e.cumplido ? colors.primaryText : colors.textMuted, fontSize: 11, fontFamily: fonts.bodySemi }}>
                    {e.cumplido ? '✓ ' : ''}
                    {e.meta}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Barra({ pct, color, fondo }: { pct: number; color: string; fondo: string }) {
  return (
    <View style={[styles.barra, { backgroundColor: fondo }]}>
      <View style={{ height: '100%', borderRadius: 4, backgroundColor: color, width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cont: { padding: 16, paddingBottom: 60, gap: 10 },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: 16, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nivelBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  nivelNum: { fontFamily: fonts.bodyBold, fontSize: 22 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  seccion: { fontFamily: fonts.bodyBold, fontSize: 17, marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radii.lg, padding: 12 },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  xp: { fontFamily: fonts.bodyBold, fontSize: 13 },
  logro: { borderWidth: 1, borderRadius: radii.lg, padding: 12, gap: 8 },
  escalones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  escalon: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
});
