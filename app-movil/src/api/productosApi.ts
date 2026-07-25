import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { Especie, Producto, ProductoCategoriaItem, TipoListado } from '../types';

interface ProductoListaResultado {
  listados: Producto[];
  nextCursor: number | null;
}

export interface CrearProductoParams {
  tipoListado: TipoListado;
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad?: number;
  especie?: Especie | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  fotos?: string[];
}

async function construirFormProducto(params: CrearProductoParams): Promise<FormData> {
  const form = new FormData();
  form.append('tipoListado', params.tipoListado);
  form.append('categoriaId', String(params.categoriaId));
  form.append('nombre', params.nombre);
  form.append('precio', String(params.precio));
  form.append('zonaDescripcion', params.zonaDescripcion);
  form.append('zonaLat', String(params.zonaLat));
  form.append('zonaLng', String(params.zonaLng));
  if (params.descripcion) {
    form.append('descripcion', params.descripcion);
  }
  if (params.cantidad) {
    form.append('cantidad', String(params.cantidad));
  }
  if (params.especie) {
    form.append('especie', params.especie);
  }

  const fotos = params.fotos ?? [];
  for (let i = 0; i < fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const productosApi = {
  categorias: () => apiGet<{ categorias: ProductoCategoriaItem[] }>('ajax/productos/categorias.php', undefined, true),

  crear: async (params: CrearProductoParams) => {
    const form = await construirFormProducto(params);
    return apiPost<{ producto: Producto }>('ajax/productos/crear.php', form, true);
  },

  listar: (
    tipoListado?: TipoListado,
    categoriaId?: number,
    especie?: Especie,
    radioKm?: 20 | 50 | 100 | null,
    cursor?: number | null,
    limit = 15
  ) =>
    apiGet<ProductoListaResultado>(
      'ajax/productos/listar.php',
      {
        ...(tipoListado ? { tipoListado } : {}),
        ...(categoriaId ? { categoriaId } : {}),
        ...(especie ? { especie } : {}),
        ...(radioKm ? { radioKm } : {}),
        ...(!radioKm && cursor ? { cursor } : {}),
        limit,
      },
      true
    ),

  obtener: (productoId: number) => apiGet<{ producto: Producto }>('ajax/productos/obtener.php', { productoId }, true),

  eliminar: (productoId: number) => apiPost<null>('ajax/productos/eliminar.php', { productoId }, true),

  favoritoAgregar: (productoId: number) => apiPost<null>('ajax/productos/favorito_agregar.php', { productoId }, true),

  favoritoQuitar: (productoId: number) => apiPost<null>('ajax/productos/favorito_quitar.php', { productoId }, true),

  misFavoritos: () => apiGet<{ favoritos: Producto[] }>('ajax/productos/mis_favoritos.php', undefined, true),
};
