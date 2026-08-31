import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { BarraNivel } from '../../../src/components/ui/BarraNivel';
import { Ficha } from '../../../src/juego/huematch/Ficha';
import { HuePlayPerfil } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

type JuegoDef = {
  id: string;
  titulo: string;
  bajada: string;
  icono: keyof typeof Ionicons.glyphMap;
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
 */
const JUEGOS: JuegoDef[] = [
  {
    id: 'huematch',
    titulo: 'HueCrush',
    bajada: 'Alineá 3 huellas o más contra reloj. Se puede jugar en duelo.',
    icono: 'grid',
    color: '#E8577E',
    ruta: '/(app)/hueplay/huematch',
    duelo: true,
  },
  {
    id: 'hueconecta',
    titulo: 'HueConecta',
    bajada: 'Cuatro huellas en línea, por turnos contra otra persona.',
    icono: 'ellipse',
    color: '#5B9AD6',
    // No tiene modo solo: sin rival no hay partida, así que se entra retando.
    ruta: '/(app)/hueplay/retar?juego=hueconecta',
    duelo: true,
  },
  {
    id: 'huememo',
    titulo: 'HueMemo',
    bajada: 'Encontrá los 8 pares antes de que se acabe el tiempo.',
    icono: 'copy',
    color: '#4CC3A5',
    ruta: '/(app)/hueplay/huememo',
    duelo: true,
  },
  {
    id: 'huetrivia',
    titulo: 'HueTrivia',
    bajada: 'Diez preguntas de cuidado animal contra reloj.',
    icono: 'help-circle',
    color: '#B36FE0',
    ruta: '/(app)/hueplay/huetrivia',
    duelo: true,
  },
  {
    id: 'huezip',
    titulo: 'HueZip',
    bajada: 'Dibujá un solo camino que pase por toda la grilla, en orden.',
    icono: 'trail-sign',
    color: '#F0A830',
    ruta: '/(app)/hueplay/huezip',
    duelo: true,
  },
  {
    id: 'huedamas',
    titulo: 'HueDamas',
    bajada: 'Las damas de siempre, por turnos contra otra persona o contra la app.',
    icono: 'apps',
    color: '#6B4226',
    // Igual que HueConecta: sin rival no hay partida, así que se entra retando
    // (ahí también está la opción de jugar contra la app).
    ruta: '/(app)/hueplay/retar?juego=huedamas',
    duelo: true,
  },
  {
    id: 'hueajedrez',
    titulo: 'HueAjedrez',
    bajada: 'Ajedrez completo (jaque, enroque, al paso) contra otra persona o contra la app.',
    icono: 'grid-outline',
    color: '#7B9463',
    ruta: '/(app)/hueplay/retar?juego=hueajedrez',
    duelo: true,
  },
  {
    id: 'huesoccer',
    titulo: 'HueSoccer',
    bajada: 'Meté la pelota en el arco del rival a lo Soccer Star, por turnos.',
    icono: 'football',
    color: '#3D9970',
    // Sin rival no hay partida, como Damas/Ajedrez/Conecta4.
    ruta: '/(app)/hueplay/retar?juego=huesoccer',
    duelo: true,
  },
  {
    id: 'hueludo',
    titulo: 'HueLudo',
    bajada: 'El clásico de mesa hasta con 4 personas, en salas con código para compartir.',
    icono: 'dice',
    color: '#B36FE0',
    // Tiene su propia bandeja (salas armándose, invitaciones, en curso) en vez
    // de ir directo a crear: con hasta 4 jugadores hay más que gestionar que
    // en un duelo 1 contra 1.
    ruta: '/(app)/hueplay/salas?juego=hueludo',
    duelo: true,
  },
  {
    id: 'huerummy',
    titulo: 'HueRummy',
    bajada: 'El Rummy de cartas de siempre, en salas de hasta 4 con código para compartir.',
    icono: 'albums',
    color: '#4CC3A5',
    ruta: '/(app)/hueplay/salas?juego=huerummy',
    duelo: true,
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

/**
 * Ya no queda ninguno "proximamente": los cuatro juegos estan jugables. La
 * lista se deja para que sumar el siguiente sea agregar una entrada.
 */
const PROXIMAMENTE: JuegoDef[] = [];

export default function HuePlayScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [perfil, setPerfil] = useState<HuePlayPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      hueplayApi.perfil().then((res) => {
        if (res.success && res.data) setPerfil(res.data);
        setLoading(false);
      });
    }, [])
  );

  const p = perfil?.progreso;
  const pct = p
    ? Math.min(100, ((p.puntos - p.nivelDesde) / Math.max(1, p.nivelHasta - p.nivelDesde)) * 100)
    : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <Text style={[styles.titulo, { color: colors.text }]}>HuePlay</Text>
      <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('hueplay.bajada')}</Text>

      {loading ? (
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

      {/* El diario va primero y con el color de acento: es el modo que
          queremos que se abra todos los días, y enterrarlo debajo de la lista
          de juegos lo dejaría como una opción más. */}
      <Pressable
        onPress={() => {
          hapticLeve();
          router.push('/(app)/hueplay/diario' as never);
        }}
        style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.primary }]}
      >
        <View style={[styles.icono, { backgroundColor: '#FFB70022' }]}>
          <Ionicons name="today" size={24} color="#FFB700" />
        </View>
        <View style={styles.texto}>
          <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>
            {t('hueplay.diario.titulo')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {t('hueplay.diario.bajadaHub')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={() => {
          hapticLeve();
          router.push('/(app)/hueplay/desafios');
        }}
        style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.icono, { backgroundColor: '#E8577E22' }]}>
          <Ionicons name="flash" size={24} color="#E8577E" />
        </View>
        <View style={styles.texto}>
          <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>{t('hueplay.desafios')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.desafiosBajada')}</Text>
        </View>
        {perfil && perfil.desafiosPendientes > 0 ? (
          <View style={[styles.pill, { backgroundColor: colors.danger }]}>
            <Text style={styles.pillTexto}>{perfil.desafiosPendientes}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </Pressable>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.juegos')}</Text>

      {JUEGOS.map((j) => (
        <Pressable
          key={j.id}
          onPress={() => {
            hapticLeve();
            j.ruta && router.push(j.ruta as never);
          }}
          style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.icono, { backgroundColor: `${j.color}22` }]}>
            {j.id === 'huematch' ? (
              <Ficha tipo={0} size={30} />
            ) : (
              <Ionicons name={j.icono} size={24} color={j.color} />
            )}
          </View>
          <View style={styles.texto}>
            <Text style={[styles.tarjetaTitulo, { color: colors.text }]}>{j.titulo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{j.bajada}</Text>
            {perfil?.records[j.id] ? (
              <Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>
                {t('hueplay.tuRecord', { n: perfil.records[j.id] })}
              </Text>
            ) : null}
            {/* Nivel propio del juego. Se muestra siempre que haya perfil, aun
                en nivel 1 con 0 puntos: ver la barra vacía invita a jugar mucho
                más que no ver nada. */}
            {perfil?.porJuego?.[j.id] ? (
              <BarraNivel
                compacta
                color={j.color}
                progreso={perfil.porJuego[j.id]!}
                etiqueta={t('hueplay.nivel', { n: perfil.porJuego[j.id]!.nivel })}
              />
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      {perfil && perfil.ranking.length > 0 ? (
        <>
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.ranking')}</Text>
          <View style={[styles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {perfil.ranking.map((r) => (
              <View
                key={r.userId}
                style={[
                  styles.rankFila,
                  r.soyYo && { backgroundColor: colors.primarySoft, borderRadius: radii.md },
                ]}
              >
                <Text
                  style={[
                    styles.rankPos,
                    { color: r.posicion <= 3 ? colors.primary : colors.textMuted },
                  ]}
                >
                  {r.posicion}
                </Text>
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
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('hueplay.nivelCorto', { n: r.nivel })}
                </Text>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13, minWidth: 54, textAlign: 'right' }}>
                  {r.puntos}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.proximamente')}</Text>
      {PROXIMAMENTE.map((j) => (
        <View
          key={j.id}
          style={[styles.tarjeta, styles.tarjetaOff, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.icono, { backgroundColor: `${j.color}18` }]}>
            <Ionicons name={j.icono} size={24} color={j.color} />
          </View>
          <View style={styles.texto}>
            <Text style={[styles.tarjetaTitulo, { color: colors.textMuted }]}>{j.titulo}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{j.bajada}</Text>
          </View>
          <View style={[styles.badge, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>{t('hueplay.pronto')}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
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
  titulo: { fontSize: 26, fontFamily: fonts.displaySemi },
  bajada: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 22, marginBottom: 10, textTransform: 'uppercase' },
  nivelCard: { borderWidth: 1, borderRadius: radii.lg, padding: 16, marginBottom: 14, gap: 8 },
  nivelFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nivelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nivelNum: { fontFamily: fonts.displaySemi, fontSize: 19 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 4 },
  stats: { flexDirection: 'row', marginTop: 6 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  tarjetaOff: { opacity: 0.6 },
  icono: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1 },
  tarjetaTitulo: { fontSize: 16, fontFamily: fonts.bodySemi, marginBottom: 2 },
  badge: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pill: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  pillTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  rankingCard: { borderWidth: 1, borderRadius: radii.lg, padding: 8 },
  rankFila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 8 },
  rankPos: { width: 20, fontFamily: fonts.bodyBold, fontSize: 13 },
  rankAvatar: { width: 26, height: 26, borderRadius: 13 },
  rankAvatarVacio: { alignItems: 'center', justifyContent: 'center' },
});
