/**
 * Ancho máximo de contenido en pantallas anchas (web/desktop), para que la
 * app no se estire de borde a borde y mantenga proporciones de "app móvil"
 * centrada, en vez de inputs/botones gigantes en ventanas anchas.
 */
export const MAX_CONTENT_WIDTH = 480;

export const centeredContent = {
  width: '100%' as const,
  maxWidth: MAX_CONTENT_WIDTH,
  alignSelf: 'center' as const,
};
