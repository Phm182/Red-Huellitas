import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { BotonFavorito } from '../../../src/components/hueplay/BotonFavorito';
import { CarruselJuegos } from '../../../src/components/hueplay/CarruselJuegos';
import { ordenarJuegos } from '../../../src/juego/hueplay/catalogo';
import { Ficha } from '../../../src/juego/huematch/Ficha';
import { HuePlayPerfil } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

type VistaJuegos = 'dinamica' | 'desplegada';

type JuegoDef = {
  id: string;
  titulo: string;
  bajada: string;
  icono: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  ruta?: string;
  /** Los que se pueden jugar contra otro. */
  duelo?: boolean;
};

/**
 * Catálogo de HuePlay.
 *
 * HuePlay es la sección; los juegos van adentro. Sumar el próximo es agregar
 * una entrada acá y una pantalla: el nivel, el ranking y los desafíos ya son
 * compartidos y los hereda sin tocar backend.
 *
 * `MaterialCommunityIcons`, no `Ionicons` — es el set que trae íconos de
 * juego reales (`chess-knight`, `cards-playing-outline`…), ver el comentario
 * más largo en `juego/hueplay/catalogo.ts` (mismo criterio, mismos íconos).
 *
 * Todas las tarjetas —salvo las de sala y HueGotchi— llevan ahora a la
 * bandeja de desafíos filtrada a ESE juego (`desafios.tsx?juego=X`) en vez
 * de saltar directo a "retar" o al tablero: entrar a un juego puntual tiene
 * que mostrar de una tus duelos activos ahí, no sólo dejar arrancar uno
 * nuevo a ciegas. Mismo criterio que ya usan HueLudo/HueRummy con su propia
 * bandeja de salas.
 */
const JUEGOS: JuegoDef[] = [
  {
    id: 'huematch',
    titulo: 'HueCrush',
    bajada: 'Alineá 3 huellas o más contra reloj. Se puede jugar en duelo.',
    icono: 'view-grid',
    color: '#E8577E',
    ruta: '/(app)/hueplay/desafios?juego=huematch',
    duelo: true,
  },
  {
    id: 'hueconecta',
    titulo: 'HueConecta',
    bajada: 'Cuatro huellas en línea, por turnos contra otra persona.',
    icono: 'circle-multiple',
    color: '#5B9AD6',
    ruta: '/(app)/hueplay/desafios?juego=hueconecta',
    duelo: true,
  },
  {
    id: 'huememo',
    titulo: 'HueMemo',
    bajada: 'Encontrá los 8 pares antes de que se acabe el tiempo.',
    icono: 'cards',
    color: '#4CC3A5',
    ruta: '/(app)/hueplay/desafios?juego=huememo',
    duelo: true,
  },
  {
    id: 'huetrivia',
    titulo: 'HueTrivia',
    bajada: 'Diez preguntas de cuidado animal contra reloj.',
    icono: 'comment-question-outline',
    color: '#B36FE0',
    ruta: '/(app)/hueplay/desafios?juego=huetrivia',
    duelo: true,
  },
  {
    id: 'huezip',
    titulo: 'HueZip',
    bajada: 'Dibujá un solo camino que pase por toda la grilla, en orden.',
    icono: 'gesture-swipe',
    color: '#F0A830',
    ruta: '/(app)/hueplay/desafios?juego=huezip',
    duelo: true,
  },
  {
    id: 'huedamas',
    titulo: 'HueDamas',
    bajada: 'Las damas de siempre, por turnos contra otra persona o contra la app.',
    icono: 'checkerboard',
    color: '#6B4226',
    ruta: '/(app)/hueplay/desafios?juego=huedamas',
    duelo: true,
  },
  {
    id: 'hueajedrez',
    titulo: 'HueAjedrez',
    bajada: 'Ajedrez completo (jaque, enroque, al paso) contra otra persona o contra la app.',
    icono: 'chess-knight',
    color: '#7B9463',
    ruta: '/(app)/hueplay/desafios?juego=hueajedrez',
    duelo: true,
  },
  {
    id: 'huetateti',
    titulo: 'HueTaTeTi',
    bajada: 'El clásico de 3 en línea, por turnos contra otra persona o contra la app.',
    icono: 'close',
    color: '#E8577E',
    ruta: '/(app)/hueplay/desafios?juego=huetateti',
    duelo: true,
  },
  {
    id: 'huepool',
    titulo: 'HuePool',
    bajada: 'Bola 8 de billar, con física real, contra otra persona por turnos.',
    icono: 'billiards-rack',
    color: '#2C5F3E',
    ruta: '/(app)/hueplay/desafios?juego=huepool',
    duelo: true,
  },
  {
    id: 'huescrabble',
    titulo: 'HueScrabble',
    bajada: 'Armá palabras cruzadas sobre el tablero, de a 2 a 4 jugadores.',
    icono: 'alphabetical-variant',
    color: '#B08D57',
    ruta: '/(app)/hueplay/salas?juego=huescrabble',
    duelo: true,
  },
  {
    id: 'huereversi',
    titulo: 'HueReversi',
    bajada: 'Flanqueá y volteá las fichas del rival hasta dominar el tablero, por turnos.',
    icono: 'circle-half-full',
    color: '#2C2C2C',
    ruta: '/(app)/hueplay/desafios?juego=huereversi',
    duelo: true,
  },
  {
    id: 'huesoccer',
    titulo: 'HueSoccer',
    bajada: 'Meté la pelota en el arco del rival a lo Soccer Star, por turnos.',
    icono: 'soccer',
    color: '#3D9970',
    ruta: '/(app)/hueplay/desafios?juego=huesoccer',
    duelo: true,
  },
  {
    id: 'hueludo',
    titulo: 'HueLudo',
    bajada: 'El clásico de mesa hasta con 4 personas, en salas con código para compartir.',
    icono: 'dice-multiple',
    color: '#B36FE0',
    // Tiene su propia bandeja (salas armándose, invitaciones, en curso) en vez
    // de ir directo a crear: con hasta 4 jugadores hay más que gestionar que
    // en un duelo 1 contra 1.
    ruta: '/(app)/hueplay/salas?juego=hueludo',
    duelo: true,
  },
  {
    id: 'hueludoroyal',
    titulo: 'HueLudo Real',
    bajada: 'La versión con dos dados: Corona para salir, Pluma de comodín y barreras.',
    icono: 'crown',
    color: '#D4A017',
    ruta: '/(app)/hueplay/salas?juego=hueludoroyal',
    duelo: true,
  },
  {
    id: 'huerummy',
    titulo: 'HueRummy',
    bajada: 'El Rummy de cartas de siempre, en salas de hasta 4 con código para compartir.',
    icono: 'cards-playing-outline',
    color: '#4CC3A5',
    ruta: '/(app)/hueplay/salas?juego=huerummy',
    duelo: true,
  },
  {
    id: 'huedoku6',
    titulo: 'HueDoku',
    bajada: 'Sudoku de 6x6 o 9x9, con dificultad a elegir. Se puede jugar en duelo.',
    icono: 'view-grid-outline',
    color: '#D9834F',
    // Una sola tarjeta para las 3 variantes: el selector de dificultad vive
    // adentro de huedoku.tsx (ver plan C5), no hace falta triplicar la tarjeta.
    ruta: '/(app)/hueplay/desafios?juego=huedoku6',
    duelo: true,
  },
  {
    id: 'huepacman',
    titulo: 'HuePacMan',
    bajada: 'Comé todos los puntos del laberinto esquivando a los 3 fantasmas.',
    icono: 'pac-man',
    color: '#F0D830',
    ruta: '/(app)/hueplay/huepacman',
  },
  {
    id: 'huegotchi',
    titulo: 'HueGotchi',
    bajada: 'Cuidá a tu mascota: alimentala, jugá, bañala y enseñale trucos.',
    icono: 'paw',
    color: '#E8A54C',
    ruta: '/(app)/juego/mascotas',
  },
];

export default function HuePlayScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [perfil, setPerfil] = useState<HuePlayPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  // Arranca siempre en "dinámica" (pedido explícito) — no se persiste entre
  // aperturas de la app, no hay mecanismo de preferencias por-pantalla acá.
  const [vista, setVista] = useState<VistaJuegos>('dinamica');
  // Con el buscador enfocado se colapsa el resto del chrome (tarjeta de
  // nivel, accesos, ranking) para que el carrusel / la grilla de resultados
  // quede arriba del teclado y se vea filtrar en vivo, sin cerrar el teclado.
  const [buscando, setBuscando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      hueplayApi.perfil().then((res) => {
        if (res.success && res.data) {
          setPerfil(res.data);
          setFavoritos(res.data.favoritos ?? []);
        }
        setLoading(false);
      });
    }, [])
  );

  const onFavoritoCambiar = useCallback((codigo: string, favorito: boolean) => {
    setFavoritos((prev) => {
      if (favorito) return prev.includes(codigo) ? prev : [...prev, codigo];
      return prev.filter((c) => c !== codigo);
    });
  }, []);

  const juegosOrdenados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = q ? JUEGOS.filter((j) => j.titulo.toLowerCase().includes(q)) : JUEGOS;
    return ordenarJuegos(base, favoritos, (j) => j.id, (j) => j.titulo);
  }, [busqueda, favoritos]);

  const labelModo = useCallback(
    (modo: 'solo' | 'multiplayer' | 'ambos') =>
      modo === 'solo' ? t('hueplay.modoSolo') : modo === 'multiplayer' ? t('hueplay.modoMultiplayer') : t('hueplay.modoAmbos'),
    [t]
  );

  const p = perfil?.progreso;
  const pct = p
    ? Math.min(100, ((p.puntos - p.nivelDesde) / Math.max(1, p.nivelHasta - p.nivelDesde)) * 100)
    : 0;

  const nivelYAcciones = (
    <>
      {buscando ? null : loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : p ? (
        <View style={[styles.nivelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.nivelFila}>
            <View style={[styles.nivelBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.nivelNum, { color: colors.primaryText }]}>{p.nivel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15 }}>
                {t('hueplay.nivel', { n: p.nivel })}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {t('hueplay.puntosYPuesto', { puntos: p.puntos, puesto: perfil.miPuesto })}
              </Text>
            </View>
          </View>

          <View style={[styles.barra, { backgroundColor: colors.border }]}>
            <View style={[styles.barraLlena, { backgroundColor: colors.primary, width: `${pct}%` }]} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
            {t('hueplay.faltanParaNivel', { n: p.faltan, nivel: p.nivel + 1 })}
          </Text>

          <View style={styles.stats}>
            <Stat label={t('hueplay.partidas')} valor={perfil.partidasJugadas} colors={colors} />
            <Stat label={t('hueplay.ganados')} valor={perfil.desafiosGanados} colors={colors} />
            <Stat label={t('hueplay.perdidos')} valor={perfil.desafiosPerdidos} colors={colors} />
          </View>
        </View>
      ) : null}

      {/* Reto del día y Multiplayer, uno al lado del otro: son las dos
          puertas de entrada grandes de HuePlay — el diario (mismo tablero
          para todo el mundo ese día) y todo lo que se juega con otra
          persona (duelos 1v1 + salas de hasta 4, unificados en una sola
          bandeja). Se ocultan mientras se busca para dejar lugar a los
          resultados sobre el teclado. */}
      {buscando ? null : (
      <View style={styles.filaMitades}>
        <Pressable
          onPress={() => {
            hapticLeve();
            router.push('/(app)/hueplay/diario' as never);
          }}
          style={[styles.tarjetaMitad, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        >
          <View style={[styles.icono, { backgroundColor: '#FFB70022' }]}>
            <Ionicons name="today" size={22} color="#FFB700" />
          </View>
          <Text style={[styles.tarjetaTitulo, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
            {t('hueplay.diario.titulo')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            hapticLeve();
            router.push('/(app)/hueplay/multiplayer' as never);
          }}
          style={[styles.tarjetaMitad, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {perfil && perfil.desafiosPendientes > 0 ? (
            <View style={[styles.pill, styles.pillEsquina, { backgroundColor: colors.danger }]}>
              <Text style={styles.pillTexto}>{perfil.desafiosPendientes}</Text>
            </View>
          ) : null}
          <View style={[styles.icono, { backgroundColor: '#5B9AD622' }]}>
            <Ionicons name="people" size={22} color="#5B9AD6" />
          </View>
          <Text style={[styles.tarjetaTitulo, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
            {t('hueplay.multiplayer.titulo')}
          </Text>
        </Pressable>
      </View>

      )}

      <View style={styles.seccionFila}>
        <Text style={[styles.seccion, styles.seccionSinMargen, { color: colors.textMuted }]}>{t('hueplay.juegos')}</Text>
        <ListSearchBar
          embedded
          value={busqueda}
          onChangeText={(v) => {
            setBusqueda(v);
            if (v.trim()) setBuscando(true);
          }}
          placeholder={t('hueplay.buscarJuego')}
          onFocus={() => setBuscando(true)}
          // Al perder foco se colapsa sólo si no quedó texto: así podés
          // tipear, tocar un resultado (el teclado se cierra) y la grilla
          // sigue expandida para entrar.
          onBlur={() => {
            if (!busqueda.trim()) setBuscando(false);
          }}
        />
      </View>

      <ChipRow
        opciones={[
          { valor: 'dinamica' as VistaJuegos, label: t('hueplay.vistaDinamica') },
          { valor: 'desplegada' as VistaJuegos, label: t('hueplay.vistaDesplegada') },
        ]}
        seleccionado={vista}
        onSelect={setVista}
        scrollable={false}
      />
    </>
  );

  // Vista "desplegada": grilla de 2 columnas parejas (chips ícono + nombre),
  // en vez de una tarjeta grande por fila. Los favoritos van primero
  // (mismo orden que el carrusel).
  const listaDesplegada = (
    <View style={styles.grillaJuegos}>
      {juegosOrdenados.map((j) => {
        const nivelJuego = perfil?.porJuego?.[j.id]?.nivel;
        return (
          <Pressable
            key={j.id}
            onPress={() => {
              hapticLeve();
              j.ruta && router.push(j.ruta as never);
            }}
            style={[styles.chipJuego, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.chipIcono, { backgroundColor: `${j.color}22` }]}>
              {j.id === 'huematch' ? (
                <Ficha tipo={0} size={22} />
              ) : (
                <MaterialCommunityIcons name={j.icono} size={20} color={j.color} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.tarjetaTitulo, { color: colors.text, fontSize: 13 }]} numberOfLines={1}>
                {j.titulo}
              </Text>
              {nivelJuego ? (
                <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                  {t('hueplay.nivelCorto', { n: nivelJuego })}
                </Text>
              ) : null}
            </View>
            <BotonFavorito juegoCodigo={j.id} esFavorito={favoritos.includes(j.id)} onCambiar={onFavoritoCambiar} size={16} />
          </Pressable>
        );
      })}
    </View>
  );

  const rankingLista = perfil?.ranking.map((r) => (
    <View
      key={r.userId}
      style={[styles.rankFila, r.soyYo && { backgroundColor: colors.primarySoft, borderRadius: radii.md }]}
    >
      <Text style={[styles.rankPos, { color: r.posicion <= 3 ? colors.primary : colors.textMuted }]}>{r.posicion}</Text>
      {r.avatarPath ? (
        <Image source={{ uri: rhAvatarUrl(r.avatarPath) }} style={styles.rankAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.rankAvatar, styles.rankAvatarVacio, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person" size={14} color={colors.primary} />
        </View>
      )}
      <Text style={{ color: colors.text, flex: 1, fontSize: 13 }} numberOfLines={1}>
        {r.username ? `@${r.username}` : r.nombreCompleto}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.nivelCorto', { n: r.nivel })}</Text>
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13, minWidth: 54, textAlign: 'right' }}>
        {r.puntos}
      </Text>
    </View>
  ));

  // Modo "desplegada": todo apilado en un único ScrollView, tal cual se
  // veía antes de este rediseño — el ranking no tiene límite de alto.
  if (vista === 'desplegada') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.contenido, centeredContent]}
        keyboardShouldPersistTaps="handled"
      >
        {nivelYAcciones}
        {listaDesplegada}
        {!buscando && perfil && perfil.ranking.length > 0 ? (
          <>
            <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.ranking')}</Text>
            <View style={[styles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {rankingLista}
            </View>
          </>
        ) : null}
      </ScrollView>
    );
  }

  // Modo "dinámica": nada de esto scrollea salvo el propio ranking — todo
  // el resto (nivel, fila de accesos, buscador+selector, carrusel) tiene
  // que entrar en una pantalla, así que el contenedor raíz es un `View`
  // fijo en vez de un `ScrollView`, y el ranking se lleva el alto que
  // sobra con un scroll interno propio.
  return (
    <View style={[styles.contenidoFijo, { backgroundColor: colors.background }, centeredContent]}>
      {nivelYAcciones}

      {/* Recién se monta con `loading` en false: si arrancara antes,
          `favoritos` llega vacío en el primer render y el carrusel abre
          mostrando el primero alfabético — cuando el favorito llega un
          instante después, el carrusel "sigue" al juego que ya estaba
          mostrando en vez de saltar al favorito, que es justo lo que se
          quiere evitar (por eso "sigue al mismo juego" al reordenar por
          favorito DESPUÉS, no al cargar la primera vez). */}
      {!loading ? (
        <View style={styles.carruselWrap}>
          <CarruselJuegos
            juegos={juegosOrdenados}
            favoritos={favoritos}
            modosPorJuego={perfil?.modosPorJuego ?? {}}
            onFavoritoCambiar={onFavoritoCambiar}
            onAbrir={(j) => {
              hapticLeve();
              const original = JUEGOS.find((x) => x.id === j.id);
              original?.ruta && router.push(original.ruta as never);
            }}
            labelModo={labelModo}
          />
        </View>
      ) : null}

      {!buscando && perfil && perfil.ranking.length > 0 ? (
        <View style={styles.rankingFlex}>
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.ranking')}</Text>
          <ScrollView style={[styles.rankingCard, styles.rankingCardMinAlto, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {rankingLista}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, valor, colors }: { label: string; valor: number; colors: { text: string; textMuted: string } }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 17 }}>{valor}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  // Modo "dinámica": ocupa toda la pantalla disponible (la da AppChrome) sin
  // scrollear — sólo el ranking, más abajo, tiene su propio scroll interno.
  contenidoFijo: { flex: 1, padding: 16 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 22, marginBottom: 10, textTransform: 'uppercase' },
  seccionSinMargen: { marginTop: 0, marginBottom: 0 },
  seccionFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 10 },
  filaMitades: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tarjetaMitad: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  pillEsquina: { position: 'absolute', top: 8, right: 8 },
  // Separado del selector Dinámica/Desplegada, que quedaba pegado al
  // carrusel sin aire.
  carruselWrap: { marginTop: 18, marginBottom: 6 },
  // `minHeight` además de `flex: 1`: en pantallas bajas el ranking se podía
  // achicar hasta mostrar 1 o 2 filas nomás — con esto entran mínimo 4-5
  // (el propio `ScrollView` de adentro se encarga de scrollear el resto).
  rankingFlex: { flex: 1, marginTop: 4, minHeight: 230 },
  nivelCard: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginBottom: 14, gap: 8 },
  nivelFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nivelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nivelNum: { fontFamily: fonts.displaySemi, fontSize: 19 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 4 },
  stats: { flexDirection: 'row', marginTop: 6 },
  icono: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  // Grilla de 2 columnas parejas para la vista "desplegada".
  grillaJuegos: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10, marginTop: 4 },
  chipJuego: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  chipIcono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tarjetaTitulo: { fontSize: 16, fontFamily: fonts.bodySemi, marginBottom: 2 },
  pill: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  pillTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  rankingCard: { borderWidth: 1, borderRadius: radii.lg, padding: 8 },
  rankingCardMinAlto: { minHeight: 190 },
  rankFila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 8 },
  rankPos: { width: 20, fontFamily: fonts.bodyBold, fontSize: 13 },
  rankAvatar: { width: 26, height: 26, borderRadius: 13 },
  rankAvatarVacio: { alignItems: 'center', justifyContent: 'center' },
});
