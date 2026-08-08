import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { Carta, ManoRivalOculta } from '../../../src/juego/huerummy/Carta';
import { COLOR_JUGADOR } from '../../../src/juego/hueludo/TableroLudo';
import { EstadoRummyVisible, HuePlaySala } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const POLL_MS = 4000;

/**
 * HueRummy: hasta 4 jugadores, cada uno con su mano oculta. El servidor
 * nunca manda las cartas ajenas (`estadoRummy.miMano` es siempre la propia,
 * `cantidadCartasPorJugador` es lo único que se sabe de los demás) — ver
 * `rh_rummy_estado_visible()` en el backend.
 */
export default function RummyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ salaId?: string }>();
  const salaId = params.salaId ? Number(params.salaId) : 0;

  const [sala, setSala] = useState<HuePlaySala | null>(null);
  const [estado, setEstado] = useState<EstadoRummyVisible | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);

  const vivoRef = useRef(true);
  const celebradoRef = useRef(false);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!salaId) return;
    const res = await hueplayApi.verSala(salaId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setError(null);
      setSala(res.data.sala);
      if (res.data.estadoRummy) setEstado(res.data.estadoRummy);
      setSeleccionadas([]);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [salaId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!sala) return;
    if (sala.estado !== 'jugando' || sala.esMiTurno) return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [sala, cargar]);

  useEffect(() => {
    if (!sala || celebradoRef.current) return;
    if (sala.estado !== 'terminada' || sala.ganadorSalaJugadorId === null) return;
    celebradoRef.current = true;
    const gane = sala.miAsientoId === sala.ganadorSalaJugadorId;
    if (gane) {
      hapticCelebracion();
      setCelebrar(true);
    } else {
      hapticError();
    }
  }, [sala]);

  const alternarSeleccion = (i: number) => {
    if (!sala?.esMiTurno || estado?.fase !== 'descartar' || enviando) return;
    hapticLeve();
    setSeleccionadas((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const robar = async (origen: 'mazo' | 'descarte') => {
    if (!sala || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    setAviso(null);
    const res = await hueplayApi.rummyRobar(sala.salaId, origen);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    setEstado(res.data.estadoRummy);
    if (res.data.rondaCortada) {
      setAviso(t('hueplay.rummy.rondaCortada'));
    }
  };

  const bajarMeld = async () => {
    if (!sala || seleccionadas.length < 3 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.rummyBajar(sala.salaId, seleccionadas);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setEstado(res.data.estadoRummy);
    setSeleccionadas([]);
  };

  const descartar = async () => {
    if (!sala || seleccionadas.length !== 1 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.rummyDescartar(sala.salaId, seleccionadas[0]);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    setEstado(res.data.estadoRummy);
    setSeleccionadas([]);
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!sala) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const terminado = sala.estado === 'terminada';
  const gane = terminado && sala.miAsientoId === sala.ganadorSalaJugadorId;
  const miAsiento = sala.jugadores.find((j) => j.esYo);
  const nombreDe = (j: (typeof sala.jugadores)[number]) => (j.username ? `@${j.username}` : j.nombreCompleto);
  const asientoDelTurno = sala.jugadores.find((j) => j.salaJugadorId === sala.turnoDeSalaJugadorId);
  const topeDescarte = estado && estado.descarte.length > 0 ? estado.descarte[estado.descarte.length - 1] : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <View style={styles.jugadoresFila}>
        {sala.jugadores.map((j) => (
          <View
            key={j.salaJugadorId}
            style={[
              styles.jugadorChip,
              {
                backgroundColor: sala.turnoDeSalaJugadorId === j.salaJugadorId ? colors.primarySoft : colors.surface,
                borderColor: sala.turnoDeSalaJugadorId === j.salaJugadorId ? COLOR_JUGADOR[j.posicion] : colors.border,
              },
            ]}
          >
            <View style={[styles.puntito, { backgroundColor: COLOR_JUGADOR[j.posicion] }]} />
            <Text style={{ color: colors.text, fontSize: 11, maxWidth: 70 }} numberOfLines={1}>
              {j.esBot ? t('hueplay.jugandoContraIA') : j.esYo ? t('hueplay.ludo.vos') : nombreDe(j)}
            </Text>
            {!j.esYo && estado ? (
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                ({estado.cantidadCartasPorJugador[j.posicion] ?? '—'})
              </Text>
            ) : null}
            {j.tomadoPorIA ? <Ionicons name="hardware-chip-outline" size={12} color={colors.textMuted} /> : null}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.aviso,
          {
            backgroundColor: terminado ? colors.surface : sala.esMiTurno ? colors.primarySoft : colors.surface,
            borderColor: sala.esMiTurno && !terminado ? colors.primary : colors.border,
          },
        ]}
      >
        {!terminado && !sala.esMiTurno ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
          {terminado
            ? gane
              ? t('hueplay.rummy.ganasteFin')
              : t('hueplay.rummy.perdisteFin')
            : aviso
              ? aviso
              : sala.esMiTurno
                ? estado?.fase === 'robar'
                  ? t('hueplay.rummy.tocaRobar')
                  : seleccionadas.length >= 3
                    ? t('hueplay.rummy.podesBajar')
                    : seleccionadas.length === 1
                      ? t('hueplay.rummy.podesDescartar')
                      : t('hueplay.rummy.elegiCartas')
                : t('hueplay.rummy.turnoDe', {
                    rival: asientoDelTurno ? (asientoDelTurno.esBot ? t('hueplay.jugandoContraIA') : nombreDe(asientoDelTurno)) : '',
                  })}
        </Text>
      </View>

      {!terminado ? (
        <View style={[styles.mesa, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.pilas}>
            <View style={styles.pila}>
              <Pressable
                disabled={!sala.esMiTurno || estado?.fase !== 'robar' || enviando}
                onPress={() => robar('mazo')}
                style={[styles.mazo, { opacity: sala.esMiTurno && estado?.fase === 'robar' ? 1 : 0.5 }]}
              >
                <Ionicons name="albums" size={28} color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{estado?.cartasEnMazo ?? 0}</Text>
              </Pressable>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('hueplay.rummy.mazo')}</Text>
            </View>

            <View style={styles.pila}>
              <Pressable
                disabled={!sala.esMiTurno || estado?.fase !== 'robar' || enviando || !topeDescarte}
                onPress={() => robar('descarte')}
                style={{ opacity: sala.esMiTurno && estado?.fase === 'robar' ? 1 : 0.6 }}
              >
                {topeDescarte ? <Carta carta={topeDescarte} tamano={48} /> : <View style={{ width: 48, height: 67 }} />}
              </Pressable>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('hueplay.rummy.descarte')}</Text>
            </View>
          </View>

          {estado && estado.melds.length > 0 ? (
            <View style={styles.melds}>
              {estado.melds.map((m, i) => (
                <View key={i} style={styles.meldFila}>
                  {m.cartas.map((c, ci) => (
                    <View key={ci} style={{ marginLeft: ci === 0 ? 0 : -18 }}>
                      <Carta carta={c} tamano={36} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {sala.jugadores
            .filter((j) => !j.esYo)
            .map((j) => (
              <View key={j.salaJugadorId} style={styles.filaRival}>
                <Text style={{ color: colors.textMuted, fontSize: 11, width: 70 }} numberOfLines={1}>
                  {j.esBot ? t('hueplay.jugandoContraIA') : nombreDe(j)}
                </Text>
                <ManoRivalOculta cantidad={estado?.cantidadCartasPorJugador[j.posicion] ?? 0} tamano={26} />
              </View>
            ))}
        </View>
      ) : null}

      {celebrar ? (
        <View style={{ width: '100%', height: 120, position: 'relative' }}>
          <CelebracionPatitas />
        </View>
      ) : null}

      {!terminado && estado ? (
        <>
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.rummy.tuMano')}</Text>
          <View style={styles.mano}>
            {estado.miMano.map((c, i) => (
              <Carta
                key={`${c.palo}-${c.valor}-${i}`}
                carta={c}
                tamano={48}
                seleccionada={seleccionadas.includes(i)}
                onPress={sala.esMiTurno && estado.fase === 'descartar' ? () => alternarSeleccion(i) : undefined}
              />
            ))}
          </View>

          {sala.esMiTurno && estado.fase === 'descartar' ? (
            <View style={styles.accionesFila}>
              <Pressable
                disabled={seleccionadas.length < 3 || enviando}
                onPress={bajarMeld}
                style={[styles.botonAccion, { backgroundColor: colors.primarySoft, opacity: seleccionadas.length >= 3 ? 1 : 0.4 }]}
              >
                <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {t('hueplay.rummy.bajar')}
                </Text>
              </Pressable>
              <Pressable
                disabled={seleccionadas.length !== 1 || enviando}
                onPress={descartar}
                style={[styles.botonAccion, { backgroundColor: colors.primary, opacity: seleccionadas.length === 1 ? 1 : 0.4 }]}
              >
                {enviando ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.rummy.descartar')}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      <Pressable onPress={() => router.replace('/(app)/hueplay/desafios')} style={[styles.boton, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
          {terminado ? t('hueplay.volver') : t('hueplay.damas.seguirDespues')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: 12, alignItems: 'center', paddingBottom: 32 },
  jugadoresFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 },
  jugadorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  puntito: { width: 10, height: 10, borderRadius: 5 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
    alignSelf: 'stretch',
    maxWidth: 420,
  },
  mesa: { alignSelf: 'stretch', maxWidth: 420, borderWidth: 1, borderRadius: radii.lg, padding: 14, gap: 12 },
  pilas: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  pila: { alignItems: 'center', gap: 4 },
  mazo: {
    width: 48,
    height: 67,
    borderWidth: 2,
    borderColor: '#D8D2C4',
    borderRadius: 8,
    backgroundColor: '#EFE9DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  melds: { gap: 6 },
  meldFila: { flexDirection: 'row' },
  filaRival: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', alignSelf: 'flex-start' },
  mano: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignSelf: 'stretch' },
  accionesFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonAccion: { borderRadius: radii.pill, paddingHorizontal: 20, paddingVertical: 11 },
  boton: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 13, paddingHorizontal: 30, marginTop: 22 },
});
