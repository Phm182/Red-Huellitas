import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JuegoAccion, JuegoAnimo, MascotaJuego } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petVoice } from '../audio/PetVoiceEngine';
import { resolveBreedProfile, variantesDeRaza } from '../domain/breeds';
import {
  animoToMood,
  HueGuestVisit,
  identityFromJuego,
  PlaceId,
} from '../domain/types';
import { HeldStance, SLEEP_LOCK_MS, poseDuration } from '../domain/poses';
import { PetPhysicsEngine } from '../physics/PetPhysicsEngine';
import { riveModuleForSpecies, riveUrlForSpecies, hasRiveAsset } from '../rive/assets';
import { RiveBridgeInputs, RIVE_TRIGGERS } from '../rive/contract';
import { RivePetHandle } from '../rive/RivePetRuntime.types';
import {
  buildEnvironment,
  environmentToRiveNumbers,
  fetchLocalWeather,
} from '../systems/environment';
import { createGuestVisit, DEMO_FRIENDS, visitTrigger } from '../systems/social';
import { gestureFromSwipe, GestureToken, TrickTrainer, TRICKS, TRICKS_QUE_SOSTIENEN } from '../systems/training';
import { TrickId } from '../domain/types';
import { Platform } from 'react-native';

const ACCION_TRIGGER: Record<JuegoAccion, string> = {
  alimentar: RIVE_TRIGGERS.feed,
  jugar: RIVE_TRIGGERS.play,
  banar: RIVE_TRIGGERS.bath,
  dormir: RIVE_TRIGGERS.sleep,
};

function moodNumber(animo: JuegoAnimo): number {
  switch (animo) {
    case 'feliz':
      return 1;
    case 'bien':
      return 0.66;
    case 'aburrido':
      return 0.33;
    case 'decaido':
      return 0;
  }
}

type StageRect = { x: number; y: number; w: number; h: number };

type VoiceMouth = { startedAt: number; durationMs: number };

/**
 * Orquestador HueGotchi: físicas, entorno, audio, trucos, visitas,
 * posturas sostenidas, orientación y sync de boca.
 */
export function useHueGotchiController(juego: MascotaJuego, accion: JuegoAccion | null) {
  const identity = useMemo(() => identityFromJuego(juego), [juego]);
  const [coatId, setCoatId] = useState<string | null>(null);
  const breed = useMemo(
    () => resolveBreedProfile(identity.species, identity.raza, identity.ageStage, coatId),
    [identity.species, identity.raza, identity.ageStage, coatId]
  );
  const coats = useMemo(
    () => variantesDeRaza(identity.species, identity.raza),
    [identity.species, identity.raza]
  );
  const physics = useRef(new PetPhysicsEngine()).current;
  const trainer = useRef(new TrickTrainer()).current;
  const handleRef = useRef<RivePetHandle | null>(null);
  const stage = useRef<StageRect>({ x: 0, y: 0, w: 320, h: 320 });

  const riveAvailable = hasRiveAsset(identity.species);
  const [place, setPlace] = useState<PlaceId>('living');
  const [guest, setGuest] = useState<HueGuestVisit | null>(null);
  const [riveReady, setRiveReady] = useState(false);
  const [riveError, setRiveError] = useState<string | null>(
    riveAvailable ? null : 'missing-riv'
  );
  const [activeTrick, setActiveTrick] = useState<TrickId | null>(null);
  const [trickMsg, setTrickMsg] = useState<string | null>(null);
  const [trickPasos, setTrickPasos] = useState(0);
  /** Feedback visual sobre el escenario: gesto ok / fallo / logro. */
  const [trickFlash, setTrickFlash] = useState<'ok' | 'fail' | 'win' | null>(null);
  const trickFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashTrick = useCallback((kind: 'ok' | 'fail' | 'win') => {
    if (trickFlashTimer.current) clearTimeout(trickFlashTimer.current);
    setTrickFlash(kind);
    trickFlashTimer.current = setTimeout(
      () => setTrickFlash(null),
      kind === 'win' ? 1600 : kind === 'fail' ? 1400 : 850
    );
  }, []);

  const [heldStance, setHeldStance] = useState<HeldStance>('none');
  const [yaw, setYaw] = useState(0); // frente a cámara (estilo ref)
  const yawRef = useRef(0);
  const yawDragStartRef = useRef(0);
  const dragModeRef = useRef<'none' | 'orbit' | 'stretch'>('none');
  const [sleepUntil, setSleepUntil] = useState(0);
  const [voiceMouth, setVoiceMouth] = useState<VoiceMouth | null>(null);
  const [, bump] = useState(0);
  const animRef = useRef<{ trigger: string; startedAt: number } | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sleepLocked = sleepUntil > Date.now() && heldStance === 'sleep';

  const react = useCallback((trigger: string) => {
    handleRef.current?.react(trigger);
    animRef.current = { trigger, startedAt: performance.now() };
  }, []);

  const playVoice = useCallback(async () => {
    const res = await petVoice.play({
      species: identity.species,
      mood: animoToMood(juego.animo),
    });
    setVoiceMouth({ startedAt: performance.now(), durationMs: res.durationMs });
    return res;
  }, [identity.species, juego.animo]);

  const speak = useCallback(async () => {
    if (sleepLocked) return;
    react('speak');
    await playVoice();
  }, [sleepLocked, react, playVoice]);

  const setStance = useCallback(
    (next: HeldStance) => {
      if (sleepLocked && next !== 'sleep') return;
      setHeldStance(next);
      if (next === 'sit') react('sitDown');
      else if (next === 'lie') react('lieDown');
      else if (next === 'none') react('standUp');
      else if (next === 'sleep') react('sleep');
    },
    [sleepLocked, react]
  );

  const entertain = useCallback(
    (kind: 'pet' | 'scratch' | 'play' | 'speak') => {
      if (sleepLocked) return;
      if (kind === 'speak') {
        void speak();
        return;
      }
      // Cualquier entretenimiento saca de sentado/acostado salvo pet suave.
      if (kind === 'play') {
        setHeldStance('none');
        react('play');
      } else if (kind === 'scratch') {
        react('scratch');
      } else {
        react('pet');
      }
      void playVoice();
    },
    [sleepLocked, react, playVoice, speak]
  );

  const [weather, setWeather] = useState<'clear' | 'rain' | 'cloudy' | 'storm'>('clear');

  useEffect(() => {
    void fetchLocalWeather().then(setWeather);
  }, []);

  const environment = useMemo(
    () => buildEnvironment(place, weather),
    [place, weather]
  );

  const riveSource = useMemo(() => {
    if (!riveAvailable) return null;
    if (Platform.OS === 'web') return riveUrlForSpecies(identity.species);
    return riveModuleForSpecies(identity.species) ?? riveUrlForSpecies(identity.species);
  }, [identity.species, riveAvailable]);

  const pushToRive = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    const phy = physics.snapshot();
    const envN = environmentToRiveNumbers(environment);
    const inputs: RiveBridgeInputs = {
      lookX: phy.lookX,
      lookY: phy.lookY,
      squash: phy.squash,
      stretch: phy.stretch,
      mood: moodNumber(juego.animo),
      bodyScale: 1,
      ageBlend: identity.ageStage === 'adulto' ? 1 : 0,
      placeId: envN.placeId,
      weatherId: envN.weatherId,
      periodId: envN.periodId,
      isDragging: phy.isDragging,
      isSleeping: heldStance === 'sleep' || accion === 'dormir' || environment.isNight,
      isNight: envN.isNight,
      isRaining: envN.isRaining,
      preferIndoors: envN.preferIndoors,
      hasGuest: guest != null,
      skinId: identity.skinId,
    };
    h.setInputs(inputs);
  }, [accion, environment, guest, heldStance, identity, juego.animo, physics]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      physics.step(dt);
      pushToRive();
      if (now - lastDraw >= 30) {
        lastDraw = now;
        bump((n) => (n + 1) % 100000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [physics, pushToRive]);

  useEffect(() => {
    handleRef.current?.setSkin(identity.skinId);
  }, [identity.skinId]);

  // Acciones de cuidado → animación + voz + posturas sostenidas.
  useEffect(() => {
    if (!accion) return;
    const trigger = ACCION_TRIGGER[accion];
    react(trigger);

    if (accion === 'dormir') {
      setHeldStance('sleep');
      const until = Date.now() + SLEEP_LOCK_MS;
      setSleepUntil(until);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      // Al terminar el lock, sigue dormido hasta que lo despierten o haga otra acción.
      sleepTimerRef.current = setTimeout(() => {
        bump((n) => (n + 1) % 100000);
      }, SLEEP_LOCK_MS + 50);
    } else {
      setHeldStance('none');
      setSleepUntil(0);
      void playVoice();
    }

    return () => {
      /* no cancelar sleep al desmontar efecto de accion */
    };
  }, [accion, react, playVoice]);

  useEffect(() => {
    if (environment.isNight && !accion && heldStance !== 'sleep') {
      react(RIVE_TRIGGERS.yawn);
    }
  }, [environment.isNight, accion, react, heldStance]);

  const onRiveReady = useCallback(
    (h: RivePetHandle) => {
      handleRef.current = h;
      setRiveReady(true);
      setRiveError(null);
      h.setSkin(identity.skinId);
      pushToRive();
      react('poke');
    },
    [identity.skinId, pushToRive, react]
  );

  const onRiveError = useCallback((e: Error) => {
    setRiveError(e.message);
    setRiveReady(false);
  }, []);

  // Micro-reacciones idle (no mientras duerme o entrena).
  useEffect(() => {
    const id = setInterval(() => {
      if (sleepLocked || heldStance === 'sleep' || trainer.activo) return;
      if (animRef.current) {
        const dur = poseDuration(animRef.current.trigger);
        if (performance.now() - animRef.current.startedAt < dur) return;
      }
      react('poke');
    }, 14000);
    return () => clearInterval(id);
  }, [react, sleepLocked, heldStance, trainer]);

  const coatKey = `@red_huellitas/huegotchi/coat/${identity.mascotaId}`;
  useEffect(() => {
    let vivo = true;
    void AsyncStorage.getItem(coatKey).then((v) => {
      if (vivo && v) setCoatId(v);
    });
    return () => {
      vivo = false;
    };
  }, [coatKey]);

  const setCoat = useCallback(
    (id: string | null) => {
      setCoatId(id);
      if (id) void AsyncStorage.setItem(coatKey, id);
      else void AsyncStorage.removeItem(coatKey);
    },
    [coatKey]
  );

  const setStageRect = useCallback((rect: StageRect) => {
    stage.current = rect;
  }, []);

  const onPointerMove = useCallback(
    (pageX: number, pageY: number) => {
      if (sleepLocked) return;
      physics.lookFromPage(pageX, pageY, stage.current);
    },
    [physics, sleepLocked]
  );

  const evaluarGesto = useCallback(
    (token: GestureToken) => {
      if (!trainer.activo) return;
      const def = trainer.definicion!;
      const res = trainer.recibir(token);
      if (res === 'completo') {
        react(def.riveTrigger);
        flashTrick('win');
        if (def.riveTrigger === RIVE_TRIGGERS.trickSpin) {
          // Giro real del modelo 3D (una vuelta).
          const start = yawRef.current;
          const t0 = performance.now();
          const spin = () => {
            const u = Math.min(1, (performance.now() - t0) / 900);
            const next = start + u * Math.PI * 2;
            yawRef.current = next;
            setYaw(next);
            if (u < 1) requestAnimationFrame(spin);
          };
          requestAnimationFrame(spin);
        }
        const hold = TRICKS_QUE_SOSTIENEN[def.riveTrigger];
        if (hold) {
          setHeldStance(hold);
        } else {
          setTimeout(() => react(RIVE_TRIGGERS.trickSuccess), 700);
        }
        setTrickMsg(`¡Lo hizo! +${def.xpReward} XP`);
        setTrickPasos(def.pattern.length);
        trainer.cancelar();
        setActiveTrick(null);
        void playVoice();
      } else if (res === 'avanza') {
        flashTrick('ok');
        setTrickPasos(trainer.progreso);
        setTrickMsg(null);
      } else if (res === 'falla') {
        flashTrick('fail');
        react(RIVE_TRIGGERS.trickFail);
        setTrickPasos(0);
        setTrickMsg('Casi… arrancá de nuevo la secuencia.');
      }
    },
    [react, trainer, playVoice, flashTrick]
  );

  const wakePet = useCallback(() => {
    if (sleepLocked) return false;
    if (heldStance !== 'sleep') return false;
    setHeldStance('none');
    setSleepUntil(0);
    react('yawn');
    void playVoice();
    return true;
  }, [sleepLocked, heldStance, react, playVoice]);

  const onTapPet = useCallback(
    (pageX: number, pageY: number) => {
      if (heldStance === 'sleep') {
        // Durante el lock no se despierta; después, un tap lo levanta.
        if (!sleepLocked) wakePet();
        return;
      }
      physics.lookFromPage(pageX, pageY, stage.current);
      physics.onTap();
      if (trainer.activo) {
        evaluarGesto('tap');
        return;
      }
      // Tap = voz con boca sincronizada + poke de cuerpo.
      void playVoice();
      react(RIVE_TRIGGERS.poke);
    },
    [heldStance, sleepLocked, wakePet, physics, trainer, evaluarGesto, playVoice, react]
  );

  const onDragPet = useCallback(
    (dx: number, dy: number, pageX: number, pageY: number) => {
      if (sleepLocked) return;
      // Entrenando: el arrastre es gesto, no órbita.
      if (trainer.activo) {
        physics.onDrag(dx, dy);
        physics.lookFromPage(pageX, pageY, stage.current);
        return;
      }
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (dragModeRef.current === 'none') {
        if (ax < 6 && ay < 6) return;
        // Horizontal dominante → orbitar 360°. Vertical → squash clay.
        dragModeRef.current = ax > ay * 1.15 ? 'orbit' : 'stretch';
        if (dragModeRef.current === 'orbit') {
          yawDragStartRef.current = yawRef.current;
        }
      }
      if (dragModeRef.current === 'orbit') {
        // dx es el desplazamiento total del gesto, no el delta por frame.
        const next = yawDragStartRef.current + dx * 0.014;
        yawRef.current = next;
        setYaw(next);
        return;
      }
      physics.onDrag(dx, dy);
      physics.lookFromPage(pageX, pageY, stage.current);
    },
    [physics, sleepLocked, trainer]
  );

  const onDragEnd = useCallback(
    (dx = 0, dy = 0) => {
      const mode = dragModeRef.current;
      dragModeRef.current = 'none';
      if (sleepLocked) {
        physics.onDragEnd();
        return;
      }
      physics.onDragEnd();
      if (trainer.activo) {
        const g = gestureFromSwipe(dx, dy);
        if (g) evaluarGesto(g);
        return;
      }
      // Órbita no dispara trucos.
      if (mode === 'orbit') return;
      const g = gestureFromSwipe(dx, dy);
      if (g) evaluarGesto(g);
    },
    [physics, evaluarGesto, sleepLocked, trainer]
  );

  const inviteFriend = useCallback(() => {
    if (sleepLocked) return;
    const friend = DEMO_FRIENDS[Math.floor(Math.random() * DEMO_FRIENDS.length)]!;
    const visit = createGuestVisit(friend);
    setGuest(visit);
    setHeldStance('none');
    react(RIVE_TRIGGERS.guestArrive);
    react(visitTrigger(visit.outcome));
  }, [react, sleepLocked]);

  const clearGuest = useCallback(() => setGuest(null), []);

  const startTrick = useCallback(
    (id: TrickId) => {
      if (sleepLocked) return;
      const def = TRICKS.find((t) => t.id === id);
      if (!def) return;
      if (activeTrick === id) {
        trainer.cancelar();
        setActiveTrick(null);
        setTrickMsg(null);
        setTrickPasos(0);
        return;
      }
      trainer.empezar(def);
      setActiveTrick(id);
      setTrickPasos(0);
      setTrickMsg(null);
    },
    [activeTrick, trainer, sleepLocked]
  );

  useEffect(() => {
    if (!activeTrick) return;
    const id = setInterval(() => {
      if (trainer.expirado()) {
        trainer.cancelar();
        setActiveTrick(null);
        setTrickPasos(0);
        setTrickMsg('Se cortó el entrenamiento. Probá de nuevo.');
      }
    }, 700);
    return () => clearInterval(id);
  }, [activeTrick, trainer]);

  // Limpiar boca cuando termina el audio.
  useEffect(() => {
    if (!voiceMouth) return;
    const id = setTimeout(() => setVoiceMouth(null), voiceMouth.durationMs + 80);
    return () => clearTimeout(id);
  }, [voiceMouth]);

  useEffect(() => {
    return () => {
      if (trickFlashTimer.current) clearTimeout(trickFlashTimer.current);
    };
  }, []);

  return {
    identity,
    breed,
    environment,
    place,
    setPlace,
    guest,
    inviteFriend,
    clearGuest,
    riveSource,
    riveAvailable,
    riveReady,
    riveError,
    onRiveReady,
    onRiveError,
    setStageRect,
    onPointerMove,
    onTapPet,
    onDragPet,
    onDragEnd,
    physicsSnapshot: physics.snapshot(),
    activeTrick,
    startTrick,
    trickMsg,
    tricks: TRICKS,
    react,
    animation: animRef.current,
    coats,
    coatId,
    setCoat,
    trickPasos,
    trickPatron: trainer.definicion?.pattern ?? null,
    trickFlash,
    heldStance,
    setStance,
    yaw,
    sleepLocked,
    sleepRemainingMs: Math.max(0, sleepUntil - Date.now()),
    wakePet,
    entertain,
    speak,
    voiceMouth,
  };
}
