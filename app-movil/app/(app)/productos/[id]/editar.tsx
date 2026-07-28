import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { productosApi } from '../../../../src/api/productosApi';
import { AppInput } from '../../../../src/components/AppInput';
import { EdicionBloqueada } from '../../../../src/components/EdicionBloqueada';
import { MultiImagePickerField } from '../../../../src/components/MultiImagePickerField';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { Especie, ProductoCategoriaItem } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

import { ESPECIES, especieI18nKey } from '../../../../src/constants/especies';

/**
 * Editar un producto o servicio propio.
 *
 * Mientras haya un pedido en curso el backend lo bloquea: cambiar nombre o
 * precio en el medio de una compra sería venderle a alguien otra cosa.
 */
export default function EditarProductoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productoId = Number(id);

  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<ProductoCategoriaItem[]>([]);

  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoIds, setFotoIds] = useState<(number | null)[]>([]);

  const [zonaDescripcion, setZonaDescripcion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productosApi.categorias().then((res) => {
      if (res.success && res.data) setCategorias(res.data.categorias);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      productosApi.obtener(productoId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const p = res.data.producto;
          setBloqueado(p.editable === false ? p.motivoNoEditable || t('edicion.noEditable') : null);
          setCategoriaId(p.categoriaId);
          setNombre(p.nombre);
          setDescripcion(p.descripcion ?? '');
          setPrecio(String(p.precio));
          setCantidad(String(p.cantidad));
          setEspecie(p.especie);
          setZonaDescripcion(p.zonaDescripcion);
          setCoords({ lat: p.zonaLat, lng: p.zonaLng });
          setFotos(p.fotos.map((f) => rhMediaUrl(f.path)));
          setFotoIds(p.fotos.map((f) => f.productoFotoId));
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [productoId, t])
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

  const precioNum = parseFloat(precio);
  const puedeGuardar =
    categoriaId !== null &&
    nombre.trim().length > 0 &&
    !Number.isNaN(precioNum) &&
    precioNum > 0 &&
    zonaDescripcion.trim().length > 0 &&
    coords !== null;

  const onGuardar = async () => {
    if (!puedeGuardar || !coords || categoriaId === null) return;
    setError(null);
    setSubmitting(true);
    const res = await productosApi.actualizar(productoId, {
      categoriaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      precio: precioNum,
      cantidad: cantidad ? parseInt(cantidad, 10) : 1,
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
      <AppInput value={nombre} onChangeText={setNombre} placeholder={t('productos.nombrePlaceholder')} />

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.descripcionLabel')}</Text>
      <AppInput
        style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('productos.descripcionPlaceholder')}
        multiline
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('productos.precioLabel')}</Text>
          <AppInput value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('productos.cantidadLabel')}</Text>
          <AppInput value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.especieLabel')}</Text>
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

      <MultiImagePickerField
        label={t('mascotas.fotos')}
        uris={fotos}
        onChange={onFotosChange}
        addLabel={t('mascotas.addFoto')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('productos.zonaLabel')}</Text>
      <AppInput value={zonaDescripcion} onChangeText={setZonaDescripcion} placeholder={t('productos.zonaPlaceholder')} />
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
  chips: { marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  segment: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  locationButton: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
