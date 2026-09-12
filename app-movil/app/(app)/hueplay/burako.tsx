import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { Carta, ManoRivalOculta } from '../../../src/juego/huerummy/Carta';
import { COLOR_JUGADOR } from '../../../src/juego/hueludo/TableroLudo';
import { EstadoBurakoVisible, HuePlaySala } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const POLL_MS = 4000;

/**
 * HueBurako: mismas fichas que HueRummy (reusa `Carta`/`ManoRivalOculta`
 * de `src/juego/huerummy/`, es el mismo mazo físico), pero reglas propias
 * — sin mínimo de apertura, con "muerto" personal y Canastas — ver
 * `inc/funciones/burako.php`. Variante INDIVIDUAL (sin parejas), documentada
 * ahí mismo.
 */
export default function BurakoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ salaId?: string }>();
  const salaId = params.salaId ? Number(params.salaId) : 0;

  const [sala, setSala] = useState<HuePlaySala | null>(null);
  const [estado, setEstado] = useState<EstadoBurakoVisible | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [meldSeleccionado, setMeldSeleccionado] = useState<number | null>(null);
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
      if (res.data.estadoBurako) setEstado(res.data.estadoBurako);
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

  const alternarMeld = (i: number) => {
    if (!sala?.esMiTurno || estado?.fase !== 'descartar' || enviando) return;
    hapticLeve();
    setMeldSeleccionado((prev) => (prev === i ? null : i));
  };

  const robar = async (origen: 'mazo' | 'descarte') => {
    if (!sala || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    setAviso(null);
    const res = await hueplayApi.burakoRobar(sala.salaId, origen);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    setEstado(res.data.estadoBurako);
    setMeldSeleccionado(null);
    if (res.data.rondaCortada) {
      setAviso(t('hueplay.burako.rondaCortada'));
    }
  };

  const bajarMeld = async () => {
    if (!sala || seleccionadas.length < 3 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.burakoBajar(sala.salaId, seleccionadas);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setEstado(res.data.estadoBurako);
    setSeleccionadas([]);
  };

  const extenderMeld = async () => {
    if (!sala || meldSeleccionado === null || seleccionadas.length < 1 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.burakoExtender(sala.salaId, meldSeleccionado, seleccionadas);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setEstado(res.data.estadoBurako);
    setSeleccionadas([]);
    setMeldSeleccionado(null);
  };

  const canjearComodin = async () => {
    if (!sala || meldSeleccionado === null || seleccionadas.length !== 1 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.burakoComodin(sala.salaId, meldSeleccionado, seleccionadas[0]);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setEstado(res.data.estadoBurako);
    setSeleccionadas([]);
    setMeldSeleccionado(null);
  };

  const descartar = async () => {
    if (!sala || seleccionadas.length !== 1 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.burakoDescartar(sala.salaId, seleccionadas[0]);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    setEstado(res.data.estadoBurako);
    setSeleccionadas([]);
    setMeldSeleccionado(null);
  };

  const comodinCanjeable =
    meldSeleccionado !== null && seleccionadas.length === 1 && estado
      ? (() => {
          const tile = estado.miMano[seleccionadas[0]];
          const meld = estado.melds[meldSeleccionado];
          if (!tile || !meld || tile.color === -1) return false;
          return meld.cartas.some((c) => c.color === -1 && c.sustituyeColor === tile.color && c.sustituyeValor === tile.valor);
        })()
      : false;

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
            {estado?.compradoMuerto[j.posicion] ? (
              <Ionicons name="checkmark-circle" size={12} color={colors.textMuted} />
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
              ? t('hueplay.burako.ganasteFin')
              : t('hueplay.burako.perdisteFin')
            : aviso
              ? aviso
              : sala.esMiTurno
                ? estado?.fase === 'robar'
                  ? t('hueplay.burako.tocaRobar')
                  : seleccionadas.length >= 3
                    ? t('hueplay.burako.podesBajar')
                    : seleccionadas.length === 1
                      ? t('hueplay.burako.podesDescartar')
                      : t('hueplay.burako.elegiCartas')
                : t('hueplay.burako.turnoDe', {
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
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('hueplay.burako.mazo')}</Text>
            </View>

            <View style={styles.pila}>
              <Pressable
                disabled={!sala.esMiTurno || estado?.fase !== 'robar' || enviando || !topeDescarte}
                onPress={() => robar('descarte')}
                style={{ opacity: sala.esMiTurno && estado?.fase === 'robar' ? 1 : 0.6 }}
              >
                {topeDescarte ? <Carta carta={topeDescarte} tamano={48} /> : <View style={{ width: 48, height: 67 }} />}
              </Pressable>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {t('hueplay.burako.descarte', { n: estado?.descarte.length ?? 0 })}
              </Text>
            </View>
          </View>

          {estado && estado.melds.length > 0 ? (
            <View style={styles.melds}>
              {estado.melds.map((m, i) => (
                <Pressable
                  key={i}
                  onPress={() => alternarMeld(i)}
                  disabled={!sala.esMiTurno || estado.fase !== 'descartar'}
                  style={[
                    styles.meldFila,
                    meldSeleccionado === i ? { backgroundColor: colors.primarySoft, borderRadius: radii.sm } : null,
                  ]}
                >
                  {m.cartas.map((c, ci) => (
                    <View key={ci} style={{ marginLeft: ci === 0 ? 0 : -18 }}>
                      <Carta carta={c} tamano={36} />
                    </View>
                  ))}
                  {m.cartas.length >= 7 ? (
                    <Text style={{ color: colors.primary, fontSize: 10, fontFamily: fonts.bodySemi, marginLeft: 6, alignSelf: 'center' }}>
                      {t('hueplay.burako.canasta')}
                    </Text>
                  ) : null}
                </Pressable>
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
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.burako.tuMano')}</Text>
          <View style={styles.mano}>
            {estado.miMano.map((c, i) => (
              <Carta
                key={`${c.color}-${c.valor}-${i}`}
                carta={c}
                tamano={48}
                seleccionada={seleccionadas.includes(i)}
                onPress={sala.esMiTurno && estado.fase === 'descartar' ? () => alternarSeleccion(i) : undefined}
              />
            ))}
          </View>

          {sala.esMiTurno && estado.fase === 'descartar' && meldSeleccionado !== null ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
              {t('hueplay.burako.juegoSeleccionado', { n: meldSeleccionado + 1 })}
            </Text>
          ) : null}

          {sala.esMiTurno && estado.fase === 'descartar' ? (
            <View style={styles.accionesFila}>
              {meldSeleccionado === null ? (
                <Pressable
                  disabled={seleccionadas.length < 3 || enviando}
                  onPress={bajarMeld}
                  style={[styles.botonAccion, { backgroundColor: colors.primarySoft, opacity: seleccionadas.length >= 3 ? 1 : 0.4 }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.burako.bajar')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={seleccionadas.length < 1 || enviando}
                  onPress={extenderMeld}
                  style={[styles.botonAccion, { backgroundColor: colors.primarySoft, opacity: seleccionadas.length >= 1 ? 1 : 0.4 }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.burako.agregar')}
                  </Text>
                </Pressable>
              )}
              {meldSeleccionado !== null && comodinCanjeable ? (
                <Pressable
                  disabled={enviando}
                  onPress={canjearComodin}
                  style={[styles.botonAccion, { backgroundColor: colors.primarySoft }]}
                >
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.burako.canjearComodin')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                disabled={seleccionadas.length !== 1 || enviando || meldSeleccionado !== null}
                onPress={descartar}
                style={[
                  styles.botonAccion,
                  { backgroundColor: colors.primary, opacity: seleccionadas.length === 1 && meldSeleccionado === null ? 1 : 0.4 },
                ]}
              >
                {enviando ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.burako.descartarAccion')}
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
  meldFila: { flexDirection: 'row', alignItems: 'center' },
  filaRival: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', alignSelf: 'flex-start' },
  mano: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignSelf: 'stretch' },
  accionesFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonAccion: { borderRadius: radii.pill, paddingHorizontal: 20, paddingVertical: 11 },
  boton: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 30,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
