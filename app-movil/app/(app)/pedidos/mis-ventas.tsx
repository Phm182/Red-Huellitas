import React, { useCallback } from 'react';
import { pedidosApi } from '../../../src/api/pedidosApi';
import { PedidosLista } from '../../../src/components/PedidosLista';
import { PedidoEstado } from '../../../src/types';

export default function MisVentasScreen() {
  const cargar = useCallback(
    (params: { estado?: PedidoEstado | null; cursor?: number | null }) => pedidosApi.misVentas(params),
    []
  );

  return <PedidosLista cargar={cargar} esVenta />;
}
