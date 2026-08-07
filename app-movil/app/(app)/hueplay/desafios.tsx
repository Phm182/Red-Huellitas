import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { HuePlayDesafio, HuePlayDesafiosBandeja } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/**
 * Bandeja de duelos.
 *
 * Se ordena por lo que hay que hacer, no por fecha: primero los que esperan que
 * juegues, después los que esperan al rival y al final el historial. Una lista
 * cronológica dejaría lo accionable mezclado con lo terminado.
 */
export default function DesafiosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const yoId = user?.userId ?? 0;
  const [bandeja, setBandeja] = useState<HuePlayDesafiosBandeja | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    hueplayApi.desafios().then((res) => {
      if (res.success && res.data) setBandeja(res.data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  const rechazar = async (d: HuePlayDesafio) => {
    hapticMedio();
    const res = await hueplayApi.rechazarDesafio(d.desafioId);
    if (res.success) cargar();
  };

  const jugar = (d: HuePlayDesafio) => {
    hapticLeve();
    // Cada duelo sabe de qué juego es: la bandeja es una sola para todos.
    if (d.juegoCodigo === 'hueconecta') {
      router.push({
        pathname: '/(app)/hueplay/hueconecta',
        params: { desafioId: d.desafioId },
      });
      return;
    }
    // Los de modo puntaje comparten la forma de entrar: id del duelo + semilla.
    const rutas: Record<string, string> = {
      huememo: '/(app)/hueplay/huememo',
      huetrivia: '/(app)/hueplay/huetrivia',
    };
    router.push({
      pathname: (rutas[d.juegoCodigo] ?? '/(app)/hueplay/huematch') as never,
      params: { desafioId: d.desafioId, semilla: d.semilla },
    });
  };

  /** Nombre visible del juego, para no mostrar el código crudo. */
  const nombreJuego = (codigo: string) =>
    ({ huematch: 'HueCrush', hueconecta: 'HueConecta', huememo: 'HueMemo', huetrivia: 'HueTrivia' })[
      codigo
    ] ?? codigo;

  const Avatar = ({ d }: { d: HuePlayDesafio }) =>
    d.otro.avatarPath ? (
      <Image source={{ uri: rhAvatarUrl(d.otro.avatarPath) }} style={styles.avatar} contentFit="cover" />
    ) : (
      <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="person" size={18} color={colors.primary} />
      </View>
    );

  const nombre = (d: HuePlayDesafio) => (d.otro.username ? `@${d.otro.username}` : d.otro.nombreCompleto);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      {/* Un botón por juego. Un único "retar" obligaría a elegir el juego en una
          pantalla intermedia, que es un paso de más para dos opciones. */}
      <View style={styles.retarFila}>
        {(['huematch', 'huememo', 'huetrivia', 'hueconecta'] as const).map((codigo) => (
          <Pressable
            key={codigo}
            onPress={() => {
              hapticLeve();
              router.push({ pathname: '/(app)/hueplay/retar', params: { juego: codigo } });
            }}
            style={[styles.botonRetar, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="flash" size={16} color={colors.primaryText} />
            <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
              {nombreJuego(codigo)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : !bandeja ||
        (bandeja.miTurno.length === 0 &&
          bandeja.esperando.length === 0 &&
          bandeja.terminados.length === 0) ? (
        <EmptyState
          icon="flash-outline"
          titulo={t('hueplay.sinDesafios')}
          descripcion={t('hueplay.sinDesafiosDesc')}
        />
      ) : (
        <>
          {bandeja.miTurno.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.primary }]}>{t('hueplay.teToca')}</Text>
              {bandeja.miTurno.map((d) => (
                <View
                  key={d.desafioId}
                  style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                >
                  <Avatar d={d} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                      {nombre(d)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {nombreJuego(d.juegoCodigo)} ·{' '}
                      {d.modo === 'turnos'
                        ? d.movimientos === 0
                          ? t('hueplay.empezasVos')
                          : t('hueplay.conecta.tuTurno')
                        : d.rivalYaJugo
                          ? t('hueplay.yaJugoRival')
                          : t('hueplay.teRetaron')}
                    </Text>
                  </View>
                  {!d.soyRetador ? (
                    <Pressable onPress={() => rechazar(d)} hitSlop={8} style={styles.iconoBoton}>
                      <Ionicons name="close" size={20} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => jugar(d)} style={[styles.jugar, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                      {t('hueplay.jugar')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

          {bandeja.esperando.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.esperando')}</Text>
              {bandeja.esperando.map((d) => (
                <View
                  key={d.desafioId}
                  style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Avatar d={d} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                      {nombre(d)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {nombreJuego(d.juegoCodigo)} ·{' '}
                      {d.modo === 'turnos'
                        ? t('hueplay.conecta.turnoDelRival')
                        : t('hueplay.hicisteN', { n: d.misPuntos ?? 0 })}
                    </Text>
                  </View>
                  <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
                </View>
              ))}
            </>
          ) : null}

          {bandeja.terminados.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.historial')}</Text>
              {bandeja.terminados.map((d) => {
                const vencido = d.estado === 'expirado';

                // En turnos no hay puntajes que comparar: el resultado sale de
                // `ganadorUserId`, y null con el duelo terminado es empate.
                const gane =
                  d.modo === 'turnos'
                    ? d.ganadorUserId === null
                      ? null
                      : d.ganadorUserId === yoId
                    : d.misPuntos !== null && d.susPuntos !== null
                      ? d.misPuntos === d.susPuntos
                        ? null
                        : d.misPuntos > d.susPuntos
                      : null;
                return (
                  <View
                    key={d.desafioId}
                    style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Avatar d={d} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                        {nombre(d)}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {nombreJuego(d.juegoCodigo)} ·{' '}
                        {vencido
                          ? t('hueplay.vencido')
                          : d.modo === 'turnos'
                            ? t('hueplay.conecta.jugadas', { n: d.movimientos })
                            : `${d.misPuntos ?? 0} - ${d.susPuntos ?? 0}`}
                      </Text>
                    </View>
                    {vencido ? null : (
                      <View
                        style={[
                          styles.resultado,
                          {
                            backgroundColor:
                              gane === null ? colors.border : gane ? colors.success : colors.danger,
                          },
                        ]}
                      >
                        <Text style={styles.resultadoTexto}>
                          {gane === null ? '=' : gane ? t('hueplay.g') : t('hueplay.p')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  retarFila: { flexDirection: 'row', gap: 8 },
  botonRetar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  jugar: { borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 },
  iconoBoton: { padding: 4 },
  resultado: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultadoTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
});
