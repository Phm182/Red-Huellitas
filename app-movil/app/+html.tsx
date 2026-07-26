import type { PropsWithChildren } from 'react';

/**
 * HTML raíz del export web. No usamos ScrollViewStyleReset de Expo porque
 * fuerza `body { overflow: hidden }`, y en Chrome/Safari mobile eso congela
 * el teclado virtual: al enfocar un TextInput no se puede tipear.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Red Huellitas</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body { height: 100%; margin: 0; }
#root { display: flex; flex: 1; min-height: 100%; height: 100%; }
/* overflow:auto (no hidden): permite scroll/teclado en mobile web */
body { overflow: auto; overscroll-behavior-y: none; }
/* App-like: scroll sin barra visible (webkit + Firefox) */
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none; }
/* iOS no hace zoom al enfocar si el input tiene >= 16px */
input, textarea, select { font-size: 16px; }
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
