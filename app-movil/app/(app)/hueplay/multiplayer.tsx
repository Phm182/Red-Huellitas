import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SwipeableSolapas } from '../../../src/components/ui/SwipeableSolapas';
import { juegoDelCatalogo } from '../../../src/juego/hueplay/catalogo';
import { rutaDelDesafio, rutaDeSala } from '../../../src/juego/hueplay/rutas';
import {
  HuePlayDesafio,
  HuePlayDesafiosBandeja,
  HuePlaySala,
  HuePlaySalasBandeja,
  HuePlayTorneo,
  HuePlayTorneosBandeja,
} from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import type { TFunction } from 'i18next';

type SolapaMP = 'tuTurno' | 'enEspera' | 'abiertas' | 'torneos' | 'historial';

/** Fila ya normalizada — el mismo shape para un duelo 1v1 o una sala, para poder pintarlas juntas. */
type FilaMP = {
  key: string;
  juegoCodigo: string;
  texto: string;
  subtexto: string;
  avatarPath?: string | null;
  badge: { texto: string; tono: 'exito' | 'error' | 'neutro' } | null;
  onPress: () => void;
};

function desafioAFila(d: HuePlayDesafio, solapa: SolapaMP, yoId: number, t: TFunction): FilaMP {
  const nombre = d.otro.username ? `@${d.otro.username}` : d.otro.nombreCompleto;
  let subtexto = juegoDelCatalogo(d.juegoCodigo)?.titulo ?? d.juegoCodigo;
  let badge: FilaMP['badge'] = null;

  if (solapa === 'historial') {
    const vencido = d.estado === 'expirado';
    if (vencido) {
      subtexto = t('hueplay.vencido');
    } else {
      // Mismo cálculo que `desafios.tsx`: en turnos el resultado sale de
      // `ganadorUserId`; en puntaje, de comparar los dos puntajes.
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
      badge = { texto: gane === null ? '=' : gane ? t('hueplay.g') : t('hueplay.p'), tono: gane === null ? 'neutro' : gane ? 'exito' : 'error' };
    }
  } else if (solapa === 'tuTurno') {
    subtexto = t('hueplay.teToca');
  } else {
    subtexto = t('hueplay.esperando');
  }

  return {
    key: `d-${d.desafioId}`,
    juegoCodigo: d.juegoCodigo,
    texto: nombre,
    subtexto,
    avatarPath: d.otro.avatarPath,
    badge,
    onPress: () => router.push(rutaDelDesafio(d) as never),
  };
}

type OrigenSala = 'invitacion' | 'armando' | 'miTurno' | 'esperando' | 'terminada';

function salaAFila(s: HuePlaySala, origen: OrigenSala, t: TFunction): FilaMP {
  const juego = juegoDelCatalogo(s.juegoCodigo);
  const otros = s.jugadores.filter((j) => !j.esYo);
  let subtexto = '';
  let badge: FilaMP['badge'] = null;

  if (origen === 'invitacion') {
    subtexto = t('hueplay.multiplayer.invitacion');
  } else if (origen === 'miTurno') {
    subtexto = t('hueplay.teToca');
  } else if (origen === 'armando') {
    subtexto = t('hueplay.multiplayer.armando');
  } else if (origen === 'esperando') {
    subtexto = t('hueplay.esperando');
  } else {
    const miAsiento = s.jugadores.find((j) => j.esYo);
    const empate = s.ganadorSalaJugadorId === null;
    const gane = !empate && s.ganadorSalaJugadorId === miAsiento?.salaJugadorId;
    badge = { texto: empate ? '=' : gane ? t('hueplay.g') : t('hueplay.p'), tono: empate ? 'neutro' : gane ? 'exito' : 'error' };
    subtexto = `${otros.length + 1} ${t('hueplay.sala.jugadoresCorto')}`;
  }

  const onPress = () => {
    if (origen === 'invitacion' || origen === 'armando') {
      router.push({ pathname: '/(app)/hueplay/sala-lobby/[salaId]', params: { salaId: s.salaId } });
    } else {
      router.push({ pathname: rutaDeSala(s.juegoCodigo) as never, params: { salaId: s.salaId } });
    }
  };

  return {
    key: `s-${s.salaId}`,
    juegoCodigo: s.juegoCodigo,
    texto: juego?.titulo ?? s.juegoCodigo,
    subtexto,
    avatarPath: otros[0]?.avatarPath ?? null,
    badge,
    onPress,
  };
}

/** Una sala abierta del visualizador: el `onPress` no navega, se SUMA (y
 * después va al lobby). El texto muestra cuánta gente hay y cuántos cupos
 * quedan. */
function salaPublicaAFila(s: HuePlaySala, t: TFunction, unirse: (salaId: number) => void): FilaMP {
  const juego = juegoDelCatalogo(s.juegoCodigo);
  const dentro = s.jugadores.filter((j) => j.estado === 'aceptado' || j.estado === 'invitado').length;
  const esDuelo = s.juegoModo === 'turnos' || s.juegoModo === 'puntaje';
  return {
    key: `sp-${s.salaId}`,
    juegoCodigo: s.juegoCodigo,
    texto: juego?.titulo ?? s.juegoCodigo,
    subtexto: esDuelo
      ? t('hueplay.multiplayer.duelo1v1')
      : t('hueplay.multiplayer.salaAbiertaInfo', {
          dentro,
          max: s.maxJugadores,
          cupos: s.cuposLibres ?? Math.max(0, s.maxJugadores - dentro),
        }),
    avatarPath: s.jugadores.find((j) => j.userId === s.creadorUserId)?.avatarPath ?? null,
    badge: null,
    onPress: () => unirse(s.salaId),
  };
}

/**
 * Multiplayer: todo lo que se juega con otra persona, en un solo lugar —
 * duelos 1 contra 1 (`desafios.tsx`) y salas de hasta 4 (`salas.tsx`),
 * fusionados acá en 3 solapas por lo que hay que hacer con cada uno. Las
 * pantallas por-juego (`desafios.tsx?juego=X`, `salas.tsx?juego=X`) siguen
 * existiendo tal cual para cuando se entra desde la tarjeta puntual de un
 * juego — esta pantalla es la vista "todo junto".
 */
export default function MultiplayerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const yoId = user?.userId ?? 0;
  // Solapa inicial por deep link (`?solapa=historial` desde una notif de fin
  // de partida, `?solapa=tuTurno` desde "arrancó la sala", etc.).
  const params = useLocalSearchParams<{ solapa?: string }>();

  const [desafios, setDesafios] = useState<HuePlayDesafiosBandeja | null>(null);
  const [salas, setSalas] = useState<HuePlaySalasBandeja | null>(null);
  const [salasAbiertas, setSalasAbiertas] = useState<HuePlaySala[]>([]);
  const [torneos, setTorneos] = useState<HuePlayTorneosBandeja | null>(null);
  const [loading, setLoading] = useState(true);
  const [uniendose, setUniendose] = useState<number | null>(null);
  const SOLAPAS_VALIDAS: SolapaMP[] = ['tuTurno', 'enEspera', 'abiertas', 'torneos', 'historial'];
  const [solapa, setSolapa] = useState<SolapaMP>(
    SOLAPAS_VALIDAS.includes(params.solapa as SolapaMP) ? (params.solapa as SolapaMP) : 'tuTurno'
  );

  const cargar = useCallback(() => {
    Promise.all([
      hueplayApi.desafios(),
      hueplayApi.salas(),
      hueplayApi.salasPublicas(),
      hueplayApi.torneos(),
    ]).then(([rd, rs, rp, rt]) => {
      if (rd.success && rd.data) setDesafios(rd.data);
      if (rs.success && rs.data) setSalas(rs.data);
      if (rp.success && rp.data) setSalasAbiertas(rp.data.salas);
      if (rt.success && rt.data) setTorneos(rt.data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  const unirseAbierta = useCallback(
    (salaId: number) => {
      if (uniendose !== null) return;
      hapticLeve();
      setUniendose(salaId);
      hueplayApi.unirseSalaPublica(salaId).then((res) => {
        setUniendose(null);
        if (res.success && res.data) {
          router.push({ pathname: '/(app)/hueplay/sala-lobby/[salaId]', params: { salaId: res.data.sala.salaId } });
        } else {
          // La sala pudo llenarse justo — refrescar el listado.
          cargar();
        }
      });
    },
    [uniendose, cargar]
  );

  const porSolapa = useMemo<Record<SolapaMP, FilaMP[]>>(() => {
    return {
      tuTurno: [
        ...(desafios?.miTurno ?? []).map((d) => desafioAFila(d, 'tuTurno', yoId, t)),
        ...(salas?.miTurno ?? []).map((s) => salaAFila(s, 'miTurno', t)),
        ...(salas?.invitaciones ?? []).map((s) => salaAFila(s, 'invitacion', t)),
      ],
      enEspera: [
        ...(desafios?.esperando ?? []).map((d) => desafioAFila(d, 'enEspera', yoId, t)),
        ...(salas?.esperando ?? []).map((s) => salaAFila(s, 'esperando', t)),
        ...(salas?.armando ?? []).map((s) => salaAFila(s, 'armando', t)),
      ],
      abiertas: salasAbiertas.map((s) => salaPublicaAFila(s, t, unirseAbierta)),
      torneos: [],
      historial: [
        ...(desafios?.terminados ?? []).map((d) => desafioAFila(d, 'historial', yoId, t)),
        ...(salas?.terminadas ?? []).map((s) => salaAFila(s, 'terminada', t)),
      ],
    };
  }, [desafios, salas, salasAbiertas, yoId, t, unirseAbierta]);

  const torneosLista = torneos ? [...torneos.enCurso, ...torneos.inscripcion, ...torneos.terminados] : [];

  const tabs: { key: SolapaMP; label: string }[] = [
    { key: 'tuTurno', label: t('hueplay.multiplayer.tuTurno') },
    { key: 'enEspera', label: t('hueplay.multiplayer.enEspera') },
    { key: 'abiertas', label: t('hueplay.multiplayer.abiertas') },
    { key: 'torneos', label: t('hueplay.multiplayer.torneos') },
    { key: 'historial', label: t('hueplay.multiplayer.historial') },
  ];

  const lista = porSolapa[solapa];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.headerFila}>
        <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.multiplayer.titulo')}</Text>
        <Pressable
          onPress={() => {
            hapticLeve();
            router.push('/(app)/hueplay/desafios' as never);
          }}
          style={[styles.crearBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={16} color={colors.primaryText} />
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
            {t('hueplay.multiplayer.crear')}
          </Text>
        </Pressable>
      </View>

      <SwipeableSolapas tabs={tabs} activa={solapa} onChange={setSolapa}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : solapa === 'torneos' ? (
          torneosLista.length === 0 ? (
            <EmptyState icon="trophy-outline" titulo={t('hueplay.multiplayer.sinTorneos')} />
          ) : (
            <FlatList
              contentContainerStyle={[styles.lista, centeredContent]}
              data={torneosLista}
              keyExtractor={(tr) => `t-${tr.torneoId}`}
              renderItem={({ item: tr }) => <FilaTorneo torneo={tr} colors={colors} t={t} />}
            />
          )
        ) : lista.length === 0 ? (
          <EmptyState
            icon="people-outline"
            titulo={solapa === 'abiertas' ? t('hueplay.multiplayer.sinAbiertas') : t('hueplay.multiplayer.sinNada')}
          />
        ) : (
          <FlatList
            contentContainerStyle={[styles.lista, centeredContent]}
            data={lista}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const juego = juegoDelCatalogo(item.juegoCodigo);
              const esAbierta = item.key.startsWith('sp-');
              const salaIdAbierta = esAbierta ? Number(item.key.slice(3)) : null;
              return (
                <Pressable
                  onPress={() => {
                    hapticLeve();
                    item.onPress();
                  }}
                  style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {juego ? (
                    <View style={[styles.iconoJuego, { backgroundColor: `${juego.color}22` }]}>
                      <MaterialCommunityIcons name={juego.icono} size={16} color={juego.color} />
                    </View>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                      {item.texto}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                      {juego?.titulo ?? item.juegoCodigo} · {item.subtexto}
                    </Text>
                  </View>
                  {esAbierta ? (
                    <View style={[styles.unirmePill, { backgroundColor: colors.primary }]}>
                      {uniendose === salaIdAbierta ? (
                        <ActivityIndicator size="small" color={colors.primaryText} />
                      ) : (
                        <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 12 }}>
                          {t('hueplay.sala.unirse')}
                        </Text>
                      )}
                    </View>
                  ) : item.badge ? (
                    <View
                      style={[
                        styles.resultado,
                        {
                          backgroundColor:
                            item.badge.tono === 'neutro'
                              ? colors.border
                              : item.badge.tono === 'exito'
                                ? colors.success
                                : colors.danger,
                        },
                      ]}
                    >
                      <Text style={styles.resultadoTexto}>{item.badge.texto}</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SwipeableSolapas>
    </View>
  );
}

/** Una fila de "Mis torneos": estado, formato y a dónde lleva el toque
 * (lobby si está en inscripción, la llave/tabla si ya arrancó). */
function FilaTorneo({
  torneo,
  colors,
  t,
}: {
  torneo: HuePlayTorneo;
  colors: ReturnType<typeof useTheme>['colors'];
  t: TFunction;
}) {
  const juego = juegoDelCatalogo(torneo.juegoCodigo);
  const destino = torneo.estado === 'inscripcion' ? '/(app)/hueplay/torneo-lobby/[torneoId]' : '/(app)/hueplay/torneo/[torneoId]';
  const sub =
    torneo.estado === 'inscripcion'
      ? t('hueplay.torneo.inscriptosDe', { n: torneo.participantes.length, max: torneo.tamano })
      : torneo.estado === 'terminado'
        ? t('hueplay.torneo.campeonEs', { nombre: torneo.ganadorNombre ?? '' })
        : t('hueplay.torneo.enCurso');
  return (
    <Pressable
      onPress={() => {
        hapticLeve();
        router.push({ pathname: destino, params: { torneoId: torneo.torneoId } });
      }}
      style={[styles.fila, { backgroundColor: colors.surface, borderColor: torneo.miPartidaActiva ? colors.primary : colors.border }]}
    >
      {juego ? (
        <View style={[styles.iconoJuego, { backgroundColor: `${juego.color}22` }]}>
          <MaterialCommunityIcons name={juego.icono} size={16} color={juego.color} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
          {torneo.formato === 'eliminacion' ? t('hueplay.torneo.eliminacion') : t('hueplay.torneo.liga')} ·{' '}
          {juego?.titulo ?? torneo.juegoCodigo}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {torneo.miPartidaActiva ? (
        <View style={[styles.unirmePill, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 12 }}>
            {t('hueplay.torneo.jugar')}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seccion: {
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    textTransform: 'uppercase',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  headerFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  crearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lista: { padding: 16, paddingTop: 0 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  iconoJuego: { width: 32, height: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  resultado: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultadoTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  unirmePill: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
