import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { perdidosApi } from '../../../../src/api/perdidosApi';
import { AppInput } from '../../../../src/components/AppInput';
import { EdicionBloqueada } from '../../../../src/components/EdicionBloqueada';
import { MultiImagePickerField } from '../../../../src/components/MultiImagePickerField';
import { RazaPicker } from '../../../../src/components/RazaPicker';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { Especie, Sexo } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

import { ESPECIES, especieI18nKey } from '../../../../src/constants/especies';

/**
 * Editar un reporte propio de perdido/encontrado.
 *
 * Si ya está marcado como reencontrado el backend devuelve el motivo y acá se
 * muestra el cartel en vez del formulario: un caso cerrado no se reescribe.
 */
export default function EditarPerdidoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const perdidoId = Number(id);

  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const [vinculado, setVinculado] = useState(false);

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [fechaSuceso, setFechaSuceso] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoIds, setFotoIds] = useState<(number | null)[]>([]);

  const [lugarDescripcion, setLugarDescripcion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      perdidosApi.obtener(perdidoId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const p = res.data.perdido;
          setBloqueado(p.editable === false ? p.motivoNoEditable || t('edicion.noEditable') : null);
          setVinculado(p.mascotaId !== null);
          setNombre(p.nombre ?? '');
          setSexo((p.sexo as Sexo) ?? 'macho');
          setEspecie((p.especie as Especie) ?? 'perro');
          setRazaId(p.razaId);
          setRazaTexto(p.razaTexto);
          setDescripcion(p.descripcion ?? '');
          setFechaSuceso(p.fechaSuceso);
          setLugarDescripcion(p.ultimoLugarDescripcion);
          setCoords({ lat: p.ultimoLugarLat, lng: p.ultimoLugarLng });
          setFotos(p.fotos.map((f) => rhMediaUrl(f.path)));
          setFotoIds(p.fotos.map((f) => f.perdidoFotoId));
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [perdidoId, t])
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

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaSuceso);
  const datosValidos = vinculado || (nombre.trim().length > 0 && (razaId !== null || !!razaTexto?.trim()));
  const puedeGuardar = datosValidos && fechaValida && lugarDescripcion.trim().length > 0 && coords !== null;

  const onGuardar = async () => {
    if (!puedeGuardar || !coords) return;
    setError(null);
    setSubmitting(true);
    const res = await perdidosApi.actualizar(perdidoId, {
      ...(vinculado
        ? {}
        : {
            nombre: nombre.trim(),
            sexo,
            especie,
            razaId,
            razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
            descripcion: descripcion.trim() || undefined,
            fotos,
            fotosExistentesIds: fotoIds,
          }),
      ultimoLugarDescripcion: lugarDescripcion.trim(),
      ultimoLugarLat: coords.lat,
      ultimoLugarLng: coords.lng,
      fechaSuceso,
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
      {!vinculado ? (
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

          <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.especie')}</Text>
          <View style={styles.segmented}>
            {ESPECIES.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  setEspecie(e);
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

          <RazaPicker
            especie={especie}
            razaId={razaId}
            razaTexto={razaTexto}
            onChange={(rid, texto) => {
              setRazaId(rid);
              setRazaTexto(texto);
            }}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.descripcion')}</Text>
          <AppInput style={styles.textarea} value={descripcion} onChangeText={setDescripcion} multiline />

          <MultiImagePickerField
            label={t('mascotas.fotos')}
            uris={fotos}
            onChange={onFotosChange}
            addLabel={t('mascotas.addFoto')}
          />
        </>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>{t('perdidos.fechaSucesoLabel')}</Text>
      <AppInput value={fechaSuceso} onChangeText={setFechaSuceso} placeholder="2026-07-21" />

      <Text style={[styles.label, { color: colors.text }]}>{t('perdidos.ultimoLugarLabel')}</Text>
      <AppInput
        value={lugarDescripcion}
        onChangeText={setLugarDescripcion}
        placeholder={t('perdidos.ultimoLugarPlaceholder')}
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
