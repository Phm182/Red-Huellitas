/**
 * Los emoticones clásicos del MSN.
 *
 * Se convierten al vuelo mientras escribís, como hacía el Messenger: escribís
 * `(L)` y ves un corazón. Es la parte del pedido que trae la nostalgia sin
 * complicar el chat — no hay picker ni sprites, sólo texto que se transforma.
 *
 * El orden importa: los más largos primero, para que `:-)` no lo agarre `:-`.
 */
const MAPA: [string, string][] = [
  [':-)', '🙂'],
  [':-(', '🙁'],
  [':-D', '😄'],
  [':-P', '😛'],
  [':-O', '😮'],
  [';-)', '😉'],
  [':)', '🙂'],
  [':(', '🙁'],
  [':D', '😄'],
  [':P', '😛'],
  [':O', '😮'],
  [';)', '😉'],
  [":'(", '😢'],
  ['(L)', '❤️'],
  ['(U)', '💔'],
  ['(Y)', '👍'],
  ['(N)', '👎'],
  ['(H)', '😎'],
  ['(A)', '😇'],
  ['(6)', '😈'],
  ['(K)', '😘'],
  ['(F)', '🌹'],
  ['(C)', '☕'],
  ['(@)', '🐱'],
  ['(&)', '🐶'],
  ['(*)', '⭐'],
  ['(8)', '🎵'],
  ['(P)', '📷'],
  ['(T)', '📞'],
];

/** Reemplaza los códigos por su emoji. Idempotente: los emoji no se re-matchean. */
export function convertirEmoticones(texto: string): string {
  let salida = texto;
  for (const [codigo, emoji] of MAPA) {
    salida = salida.split(codigo).join(emoji);
    // (L) y (l) valían igual en el MSN.
    const minuscula = codigo.toLowerCase();
    if (minuscula !== codigo) {
      salida = salida.split(minuscula).join(emoji);
    }
  }
  return salida;
}
