import React, { useCallback } from 'react';
import { pedidosApi } from '../../../src/api/pedidosApi';
import { PedidosLista } from '../../../src/components/PedidosLista';
import { PedidoEstado } from '../../../src/types';

export default function MisComprasScreen() {
  const cargar = useCallback(
    (params: { estado?: PedidoEstado | null; cursor?: number | null }) => pedidosApi.misCompras(params),
    []
  );

  return <PedidosLista cargar={cargar} esVenta={false} />;
}
