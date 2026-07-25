import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiResponse, Pedido, PedidoEstado, PedidoListaResultado } from '../types';
import { centeredContent } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { pedidoEstadoColor } from '../utils/pedidoEstadoColor';

const ESTADOS: PedidoEstado[] = ['pendiente', 'pagado', 'coordinando', 'entregado', 'cancelado'];

interface Props {
  /** mis_compras o mis_ventas — lo único que cambia entre las dos pantallas. */
  cargar: (params: { estado?: PedidoEstado | null; cursor?: number | null }) => Promise<ApiResponse<PedidoListaResultado>>;
  /** true en Mis Ventas: muestra al comprador y el desglose de comisión. */
  esVenta: boolean;
}

export function PedidosLista({ cargar, esVenta }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estado, setEstado] = useState<PedidoEstado | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  const cargarPrimeraPagina = useCallback(
    (filtro: PedidoEstado | null) => {
      setLoading(true);
      cargar({ estado: filtro }).then((res) => {
        if (res.success && res.data) {
          setPedidos(res.data.pedidos);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
    },
    [cargar]
  );

  useFocusEffect(
    useCallback(() => {
      cargarPrimeraPagina(estado);
    }, [cargarPrimeraPagina, estado])
  );

  const onCargarMas = async () => {
    if (nextCursor === null || cargandoMas || loading) return;
    setCargandoMas(true);
    const res = await cargar({ estado, cursor: nextCursor });
    setCargandoMas(false);
    if (res.success && res.data) {
      setPedidos((prev) => [...prev, ...res.data!.pedidos]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const onFiltrar = (nuevo: PedidoEstado | null) => {
    if (nuevo === estado) return;
    setEstado(nuevo);
    setNextCursor(null);
    cargarPrimeraPagina(nuevo);
  };

  const chip = (valor: PedidoEstado | null, label: string) => {
    const activo = estado === valor;
    return (
      <Pressable
        key={valor ?? 'todos'}
        onPress={() => onFiltrar(valor)}
        style={[
          styles.chip,
          { borderColor: activo ? colors.primary : colors.border, backgroundColor: activo ? colors.primary : 'transparent' },
        ]}
      >
        <Text style={{ color: activo ? colors.primaryText : colors.textMuted, fontSize: 12 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={{ flexGrow: 0 }}
      >
        {chip(null, t('pedidos.filtroTodos'))}
        {ESTADOS.map((e) => chip(e, t(`pedidos.estado.${e}`)))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={pedidos}
          keyExtractor={(p) => String(p.pedidoId)}
          onEndReached={onCargarMas}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('pedidos.empty')}</Text>}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item }) => {
            const estadoColor = pedidoEstadoColor(item.estado, colors);
            const contraparte = esVenta ? item.comprador : item.vendedor;
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/(app)/pedidos/[id]', params: { id: item.pedidoId } })}
              >
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{contraparte.nombreCompleto}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.numeroComprobante}</Text>
                </View>

                {item.items.map((i) => (
                  <Text key={i.pedidoItemId} style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {i.cantidad}x {i.nombreProducto}
                  </Text>
                ))}

                <View style={[styles.rowBetween, { marginTop: 6 }]}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {esVenta
                      ? `${t('pedidos.montoVendedor')}: $${item.montoVendedor.toLocaleString()}`
                      : `${t('carrito.total')}: $${item.montoProductos.toLocaleString()}`}
                  </Text>
                  <Text style={{ color: estadoColor, fontWeight: '600', fontSize: 12 }}>
                    {t(`pedidos.estado.${item.estado}`)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8 },
  list: { padding: 16, paddingTop: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
