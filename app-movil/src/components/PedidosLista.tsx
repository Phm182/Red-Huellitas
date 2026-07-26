import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { ApiResponse, Pedido, PedidoEstado, PedidoListaResultado } from '../types';
import { centeredContent } from '../theme/layout';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { pedidoEstadoColor } from '../utils/pedidoEstadoColor';
import { ChipOption, ChipRow } from './ui/ChipRow';
import { EmptyState } from './ui/EmptyState';
import { ListCard } from './ui/ListCard';
import { SkeletonList } from './ui/Skeleton';

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
  const [refrescando, setRefrescando] = useState(false);

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

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await cargar({ estado });
    if (res.success && res.data) {
      setPedidos(res.data.pedidos);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  const onFiltrar = (nuevo: PedidoEstado | null) => {
    if (nuevo === estado) return;
    setEstado(nuevo);
    setNextCursor(null);
    cargarPrimeraPagina(nuevo);
  };

  const opciones: ChipOption<PedidoEstado | null>[] = [
    { valor: null, label: t('pedidos.filtroTodos') },
    ...ESTADOS.map((e) => ({ valor: e, label: t(`pedidos.estado.${e}`) })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.filtros}>
        <ChipRow opciones={opciones} seleccionado={estado} onSelect={onFiltrar} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent, pedidos.length === 0 && { flexGrow: 1 }]}
          data={pedidos}
          keyExtractor={(p) => String(p.pedidoId)}
          onEndReached={onCargarMas}
          onEndReachedThreshold={0.4}
          refreshing={refrescando}
          onRefresh={onRefrescar}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" titulo={t('pedidos.empty')} />
          }
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
          renderItem={({ item, index }) => {
            const estadoColor = pedidoEstadoColor(item.estado, colors);
            const contraparte = esVenta ? item.comprador : item.vendedor;
            const detalle = item.items.map((i) => `${i.cantidad}× ${i.nombreProducto}`).join(', ');
            const monto = esVenta
              ? `${t('pedidos.montoVendedor')}: $${item.montoVendedor.toLocaleString()}`
              : `${t('carrito.total')}: $${item.montoProductos.toLocaleString()}`;

            return (
              <ListCard
                index={index}
                titulo={contraparte.nombreCompleto}
                subtitulo={detalle}
                meta={item.numeroComprobante}
                iconoFallback="receipt-outline"
                onPress={() => router.push({ pathname: '/(app)/pedidos/[id]', params: { id: item.pedidoId } })}
                badge={
                  <Text style={[type.caption, { color: estadoColor }]}>
                    {t(`pedidos.estado.${item.estado}`)}
                  </Text>
                }
              >
                <Text style={[type.section, { color: colors.text, marginTop: 8 }]}>{monto}</Text>
              </ListCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { paddingVertical: 8 },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
});
