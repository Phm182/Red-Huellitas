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
import { gestureFromSwipe, GestureToken, TrickTrainer, TRICKS } from '../systems/training';
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

/**
 * Orquestador HueGotchi: físicas, entorno, Rive bridge, audio, trucos, visitas.
 */
export function useHueGotchiController(juego: MascotaJuego, accion: JuegoAccion | null) {
  const identity = useMemo(() => identityFromJuego(juego), [juego]);
  /** Variante de pelaje elegida a mano (null = la primera del catálogo). */
  const [coatId, setCoatId] = useState<string | null>(null);
  /** Morfología y colores reales de la raza: proporciones, peso, pelo, orejas. */
  const breed = useMemo(
    () => resolveBreedProfile(identity.species, identity.raza, identity.ageStage, coatId),
    [identity.species, identity.raza, identity.ageStage, coatId]
  );
  /** Colorways disponibles para esta raza (un Labrador es dorado, chocolate o negro). */
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
  const [, bump] = useState(0);
  /**
   * Animación en curso. El renderer calcula la pose a partir de
   * `(now - startedAt) / poseDuration(trigger)`, así que acá sólo hace falta
   * saber qué se disparó y cuándo.
   */
  const animRef = useRef<{ trigger: string; startedAt: number } | null>(null);

  /** Dispara una animación de cuerpo (y el trigger Rive, si algún día hay un .riv real). */
  const react = useCallback((trigger: string) => {
    handleRef.current?.react(trigger);
    animRef.current = { trigger, startedAt: performance.now() };
  }, []);

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
      isSleeping: accion === 'dormir' || environment.isNight,
      isNight: envN.isNight,
      isRaining: envN.isRaining,
      preferIndoors: envN.preferIndoors,
      hasGuest: guest != null,
      skinId: identity.skinId,
    };
    h.setInputs(inputs);
  }, [accion, environment, guest, identity, juego.animo, physics]);

  // Físicas a 60fps, pero re-render a ~33fps: el personaje es un SVG de ~40
  // nodos y redibujarlo 60 veces por segundo hace tironear el gesto en gama
  // media sin que se note ninguna mejora de fluidez.
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

  // Skin sin recargar
  useEffect(() => {
    handleRef.current?.setSkin(identity.skinId);
  }, [identity.skinId]);

  // Acciones cuidado → reacciones Rive + voz
  useEffect(() => {
    if (!accion) return;
    react(ACCION_TRIGGER[accion]);
    void petVoice.play({ species: identity.species, mood: animoToMood(juego.animo) });
  }, [accion, identity.species, juego.animo, react]);

  useEffect(() => {
    if (environment.isNight && !accion) {
      react(RIVE_TRIGGERS.yawn);
    }
  }, [environment.isNight, accion, react]);

  const onRiveReady = useCallback(
    (h: RivePetHandle) => {
      handleRef.current = h;
      setRiveReady(true);
      setRiveError(null);
      h.setSkin(identity.skinId);
      pushToRive();
      // Arranque vivo: pequeña reacción al montar
      react('poke');
    },
    [identity.skinId, pushToRive, react]
  );

  const onRiveError = useCallback((e: Error) => {
    setRiveError(e.message);
    setRiveReady(false);
  }, []);

  // Micro-reacciones idle para que el personaje procedural no quede estatua.
  useEffect(() => {
    const id = setInterval(() => {
      react('poke');
    }, 12000);
    return () => clearInterval(id);
  }, [react]);

  // El pelaje elegido se guarda por mascota. Vive en AsyncStorage y no en la
  // base: no hay columna para esto todavía, así que la elección es local a este
  // dispositivo hasta que se agregue al backend.
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
      physics.lookFromPage(pageX, pageY, stage.current);
    },
    [physics]
  );

  /** Un gesto (tap o swipe completo) contra el truco armado. */
  const evaluarGesto = useCallback(
    (token: GestureToken) => {
      if (!trainer.activo) return;
      const def = trainer.definicion!;
      const res = trainer.recibir(token);
      if (res === 'completo') {
        react(def.riveTrigger);
        setTimeout(() => react(RIVE_TRIGGERS.trickSuccess), 700);
        setTrickMsg(`¡Lo hizo! +${def.xpReward} XP`);
        setTrickPasos(def.pattern.length);
        trainer.cancelar();
        setActiveTrick(null);
      } else if (res === 'avanza') {
        setTrickPasos(trainer.progreso);
        setTrickMsg(null);
      } else if (res === 'falla') {
        react(RIVE_TRIGGERS.trickFail);
        setTrickPasos(0);
        setTrickMsg('Casi… arrancá de nuevo la secuencia.');
      }
    },
    [react, trainer]
  );

  const onTapPet = useCallback(
    (pageX: number, pageY: number) => {
      physics.lookFromPage(pageX, pageY, stage.current);
      physics.onTap();
      void petVoice.play({ species: identity.species, mood: animoToMood(juego.animo) });
      if (trainer.activo) {
        evaluarGesto('tap');
      } else {
        react(RIVE_TRIGGERS.poke);
      }
    },
    [identity.species, juego.animo, physics, trainer, react, evaluarGesto]
  );

  // Durante el arrastre sólo se mueve la física: nada de tokens acá, que es lo
  // que rompía el entrenamiento (un token por frame).
  const onDragPet = useCallback(
    (dx: number, dy: number, pageX: number, pageY: number) => {
      physics.onDrag(dx, dy);
      physics.lookFromPage(pageX, pageY, stage.current);
    },
    [physics]
  );

  /** El token se emite una sola vez, al soltar, con el desplazamiento total. */
  const onDragEnd = useCallback(
    (dx = 0, dy = 0) => {
      physics.onDragEnd();
      const g = gestureFromSwipe(dx, dy);
      if (g) evaluarGesto(g);
    },
    [physics, evaluarGesto]
  );

  const inviteFriend = useCallback(() => {
    const friend = DEMO_FRIENDS[Math.floor(Math.random() * DEMO_FRIENDS.length)]!;
    const visit = createGuestVisit(friend);
    setGuest(visit);
    react(RIVE_TRIGGERS.guestArrive);
    react(visitTrigger(visit.outcome));
  }, [react]);

  const clearGuest = useCallback(() => setGuest(null), []);

  const startTrick = useCallback(
    (id: TrickId) => {
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
    [activeTrick, trainer]
  );

  // Si se queda a medias, se limpia solo en vez de dejar el truco colgado.
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
    /** Animación en curso (o null): el renderer la convierte en pose. */
    animation: animRef.current,
    coats,
    coatId,
    setCoat,
    /** Pasos del patrón ya logrados, para dibujar el progreso del truco. */
    trickPasos,
    trickPatron: trainer.definicion?.pattern ?? null,
  };
}
