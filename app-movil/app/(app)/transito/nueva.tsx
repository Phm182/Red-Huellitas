import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { transitoApi } from '../../../src/api/transitoApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { RazaPicker } from '../../../src/components/RazaPicker';
import { Especie, Mascota, Sexo, TipoTransito, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AppInput } from '../../../src/components/AppInput';

const TIPOS: TipoTransito[] = ['necesito', 'ofrezco'];
import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';

export default function NuevoTransitoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const tipoInicial: TipoTransito =
    params.tipo === 'necesito' || params.tipo === 'ofrezco' ? params.tipo : 'necesito';

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [tipo, setTipo] = useState<TipoTransito>(tipoInicial);
  const [misMascotas, setMisMascotas] = useState<Mascota[]>([]);
  const [vincularMascota, setVincularMascota] = useState(true);
  const [mascotaId, setMascotaId] = useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [duracionDias, setDuracionDias] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  const [zonaDescripcion, setZonaDescripcion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return () => {
        activo = false;
      };
    }, [])
  );

  useEffect(() => {
    mascotasApi.misMascotas().then((res) => {
      if (res.success && res.data) {
        setMisMascotas(res.data.mascotas);
        if (res.data.mascotas.length === 0) {
          setVincularMascota(false);
        }
      }
    });
  }, []);

  const cambiarEspecie = (nueva: Especie | null) => {
    setEspecie(nueva);
    setRazaId(null);
    setRazaTexto(null);
  };

  const usaMascotaVinculada = tipo === 'necesito' && vincularMascota;

  const obtenerUbicacion = async () => {
    setLocationError(null);
    setLocating(true);
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      setLocationError(t('onboarding.locationPermissionDenied'));
      setLocating(false);
      return;
    }
    const posicion = await Location.getCurrentPositionAsync({});
    setCoords({ lat: posicion.coords.latitude, lng: posicion.coords.longitude });
    setLocating(false);
  };

  let datosValidos: boolean;
  if (usaMascotaVinculada) {
    datosValidos = mascotaId !== null;
  } else if (tipo === 'necesito') {
    datosValidos = nombre.trim().length > 0 && especie !== null;
  } else {
    datosValidos = true; // 'ofrezco' manual: no hay un animal específico, todo opcional
  }

  const puedePublicar =
    datosValidos && zonaDescripcion.trim().length > 0 && coords !== null;

  const onPublicar = async () => {
    if (!puedePublicar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await transitoApi.crear({
      tipo,
      ...(usaMascotaVinculada
        ? { mascotaId }
        : {
            nombre: tipo === 'necesito' ? nombre.trim() : undefined,
            sexo: tipo === 'necesito' ? sexo : undefined,
            especie: especie ?? undefined,
            razaId,
            razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
            descripcion: descripcion.trim() || undefined,
            fotos,
          }),
      descripcion: usaMascotaVinculada ? descripcion.trim() || undefined : undefined,
      duracionDias: duracionDias ? parseInt(duracionDias, 10) : null,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/transito/[id]', params: { id: res.data.transito.transitoId } });
    } else {
      setError(res.message);
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

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('transito.tipoLabel')}</Text>
      <View style={styles.segmented}>
        {TIPOS.map((tp) => (
          <Pressable
            key={tp}
            onPress={() => setTipo(tp)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: tipo === tp ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: tipo === tp ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`transito.tipo.${tp}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tipo === 'necesito' && misMascotas.length > 0 ? (
        <View style={[styles.switchRow, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('transito.vincularMascotaLabel')}</Text>
          <Switch value={vincularMascota} onValueChange={setVincularMascota} />
        </View>
      ) : null}

      {usaMascotaVinculada ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('transito.elegirMascotaLabel')}</Text>
          {misMascotas.map((m) => (
            <Pressable
              key={m.mascotaId}
              onPress={() => setMascotaId(m.mascotaId)}
              style={[
                styles.mascotaRow,
                { borderColor: colors.primary, backgroundColor: mascotaId === m.mascotaId ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: mascotaId === m.mascotaId ? colors.primaryText : colors.text, fontWeight: '600' }}>
                {m.nombre}
              </Text>
              <Text style={{ color: mascotaId === m.mascotaId ? colors.primaryText : colors.textMuted, fontSize: 12 }}>
                {m.raza ?? m.especie}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          {tipo === 'necesito' ? (
            <>
              <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.nombre')}</Text>
              <AppInput
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.sexo')}</Text>
              <View style={styles.segmented}>
                {(['macho', 'hembra'] as Sexo[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSexo(s)}
                    style={[styles.segment, { borderColor: colors.primary, backgroundColor: sexo === s ? colors.primary : 'transparent' }]}
                  >
                    <Text style={{ color: sexo === s ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                      {t(s === 'macho' ? 'mascotas.sexoMacho' : 'mascotas.sexoHembra')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.label, { color: colors.text }]}>
            {tipo === 'necesito' ? t('mascotas.especie') : t('transito.especieAceptaLabel')}
          </Text>
          <View style={styles.segmented}>
            {ESPECIES.map((e) => (
              <Pressable
                key={e}
                onPress={() => cambiarEspecie(especie === e ? (null as unknown as Especie) : e)}
                style={[styles.segment, { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' }]}
              >
                <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                  {t(especieI18nKey(e))}
                </Text>
              </Pressable>
            ))}
          </View>

          {especie !== null ? (
            <RazaPicker
              especie={especie}
              razaId={razaId}
              razaTexto={razaTexto}
              onChange={(id, texto) => {
                setRazaId(id);
                setRazaTexto(texto);
              }}
            />
          ) : null}

          <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />
        </>
      )}

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.descripcionLabel')}</Text>
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.duracionDiasLabel')}</Text>
      <AppInput
        value={duracionDias}
        onChangeText={setDuracionDias}
        keyboardType="number-pad"
        placeholder={t('transito.duracionDiasPlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('transito.zonaPlaceholder')}
      />
      <Pressable
        style={[styles.locationButton, { borderColor: colors.primary }]}
        onPress={obtenerUbicacion}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {coords ? t('onboarding.locationObtained') : t('onboarding.getLocation')}
          </Text>
        )}
      </Pressable>
      {locationError ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{locationError}</Text> : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedePublicar ? colors.primary : colors.border }]}
        onPress={onPublicar}
        disabled={!puedePublicar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('transito.publicarButton')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  container: { flexGrow: 1, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  segment: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 12,
  },
  mascotaRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
