import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { pedidosApi } from '../../../src/api/pedidosApi';
import { Pedido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { pedidoEstadoColor } from '../../../src/utils/pedidoEstadoColor';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function PedidoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'comprobante' | 'email' | 'entregado' | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    pedidosApi.obtener(Number(id)).then((res) => {
      if (res.success && res.data) {
        setPedido(res.data.pedido);
      } else {
        setMensaje({ texto: res.message, error: true });
      }
      setLoading(false);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const onVerComprobante = async () => {
    if (!pedido) return;
    setMensaje(null);
    setBusy('comprobante');
    const res = await pedidosApi.comprobanteLink(pedido.pedidoId);
    setBusy(null);
    if (res.success && res.data) {
      Linking.openURL(res.data.url);
    } else {
      setMensaje({ texto: res.message, error: true });
    }
  };

  const onReenviarEmail = async () => {
    if (!pedido) return;
    setMensaje(null);
    setBusy('email');
    const res = await pedidosApi.reenviarComprobante(pedido.pedidoId);
    setBusy(null);
    setMensaje({ texto: res.message, error: !res.success });
    if (res.success) cargar();
  };

  const onMarcarEntregado = async () => {
    if (!pedido) return;
    setBusy('entregado');
    const res = await pedidosApi.marcarEntregado(pedido.pedidoId);
    setBusy(null);
    if (res.success) {
      cargar();
    } else {
      setMensaje({ texto: res.message, error: true });
    }
  };

  if (loading) {
    return <SkeletonList />;
  }

  if (!pedido) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          {mensaje?.texto ?? t('pedidos.empty')}
        </Text>
      </View>
    );
  }

  const estadoColor = pedidoEstadoColor(pedido.estado, colors);
  const contraparte = pedido.esVendedor ? pedido.comprador : pedido.vendedor;
  const totalUnidades = pedido.items.reduce((acc, i) => acc + i.cantidad, 0);
  const puedeMarcarEntregado = pedido.esVendedor && (pedido.estado === 'coordinando' || pedido.estado === 'pagado');

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{pedido.numeroComprobante}</Text>
          <Text style={{ color: estadoColor, fontWeight: '700', fontSize: 12 }}>
            {t(`pedidos.estado.${pedido.estado}`)}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{pedido.createdAt}</Text>

        <Text style={[styles.seccion, { color: colors.textMuted }]}>
          {pedido.esVendedor ? t('pedidos.compradorLabel') : t('pedidos.vendedorLabel')}
        </Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{contraparte.nombreCompleto}</Text>
        {contraparte.username ? (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{contraparte.username}</Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.seccion, { color: colors.textMuted, marginTop: 0 }]}>{t('pedidos.detalleItems')}</Text>
        {pedido.items.map((item) => (
          <View key={item.pedidoItemId} style={styles.itemRow}>
            <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
              {item.nombreProducto}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>
              {item.cantidad} x ${item.precioUnitario.toLocaleString()}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 10, minWidth: 70, textAlign: 'right' }}>
              ${(item.precioUnitario * item.cantidad).toLocaleString()}
            </Text>
          </View>
        ))}

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.textMuted }}>{t('pedidos.totalArticulos')}</Text>
          <Text style={{ color: colors.text }}>{totalUnidades}</Text>
        </View>

        {pedido.esVendedor ? (
          <>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.textMuted }}>{t('pedidos.montoProductos')}</Text>
              <Text style={{ color: colors.text }}>${pedido.montoProductos.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {t('pedidos.comision', { porcentaje: pedido.porcentajeComision })}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                − ${pedido.montoComision.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.granTotal, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('pedidos.montoVendedor')}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                ${pedido.montoVendedor.toLocaleString()}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.totalRow, styles.granTotal, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('carrito.total')}</Text>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
              ${pedido.montoProductos.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {pedido.metodoPago === 'coordinar' && pedido.vendedorWhatsapp && !pedido.esVendedor ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(`https://wa.me/${pedido.vendedorWhatsapp!.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('pedidos.coordinarWhatsapp')}</Text>
        </Pressable>
      ) : null}

      {pedido.metodoPago === 'mercadopago' && pedido.initPoint ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => Linking.openURL(pedido.initPoint!)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('pedidos.pagarConMp')}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.button, { borderWidth: 1, borderColor: colors.primary }]}
        onPress={onVerComprobante}
        disabled={busy !== null}
      >
        {busy === 'comprobante' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('pedidos.verComprobante')}</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.button, { borderWidth: 1, borderColor: colors.border }]}
        onPress={onReenviarEmail}
        disabled={busy !== null}
      >
        {busy === 'email' ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('pedidos.reenviarEmail')}</Text>
        )}
      </Pressable>

      {pedido.comprobanteEnviadoEn ? (
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 6 }}>
          {t('pedidos.comprobanteEnviadoEn', { fecha: pedido.comprobanteEnviadoEn })}
        </Text>
      ) : null}

      {puedeMarcarEntregado ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={onMarcarEntregado}
          disabled={busy !== null}
        >
          {busy === 'entregado' ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('pedidos.marcarEntregadoButton')}</Text>
          )}
        </Pressable>
      ) : null}

      {mensaje ? (
        <Text
          style={{
            color: mensaje.error ? colors.danger : colors.success,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          {mensaje.texto}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seccion: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 },
  granTotal: { borderTopWidth: 1, marginTop: 8 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
});
