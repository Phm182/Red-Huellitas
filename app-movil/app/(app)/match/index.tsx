import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { matchApi } from '../../../src/api/matchApi';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { RazaPicker } from '../../../src/components/RazaPicker';
import { ChipOption } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FilterSelect } from '../../../src/components/ui/FilterSelect';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { Especie, Mascota, MatchCandidato, Sexo, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';

import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';
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
        <View style={styles.filtros}>
          <FilterSelect
            label={t('common.mascota')}
            opciones={disponibles.map((m) => ({
              valor: m.mascotaId,
              label: m.nombre,
              icon: 'paw-outline' as const,
            }))}
            seleccionado={mascotaOrigenId ?? disponibles[0].mascotaId}
            onSelect={setMascotaOrigenId}
          />
        </View>
      ) : null}

      <View style={styles.filtros}>
        <FilterSelect
          label={t('common.especie')}
          opciones={
            [
              { valor: null, label: t('match.cualquiera'), icon: 'apps-outline' },
              ...ESPECIES.map((e) => ({
                valor: e,
                label: t(especieI18nKey(e)),
                icon: 'paw-outline' as const,
              })),
            ] as ChipOption<Especie | null>[]
          }
          seleccionado={especieFiltro}
          onSelect={onEspecieChange}
        />
        <FilterSelect
          label={t('common.sexo')}
          opciones={
            [
              { valor: null, label: t('match.cualquiera') },
              ...SEXOS.map((s) => ({
                valor: s,
                label: t(`match.sexo.${s}`),
              })),
            ] as ChipOption<Sexo | null>[]
          }
          seleccionado={sexoFiltro}
          onSelect={setSexoFiltro}
        />
        <FilterSelect
          label={t('common.edad')}
          opciones={EDAD_BUCKETS.map((b) => ({
            valor: b.key,
            label: t(`match.edadBucket.${b.key}`),
          }))}
          seleccionado={edadBucketKey}
          onSelect={setEdadBucketKey}
        />
        <FilterSelect
          label={t('common.distancia')}
          opciones={
            [
              ...RADIOS.map((r) => ({
                valor: r,
                label: `${r} km`,
                icon: 'location-outline' as const,
              })),
              { valor: null, label: t('match.sinLimite'), icon: 'globe-outline' as const },
            ] as ChipOption<20 | 50 | 100 | null>[]
          }
          seleccionado={radioKm}
          onSelect={setRadioKm}
        />
      </View>

      {especieFiltro ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
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
                t(especieI18nKey(candidatoActual.especie))}
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
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
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
