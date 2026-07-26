import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { matchApi } from '../../../src/api/matchApi';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { RazaPicker } from '../../../src/components/RazaPicker';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { Especie, Mascota, MatchCandidato, Sexo, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];
const SEXOS: Sexo[] = ['macho', 'hembra'];
const RADIOS: Array<20 | 50 | 100> = [20, 50, 100];

interface EdadBucket {
  key: string;
  edadMin: number | null;
  edadMax: number | null;
}

const EDAD_BUCKETS: EdadBucket[] = [
  { key: 'cualquiera', edadMin: null, edadMax: null },
  { key: 'cachorro', edadMin: 0, edadMax: 0 },
  { key: 'joven', edadMin: 1, edadMax: 3 },
  { key: 'adulto', edadMin: 3, edadMax: 7 },
  { key: 'senior', edadMin: 7, edadMax: null },
];

export default function MatchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);
  const [disponibles, setDisponibles] = useState<Mascota[]>([]);
  const [mascotaOrigenId, setMascotaOrigenId] = useState<number | null>(null);
  const especieDefaultAplicada = useRef(false);

  const [especieFiltro, setEspecieFiltro] = useState<Especie | null>(null);
  const [sexoFiltro, setSexoFiltro] = useState<Sexo | null>(null);
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [edadBucketKey, setEdadBucketKey] = useState('cualquiera');
  const [radioKm, setRadioKm] = useState<20 | 50 | 100 | null>(null);

  const [candidatos, setCandidatos] = useState<MatchCandidato[]>([]);
  const [loadingDeck, setLoadingDeck] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [matchModal, setMatchModal] = useState<{ matchId: number; mascotaCandidata: MatchCandidato } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingGate(true);
      perfilApi.estadoVerificacion().then((res) => {
        if (activo && res.success && res.data) {
          setVerificacion(res.data);
        }
        if (activo) setLoadingGate(false);
      });
      mascotasApi.misMascotas().then((res) => {
        if (!activo || !res.success || !res.data) return;
        const propias = res.data.mascotas.filter((m) => m.disponibleParaMatch && m.estado === 'A');
        setDisponibles(propias);
        setMascotaOrigenId((prev) => (prev && propias.some((m) => m.mascotaId === prev) ? prev : propias[0]?.mascotaId ?? null));
        if (!especieDefaultAplicada.current && propias[0]) {
          especieDefaultAplicada.current = true;
          setEspecieFiltro(propias[0].especie);
        }
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const onEspecieChange = (e: Especie | null) => {
    setEspecieFiltro(e);
    setRazaId(null);
    setRazaTexto(null);
  };

  const cargarDeck = useCallback(() => {
    if (!mascotaOrigenId) return;
    setLoadingDeck(true);
    const bucket = EDAD_BUCKETS.find((b) => b.key === edadBucketKey) ?? EDAD_BUCKETS[0];
    matchApi
      .candidatos({
        mascotaIdOrigen: mascotaOrigenId,
        especie: especieFiltro,
        sexo: sexoFiltro,
        razaId,
        edadMin: bucket.edadMin,
        edadMax: bucket.edadMax,
        radioKm,
      })
      .then((res) => {
        if (res.success && res.data) {
          setCandidatos(res.data.candidatos);
        }
        setLoadingDeck(false);
      });
  }, [mascotaOrigenId, especieFiltro, sexoFiltro, razaId, edadBucketKey, radioKm]);

  useFocusEffect(
    useCallback(() => {
      cargarDeck();
    }, [cargarDeck])
  );

  const candidatoActual = candidatos[0] ?? null;

  const onSwipe = async (direccion: 'like' | 'pass') => {
    if (!mascotaOrigenId || !candidatoActual || swiping) return;
    setSwiping(true);
    const res = await matchApi.swipe(mascotaOrigenId, candidatoActual.mascotaId, direccion);
    setSwiping(false);
    setCandidatos((prev) => prev.slice(1));
    if (res.success && res.data?.match && res.data.matchId && res.data.mascotaCandidata) {
      setMatchModal({ matchId: res.data.matchId, mascotaCandidata: res.data.mascotaCandidata });
    }
  };

  if (loadingGate) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('feed.verificationRequiredTitle')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('feed.verificationRequiredBody')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.goToVerification')}</Text>
        </Pressable>
      </View>
    );
  }

  if (disponibles.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('match.sinMascotasTitulo')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('match.sinMascotasBody')}
        </Text>
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push('/(app)/mascotas')}>
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('match.irAMisMascotas')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable onPress={() => router.push('/(app)/match/matches')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('match.misMatches')}</Text>
        </Pressable>
      </View>

      {disponibles.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
          {disponibles.map((m) => {
            const activo = m.mascotaId === mascotaOrigenId;
            return (
              <Pressable
                key={m.mascotaId}
                onPress={() => setMascotaOrigenId(m.mascotaId)}
                style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>{m.nombre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => onEspecieChange(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: especieFiltro === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: especieFiltro === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('match.cualquiera')}
          </Text>
        </Pressable>
        {ESPECIES.map((e) => {
          const activo = especieFiltro === e;
          return (
            <Pressable
              key={e}
              onPress={() => onEspecieChange(e)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {especieFiltro ? (
        <View style={{ paddingHorizontal: 12 }}>
          <RazaPicker
            especie={especieFiltro}
            razaId={razaId}
            razaTexto={razaTexto}
            onChange={(id, texto) => {
              setRazaId(id);
              setRazaTexto(texto);
            }}
          />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setSexoFiltro(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: sexoFiltro === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: sexoFiltro === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('match.cualquiera')}
          </Text>
        </Pressable>
        {SEXOS.map((s) => {
          const activo = sexoFiltro === s;
          return (
            <Pressable
              key={s}
              onPress={() => setSexoFiltro(s)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>{t(`match.sexo.${s}`)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {EDAD_BUCKETS.map((b) => {
          const activo = edadBucketKey === b.key;
          return (
            <Pressable
              key={b.key}
              onPress={() => setEdadBucketKey(b.key)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`match.edadBucket.${b.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {RADIOS.map((r) => {
          const activo = radioKm === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRadioKm(r)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>{r}km</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setRadioKm(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: radioKm === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: radioKm === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('match.sinLimite')}
          </Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.deck, centeredContent]}>
        {loadingDeck ? (
          <ActivityIndicator color={colors.primary} />
        ) : candidatoActual ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {candidatoActual.fotos?.[0] ? (
              <Image source={{ uri: rhMediaUrl(candidatoActual.fotos[0].path) }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, { backgroundColor: colors.background }]} />
            )}
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20, marginTop: 12 }}>{candidatoActual.nombre}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              {candidatoActual.raza ??
                t(`mascotas.especie${candidatoActual.especie.charAt(0).toUpperCase()}${candidatoActual.especie.slice(1)}`)}
              {candidatoActual.edadAnios !== null ? ` · ${candidatoActual.edadAnios} años` : ''}
            </Text>
            <Text style={{ color: colors.textMuted }}>{t(`match.sexo.${candidatoActual.sexo}`)}</Text>
            {candidatoActual.distanciaKm !== null ? (
              <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 4 }}>{candidatoActual.distanciaKm}km</Text>
            ) : null}

            <View style={styles.swipeButtons}>
              <Pressable
                style={[styles.swipeButton, { backgroundColor: colors.surface, borderColor: colors.danger }]}
                onPress={() => onSwipe('pass')}
                disabled={swiping}
              >
                <Text style={{ fontSize: 28 }}>❌</Text>
              </Pressable>
              <Pressable
                style={[styles.swipeButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={() => onSwipe('like')}
                disabled={swiping}
              >
                <Text style={{ fontSize: 28 }}>❤️</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.centered}>
            <EmptyState
              icon="heart-outline"
              titulo={t('match.emptyDeck')}
              accionLabel={t('match.buscarDeNuevo')}
              onAccion={cargarDeck}
            />
          </View>
        )}
      </View>

      <Modal visible={matchModal !== null} transparent animationType="fade" onRequestClose={() => setMatchModal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.matchCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20, marginBottom: 8 }}>{t('match.esUnMatch')}</Text>
            {matchModal ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
                {t('match.esUnMatchBody', { nombre: matchModal.mascotaCandidata.nombre })}
              </Text>
            ) : null}
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (matchModal) {
                  const matchId = matchModal.matchId;
                  setMatchModal(null);
                  router.push({ pathname: '/(app)/match/[matchId]', params: { matchId } });
                }
              }}
            >
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('match.irAlChat')}</Text>
            </Pressable>
            <Pressable onPress={() => setMatchModal(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.textMuted }}>{t('match.cerrarModal')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  atajos: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  filtros: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 6 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  deck: { flex: 1, padding: 16 },
  card: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
  foto: { width: 220, height: 220, borderRadius: 14 },
  swipeButtons: { flexDirection: 'row', gap: 24, marginTop: 20 },
  swipeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  matchCard: { width: '85%', maxWidth: 360, borderRadius: 16, padding: 28, alignItems: 'center' },
});
