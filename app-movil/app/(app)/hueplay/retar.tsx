import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { HuePlayDesafio, HuePlayRival } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticExito, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

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
  const rutas: Record<string, string> = {
    huememo: '/(app)/hueplay/huememo',
    huetrivia: '/(app)/hueplay/huetrivia',
  };
  return {
    pathname: rutas[d.juegoCodigo] ?? '/(app)/hueplay/huematch',
    params: { desafioId: d.desafioId, semilla: d.semilla },
  };
}

/** Juegos de tablero por turnos: son los únicos donde el plazo de respuesta tiene sentido. */
const JUEGOS_TURNOS = ['hueconecta', 'huedamas', 'hueajedrez'];

/** Juegos con modo solitario contra la IA de la app. */
const JUEGOS_IA = ['huedamas', 'hueajedrez'];

const PLAZOS = [1, 6, 12, 24];

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
  const CODIGOS = ['huematch', 'huememo', 'huetrivia', 'hueconecta', 'huedamas', 'hueajedrez'];
  const JUEGO = CODIGOS.includes(params.juego ?? '') ? params.juego! : 'huematch';
  const esDeTurnos = JUEGOS_TURNOS.includes(JUEGO);
  const tieneIA = JUEGOS_IA.includes(JUEGO);

  const [busqueda, setBusqueda] = useState('');
  const [rivales, setRivales] = useState<HuePlayRival[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [contraIA, setContraIA] = useState(false);
  const [plazoTurnoHoras, setPlazoTurnoHoras] = useState(24);
  const [error, setError] = useState<string | null>(null);

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
    setEnviando(r.userId);
    setError(null);
    const res = await hueplayApi.crearDesafio(
      JUEGO,
      r.userId,
      esDeTurnos ? { plazoTurnoHoras } : undefined
    );
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
      {esDeTurnos ? (
        <View style={styles.plazoBloque}>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
            {t('hueplay.plazoTurno')}
          </Text>
          <ChipRow
            opciones={PLAZOS.map((h) => ({ valor: h, label: t('hueplay.plazoHoras', { n: h }) }))}
            seleccionado={plazoTurnoHoras}
            onSelect={setPlazoTurnoHoras}
            scrollable={false}
          />
        </View>
      ) : null}

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
                onPress={() => retar(r)}
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
  plazoBloque: { paddingHorizontal: 16, paddingTop: 12 },
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
});
