import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { JUEGOS_CATALOGO } from '../../../src/juego/hueplay/catalogo';
import { variantePorJuegoCodigo } from '../../../src/juego/huedoku/motor';
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
/** Juegos de tablero por turnos: no tienen modo solo, sólo duelo. */
const JUEGOS_SIN_SOLO = ['hueconecta', 'huedamas', 'hueajedrez', 'huesoccer'];

export default function DesafiosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const yoId = user?.userId ?? 0;
  // Se puede llegar con `?juego=X` desde la tarjeta de un juego puntual en
  // el hub de HuePlay — así, entrar a un juego muestra de una tus duelos
  // activos de ESE juego (antes se saltaba directo a "retar", sin mostrar
  // nada de lo que ya tenías en curso).
  const params = useLocalSearchParams<{ juego?: string }>();
  const [bandeja, setBandeja] = useState<HuePlayDesafiosBandeja | null>(null);
  const [loading, setLoading] = useState(true);
  const [juegoElegido, setJuegoElegido] = useState<string | null>(() =>
    JUEGOS_CATALOGO.some((j) => j.codigo === params.juego) ? (params.juego as string) : null
  );

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
    if (d.juegoCodigo === 'huedamas') {
      router.push({
        pathname: '/(app)/hueplay/damas',
        params: { desafioId: d.desafioId },
      });
      return;
    }
    if (d.juegoCodigo === 'hueajedrez') {
      router.push({
        pathname: '/(app)/hueplay/ajedrez',
        params: { desafioId: d.desafioId },
      });
      return;
    }
    if (d.juegoCodigo === 'huesoccer') {
      router.push({
        pathname: '/(app)/hueplay/huesoccer',
        params: { desafioId: d.desafioId },
      });
      return;
    }
    const varianteDoku = variantePorJuegoCodigo(d.juegoCodigo);
    if (varianteDoku) {
      router.push({
        pathname: '/(app)/hueplay/huedoku',
        params: { desafioId: d.desafioId, semilla: d.semilla, variante: varianteDoku },
      });
      return;
    }
    // Los de modo puntaje comparten la forma de entrar: id del duelo + semilla.
    const rutas: Record<string, string> = {
      huememo: '/(app)/hueplay/huememo',
      huetrivia: '/(app)/hueplay/huetrivia',
      huezip: '/(app)/hueplay/huezip',
    };
    router.push({
      pathname: (rutas[d.juegoCodigo] ?? '/(app)/hueplay/huematch') as never,
      params: { desafioId: d.desafioId, semilla: d.semilla },
    });
  };

  /** Practicar solo, sin desafío — sólo los juegos que no están en `JUEGOS_SIN_SOLO`. */
  const jugarSolo = (codigo: string) => {
    hapticLeve();
    const varianteDoku = variantePorJuegoCodigo(codigo);
    if (varianteDoku) {
      router.push({ pathname: '/(app)/hueplay/huedoku', params: { variante: varianteDoku } });
      return;
    }
    const rutas: Record<string, string> = {
      huematch: '/(app)/hueplay/huematch',
      huememo: '/(app)/hueplay/huememo',
      huetrivia: '/(app)/hueplay/huetrivia',
      huezip: '/(app)/hueplay/huezip',
    };
    router.push((rutas[codigo] ?? '/(app)/hueplay/huematch') as never);
  };

  /** Con un juego elegido, sólo se muestran SUS duelos — es la lista que pidió ver quien entra a un juego puntual. */
  const filtrar = <T extends { juegoCodigo: string }>(lista: T[]): T[] =>
    juegoElegido ? lista.filter((d) => d.juegoCodigo === juegoElegido) : lista;

  /** Nombre visible del juego, para no mostrar el código crudo. */
  const nombreJuego = (codigo: string) =>
    ({
      huematch: 'HueCrush',
      hueconecta: 'HueConecta',
      huememo: 'HueMemo',
      huetrivia: 'HueTrivia',
      huezip: 'HueZip',
      huedamas: 'HueDamas',
      hueajedrez: 'HueAjedrez',
      huesoccer: 'HueSoccer',
      huedoku6: 'HueDoku 6x6',
      huedoku9facil: 'HueDoku 9x9 Fácil',
      huedoku9dificil: 'HueDoku 9x9 Difícil',
    })[codigo] ?? codigo;

  /** "Vence en 3h" — sólo tiene sentido en duelos abiertos, no contra la IA. */
  const textoVence = (d: HuePlayDesafio): string | null => {
    if (d.esRivalIA) return null;
    const msRestantes = new Date(d.expiraEn.replace(' ', 'T')).getTime() - Date.now();
    if (msRestantes <= 0) return null;
    const minutos = Math.floor(msRestantes / 60000);
    const texto =
      minutos < 60 ? `${minutos}m` : minutos < 1440 ? `${Math.floor(minutos / 60)}h` : `${Math.floor(minutos / 1440)}d`;
    return t('hueplay.venceEn', { texto });
  };

  const Avatar = ({ d }: { d: HuePlayDesafio }) =>
    d.otro.avatarPath ? (
      <Image source={{ uri: rhAvatarUrl(d.otro.avatarPath) }} style={styles.avatar} contentFit="cover" />
    ) : (
      <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="person" size={18} color={colors.primary} />
      </View>
    );

  const nombre = (d: HuePlayDesafio) => (d.otro.username ? `@${d.otro.username}` : d.otro.nombreCompleto);

  const miTurno = filtrar(bandeja?.miTurno ?? []);
  const esperando = filtrar(bandeja?.esperando ?? []);
  const terminados = filtrar(bandeja?.terminados ?? []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      {/* Elegir juego primero, después qué hacer con él — antes eran 6 botones
          angostos en una sola fila (con HueLudo/HueRummy aparte, ni entraban)
          y todos con el mismo ícono de rayo genérico en vez del propio de
          cada juego: con seis nombres largos ahí apretados, texto e ícono se
          superponían. Ahora es una grilla que hace wrap, con el mismo
          ícono/color que ya usa la lista principal de HuePlay. */}
      <Text style={[styles.seccion, { color: colors.textMuted, marginTop: 0 }]}>
        {t('hueplay.seleccionarJuego')}
      </Text>
      <View style={styles.juegosGrilla}>
        {JUEGOS_CATALOGO.map((j) => {
          const activo = juegoElegido === j.codigo;
          return (
            <Pressable
              key={j.codigo}
              onPress={() => {
                hapticLeve();
                setJuegoElegido((cur) => (cur === j.codigo ? null : j.codigo));
              }}
              style={[
                styles.juegoBoton,
                {
                  backgroundColor: activo ? j.color : colors.surface,
                  borderColor: activo ? j.color : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons name={j.icono} size={16} color={activo ? '#FFFFFF' : j.color} />
              <Text
                numberOfLines={1}
                style={{
                  color: activo ? '#FFFFFF' : colors.text,
                  fontFamily: fonts.bodySemi,
                  fontSize: 12,
                  flexShrink: 1,
                }}
              >
                {j.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {juegoElegido ? (
        (() => {
          const j = JUEGOS_CATALOGO.find((g) => g.codigo === juegoElegido)!;
          return j.esSala ? (
            <View style={styles.accionesFila}>
              <Pressable
                onPress={() => {
                  hapticLeve();
                  router.push(`/(app)/hueplay/sala-crear?juego=${j.codigo}` as never);
                }}
                style={[styles.botonAccion, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add-circle" size={16} color={colors.primaryText} />
                <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {t('hueplay.sala.crearSala')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticLeve();
                  router.push('/(app)/hueplay/sala-unirse' as never);
                }}
                style={[styles.botonAccion, styles.botonAccionOutline, { borderColor: colors.border }]}
              >
                <Ionicons name="key-outline" size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {t('hueplay.sala.tenesCodigo')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticLeve();
                  router.push(`/(app)/hueplay/salas?juego=${j.codigo}` as never);
                }}
                style={styles.verSalasLink}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.sala.verSalas')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.accionesFila}>
              <Pressable
                onPress={() => {
                  hapticLeve();
                  router.push({ pathname: '/(app)/hueplay/retar', params: { juego: j.codigo } });
                }}
                style={[styles.botonAccion, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="flash" size={16} color={colors.primaryText} />
                <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {t('hueplay.retar')}
                </Text>
              </Pressable>
              {!JUEGOS_SIN_SOLO.includes(j.codigo) ? (
                <Pressable
                  onPress={() => jugarSolo(j.codigo)}
                  style={[styles.botonAccion, styles.botonAccionOutline, { borderColor: colors.border }]}
                >
                  <Ionicons name="play" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.match.empezar')}
                  </Text>
                </Pressable>
              ) : null}
              {j.codigo === 'huesoccer' ? (
                <Pressable
                  onPress={() => {
                    hapticLeve();
                    router.push('/(app)/ajustes/huesoccer-skins' as never);
                  }}
                  style={[styles.botonAccion, styles.botonAccionOutline, { borderColor: colors.border }]}
                >
                  <Ionicons name="color-palette-outline" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.soccer.skinsTitulo')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })()
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : !bandeja || (miTurno.length === 0 && esperando.length === 0 && terminados.length === 0) ? (
        <EmptyState
          icon="flash-outline"
          titulo={t('hueplay.sinDesafios')}
          descripcion={t('hueplay.sinDesafiosDesc')}
        />
      ) : (
        <>
          {miTurno.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.primary }]}>{t('hueplay.teToca')}</Text>
              {miTurno.map((d) => (
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
                      {textoVence(d) ? ` · ${textoVence(d)}` : ''}
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

          {esperando.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.esperando')}</Text>
              {esperando.map((d) => (
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
                      {textoVence(d) ? ` · ${textoVence(d)}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
                </View>
              ))}
            </>
          ) : null}

          {terminados.length > 0 ? (
            <>
              <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.historial')}</Text>
              {terminados.map((d) => {
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
  // Grilla, no una fila fija: con 8 juegos (6 duelos + Ludo + Rummy) uno
  // solo hace wrap sin achicar el texto ni superponer el ícono.
  juegosGrilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  juegoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '31%',
    justifyContent: 'center',
  },
  accionesFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  botonAccionOutline: { backgroundColor: 'transparent', borderWidth: 1 },
  verSalasLink: { paddingVertical: 8, paddingHorizontal: 4 },
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
