import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { transitoApi } from '../../../../src/api/transitoApi';
import { AppInput } from '../../../../src/components/AppInput';
import { EdicionBloqueada } from '../../../../src/components/EdicionBloqueada';
import { MultiImagePickerField } from '../../../../src/components/MultiImagePickerField';
import { RazaPicker } from '../../../../src/components/RazaPicker';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { Especie, Sexo, TipoTransito } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

import { ESPECIES, especieI18nKey } from '../../../../src/constants/especies';

/**
 * Editar una publicación propia de tránsito.
 *
 * El tipo (necesito/ofrezco) y la mascota vinculada no se muestran porque el
 * endpoint no los deja cambiar: convertirían la publicación en otra distinta.
 */
export default function EditarTransitoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transitoId = Number(id);

  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoTransito>('necesito');
  const [vinculada, setVinculada] = useState(false);

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [duracionDias, setDuracionDias] = useState('');
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
      transitoApi.obtener(transitoId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const tr = res.data.transito;
          setBloqueado(tr.editable === false ? tr.motivoNoEditable || t('edicion.noEditable') : null);
          setTipo(tr.tipo);
          setVinculada(tr.mascotaId !== null);
          setNombre(tr.nombre ?? '');
          setSexo((tr.sexo as Sexo) ?? 'macho');
          setEspecie(tr.especie ?? null);
          setRazaId(tr.razaId);
          setRazaTexto(tr.razaTexto);
          setDescripcion(tr.descripcion ?? '');
          setDuracionDias(tr.duracionDias != null ? String(tr.duracionDias) : '');
          setZonaDescripcion(tr.zonaDescripcion);
          setCoords({ lat: tr.zonaLat, lng: tr.zonaLng });
          setFotos(tr.fotos.map((f) => rhMediaUrl(f.path)));
          setFotoIds(tr.fotos.map((f) => f.transitoFotoId));
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [transitoId, t])
  );

  const onFotosChange = (uris: string[]) => {
    // Conservar el id de las que ya estaban; las nuevas quedan en null.
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

  const datosValidos = vinculada || tipo === 'ofrezco' || (nombre.trim().length > 0 && especie !== null);
  const puedeGuardar = datosValidos && zonaDescripcion.trim().length > 0 && coords !== null;

  const onGuardar = async () => {
    if (!puedeGuardar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await transitoApi.actualizar(transitoId, {
      ...(vinculada
        ? {}
        : {
            nombre: tipo === 'necesito' ? nombre.trim() : undefined,
            sexo: tipo === 'necesito' ? sexo : undefined,
            especie: especie ?? undefined,
            razaId,
            razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
            fotos,
            fotosExistentesIds: fotoIds,
          }),
      descripcion: descripcion.trim() || undefined,
      duracionDias: duracionDias ? parseInt(duracionDias, 10) : null,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
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
      {!vinculada ? (
        <>
          {tipo === 'necesito' ? (
            <>
              <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.nombre')}</Text>
              <AppInput value={nombre} onChangeText={setNombre} />

              <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.sexo')}</Text>
              <View style={styles.segmented}>
                {(['macho', 'hembra'] as Sexo[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSexo(s)}
                    style={[
                      styles.segment,
                      { borderColor: colors.primary, backgroundColor: sexo === s ? colors.primary : 'transparent' },
                    ]}
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
                onPress={() => {
                  setEspecie(especie === e ? null : e);
                  setRazaId(null);
                  setRazaTexto(null);
                }}
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

          {especie !== null ? (
            <RazaPicker
              especie={especie}
              razaId={razaId}
              razaTexto={razaTexto}
              onChange={(rid, texto) => {
                setRazaId(rid);
                setRazaTexto(texto);
              }}
            />
          ) : null}

          <MultiImagePickerField
            label={t('mascotas.fotos')}
            uris={fotos}
            onChange={onFotosChange}
            addLabel={t('mascotas.addFoto')}
          />
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.descripcionLabel')}</Text>
      <AppInput style={styles.textarea} value={descripcion} onChangeText={setDescripcion} multiline />

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.duracionDiasLabel')}</Text>
      <AppInput
        value={duracionDias}
        onChangeText={setDuracionDias}
        keyboardType="number-pad"
        placeholder={t('transito.duracionDiasPlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('transito.zonaLabel')}</Text>
      <AppInput value={zonaDescripcion} onChangeText={setZonaDescripcion} placeholder={t('transito.zonaPlaceholder')} />
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
