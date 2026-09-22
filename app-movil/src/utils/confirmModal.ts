/**
 * Confirmación modal con la estética de la app, en vez de `Alert.alert`
 * (nativo, genérico, distinto look en Android/iOS/web).
 *
 * Mismo patrón "bus" que `avisoObjetivos.ts`: `ConfirmModalHost` (montado
 * una sola vez en la raíz) se suscribe, y `confirmar()` desde cualquier
 * lugar — incluso fuera de un componente, como el listener de navegación de
 * `usePausaAlSalir.ts` — dispara el modal y espera la respuesta.
 */
export type ConfirmOpciones = {
  titulo: string;
  mensaje?: string;
  textoConfirmar: string;
  textoCancelar: string;
  /** El botón de confirmar se pinta en rojo (ej. "Salir sin guardar"). */
  destructivo?: boolean;
};

type Oyente = (opciones: ConfirmOpciones, resolver: (v: boolean) => void) => void;

let oyente: Oyente | null = null;

export function registrarConfirmModal(o: Oyente): () => void {
  oyente = o;
  return () => {
    if (oyente === o) oyente = null;
  };
}

/** Resuelve `true` si se tocó el botón de confirmar, `false` si se canceló o se tocó afuera. */
export function confirmar(opciones: ConfirmOpciones): Promise<boolean> {
  return new Promise((resolve) => {
    if (!oyente) {
      // No debería pasar (el host vive en la raíz), pero mejor no colgar la
      // promesa: se resuelve como cancelado.
      resolve(false);
      return;
    }
    oyente(opciones, resolve);
  });
}
