import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { variantePorJuegoCodigo } from '../../../src/juego/huedoku/motor';
import { GOLES_MAX, GOLES_MIN, GOLES_PARA_GANAR_DEFAULT } from '../../../src/juego/huesoccer/motor';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FilterChip } from '../../../src/components/ui/ChipRow';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { PlazoTurnoSelector } from '../../../src/components/ui/PlazoTurnoSelector';
import { HuePlayDesafio, HuePlayRival } from '../../../src/types/hueplay';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/** Presets de "a cuántos goles" — el rango real (1-10) lo valida el backend. */
const PRESETS_GOLES = [1, 3, 5, 7, 10];

/** A qué pantalla se navega apenas se crea el desafío, por juego. */
function rutaDelDesafio(d: HuePlayDesafio): { pathname: string; params: Record<string, string | number> } {
  if (d.juegoCodigo === 'hueconecta') {
    return { pathname: '/(app)/hueplay/hueconecta', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huedamas') {
    return { pathname: '/(app)/hueplay/damas', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'hueajedrez') {
    return { pathname: '/(app)/hueplay/ajedrez', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huesoccer') {
    return { pathname: '/(app)/hueplay/huesoccer', params: { desafioId: d.desafioId } };
  }
  const varianteDoku = variantePorJuegoCodigo(d.juegoCodigo);
  if (varianteDoku) {
    return { pathname: '/(app)/hueplay/huedoku', params: { desafioId: d.desafioId, semilla: d.semilla, variante: varianteDoku } };
  }
  const rutas: Record<string, string> = {
    huememo: '/(app)/hueplay/huememo',
    huetrivia: '/(app)/hueplay/huetrivia',
    huezip: '/(app)/hueplay/huezip',
  };
  return {
    pathname: rutas[d.juegoCodigo] ?? '/(app)/hueplay/huematch',
    params: { desafioId: d.desafioId, semilla: d.semilla },
  };
}

/** Juegos de tablero por turnos: son los únicos donde el plazo de respuesta tiene sentido. */
const JUEGOS_TURNOS = ['hueconecta', 'huedamas', 'hueajedrez', 'huesoccer'];

/** Juegos con modo solitario contra la IA de la app. */
const JUEGOS_IA = ['huedamas', 'hueajedrez'];


/**
 * A quién retar.
 *
 * La búsqueda va contra el servidor y no filtra una lista ya bajada: el
 * endpoint excluye a quien ya tiene un duelo abierto conmigo **en ese juego**,
 * y ese dato no se puede recalcular en el cliente.
 */
export default function RetarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ juego?: string }>();

  // El juego llega por parámetro: se puede tener un duelo abierto de HueMatch y
  // otro de HueConecta con la misma persona, así que la lista de rivales
  // depende de cuál se está por retar.
  const CODIGOS = [
    'huematch',
    'huememo',
    'huetrivia',
    'huezip',
    'hueconecta',
    'huedamas',
    'hueajedrez',
    'huesoccer',
    'huedoku6',
    'huedoku9facil',
    'huedoku9dificil',
  ];
  const JUEGO = CODIGOS.includes(params.juego ?? '') ? params.juego! : 'huematch';
  const esDeTurnos = JUEGOS_TURNOS.includes(JUEGO);
  const tieneIA = JUEGOS_IA.includes(JUEGO);

  const esSoccer = JUEGO === 'huesoccer';

  const [busqueda, setBusqueda] = useState('');
  const [rivales, setRivales] = useState<HuePlayRival[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [plazoTurnoMinutos, setPlazoTurnoMinutos] = useState(1440);
  const [metaGoles, setMetaGoles] = useState(GOLES_PARA_GANAR_DEFAULT);
  const [error, setError] = useState<string | null>(null);
  /**
   * Rival al que se le tocó "Retar", pendiente de confirmar en el modal.
   *
   * Antes el plazo (y ahora también la meta de goles) se mostraban siempre
   * arriba de la pantalla, antes de elegir con quién jugar — poco claro,
   * porque no quedaba antes de "a quién" sino de "cómo". Ahora el modal se
   * abre recién al tocar Retar sobre alguien puntual, y confirmar ahí es lo
   * que manda el desafío.
   */
  const [rivalPendiente, setRivalPendiente] = useState<HuePlayRival | null>(null);

  const cargar = useCallback((q: string) => {
    setLoading(true);
    hueplayApi.rivales(JUEGO, q || undefined).then((res) => {
      if (res.success && res.data) setRivales(res.data.rivales);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    // Se espera a que deje de tipear: sin esto sale una request por tecla.
    const id = setTimeout(() => cargar(busqueda.trim()), 300);
    return () => clearTimeout(id);
  }, [busqueda, cargar]);

  const retar = async (r: HuePlayRival) => {
    hapticMedio();
    setRivalPendiente(null);
    setEnviando(r.userId);
    setError(null);
    const res = await hueplayApi.crearDesafio(JUEGO, r.userId, {
      ...(esDeTurnos ? { plazoTurnoMinutos } : {}),
      ...(esSoccer ? { metaGoles } : {}),
    });
    setEnviando(null);

    if (res.success && res.data) {
      hapticExito();
      // Se va directo al tablero: retar y quedarse mirando la lista obligaría a
      // volver a buscar el duelo en la bandeja para jugarlo. Si el saque le
      // tocó al rival, se entra igual — se ve el tablero vacío y el cartel de
      // que es su turno, que es más claro que no mostrar nada.
      router.replace(rutaDelDesafio(res.data.desafio) as never);
    } else {
      setError(res.message ?? t('common.error'));
      cargar(busqueda.trim());
    }
  };

  /** Toque en "Retar" de una fila: si el juego tiene algo que configurar, abre el modal; si no, va directo. */
  const onTocarRetar = (r: HuePlayRival) => {
    if (esDeTurnos) {
      hapticLeve();
      setRivalPendiente(r);
      return;
    }
    retar(r);
  };

  const jugarContraIA = async () => {
    hapticMedio();
    setEnviando(-1);
    setError(null);
    const res = await hueplayApi.crearDesafio(JUEGO, undefined, { contraIA: true });
    setEnviando(null);

    if (res.success && res.data) {
      hapticExito();
      router.replace(rutaDelDesafio(res.data.desafio) as never);
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {tieneIA ? (
        <Pressable
          disabled={enviando !== null}
          onPress={jugarContraIA}
          style={[styles.botonIA, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
        >
          {enviando === -1 ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 14 }}>
                {t('hueplay.jugarContraIA')}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />

      {error ? (
        <Text style={{ color: colors.danger, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.lista, centeredContent]}>
          {rivales.length === 0 ? (
            <EmptyState
              icon="people-outline"
              titulo={t('hueplay.sinRivales')}
              descripcion={t('hueplay.sinRivalesDesc')}
            />
          ) : null}

          {rivales.map((r) => (
            <View
              key={r.userId}
              style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {r.avatarPath ? (
                <Image source={{ uri: rhAvatarUrl(r.avatarPath) }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                  {r.username ? `@${r.username}` : r.nombreCompleto}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('hueplay.nivelCorto', { n: r.nivel })}
                  {r.loSigo ? ` · ${t('hueplay.loSeguis')}` : ''}
                </Text>
              </View>

              <Pressable
                disabled={enviando !== null}
                onPress={() => onTocarRetar(r)}
                style={[styles.retar, { backgroundColor: colors.primary, opacity: enviando ? 0.5 : 1 }]}
              >
                {enviando === r.userId ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                    {t('hueplay.retar')}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={rivalPendiente !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRivalPendiente(null)}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRivalPendiente(null)} />
          <View style={[styles.dialog, elevation.lg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[type.titleSm, { color: colors.text, marginBottom: 2 }]}>
              {t('hueplay.configurarDuelo')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
              {rivalPendiente?.username ? `@${rivalPendiente.username}` : rivalPendiente?.nombreCompleto}
            </Text>

            <Text style={[type.label, { color: colors.textMuted, marginBottom: 8 }]}>
              {t('hueplay.plazoTurno')}
            </Text>
            <PlazoTurnoSelector valorMinutos={plazoTurnoMinutos} onChange={setPlazoTurnoMinutos} />

            {esSoccer ? (
              <>
                <Text style={[type.label, { color: colors.textMuted, marginTop: 18, marginBottom: 8 }]}>
                  {t('hueplay.soccer.metaGoles')}
                </Text>
                <View style={styles.chipsGoles}>
                  {PRESETS_GOLES.map((g) => (
                    <FilterChip key={g} label={String(g)} activo={metaGoles === g} onPress={() => setMetaGoles(g)} />
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              disabled={enviando !== null}
              onPress={() => rivalPendiente && retar(rivalPendiente)}
              style={[styles.botonConfirmar, { backgroundColor: colors.primary, marginTop: 22 }]}
            >
              {enviando !== null ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>
                  {t('hueplay.retar')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, paddingBottom: 32, flexGrow: 1 },
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
  retar: { borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 9, minWidth: 74, alignItems: 'center' },
  botonIA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.pill,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
  },
  chipsGoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  botonConfirmar: { borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});
