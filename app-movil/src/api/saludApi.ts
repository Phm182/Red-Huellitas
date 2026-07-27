import { apiGet } from './client';
import { CuidadoRecomendacion, EspecieCuidado, RefugioResumen } from '../types';

export const cuidadosApi = {
  /** Sin `especie`, el backend arranca por la de las mascotas del usuario. */
  listar: (especie?: EspecieCuidado) =>
    apiGet<{ especie: EspecieCuidado; cuidados: CuidadoRecomendacion[] }>(
      'ajax/cuidados/listar.php',
      especie ? { especie } : undefined,
      true
    ),
};

export const refugiosApi = {
  listar: (cursor?: number | null) =>
    apiGet<{ refugios: RefugioResumen[]; nextCursor: number | null }>(
      'ajax/refugios/listar.php',
      cursor ? { cursor } : undefined,
      true
    ),
};
