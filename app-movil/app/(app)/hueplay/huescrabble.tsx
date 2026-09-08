import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { CelebracionPatitas } from '../../../src/juego/comun/CelebracionPatitas';
import { COLOR_JUGADOR } from '../../../src/juego/hueludo/TableroLudo';
import { FichaAtril } from '../../../src/juego/huescrabble/FichaAtril';
import { SelectorComodin } from '../../../src/juego/huescrabble/SelectorComodin';
import { FichaPendiente, TableroScrabble } from '../../../src/juego/huescrabble/TableroScrabble';
import { EstadoScrabbleVisible, FichaScrabblePropuesta, HuePlaySala } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticCelebracion, hapticError, hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';

const POLL_MS = 4000;

/** Una ficha del atril "armada": la próxima que se coloca al tocar una casilla vacía. */
type FichaArmada = { indice: number; letra: string; esComodin: boolean };

/**
 * HueScrabble: de 2 a 4 jugadores, atril oculto por jugador. El flujo es
 * "armar" una ficha del atril tocándola, después tocar una casilla vacía del
 * tablero para colocarla ahí — se puede armar/desarmar toda la jugada del
 * turno antes de confirmar con "Jugar", que es la única llamada real al
 * servidor (todo lo intermedio es sólo estado local).
 */
export default function HueScrabbleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ salaId?: string }>();
  const salaId = params.salaId ? Number(params.salaId) : 0;

  const [sala, setSala] = useState<HuePlaySala | null>(null);
  const [estado, setEstado] = useState<EstadoScrabbleVisible | null>(null);
  const [pendientes, setPendientes] = useState<FichaPendiente[]>([]);
  const [indicesUsados, setIndicesUsados] = useState<number[]>([]);
  const [fichaArmada, setFichaArmada] = useState<FichaArmada | null>(null);
  const [comodinPendiente, setComodinPendiente] = useState<number | null>(null);
  const [modoCambio, setModoCambio] = useState(false);
  const [indicesCambio, setIndicesCambio] = useState<number[]>([]);
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

  const limpiarTurnoLocal = () => {
    setPendientes([]);
    setIndicesUsados([]);
    setFichaArmada(null);
    setModoCambio(false);
    setIndicesCambio([]);
  };

  const cargar = useCallback(async () => {
    if (!salaId) return;
    const res = await hueplayApi.verSala(salaId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setError(null);
      setSala(res.data.sala);
      if (res.data.estadoScrabble) setEstado(res.data.estadoScrabble);
      limpiarTurnoLocal();
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
    if (sala.estado !== 'terminada') return;
    celebradoRef.current = true;
    if (sala.ganadorSalaJugadorId === null) return; // empate: sin festejo ni sacudida
    const gane = sala.miAsientoId === sala.ganadorSalaJugadorId;
    if (gane) {
      hapticCelebracion();
      setCelebrar(true);
    } else {
      hapticError();
    }
  }, [sala]);

  const tocarFichaAtril = (indice: number) => {
    if (!sala?.esMiTurno || enviando || !estado) return;
    if (modoCambio) {
      hapticLeve();
      setIndicesCambio((prev) => (prev.includes(indice) ? prev.filter((i) => i !== indice) : [...prev, indice]));
      return;
    }
    if (pendientes.length > 0 && indicesUsados.includes(indice)) return; // ya está en el tablero este turno
    const letra = estado.miAtril[indice];
    hapticLeve();
    if (letra === '*') {
      setComodinPendiente(indice);
      return;
    }
    setFichaArmada({ indice, letra, esComodin: false });
  };

  const tocarCasillaTablero = (fila: number, col: number) => {
    if (!sala?.esMiTurno || enviando || modoCambio) return;

    const yaPendiente = pendientes.find((p) => p.fila === fila && p.col === col);
    if (yaPendiente) {
      hapticLeve();
      setPendientes((prev) => prev.filter((p) => !(p.fila === fila && p.col === col)));
      setIndicesUsados((prev) => prev.filter((i) => i !== yaPendiente.indiceAtril));
      return;
    }

    if (!fichaArmada) return;
    if (estado?.tablero[fila]?.[col]) return; // ya hay una ficha confirmada ahí

    hapticMedio();
    setPendientes((prev) => [
      ...prev,
      { fila, col, letra: fichaArmada.letra, esComodin: fichaArmada.esComodin, indiceAtril: fichaArmada.indice },
    ]);
    setIndicesUsados((prev) => [...prev, fichaArmada.indice]);
    setFichaArmada(null);
  };

  const deshacerTodo = () => {
    if (!pendientes.length) return;
    hapticLeve();
    setPendientes([]);
    setIndicesUsados([]);
    setFichaArmada(null);
  };

  const jugar = async () => {
    if (!sala || !pendientes.length || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    setAviso(null);
    const fichas: FichaScrabblePropuesta[] = pendientes.map((p) => ({
      fila: p.fila,
      col: p.col,
      letra: p.letra,
      esComodin: p.esComodin,
    }));
    const res = await hueplayApi.scrabbleJugar(sala.salaId, fichas);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      hapticError();
      setError(res.message ?? t('common.error'));
      return;
    }
    hapticExito();
    setSala(res.data.sala);
    if (res.data.estadoScrabble) setEstado(res.data.estadoScrabble);
    limpiarTurnoLocal();
    setAviso(t('hueplay.scrabble.puntosGanados', { puntos: res.data.puntos }));
  };

  const pasar = async () => {
    if (!sala || pendientes.length > 0 || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    setAviso(null);
    const res = await hueplayApi.scrabblePasar(sala.salaId);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    if (res.data.estadoScrabble) setEstado(res.data.estadoScrabble);
    limpiarTurnoLocal();
  };

  const confirmarCambio = async () => {
    if (!sala || !indicesCambio.length || enviando) return;
    hapticMedio();
    setEnviando(true);
    setError(null);
    const res = await hueplayApi.scrabbleIntercambiar(sala.salaId, indicesCambio);
    if (!vivoRef.current) return;
    setEnviando(false);
    if (!res.success || !res.data) {
      setError(res.message ?? t('common.error'));
      return;
    }
    setSala(res.data.sala);
    if (res.data.estadoScrabble) setEstado(res.data.estadoScrabble);
    limpiarTurnoLocal();
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!sala || !estado) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const terminado = sala.estado === 'terminada';
  const empate = terminado && sala.ganadorSalaJugadorId === null;
  const gane = !empate && terminado && sala.miAsientoId === sala.ganadorSalaJugadorId;
  const miAsiento = sala.jugadores.find((j) => j.esYo);
  const nombreDe = (j: (typeof sala.jugadores)[number]) => (j.username ? `@${j.username}` : j.nombreCompleto);
  const asientoDelTurno = sala.jugadores.find((j) => j.salaJugadorId === sala.turnoDeSalaJugadorId);
  const tamanoTablero = Math.min(width - 24, 420);

  const atrilVisible = estado.miAtril
    .map((letra, indice) => ({ letra, indice }))
    .filter(({ indice }) => !indicesUsados.includes(indice));

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
              {j.esBot ? t('hueplay.jugandoContraIA') : j.esYo ? t('hueplay.scrabble.vos') : nombreDe(j)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: fonts.bodySemi }}>
              {estado.puntajes[j.posicion] ?? 0}
            </Text>
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
            ? empate
              ? t('hueplay.scrabble.empateFin')
              : gane
                ? t('hueplay.scrabble.ganasteFin')
                : t('hueplay.scrabble.perdisteFin')
            : aviso
              ? aviso
              : sala.esMiTurno
                ? t('hueplay.scrabble.elegiFichas')
                : t('hueplay.scrabble.turnoDe', {
                    rival: asientoDelTurno ? (asientoDelTurno.esBot ? t('hueplay.jugandoContraIA') : nombreDe(asientoDelTurno)) : '',
                  })}
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
        {t('hueplay.scrabble.fichasEnBolsa', { n: estado.fichasEnBolsa })}
      </Text>

      <View style={{ width: tamanoTablero, height: tamanoTablero, position: 'relative' }}>
        <TableroScrabble
          tablero={estado.tablero}
          pendientes={pendientes}
          hayFichaArmada={fichaArmada !== null}
          onTocarCasilla={tocarCasillaTablero}
          tamano={tamanoTablero}
        />
        {celebrar ? <CelebracionPatitas /> : null}
      </View>

      {!terminado ? (
        <>
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.scrabble.tuAtril')}</Text>
          <View style={styles.atrilFila}>
            {atrilVisible.map(({ letra, indice }) => (
              <FichaAtril
                key={indice}
                letra={letra}
                resaltada={fichaArmada?.indice === indice}
                marcada={modoCambio && indicesCambio.includes(indice)}
                onPress={() => tocarFichaAtril(indice)}
              />
            ))}
          </View>

          {sala.esMiTurno ? (
            modoCambio ? (
              <View style={styles.accionesFila}>
                <Pressable
                  onPress={() => {
                    setModoCambio(false);
                    setIndicesCambio([]);
                  }}
                  style={[styles.botonAccion, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.scrabble.cancelarCambio')}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!indicesCambio.length || enviando}
                  onPress={confirmarCambio}
                  style={[styles.botonAccion, { backgroundColor: colors.primary, opacity: indicesCambio.length ? 1 : 0.4 }]}
                >
                  {enviando ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                      {t('hueplay.scrabble.confirmarCambio')}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.accionesFila}>
                <Pressable
                  disabled={pendientes.length > 0 || enviando}
                  onPress={() => setModoCambio(true)}
                  style={[styles.botonAccion, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pendientes.length > 0 ? 0.4 : 1 }]}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12 }}>
                    {t('hueplay.scrabble.cambiarFichas')}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={pendientes.length > 0 || enviando}
                  onPress={pasar}
                  style={[styles.botonAccion, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pendientes.length > 0 ? 0.4 : 1 }]}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12 }}>
                    {t('hueplay.scrabble.pasar')}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!pendientes.length || enviando}
                  onPress={deshacerTodo}
                  style={[styles.botonAccion, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pendientes.length ? 1 : 0.4 }]}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12 }}>
                    {t('hueplay.scrabble.deshacer')}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!pendientes.length || enviando}
                  onPress={jugar}
                  style={[styles.botonAccion, { backgroundColor: colors.primary, opacity: pendientes.length ? 1 : 0.4 }]}
                >
                  {enviando ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                      {t('hueplay.scrabble.jugar')}
                    </Text>
                  )}
                </Pressable>
              </View>
            )
          ) : null}
        </>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      <Pressable onPress={() => router.replace('/(app)/hueplay/desafios')} style={[styles.boton, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
          {terminado ? t('hueplay.volver') : t('hueplay.scrabble.seguirDespues')}
        </Text>
      </Pressable>

      <SelectorComodin
        visible={comodinPendiente !== null}
        onCancelar={() => setComodinPendiente(null)}
        onElegir={(letra) => {
          if (comodinPendiente !== null) {
            setFichaArmada({ indice: comodinPendiente, letra, esComodin: true });
          }
          setComodinPendiente(null);
        }}
      />
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
    marginBottom: 8,
    alignSelf: 'stretch',
    maxWidth: 420,
  },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', alignSelf: 'flex-start' },
  atrilFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignSelf: 'stretch' },
  accionesFila: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  botonAccion: { borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11 },
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
