import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';
import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { carritoApi } from '../../../src/api/carritoApi';
import { productosApi } from '../../../src/api/productosApi';
import { BotonEditarPublicacion } from '../../../src/components/BotonEditarPublicacion';
import { CarruselFotos } from '../../../src/components/CarruselFotos';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Producto } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function ProductoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoritoBusy, setFavoritoBusy] = useState(false);
  const [cantidadCarrito, setCantidadCarrito] = useState(1);
  const [agregandoCarrito, setAgregandoCarrito] = useState(false);
  const [agregadoCarrito, setAgregadoCarrito] = useState(false);
  const [errorCarrito, setErrorCarrito] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      productosApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setProducto(res.data.producto);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onToggleFavorito = async () => {
    if (!producto || favoritoBusy) return;
    setFavoritoBusy(true);
    const res = producto.esFavorito
      ? await productosApi.favoritoQuitar(producto.productoId)
      : await productosApi.favoritoAgregar(producto.productoId);
    setFavoritoBusy(false);
    if (res.success) {
      setProducto({ ...producto, esFavorito: !producto.esFavorito });
    }
  };

  const onAgregarAlCarrito = async () => {
    if (!producto || agregandoCarrito) return;
    setErrorCarrito(null);
    setAgregandoCarrito(true);
    const res = await carritoApi.agregar(producto.productoId, cantidadCarrito);
    setAgregandoCarrito(false);
    if (res.success) {
      setAgregadoCarrito(true);
    } else {
      setErrorCarrito(res.message);
    }
  };

  const onEliminar = () => {
    if (!producto) return;
    Alert.alert(t('productos.deleteConfirmTitle'), t('productos.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await productosApi.eliminar(producto.productoId);
          if (res.success) {
            router.replace('/(app)/productos');
          }
        },
      },
    ]);
  };

  if (loading || !producto) {
    return <SkeletonList />;
  }

  const especieLabel = producto.especie
    ? t(especieI18nKey(producto.especie))
    : null;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {producto.fotos.length > 0 ? (
        <View style={{ marginBottom: 14 }}>
          <CarruselFotos paths={producto.fotos.map((f) => f.path)} />
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
          {t(`productos.tipoListado.${producto.tipoListado}`).toUpperCase()}
          {producto.categoria ? ` · ${producto.categoria.nombre}` : ''}
        </Text>
        <Pressable onPress={onToggleFavorito} disabled={favoritoBusy}>
          <Text style={{ fontSize: 22 }}>{producto.esFavorito ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20, marginBottom: 4 }}>{producto.nombre}</Text>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 22, marginBottom: 8 }}>
        ${producto.precio.toLocaleString()}
      </Text>
      {especieLabel ? <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{especieLabel}</Text> : null}
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{producto.zonaDescripcion}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{producto.autor.username}</Text>

      {producto.descripcion ? (
        <Text style={{ color: colors.text, marginBottom: 16 }}>{producto.descripcion}</Text>
      ) : null}

      {/* Los servicios no van al carrito (no hay stock que reservar), pero sí
          tienen que poder contactarse: antes se quedaban sin ninguna acción. */}
      {!producto.esDueno && producto.tipoListado === 'servicio' ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary, marginBottom: 12 }]}
          onPress={() => router.push(`/(app)/usuario/${producto.autor.username}` as never)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
            {t('productos.consultarServicio')}
          </Text>
        </Pressable>
      ) : null}

      {!producto.esDueno && producto.tipoListado === 'producto' ? (
        producto.cantidad > 0 ? (
          agregadoCarrito ? (
            <Pressable
              style={[styles.whatsappButton, { borderWidth: 1, borderColor: colors.primary, marginBottom: 12 }]}
              onPress={() => router.push('/(app)/carrito')}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('productos.verCarrito')}</Text>
            </Pressable>
          ) : (
            <View style={{ marginBottom: 12 }}>
              <View style={styles.stepperRow}>
                <Pressable
                  style={[styles.stepperButton, { borderColor: colors.border }]}
                  onPress={() => setCantidadCarrito((c) => Math.max(1, c - 1))}
                >
                  <Text style={{ color: colors.text }}>-</Text>
                </Pressable>
                <Text style={{ color: colors.text, marginHorizontal: 12 }}>{cantidadCarrito}</Text>
                <Pressable
                  style={[styles.stepperButton, { borderColor: colors.border }]}
                  onPress={() => setCantidadCarrito((c) => Math.min(producto.cantidad, c + 1))}
                >
                  <Text style={{ color: colors.text }}>+</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
                onPress={onAgregarAlCarrito}
                disabled={agregandoCarrito}
              >
                {agregandoCarrito ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('productos.agregarAlCarrito')}</Text>
                )}
              </Pressable>
              {errorCarrito ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{errorCarrito}</Text> : null}
            </View>
          )
        ) : (
          <Text style={{ color: colors.danger, marginBottom: 12 }}>{t('productos.sinStock')}</Text>
        )
      ) : null}

      {producto.whatsappNumero ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${producto.whatsappNumero!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {producto.esDueno ? (
        <>
          <BotonEditarPublicacion
            ruta="/(app)/productos/[id]/editar"
            id={producto.productoId}
            editable={producto.editable}
            motivoNoEditable={producto.motivoNoEditable}
          />
          <Pressable onPress={onEliminar} style={styles.eliminarLink}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('productos.eliminarButton')}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={producto.autor.userId} productoId={producto.productoId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Sin flexGrow: estiraba el contenedor y dejaba un hueco enorme entre las
  // fotos y la descripción cuando la publicación tiene poco texto.
  container: { padding: 20, paddingBottom: 32 },
  foto: { width: 260, height: 220, borderRadius: 12, marginRight: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  whatsappButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepperButton: { width: 32, height: 32, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  eliminarLink: { marginTop: 4, alignItems: 'center' },
  denunciaRow: { marginTop: 16, alignItems: 'center' },
});
