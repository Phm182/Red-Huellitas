import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { veterinariasApi } from '../../../src/api/veterinariasApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AppInput } from '../../../src/components/AppInput';

export default function NuevaVeterinariaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsappNumero, setWhatsappNumero] = useState('');
  const [horario, setHorario] = useState('');
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

  const puedePublicar =
    nombre.trim().length > 0 &&
    (telefono.trim().length > 0 || whatsappNumero.trim().length > 0) &&
    zonaDescripcion.trim().length > 0 &&
    coords !== null;

  const onPublicar = async () => {
    if (!puedePublicar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await veterinariasApi.crear({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      whatsappNumero: whatsappNumero.trim() || undefined,
      horario: horario.trim() || undefined,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      fotos,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/veterinarias/[id]', params: { id: res.data.veterinaria.veterinariaId } });
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
      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.nombreLabel')}</Text>
      <AppInput
        value={nombre}
        onChangeText={setNombre}
        placeholder={t('veterinarias.nombrePlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.descripcionLabel')}</Text>
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('veterinarias.descripcionPlaceholder')}
        multiline
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.telefonoLabel')}</Text>
      <AppInput
        value={telefono}
        onChangeText={setTelefono}
        placeholder={t('veterinarias.telefonoPlaceholder')}
        keyboardType="phone-pad"
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.whatsappLabel')}</Text>
      <AppInput
        value={whatsappNumero}
        onChangeText={setWhatsappNumero}
        placeholder={t('veterinarias.whatsappPlaceholder')}
        keyboardType="phone-pad"
      />
      {telefono.trim().length === 0 && whatsappNumero.trim().length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: -8, marginBottom: 12 }}>
          {t('veterinarias.contactoAyuda')}
        </Text>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.horarioLabel')}</Text>
      <AppInput
        value={horario}
        onChangeText={setHorario}
        placeholder={t('veterinarias.horarioPlaceholder')}
      />

      <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />

      <Text style={[styles.label, { color: colors.text }]}>{t('veterinarias.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('veterinarias.zonaPlaceholder')}
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
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('veterinarias.publicarButton')}</Text>
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
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
