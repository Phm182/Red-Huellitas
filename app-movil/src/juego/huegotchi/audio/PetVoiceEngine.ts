import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import { Platform } from 'react-native';
import { HueSpecies, MoodBucket } from '../domain/types';

type ClipId = `v${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;

const CLIPS: ClipId[] = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];

/** Pool por ánimo (10 variaciones totales, solapadas). */
const BY_MOOD: Record<MoodBucket, ClipId[]> = {
  feliz: ['v1', 'v2', 'v3', 'v4'],
  neutro: ['v4', 'v5', 'v6', 'v7'],
  enojado: ['v7', 'v8', 'v9', 'v10'],
};

/**
 * El sintetizador sonaba a pitido de consola vieja, no a un animal, así que
 * queda apagado: preferible el silencio a un ladrido falso. El código sigue
 * abajo para poder comparar, pero no se usa hasta que haya grabaciones reales
 * registradas en VOICE_ASSETS.
 */
const PERMITIR_SINTETIZADOR = false;

/**
 * Registrar los archivos reales acá:
 * VOICE_ASSETS.gato.feliz.v1 = require('../../../../assets/juego/audio/gato_feliz_1.m4a')
 */
const A = {
  gatoMaullido1: require('../../../../assets/juego/audio/gato_maullido_1.mp3') as number,
  gatoMaullido2: require('../../../../assets/juego/audio/gato_maullido_2.mp3') as number,
  gatoMaullido3: require('../../../../assets/juego/audio/gato_maullido_3.mp3') as number,
  gatoMaullido4: require('../../../../assets/juego/audio/gato_maullido_4.mp3') as number,
  gatoMaullido5: require('../../../../assets/juego/audio/gato_maullido_5.mp3') as number,
  gatoMaullido6: require('../../../../assets/juego/audio/gato_maullido_6.mp3') as number,
  gatoMaullido7: require('../../../../assets/juego/audio/gato_maullido_7.mp3') as number,
  gatoChico1: require('../../../../assets/juego/audio/gato_maullido_chico_1.mp3') as number,
  gatoChico2: require('../../../../assets/juego/audio/gato_maullido_chico_2.mp3') as number,
  gatoGrunido1: require('../../../../assets/juego/audio/gato_grunido_1.mp3') as number,
  gatoGrunido2: require('../../../../assets/juego/audio/gato_grunido_2.mp3') as number,
  gatoGrunido3: require('../../../../assets/juego/audio/gato_grunido_3.mp3') as number,
  perroLadrido1: require('../../../../assets/juego/audio/perro_ladrido_1.mp3') as number,
  perroLadrido2: require('../../../../assets/juego/audio/perro_ladrido_2.mp3') as number,
  perroLadrido3: require('../../../../assets/juego/audio/perro_ladrido_3.mp3') as number,
  perroLadrido4: require('../../../../assets/juego/audio/perro_ladrido_4.mp3') as number,
  perroLadrido5: require('../../../../assets/juego/audio/perro_ladrido_5.mp3') as number,
  perroJadeo1: require('../../../../assets/juego/audio/perro_jadeo_1.mp3') as number,
};

/**
 * Grabaciones reales (CC0, BigSoundBank). La tortuga y "otro" no tienen voz
 * propia grabada: quedan mudos a propósito, que es mejor que ponerle ladridos
 * a una tortuga.
 */
const VOICE_ASSETS: Partial<
  Record<HueSpecies, Partial<Record<MoodBucket, Partial<Record<ClipId, number>>>>>
> = {
  gato: {
    feliz: { v1: A.gatoMaullido1, v2: A.gatoMaullido2, v3: A.gatoChico1, v4: A.gatoMaullido3 },
    neutro: { v4: A.gatoMaullido4, v5: A.gatoMaullido5, v6: A.gatoChico2, v7: A.gatoMaullido6 },
    enojado: { v7: A.gatoGrunido1, v8: A.gatoGrunido2, v9: A.gatoGrunido3, v10: A.gatoMaullido7 },
  },
  perro: {
    feliz: { v1: A.perroLadrido1, v2: A.perroLadrido4, v3: A.perroLadrido2, v4: A.perroLadrido5 },
    neutro: { v4: A.perroJadeo1, v5: A.perroLadrido1, v6: A.perroLadrido4, v7: A.perroLadrido3 },
    enojado: { v7: A.perroLadrido3, v8: A.perroLadrido5, v9: A.perroLadrido2, v10: A.perroLadrido3 },
  },
  tortuga: {},
  otro: {},
};

const SYNTH: Record<ClipId, { f0: number; f1: number; ms: number }> = {
  v1: { f0: 640, f1: 900, ms: 260 },
  v2: { f0: 560, f1: 780, ms: 300 },
  v3: { f0: 720, f1: 980, ms: 240 },
  v4: { f0: 500, f1: 660, ms: 340 },
  v5: { f0: 480, f1: 620, ms: 320 },
  v6: { f0: 440, f1: 560, ms: 360 },
  v7: { f0: 400, f1: 480, ms: 380 },
  v8: { f0: 360, f1: 420, ms: 400 },
  v9: { f0: 320, f1: 380, ms: 420 },
  v10: { f0: 280, f1: 340, ms: 460 },
};

let audioReady = false;

async function ensureMode() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    audioReady = true;
  } catch {
    /* web / unsupported */
  }
}

function pickClip(mood: MoodBucket): ClipId {
  const pool = BY_MOOD[mood];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function randomPitch(): number {
  return 0.9 + Math.random() * 0.2;
}

/**
 * Motor de voz: 10 variaciones × ánimo + pitch 0.9–1.1.
 */
export class PetVoiceEngine {
  async play(opts: { species: HueSpecies; mood: MoodBucket }): Promise<ClipId> {
    const clip = pickClip(opts.mood);
    const pitch = randomPitch();
    const asset = VOICE_ASSETS[opts.species]?.[opts.mood]?.[clip];

    if (asset != null) {
      try {
        await ensureMode();
        const { sound } = await Audio.Sound.createAsync(asset, {
          shouldPlay: true,
          volume: 0.95,
          rate: pitch,
          shouldCorrectPitch: true,
        });
        sound.setOnPlaybackStatusUpdate((st) => {
          const s = st as AVPlaybackStatusSuccess;
          if (s.isLoaded && s.didJustFinish) void sound.unloadAsync();
        });
        return clip;
      } catch {
        /* synth fallback */
      }
    }

    this.playSynth(clip, opts.species, pitch);
    return clip;
  }

  private playSynth(clip: ClipId, species: HueSpecies, pitch: number) {
    if (!PERMITIR_SINTETIZADOR) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.playSynthWeb(clip, species, pitch);
    } else {
      void this.playSynthNative(clip, species, pitch);
    }
  }

  private async playSynthNative(clip: ClipId, species: HueSpecies, pitch: number) {
    try {
      await ensureMode();
      const sampleRate = 8000;
      const samples = synthSamples(clip, species, pitch, sampleRate);
      const wav = encodeWav(samples, sampleRate);
      const uri = `data:audio/wav;base64,${toBase64(wav)}`;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.95 });
      sound.setOnPlaybackStatusUpdate((st) => {
        const s = st as AVPlaybackStatusSuccess;
        if (s.isLoaded && s.didJustFinish) void sound.unloadAsync();
      });
    } catch {
      /* dispositivo sin soporte para data URI de audio: se pierde el sonido, no la app */
    }
  }

  private playSynthWeb(clip: ClipId, species: HueSpecies, pitch: number) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const p = SYNTH[clip];
    const ctx = new AC();
    const now = ctx.currentTime;
    const dur = (p.ms / 1000) / pitch;
    const mul = species === 'perro' ? 0.55 : species === 'tortuga' ? 0.35 : 1;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = species === 'perro' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(p.f0 * mul * pitch, now);
    osc.frequency.linearRampToValueAtTime(p.f1 * mul * pitch, now + dur * 0.35);
    osc.frequency.linearRampToValueAtTime(p.f0 * mul * pitch * 0.9, now + dur);
    filter.type = 'bandpass';
    filter.frequency.value = p.f1 * mul * pitch;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    osc.onended = () => void ctx.close();
  }
}

export const petVoice = new PetVoiceEngine();

/**
 * Síntesis PCM del "grito" (bark/meow) para reproducir vía data URI en
 * nativo, donde no existe Web Audio API. Mismo barrido de frecuencia que la
 * versión web, con timbre por especie (pulso/aserrado/seno) + textura de
 * ruido leve para especies sin voz definida.
 */
function synthSamples(clip: ClipId, species: HueSpecies, pitch: number, sampleRate: number): Int16Array {
  const p = SYNTH[clip];
  const dur = (p.ms / 1000) / pitch;
  const n = Math.max(1, Math.floor(dur * sampleRate));
  const mul = species === 'perro' ? 0.55 : species === 'tortuga' || species === 'otro' ? 0.4 : 1;
  const out = new Int16Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const tt = t / dur;
    const freq =
      tt < 0.35
        ? p.f0 * mul * pitch + (p.f1 - p.f0) * mul * pitch * (tt / 0.35)
        : p.f1 * mul * pitch - (p.f1 - p.f0 * 0.9) * mul * pitch * ((tt - 0.35) / 0.65);
    phase += (2 * Math.PI * freq) / sampleRate;

    let wave: number;
    if (species === 'perro') {
      wave = Math.sign(Math.sin(phase)) * 0.6 + Math.sin(phase) * 0.4;
    } else if (species === 'gato') {
      wave = (Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.15 * Math.sin(3 * phase)) / 1.5;
    } else {
      wave = Math.sin(phase);
    }

    const attack = Math.min(1, t / 0.02);
    const decay = Math.exp(-3 * tt);
    const env = attack * decay;
    const noise = species === 'otro' || species === 'tortuga' ? (Math.random() * 2 - 1) * 0.06 : 0;
    const sample = Math.max(-1, Math.min(1, wave * env + noise)) * 0.85;
    out[i] = Math.round(sample * 32767);
  }
  return out;
}

function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const blockAlign = 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i]!, true);
  }
  return new Uint8Array(buffer);
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    result += B64_CHARS[(n >> 18) & 63] + B64_CHARS[(n >> 12) & 63] + B64_CHARS[(n >> 6) & 63] + B64_CHARS[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    result += B64_CHARS[(n >> 18) & 63] + B64_CHARS[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    result += B64_CHARS[(n >> 18) & 63] + B64_CHARS[(n >> 12) & 63] + B64_CHARS[(n >> 6) & 63] + '=';
  }
  return result;
}
