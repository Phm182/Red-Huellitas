import { ThemeColors } from '../theme/colors';
import { PedidoEstado } from '../types';

export function pedidoEstadoColor(estado: PedidoEstado, colors: ThemeColors): string {
  switch (estado) {
    case 'pagado':
    case 'entregado':
      return colors.success;
    case 'cancelado':
      return colors.danger;
    case 'coordinando':
    case 'pendiente':
    default:
      return colors.primary;
  }
}
