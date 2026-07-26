import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { donacionesApi } from '../../../src/api/donacionesApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { CategoriaDonacion, Especie, TipoDonacion, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AppInput } from '../../../src/components/AppInput';

const TIPOS: TipoDonacion[] = ['necesito', 'ofrezco'];
const CATEGORIAS: CategoriaDonacion[] = ['alimento', 'insumo'];
const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];

export default function NuevaDonacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [tipo, setTipo] = useState<TipoDonacion>('ofrezco');
  const [categoria, setCategoria] = useState<CategoriaDonacion>('alimento');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [descripcion, setDescripcion] = useState('');
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
    descripcion.trim().length > 0 && zonaDescripcion.trim().length > 0 && coords !== null;

  const onPublicar = async () => {
    if (!puedePublicar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await donacionesApi.crear({
      tipo,
      categoria,
      descripcion: descripcion.trim(),
      especie,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      fotos,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/donaciones/[id]', params: { id: res.data.donacion.donacionId } });
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
      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.tipoLabel')}</Text>
      <View style={styles.segmented}>
        {TIPOS.map((tp) => (
          <Pressable
            key={tp}
            onPress={() => setTipo(tp)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: tipo === tp ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: tipo === tp ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`donaciones.tipo.${tp}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.categoriaLabel')}</Text>
      <View style={styles.segmented}>
        {CATEGORIAS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoria(c)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: categoria === c ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: categoria === c ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`donaciones.categoria.${c}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.especieLabel')}</Text>
      <View style={styles.segmented}>
        {ESPECIES.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEspecie(especie === e ? null : e)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.descripcionLabel')}</Text>
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('donaciones.descripcionPlaceholder')}
        multiline
      />

      <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('donaciones.zonaPlaceholder')}
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
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('donaciones.publicarButton')}</Text>
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
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
