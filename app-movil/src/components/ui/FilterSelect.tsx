import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { elevation, radii } from '../../theme/elevation';
import { MAX_CONTENT_WIDTH } from '../../theme/layout';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';
import { ChipOption } from './ChipRow';

type Props<T> = {
  /** Ej: "Categoría", "Tipo", "Distancia" */
  label: string;
  opciones: ChipOption<T>[];
  seleccionado: T;
  onSelect: (valor: T) => void;
};

/**
 * Filtro compacto: muestra "Label: valor" y al tocar abre opciones
 * en un diálogo centrado, con flechas si hay más ítems arriba/abajo.
 */
export function FilterSelect<T>({ label, opciones, seleccionado, onSelect }: Props<T>) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [abierto, setAbierto] = useState(false);
  const [puedeSubir, setPuedeSubir] = useState(false);
  const [puedeBajar, setPuedeBajar] = useState(false);
  /** Refs: layout y contentSize llegan en distinto orden; el state llega tarde. */
  const listaHRef = useRef(0);
  const contenidoHRef = useRef(0);
  const scrollYRef = useRef(0);

  const actual = opciones.find((o) => o.valor === seleccionado) ?? opciones[0];
  const valorLabel = actual?.label ?? '—';
  const dialogWidth = Math.min(340, Math.min(windowWidth - 48, MAX_CONTENT_WIDTH - 40));

  const recalcular = useCallback(() => {
    const viewport = listaHRef.current;
    const content = contenidoHRef.current;
    if (viewport <= 0 || content <= 0) return;
    const y = scrollYRef.current;
    const maxY = Math.max(0, content - viewport);
    setPuedeSubir(y > 8);
    setPuedeBajar(maxY > 8 && y < maxY - 8);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    scrollYRef.current = contentOffset.y;
    listaHRef.current = layoutMeasurement.height;
    contenidoHRef.current = contentSize.height;
    recalcular();
  };

  const onAbrir = () => {
    hapticLeve();
    scrollYRef.current = 0;
    listaHRef.current = 0;
    contenidoHRef.current = 0;
    setPuedeSubir(false);
    setPuedeBajar(false);
    setAbierto(true);
  };

  return (
    <>
      <Pressable
        onPress={onAbrir}
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodySemi }}>{label}: </Text>
          {valorLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAbierto(false)} />
          <View
            style={[
              styles.dialog,
              elevation.md,
              {
                width: dialogWidth,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[type.titleSm, { color: colors.text, marginBottom: 12 }]}>{label}</Text>

            <View style={styles.listaWrap}>
              {puedeSubir ? (
                <View style={[styles.flecha, styles.flechaArriba, { backgroundColor: colors.surface }]}>
                  <Ionicons name="chevron-up" size={20} color={colors.primary} />
                </View>
              ) : null}

              <ScrollView
                style={styles.lista}
                bounces={false}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onLayout={(e: LayoutChangeEvent) => {
                  listaHRef.current = e.nativeEvent.layout.height;
                  recalcular();
                }}
                onContentSizeChange={(_, h) => {
                  contenidoHRef.current = h;
                  recalcular();
                }}
              >
                {opciones.map((op) => {
                  const activa = op.valor === seleccionado;
                  return (
                    <Pressable
                      key={String(op.valor)}
                      onPress={() => {
                        hapticLeve();
                        onSelect(op.valor);
                        setAbierto(false);
                      }}
                      style={[
                        styles.opcion,
                        {
                          borderColor: activa ? colors.primary : colors.border,
                          backgroundColor: activa ? colors.primarySoft : 'transparent',
                        },
                      ]}
                    >
                      {op.icon ? (
                        <Ionicons
                          name={op.icon}
                          size={18}
                          color={activa ? colors.primary : colors.textMuted}
                        />
                      ) : null}
                      <Text
                        style={{
                          flex: 1,
                          color: colors.text,
                          fontFamily: activa ? fonts.bodySemi : fonts.body,
                        }}
                      >
                        {op.label}
                      </Text>
                      {activa ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {puedeBajar ? (
                <View style={[styles.flecha, styles.flechaAbajo, { backgroundColor: colors.surface }]}>
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

type TabsProps<T extends string> = {
  tabs: { key: T; label: string }[];
  activa: T;
  onChange: (key: T) => void;
};

/** Solapas superiores (Necesito / Ofrezco, Buscar / Ofrecer). */
export function SolapaTabs<T extends string>({ tabs, activa, onChange }: TabsProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.solapas, { borderBottomColor: colors.border }]}>
      {tabs.map((tab) => {
        const on = tab.key === activa;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              hapticLeve();
              onChange(tab.key);
            }}
            style={[styles.solapa, on && { borderBottomColor: colors.primary }]}
          >
            <Text
              style={{
                color: on ? colors.primary : colors.textMuted,
                fontFamily: fonts.bodySemi,
                fontSize: 14,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  triggerText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    maxHeight: '70%',
  },
  listaWrap: { position: 'relative' },
  lista: { maxHeight: 280 },
  flecha: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    paddingVertical: 2,
  },
  flechaArriba: { top: 0 },
  flechaAbajo: { bottom: 0 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  solapas: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  solapa: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
