/**
 * Voz HueGotchi — sin importar expo-av en el módulo crítico (evita crashes web).
 * Usa síntesis Web Audio + háptica. MP3 opcionales más adelante con lazy load.
 */

import { Platform } from 'react-native';
import { JuegoAnimo } from '../../../types';
import { hapticLeve, hapticMedio } from '../../../utils/haptics';
import { EspecieHue } from '../types';
import { pickVoiceClip, SYNTH_PROFILES, VoiceClipId } from './catalog';

export async function playPetVoice(opts: {
  especie: EspecieHue;
  animo: JuegoAnimo;
  motivo?: 'tap' | 'accion' | 'poke';
}): Promise<VoiceClipId> {
  const clip = pickVoiceClip(opts.animo);
  if (opts.motivo === 'accion') hapticMedio();
  else hapticLeve();

  playSynthClip(clip, opts.especie);
  return clip;
}

function playSynthClip(clip: VoiceClipId, especie: EspecieHue) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const profile = SYNTH_PROFILES[clip];
  const ctx = new AC();
  const now = ctx.currentTime;
  const dur = profile.ms / 1000;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = especie === 'perro' ? 'square' : 'sawtooth';
  const base = especie === 'perro' ? profile.f0 * 0.55 : profile.f0;
  const peak = especie === 'perro' ? profile.f1 * 0.55 : profile.f1;

  osc.frequency.setValueAtTime(base, now);
  osc.frequency.linearRampToValueAtTime(peak, now + dur * 0.35);
  osc.frequency.linearRampToValueAtTime(base * 0.9, now + dur);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 6 + profile.vibrato * 0.2;
  lfoGain.gain.value = profile.vibrato;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  filter.type = 'bandpass';
  filter.frequency.value = peak;
  filter.Q.value = 4;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + dur + 0.05);
  lfo.stop(now + dur + 0.05);
  osc.onended = () => {
    void ctx.close();
  };
}
