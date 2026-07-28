/**
 * Filtra ítems si todas las palabras del query aparecen en algún campo
 * (coincidencia parcial, sin importar mayúsculas).
 */
export function filtrarPorTexto<T>(
  items: T[],
  query: string,
  campos: (item: T) => Array<string | number | null | undefined>
): T[] {
  const palabras = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 0);

  if (palabras.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const haystack = campos(item)
      .filter((c) => c !== null && c !== undefined && String(c).trim() !== '')
      .join(' ')
      .toLowerCase();
    return palabras.every((p) => haystack.includes(p));
  });
}
