import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { productosApi } from '../../../src/api/productosApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { Especie, ProductoCategoriaItem, TipoListado, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { AppInput } from '../../../src/components/AppInput';

const TIPOS: TipoListado[] = ['producto', 'servicio'];
import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';

export default function NuevoProductoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);
  const [categorias, setCategorias] = useState<ProductoCategoriaItem[]>([]);

  const [tipoListado, setTipoListado] = useState<TipoListado>('producto');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [especie, setEspecie] = useState<Especie | null>(null);
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
    productosApi.categorias().then((res) => {
      if (res.success && res.data) {
        setCategorias(res.data.categorias);
        if (res.data.categorias.length > 0) {
          setCategoriaId((prev) => prev ?? res.data!.categorias[0].categoriaId);
        }
      }
    });
  }, []);

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

  const precioNum = parseFloat(precio.replace(',', '.'));
  const puedePublicar =
    categoriaId !== null &&
    nombre.trim().length > 0 &&
    !isNaN(precioNum) &&
    precioNum > 0 &&
    zonaDescripcion.trim().length > 0 &&
    coords !== null;

  const onPublicar = async () => {
    if (!puedePublicar || !coords || categoriaId === null) return;
    setError(null);
    setSubmitting(true);
    const res = await productosApi.crear({
      tipoListado,
      categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      precio: precioNum,
      cantidad: parseInt(cantidad, 10) || 1,
      especie,
      zonaDescripcion: zonaDescripcion.trim(),
      zonaLat: coords.lat,
      zonaLng: coords.lng,
      fotos,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/productos/[id]', params: { id: res.data.producto.productoId } });
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
      <Text style={[styles.label, { color: colors.text }]}>{t('productos.tipoListadoLabel')}</Text>
      <View style={styles.segmented}>
        {TIPOS.map((tp) => (
          <Pressable
            key={tp}
            onPress={() => setTipoListado(tp)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: tipoListado === tp ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: tipoListado === tp ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(`productos.tipoListado.${tp}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.categoriaLabel')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {categorias.map((c) => {
          const activo = categoriaId === c.categoriaId;
          return (
            <Pressable
              key={c.categoriaId}
              onPress={() => setCategoriaId(c.categoriaId)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontSize: 13 }}>{c.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.nombreLabel')}</Text>
      <AppInput
        value={nombre}
        onChangeText={setNombre}
        placeholder={t('productos.nombrePlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.descripcionLabel')}</Text>
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('productos.descripcionPlaceholder')}
        multiline
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('productos.precioLabel')}</Text>
          <AppInput
            value={precio}
            onChangeText={setPrecio}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('productos.cantidadLabel')}</Text>
          <AppInput
            value={cantidad}
            onChangeText={setCantidad}
            placeholder="1"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.especieLabel')}</Text>
      <View style={styles.segmented}>
        {ESPECIES.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEspecie(especie === e ? null : e)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(especieI18nKey(e))}
            </Text>
          </Pressable>
        ))}
      </View>

      <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('productos.zonaPlaceholder')}
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
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('productos.publicarButton')}</Text>
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
  chips: { marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
