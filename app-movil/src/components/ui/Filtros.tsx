import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';
import { FilterChip } from './ChipRow';

export type Opcion = { valor: string; label: string };
/** Un grupo de opciones excluyentes; `test` dice si un ítem cumple la opción elegida. */
export type FiltroDef<T> = {
  key: string;
  titulo: string;
  opciones: Opcion[];
  test: (item: T, valor: string) => boolean;
};
export type Orden<T> = { valor: string; label: string; cmp: (a: T, b: T) => number };
export type FiltrosConfig<T> = { defs: FiltroDef<T>[]; ordenes?: Orden<T>[] };

/**
 * Estado de los filtros de una lista. Se aplican sobre lo ya cargado, encima de
 * la búsqueda por texto y de los filtros que la pantalla pide al servidor.
 */
export function useFiltros<T>(config: FiltrosConfig<T>) {
  const [valores, setValores] = useState<Record<string, string | null>>({});
  const [orden, setOrden] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const activos = Object.values(valores).filter((v) => v != null).length + (orden ? 1 : 0);

  const aplicar = (items: T[]): T[] => {
    let res = items;
    for (const d of config.defs) {
      const v = valores[d.key];
      if (v != null) res = res.filter((it) => d.test(it, v));
    }
    const o = orden ? config.ordenes?.find((x) => x.valor === orden) : null;
    return o ? [...res].sort(o.cmp) : res;
  };

  const setValor = useCallback((key: string, v: string | null) => setValores((p) => ({ ...p, [key]: v })), []);
  const limpiar = useCallback(() => {
    setValores({});
    setOrden(null);
  }, []);

  return {
    config,
    valores,
    orden,
    activos,
    abierto,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    setValor,
    setOrden,
    limpiar,
    aplicar,
  };
}
export type FiltrosState<T> = ReturnType<typeof useFiltros<T>>;

/** Hoja con todos los filtros de la pantalla. */
export function FiltrosSheet<T>({ f, resultados }: { f: FiltrosState<T>; resultados: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { defs, ordenes } = f.config;

  return (
    <Modal transparent visible={f.abierto} animationType="slide" onRequestClose={f.cerrar}>
      <Pressable style={styles.telon} onPress={f.cerrar} />
      <View style={[styles.hoja, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.asa, { backgroundColor: colors.border }]} />
        <View style={styles.cabecera}>
          <Text style={[type.title, { color: colors.text, flex: 1 }]}>{t('filtros.titulo')}</Text>
          {f.activos > 0 ? (
            <Pressable
              onPress={() => {
                hapticLeve();
                f.limpiar();
              }}
              hitSlop={8}
            >
              <Text style={[type.label, { color: colors.primary }]}>{t('filtros.limpiar')}</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
          {ordenes && ordenes.length > 0 ? (
            <Seccion titulo={t('filtros.ordenar')}>
              {ordenes.map((o) => (
                <FilterChip
                  key={o.valor}
                  label={o.label}
                  activo={f.orden === o.valor}
                  onPress={() => f.setOrden(f.orden === o.valor ? null : o.valor)}
                />
              ))}
            </Seccion>
          ) : null}
          {defs.map((d) => (
            <Seccion key={d.key} titulo={d.titulo}>
              {d.opciones.map((op) => (
                <FilterChip
                  key={op.valor}
                  label={op.label}
                  activo={f.valores[d.key] === op.valor}
                  onPress={() => f.setValor(d.key, f.valores[d.key] === op.valor ? null : op.valor)}
                />
              ))}
            </Seccion>
          ))}
        </ScrollView>

        <Pressable onPress={f.cerrar} style={[styles.listo, { backgroundColor: colors.primary }]}>
          <Text style={[type.label, { color: colors.primaryText, fontWeight: '800' }]}>
            {t('filtros.verResultados', { cantidad: resultados })}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[type.caption, { color: colors.textMuted, marginBottom: 6, fontWeight: '700' }]}>
        {titulo.toUpperCase()}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** Botón "Filtros" de la fila del buscador, con contador de filtros activos. */
export function BotonFiltros({ onPress, activos }: { onPress: () => void; activos: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticLeve();
        onPress();
      }}
      style={[
        styles.boton,
        {
          backgroundColor: activos > 0 ? colors.primary : colors.surface,
          borderColor: activos > 0 ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('filtros.titulo')}
    >
      <Ionicons name="options-outline" size={16} color={activos > 0 ? colors.primaryText : colors.text} />
      <Text style={[type.label, { color: activos > 0 ? colors.primaryText : colors.text, fontSize: 13 }]}>
        {t('filtros.titulo')}
        {activos > 0 ? ` (${activos})` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  telon: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: {
    maxHeight: '82%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listo: { alignItems: 'center', paddingVertical: 14, borderRadius: radii.lg, marginTop: 4 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 40,
  },
});
