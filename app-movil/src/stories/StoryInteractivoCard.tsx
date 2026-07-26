import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { StoryInteractivo } from './storyEditorTypes';

type Props = {
  interactivo: StoryInteractivo;
  width: number;
  height: number;
  /** Resultados en vivo; sólo en el visor. */
  votosA?: number;
  votosB?: number;
  miVoto?: 'A' | 'B' | null;
  /** Sin handler el sticker es sólo visual (editor). */
  onVotar?: (opcion: 'A' | 'B') => void;
  onResponder?: () => void;
};

/**
 * Dibuja el sticker de encuesta o de caja de preguntas.
 *
 * Lo usan el editor (sin handlers, como preview de lo que va a ver el otro) y
 * el visor (con votación real). Que sea el mismo componente evita la sorpresa
 * clásica de publicar algo que se ve distinto de como se editó.
 */
export function StoryInteractivoCard({
  interactivo,
  width,
  height,
  votosA = 0,
  votosB = 0,
  miVoto = null,
  onVotar,
  onResponder,
}: Props) {
  const posicion = {
    position: 'absolute' as const,
    left: interactivo.x * width,
    top: interactivo.y * height,
    transform: [{ translateX: '-50%' as const }, { translateY: '-50%' as const }],
  };

  if (interactivo.kind === 'pregunta') {
    return (
      <View style={[posicion, styles.card]}>
        <Text style={[type.caption, styles.etiqueta]}>PREGUNTAME</Text>
        <Text style={[type.section, styles.titulo]}>{interactivo.texto}</Text>
        <Pressable
          onPress={onResponder}
          disabled={!onResponder}
          style={[styles.campoRespuesta, !onResponder && styles.inerte]}
        >
          <Text style={[type.bodySm, styles.campoTexto]}>Escribí tu respuesta…</Text>
        </Pressable>
      </View>
    );
  }

  const total = votosA + votosB;
  // Antes de que vote alguien las barras van al 50/50: mostrar 0% de un lado
  // parece un resultado real y no lo es.
  const pctA = total > 0 ? Math.round((votosA / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const yaVoto = miVoto !== null;

  const opcion = (letra: 'A' | 'B', label: string, pct: number) => (
    <Pressable
      onPress={() => onVotar?.(letra)}
      disabled={!onVotar}
      style={[styles.opcion, miVoto === letra && styles.opcionElegida]}
    >
      {/* La barra de progreso sólo aparece una vez que hay voto propio: antes
          de votar el resultado se esconde, como en Instagram. */}
      {yaVoto ? <View style={[styles.barra, { width: `${pct}%` }]} /> : null}
      <View style={styles.opcionContenido}>
        <Text style={[type.label, styles.opcionTexto]} numberOfLines={1}>
          {label}
        </Text>
        {yaVoto ? <Text style={[type.caption, styles.opcionPct]}>{pct}%</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <View style={[posicion, styles.card]}>
      <Text style={[type.section, styles.titulo]}>{interactivo.pregunta}</Text>
      <View style={styles.opciones}>
        {opcion('A', interactivo.opcionA, pctA)}
        {opcion('B', interactivo.opcionB, pctB)}
      </View>
      {yaVoto && total > 0 ? (
        <Text style={[type.caption, styles.total]}>
          {total} {total === 1 ? 'voto' : 'votos'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.lg,
    padding: 14,
    gap: 8,
  },
  etiqueta: { color: '#5F6F6A', letterSpacing: 1 },
  titulo: { color: '#121816', textAlign: 'center' },
  opciones: { gap: 6 },
  opcion: {
    borderRadius: radii.sm,
    backgroundColor: 'rgba(18,24,22,0.08)',
    overflow: 'hidden',
    justifyContent: 'center',
    minHeight: 38,
  },
  opcionElegida: { borderWidth: 2, borderColor: '#E23B4A' },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(226,59,74,0.25)' },
  opcionContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  opcionTexto: { color: '#121816', flex: 1 },
  opcionPct: { color: '#121816' },
  total: { color: '#5F6F6A', textAlign: 'center' },
  campoRespuesta: {
    borderRadius: radii.sm,
    backgroundColor: 'rgba(18,24,22,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  campoTexto: { color: '#5F6F6A' },
  inerte: { opacity: 0.8 },
});
