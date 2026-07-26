import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { carritoApi } from '../../../src/api/carritoApi';
import { CarritoPublico, Pedido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function CarritoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [carrito, setCarrito] = useState<CarritoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [comprando, setComprando] = useState(false);
  const [pedidosCreados, setPedidosCreados] = useState<Pedido[] | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    carritoApi.ver().then((res) => {
      if (res.success && res.data) {
        setCarrito(res.data);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPedidosCreados(null);
      cargar();
    }, [cargar])
  );

  const onActualizarCantidad = async (carritoItemId: number, cantidad: number) => {
    if (cantidad < 1 || busyItemId !== null) return;
    setBusyItemId(carritoItemId);
    const res = await carritoApi.actualizarCantidad(carritoItemId, cantidad);
    setBusyItemId(null);
    if (res.success && res.data) {
      setCarrito(res.data);
    } else {
      Alert.alert('', res.message);
    }
  };

  const onQuitar = async (carritoItemId: number) => {
    if (busyItemId !== null) return;
    setBusyItemId(carritoItemId);
    const res = await carritoApi.quitar(carritoItemId);
    setBusyItemId(null);
    if (res.success && res.data) {
      setCarrito(res.data);
    }
  };

  const onVaciar = () => {
    Alert.alert(t('carrito.vaciarConfirmTitle'), t('carrito.vaciarConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('carrito.vaciarButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await carritoApi.vaciar();
          if (res.success) {
            cargar();
          }
        },
      },
    ]);
  };

  const onComprar = async () => {
    setComprando(true);
    const res = await carritoApi.checkout();
    setComprando(false);
    if (res.success && res.data) {
      setPedidosCreados(res.data.pedidos);
      setCarrito({ grupos: [], total: 0 });
    } else {
      Alert.alert('', res.message);
    }
  };

  if (loading) {
    return <SkeletonList />;
  }

  if (pedidosCreados) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 18, marginBottom: 8 }}>
            {t('carrito.checkoutSuccessTitle')}
          </Text>
          <Text style={{ color: colors.textMuted }}>{t('carrito.checkoutSuccessBody')}</Text>
        </View>
        {pedidosCreados.map((pedido) => (
          <View key={pedido.pedidoId} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>
              {t('pedidos.vendedorLabel')}: {pedido.vendedor.nombreCompleto}
            </Text>
            <Text style={{ color: colors.textMuted, marginBottom: 8 }}>
              {t('carrito.total')}: ${pedido.montoProductos.toLocaleString()}
            </Text>
            {pedido.metodoPago === 'mercadopago' && pedido.initPoint ? (
              <Pressable
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL(pedido.initPoint!)}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('pedidos.pagarConMp')}</Text>
              </Pressable>
            ) : pedido.vendedorWhatsapp ? (
              <Pressable
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL(`https://wa.me/${pedido.vendedorWhatsapp!.replace(/\D/g, '')}`)}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('pedidos.coordinarWhatsapp')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          style={[styles.button, { borderWidth: 1, borderColor: colors.primary, marginTop: 8 }]}
          onPress={() => router.replace('/(app)/pedidos/mis-compras')}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('carrito.verMisCompras')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!carrito || carrito.grupos.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{t('carrito.empty')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      {carrito.grupos.map((grupo) => (
        <View
          key={grupo.vendedorUserId}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {grupo.items.map((item) => (
            <View key={item.carritoItemId} style={styles.itemRow}>
              {item.producto.fotos[0] ? (
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: rhMediaUrl(item.producto.fotos[0].path) }} style={styles.thumb} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.producto.nombre}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  ${item.producto.precio.toLocaleString()} x {item.cantidad} = ${item.subtotal.toLocaleString()}
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={[styles.stepperButton, { borderColor: colors.border }]}
                    onPress={() => onActualizarCantidad(item.carritoItemId, item.cantidad - 1)}
                    disabled={busyItemId === item.carritoItemId}
                  >
                    <Text style={{ color: colors.text }}>-</Text>
                  </Pressable>
                  <Text style={{ color: colors.text, marginHorizontal: 10 }}>{item.cantidad}</Text>
                  <Pressable
                    style={[styles.stepperButton, { borderColor: colors.border }]}
                    onPress={() => onActualizarCantidad(item.carritoItemId, item.cantidad + 1)}
                    disabled={busyItemId === item.carritoItemId}
                  >
                    <Text style={{ color: colors.text }}>+</Text>
                  </Pressable>
                  <Pressable onPress={() => onQuitar(item.carritoItemId)} disabled={busyItemId === item.carritoItemId}>
                    <Text style={{ color: colors.danger, marginLeft: 16, fontSize: 12 }}>{t('carrito.quitarButton')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'right', marginTop: 8 }}>
            {t('carrito.subtotal')}: ${grupo.subtotal.toLocaleString()}
          </Text>
        </View>
      ))}

      <Text style={[styles.totalText, { color: colors.text }]}>
        {t('carrito.total')}: ${carrito.total.toLocaleString()}
      </Text>

      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onComprar} disabled={comprando}>
        {comprando ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('carrito.comprarButton')}</Text>
        )}
      </Pressable>

      <Pressable style={styles.vaciarLink} onPress={onVaciar}>
        <Text style={{ color: colors.danger, fontSize: 12 }}>{t('carrito.vaciarButton')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  itemRow: { flexDirection: 'row', marginBottom: 12 },
  thumbWrap: { marginRight: 10 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  stepperButton: { width: 28, height: 28, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  totalText: { fontWeight: '700', fontSize: 18, textAlign: 'right', marginBottom: 16 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
  vaciarLink: { marginTop: 12, alignItems: 'center' },
});
