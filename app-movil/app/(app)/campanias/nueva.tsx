import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { TipoCampania, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AppInput } from '../../../src/components/AppInput';

const TIPOS: TipoCampania[] = ['castracion', 'vacunacion'];

export default function NuevaCampaniaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [tipo, setTipo] = useState<TipoCampania>('vacunacion');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [esRango, setEsRango] = useState(false);
  const [fechaHasta, setFechaHasta] = useState('');
  const [zonaDescripcion, setZonaDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requiereInscripcion, setRequiereInscripcion] = useState(false);
  const [cupoMaximo, setCupoMaximo] = useState('');
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

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) && (!esRango || /^\d{4}-\d{2}-\d{2}$/.test(fechaHasta));
  const puedePublicar =
    titulo.trim().length > 0 && fechaValida && zonaDescripcion.trim().length > 0 && coords !== null;

  const onPublicar = async () => {
    if (!puedePublicar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await campaniaApi.crear({
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      fechaDesde,
      fechaHasta: esRango ? fechaHasta : null,
      zonaDescripcion: zonaDescripcion.trim(),
      direccion: direccion.trim() || undefined,
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      requiereInscripcion,
      cupoMaximo: requiereInscripcion && cupoMaximo ? parseInt(cupoMaximo, 10) : null,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/campanias/[id]', params: { id: res.data.campania.campaniaId } });
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
      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.tipoLabel')}</Text>
      <View style={styles.segmented}>
        {TIPOS.map((tp) => (
          <Pressable
            key={tp}
            onPress={() => setTipo(tp)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: tipo === tp ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: tipo === tp ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`campanias.tipo.${tp}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.tituloLabel')}</Text>
      <AppInput
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.descripcionLabel')}</Text>
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.fechaDesdeLabel')}</Text>
      <AppInput
        value={fechaDesde}
        onChangeText={setFechaDesde}
        placeholder="YYYY-MM-DD"
      />

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('campanias.esRangoLabel')}</Text>
        <Switch value={esRango} onValueChange={setEsRango} />
      </View>
      {esRango ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>{t('campanias.fechaHastaLabel')}</Text>
          <AppInput
            value={fechaHasta}
            onChangeText={setFechaHasta}
            placeholder="YYYY-MM-DD"
          />
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('campanias.zonaPlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.direccionLabel')}</Text>
      <AppInput
        value={direccion}
        onChangeText={setDireccion}
        placeholder={t('campanias.direccionPlaceholder')}
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

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('campanias.requiereInscripcionLabel')}</Text>
        <Switch value={requiereInscripcion} onValueChange={setRequiereInscripcion} />
      </View>
      {requiereInscripcion ? (
        <>
          <Text style={[styles.label, { color: colors.text }]}>{t('campanias.cupoMaximoLabel')}</Text>
          <AppInput
            value={cupoMaximo}
            onChangeText={setCupoMaximo}
            keyboardType="number-pad"
            placeholder={t('campanias.cupoMaximoPlaceholder')}
          />
        </>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedePublicar ? colors.primary : colors.border }]}
        onPress={onPublicar}
        disabled={!puedePublicar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('campanias.publicarButton')}</Text>
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
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
