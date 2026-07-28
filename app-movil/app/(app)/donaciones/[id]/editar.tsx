import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { donacionesApi } from '../../../../src/api/donacionesApi';
import { AppInput } from '../../../../src/components/AppInput';
import { EdicionBloqueada } from '../../../../src/components/EdicionBloqueada';
import { MultiImagePickerField } from '../../../../src/components/MultiImagePickerField';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { CategoriaDonacion, Especie } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

const CATEGORIAS: CategoriaDonacion[] = ['alimento', 'insumo', 'ropa'];
import { ESPECIES, especieI18nKey } from '../../../../src/constants/especies';

/**
 * Editar una publicación propia de donación.
 *
 * El tipo (necesito/ofrezco) no aparece: darlo vuelta cambiaría el sentido de
 * una publicación que la gente ya vio, así que el endpoint no lo acepta.
 */
export default function EditarDonacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const donacionId = Number(id);

  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState<string | null>(null);

  const [categoria, setCategoria] = useState<CategoriaDonacion>('alimento');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoIds, setFotoIds] = useState<(number | null)[]>([]);

  const [zonaDescripcion, setZonaDescripcion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      donacionesApi.obtener(donacionId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const d = res.data.donacion;
          setBloqueado(d.editable === false ? d.motivoNoEditable || t('edicion.noEditable') : null);
          setCategoria(d.categoria);
          setEspecie(d.especie);
          setDescripcion(d.descripcion);
          setZonaDescripcion(d.zonaDescripcion);
          setCoords({ lat: d.zonaLat, lng: d.zonaLng });
          setFotos(d.fotos.map((f) => rhMediaUrl(f.path)));
          setFotoIds(d.fotos.map((f) => f.donacionFotoId));
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [donacionId, t])
  );

  const onFotosChange = (uris: string[]) => {
    setFotoIds(uris.map((uri) => {
      const idx = fotos.indexOf(uri);
      return idx >= 0 ? fotoIds[idx] ?? null : null;
    }));
    setFotos(uris);
  };

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

  const puedeGuardar = descripcion.trim().length > 0 && zonaDescripcion.trim().length > 0 && coords !== null;

  const onGuardar = async () => {
    if (!puedeGuardar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await donacionesApi.actualizar(donacionId, {
      categoria,
      descripcion: descripcion.trim(),
      especie,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      fotos,
      fotosExistentesIds: fotoIds,
    });
    setSubmitting(false);
    if (res.success) {
      router.back();
    } else {
      setError(res.message);
    }
  };

  if (loading) return <SkeletonList />;
  if (bloqueado) return <EdicionBloqueada motivo={bloqueado} />;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.categoriaLabel')}</Text>
      <View style={styles.segmented}>
        {CATEGORIAS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoria(c)}
            style={[
              styles.segment,
              { borderColor: colors.primary, backgroundColor: categoria === c ? colors.primary : 'transparent' },
            ]}
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
            style={[
              styles.segment,
              { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(especieI18nKey(e))}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.descripcionLabel')}</Text>
      <AppInput style={styles.textarea} value={descripcion} onChangeText={setDescripcion} multiline />

      <MultiImagePickerField
        label={t('mascotas.fotos')}
        uris={fotos}
        onChange={onFotosChange}
        addLabel={t('mascotas.addFoto')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('donaciones.zonaLabel')}</Text>
      <AppInput value={zonaDescripcion} onChangeText={setZonaDescripcion} placeholder={t('donaciones.zonaPlaceholder')} />
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
        style={[styles.button, { backgroundColor: puedeGuardar ? colors.primary : colors.border }]}
        onPress={onGuardar}
        disabled={!puedeGuardar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  segment: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
