/**
 * Componentes de UI compartidos, construidos sobre los tokens de `src/theme`.
 *
 * Cada uno existe porque el mismo patrón estaba copiado a mano en decenas de
 * pantallas con medidas distintas — por eso dos listados que mostraban lo
 * mismo no se veían iguales. Todo lo nuevo debería componerse con estos en
 * vez de escribir un `StyleSheet` desde cero.
 */
export { AppCard } from './AppCard';
export { Badge } from './Badge';
export type { BadgeTono } from './Badge';
export { ChipRow, FilterChip, RadioChips } from './ChipRow';
export type { ChipOption, RadioKm } from './ChipRow';
export { EmptyState } from './EmptyState';
export { Fab } from './Fab';
export { ListCard } from './ListCard';
export { Screen } from './Screen';
export { SectionHeader } from './SectionHeader';
export { Skeleton, SkeletonCard, SkeletonList, SkeletonPost } from './Skeleton';
