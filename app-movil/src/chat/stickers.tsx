import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Stickers propios de Red Huellitas.
 *
 * Son SVG dibujados acá y no imágenes ni un pack externo: pesan bytes en vez
 * de kilobytes, se ven nítidos en cualquier pantalla, se tiñen con el tema, y
 * sobre todo no dependen de un proveedor de contenido que haya que moderar
 * — algo que importa el doble teniendo cuentas de menores en la app.
 *
 * El id es lo que viaja en `Mensaje.Texto`; nunca cambiarlo sin migrar los
 * mensajes viejos, que quedarían sin dibujo.
 */
export type StickerId =
  | 'huella'
  | 'perro_feliz'
  | 'gato_curioso'
  | 'hueso'
  | 'corazon_huella'
  | 'pelota'
  | 'adopta'
  | 'dormido';

export type StickerDef = {
  id: StickerId;
  /** Clave i18n para el lector de pantalla. */
  labelKey: string;
  render: (size: number) => React.ReactNode;
};

const P = {
  marron: '#B5773F',
  marronOsc: '#7C4A22',
  crema: '#F2E4CE',
  rosa: '#E8899A',
  rojo: '#E8574C',
  gris: '#8A8C8E',
  grisOsc: '#4E5052',
  hueso: '#F2E8D5',
  verde: '#5B9A4C',
  noche: '#3A4A6B',
};

/** Huella: 4 dedos + almohadilla. Es la marca de la app. */
function Huella(size: number, color = P.marron) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={28} cy={32} rx={12} ry={15} fill={color} />
      <Ellipse cx={50} cy={24} rx={12} ry={16} fill={color} />
      <Ellipse cx={72} cy={32} rx={12} ry={15} fill={color} />
      <Ellipse cx={84} cy={54} rx={10} ry={13} fill={color} />
      <Path
        d="M50 46 C66 46, 78 58, 78 70 C78 82, 66 88, 50 88 C34 88, 22 82, 22 70 C22 58, 34 46, 50 46 Z"
        fill={color}
      />
    </Svg>
  );
}

function cara(ojoY: number, sonrisa: boolean) {
  return (
    <G>
      <Circle cx={38} cy={ojoY} r={4.5} fill="#1C1A19" />
      <Circle cx={62} cy={ojoY} r={4.5} fill="#1C1A19" />
      <Circle cx={39.5} cy={ojoY - 1.5} r={1.6} fill="#FFF" />
      <Circle cx={63.5} cy={ojoY - 1.5} r={1.6} fill="#FFF" />
      {sonrisa ? (
        <Path d="M40 68 Q50 78, 60 68" stroke="#1C1A19" strokeWidth={3} fill="none" strokeLinecap="round" />
      ) : (
        <Path d="M44 70 Q50 74, 56 70" stroke="#1C1A19" strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
    </G>
  );
}

export const STICKERS: StickerDef[] = [
  {
    id: 'huella',
    labelKey: 'chat.stickers.huella',
    render: (s) => Huella(s),
  },
  {
    id: 'perro_feliz',
    labelKey: 'chat.stickers.perroFeliz',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {/* orejas caídas */}
        <Ellipse cx={20} cy={48} rx={11} ry={20} fill={P.marronOsc} />
        <Ellipse cx={80} cy={48} rx={11} ry={20} fill={P.marronOsc} />
        <Circle cx={50} cy={50} r={34} fill={P.marron} />
        <Ellipse cx={50} cy={64} rx={17} ry={13} fill={P.crema} />
        <Ellipse cx={50} cy={58} rx={7} ry={5} fill="#2B2B2B" />
        {cara(42, true)}
        {/* lengua */}
        <Ellipse cx={50} cy={76} rx={6} ry={8} fill={P.rosa} />
      </Svg>
    ),
  },
  {
    id: 'gato_curioso',
    labelKey: 'chat.stickers.gatoCurioso',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {/* orejas triangulares */}
        <Path d="M22 34 L26 8 L46 26 Z" fill={P.gris} />
        <Path d="M78 34 L74 8 L54 26 Z" fill={P.gris} />
        <Circle cx={50} cy={52} r={33} fill={P.gris} />
        <Ellipse cx={50} cy={64} rx={14} ry={10} fill="#D9DBDC" />
        <Path d="M50 58 l-4 5 l8 0 Z" fill={P.rosa} />
        {/* pupilas verticales de gato */}
        <G>
          <Ellipse cx={38} cy={46} rx={5} ry={6} fill="#B8A44E" />
          <Ellipse cx={62} cy={46} rx={5} ry={6} fill="#B8A44E" />
          <Ellipse cx={38} cy={46} rx={1.6} ry={5.5} fill="#141110" />
          <Ellipse cx={62} cy={46} rx={1.6} ry={5.5} fill="#141110" />
        </G>
        {/* bigotes */}
        <Path d="M64 62 L86 58 M64 66 L86 66 M36 62 L14 58 M36 66 L14 66" stroke="#FFF" strokeWidth={1.6} opacity={0.75} />
      </Svg>
    ),
  },
  {
    id: 'hueso',
    labelKey: 'chat.stickers.hueso',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <G transform="rotate(-20 50 50)">
          <Rect x={22} y={42} width={56} height={16} rx={8} fill={P.hueso} />
          <Circle cx={24} cy={40} r={11} fill={P.hueso} />
          <Circle cx={24} cy={60} r={11} fill={P.hueso} />
          <Circle cx={76} cy={40} r={11} fill={P.hueso} />
          <Circle cx={76} cy={60} r={11} fill={P.hueso} />
        </G>
      </Svg>
    ),
  },
  {
    id: 'corazon_huella',
    labelKey: 'chat.stickers.corazonHuella',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Path
          d="M50 86 C18 64, 8 46, 8 34 C8 20, 19 12, 30 12 C39 12, 46 18, 50 26 C54 18, 61 12, 70 12 C81 12, 92 20, 92 34 C92 46, 82 64, 50 86 Z"
          fill={P.rojo}
        />
        <G transform="translate(50 46) scale(0.34) translate(-50 -50)">
          <Ellipse cx={28} cy={32} rx={12} ry={15} fill="#FFF" />
          <Ellipse cx={50} cy={24} rx={12} ry={16} fill="#FFF" />
          <Ellipse cx={72} cy={32} rx={12} ry={15} fill="#FFF" />
          <Ellipse cx={84} cy={54} rx={10} ry={13} fill="#FFF" />
          <Path d="M50 46 C66 46, 78 58, 78 70 C78 82, 66 88, 50 88 C34 88, 22 82, 22 70 C22 58, 34 46, 50 46 Z" fill="#FFF" />
        </G>
      </Svg>
    ),
  },
  {
    id: 'pelota',
    labelKey: 'chat.stickers.pelota',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={34} fill={P.rojo} />
        <Path d="M16 50 Q50 30, 84 50" stroke="#FFF" strokeWidth={5} fill="none" />
        <Path d="M16 50 Q50 70, 84 50" stroke="#FFF" strokeWidth={5} fill="none" />
        <Circle cx={38} cy={38} r={7} fill="#FFF" opacity={0.35} />
      </Svg>
    ),
  },
  {
    id: 'adopta',
    labelKey: 'chat.stickers.adopta',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {/* casita */}
        <Path d="M50 12 L92 46 L82 46 L82 88 L18 88 L18 46 L8 46 Z" fill={P.verde} />
        <Rect x={38} y={58} width={24} height={30} rx={3} fill={P.crema} />
        <G transform="translate(50 40) scale(0.26) translate(-50 -50)">
          <Ellipse cx={28} cy={32} rx={12} ry={15} fill="#FFF" />
          <Ellipse cx={50} cy={24} rx={12} ry={16} fill="#FFF" />
          <Ellipse cx={72} cy={32} rx={12} ry={15} fill="#FFF" />
          <Ellipse cx={84} cy={54} rx={10} ry={13} fill="#FFF" />
          <Path d="M50 46 C66 46, 78 58, 78 70 C78 82, 66 88, 50 88 C34 88, 22 82, 22 70 C22 58, 34 46, 50 46 Z" fill="#FFF" />
        </G>
      </Svg>
    ),
  },
  {
    id: 'dormido',
    labelKey: 'chat.stickers.dormido',
    render: (s) => (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Ellipse cx={50} cy={68} rx={36} ry={22} fill={P.marron} />
        <Circle cx={30} cy={56} r={18} fill={P.marron} />
        <Ellipse cx={16} cy={52} rx={7} ry={12} fill={P.marronOsc} />
        {/* ojos cerrados */}
        <Path d="M22 54 Q26 58, 30 54 M34 54 Q38 58, 42 54" stroke="#1C1A19" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Ellipse cx={26} cy={62} rx={4} ry={3} fill="#2B2B2B" />
        {/* zzz */}
        <Path d="M60 34 L74 34 L60 48 L74 48" stroke={P.noche} strokeWidth={3.5} fill="none" strokeLinejoin="round" />
        <Path d="M78 16 L88 16 L78 26 L88 26" stroke={P.noche} strokeWidth={3} fill="none" strokeLinejoin="round" />
      </Svg>
    ),
  },
];

export function stickerPorId(id: string): StickerDef | null {
  return STICKERS.find((s) => s.id === id) ?? null;
}

/** Dibuja un sticker por id; si el id no existe (mensaje viejo), no rompe. */
export function StickerImagen({ id, size }: { id: string; size: number }) {
  const def = stickerPorId(id);
  if (!def) return null;
  return <>{def.render(size)}</>;
}
