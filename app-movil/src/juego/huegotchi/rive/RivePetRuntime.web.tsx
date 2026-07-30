/**
 * Runtime Rive web — descubre SM/inputs del .riv real y los anima.
 * Los .riv de marketplace NO usan PetLife: suelen tener "State Machine 1".
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { RIVE_SKIN_PROP, RiveBridgeInputs } from './contract';
import { RivePetHandle, RivePetRuntimeProps } from './RivePetRuntime.types';

type SmInput = {
  name: string;
  value?: number | boolean;
  fire?: () => void;
};

const REACT_ALIASES: Record<string, string[]> = {
  poke: ['poke', 'tap', 'click', 'press', 'hit', 'pet', 'Boolean 1', 'hover'],
  feed: ['feed', 'eat', 'food', 'alimentar'],
  play: ['play', 'jugar', 'happy', 'excited'],
  bath: ['bath', 'banar', 'wash', 'clean'],
  sleep: ['sleep', 'dormir', 'rest', 'zzz'],
  yawn: ['yawn', 'tired', 'sleep'],
  guestArrive: ['guest', 'visit', 'friend', 'arrive'],
  trickPaw: ['paw', 'trick', 'sit'],
  trickSpin: ['spin', 'roll', 'trick'],
  trickPlayDead: ['dead', 'playdead', 'trick'],
  trickSuccess: ['success', 'win', 'happy', 'Boolean 1'],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function RivePetRuntime({ source, width, height, onReady, onError }: RivePetRuntimeProps) {
  const src = typeof source === 'string' ? source : String(source);
  const readyOnce = useRef(false);

  const { rive, RiveComponent } = useRive({
    src,
    // La mayoría de community files usan este nombre
    stateMachines: 'State Machine 1',
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => onError?.(new Error(`No se pudo cargar Rive: ${src}`)),
  });

  useEffect(() => {
    if (!rive || readyOnce.current) return;
    readyOnce.current = true;

    // Por si el nombre no era "State Machine 1", arrancar todo lo disponible
    try {
      const sms = rive.stateMachineNames ?? [];
      const anims = rive.animationNames ?? [];
      if (sms.length) {
        rive.play(sms);
      } else if (anims.length) {
        const idleish = anims.filter((n) => /idle|loop|breath|blink|wait/i.test(n));
        rive.play(idleish.length ? idleish : anims);
      } else {
        rive.play();
      }
    } catch {
      try {
        rive.play();
      } catch {
        /* */
      }
    }

    const listInputs = (): { sm: string; input: SmInput }[] => {
      const out: { sm: string; input: SmInput }[] = [];
      const sms = rive.stateMachineNames?.length ? rive.stateMachineNames : ['State Machine 1'];
      for (const sm of sms) {
        try {
          const inputs = (rive.stateMachineInputs(sm) ?? []) as SmInput[];
          for (const input of inputs) out.push({ sm, input });
        } catch {
          /* */
        }
      }
      return out;
    };

    const findByAliases = (aliases: string[]) => {
      const wanted = aliases.map(norm);
      return listInputs().filter(({ input }) => wanted.includes(norm(input.name)));
    };

    const setNumByHints = (hints: string[], value: number) => {
      const hits = findByAliases(hints);
      if (hits.length) {
        for (const h of hits) {
          if (typeof h.input.value === 'number' || h.input.value === undefined) {
            try {
              h.input.value = value;
            } catch {
              /* */
            }
          }
        }
        return;
      }
      // Fallback: primer number input
      for (const { input } of listInputs()) {
        if (typeof input.value === 'number') {
          try {
            input.value = value;
          } catch {
            /* */
          }
          break;
        }
      }
    };

    const pulseBooleans = () => {
      const bools = listInputs().filter(
        ({ input }) => typeof input.value === 'boolean' || /bool|hover|press|click|tap/i.test(input.name)
      );
      for (const { input } of bools) {
        try {
          const prev = Boolean(input.value);
          input.value = !prev;
          setTimeout(() => {
            try {
              input.value = prev;
            } catch {
              /* */
            }
          }, 450);
        } catch {
          /* */
        }
      }
    };

    const fireAllTriggers = () => {
      for (const { input } of listInputs()) {
        if (typeof input.fire === 'function') {
          try {
            input.fire();
          } catch {
            /* */
          }
        }
      }
    };

    const fire = (triggerName: string) => {
      const aliases = REACT_ALIASES[triggerName] ?? [triggerName];
      const hits = findByAliases(aliases);
      let fired = false;
      for (const h of hits) {
        if (typeof h.input.fire === 'function') {
          try {
            h.input.fire();
            fired = true;
          } catch {
            /* */
          }
        } else if (typeof h.input.value === 'boolean') {
          try {
            h.input.value = true;
            setTimeout(() => {
              try {
                h.input.value = false;
              } catch {
                /* */
              }
            }, 400);
            fired = true;
          } catch {
            /* */
          }
        }
      }
      if (!fired) {
        fireAllTriggers();
        pulseBooleans();
      }
    };

    const react = (kind: string) => {
      fire(kind);
      // Empujar animaciones idle/react si existen
      try {
        const anims = rive.animationNames ?? [];
        const match = anims.filter((n) =>
          new RegExp(kind === 'poke' ? 'tap|hit|click|react|happy' : kind, 'i').test(n)
        );
        if (match.length) rive.play(match);
      } catch {
        /* */
      }
    };

    const setSkin = (skinId: string) => {
      try {
        rive.setTextRunValue?.(RIVE_SKIN_PROP, skinId);
      } catch {
        /* */
      }
    };

    const setInputs = (partial: Partial<RiveBridgeInputs>) => {
      try {
        if (partial.lookX != null) {
          setNumByHints(['lookX', 'lookx', 'pointerX', 'pointerx', 'x', 'mouseX', 'hoverX'], partial.lookX);
        }
        if (partial.lookY != null) {
          setNumByHints(['lookY', 'looky', 'pointerY', 'pointery', 'y', 'mouseY', 'hoverY'], partial.lookY);
        }
        if (partial.mood != null) {
          setNumByHints(['mood', 'happiness', 'animo', 'happy'], partial.mood);
        }
        if (partial.squash != null) {
          setNumByHints(['squash', 'scaleY', 'scale'], partial.squash);
        }
        if (partial.isDragging != null || partial.isSleeping != null || partial.hasGuest != null) {
          const boolHits = listInputs().filter(({ input }) => typeof input.value === 'boolean');
          for (const { input } of boolHits) {
            const n = norm(input.name);
            if (partial.isDragging != null && /drag|hold|press/.test(n)) input.value = partial.isDragging;
            if (partial.isSleeping != null && /sleep|rest|zzz/.test(n)) input.value = partial.isSleeping;
            if (partial.hasGuest != null && /guest|visit|friend/.test(n)) input.value = partial.hasGuest;
          }
        }
        if (partial.skinId != null) setSkin(partial.skinId);
      } catch {
        /* */
      }
    };

    const handle: RivePetHandle = { setInputs, setSkin, fire, react };
    onReady?.(handle);
  }, [rive, onReady]);

  // Reset flag si cambia el source (remount)
  useEffect(() => {
    readyOnce.current = false;
  }, [src]);

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="box-none">
      <RiveComponent style={{ width, height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 20 },
});
