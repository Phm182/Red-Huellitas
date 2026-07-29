import React from 'react';
import { HueGotchiCharacter } from '../../juego/huegotchi';
import { PetAppearance } from '../../juego/huegotchi';
import { JuegoAnimo } from '../../types';
import { AccionMascota } from '../MascotaAvatar';

type Props = {
  especie: string;
  animo: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
  appearance?: Partial<PetAppearance>;
};

/** Wrapper HueGotchi (antes GIF plano). */
export function MascotaAnimada(props: Props) {
  return <HueGotchiCharacter {...props} tamano={props.tamano ?? 280} />;
}
