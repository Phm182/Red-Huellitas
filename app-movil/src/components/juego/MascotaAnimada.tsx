import React from 'react';
import { HueGotchiExperience } from '../../juego/huegotchi';
import { JuegoAnimo } from '../../types';
import { AccionMascota } from '../MascotaAvatar';
import { MascotaJuego } from '../../types';

type Props = {
  juego: MascotaJuego;
  especie?: string;
  animo?: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
};

/** Entry del escenario HueGotchi (Rive). */
export function MascotaAnimada({ juego, accion = null, tamano = 300 }: Props) {
  return <HueGotchiExperience juego={juego} accion={accion} tamano={tamano} />;
}
