import { Platform } from 'react-native';

const ID = 'rh-sin-barras-de-scroll';

/**
 * Oculta toda barra de scroll en web, sin perder el scroll.
 *
 * La regla también vive en `app/+html.tsx`, pero **ese archivo sólo se aplica
 * al export estático: el dev server sirve su propio HTML** y ahí nunca llegaba,
 * así que en desarrollo (y en cualquier host que no use el export) aparecía la
 * barra igual. Inyectarla desde el runtime cubre los dos casos.
 *
 * `scrollbar-width` cubre Firefox y Chrome moderno; `::-webkit-scrollbar` cubre
 * Safari y los Chrome viejos; `-ms-overflow-style`, Edge legacy.
 */
export function ocultarBarrasDeScroll(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(ID)) return;

  const style = document.createElement('style');
  style.id = ID;
  style.textContent = `
html, body, * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
  width: 0 !important; height: 0 !important; display: none !important;
}
`;
  document.head.appendChild(style);
}
