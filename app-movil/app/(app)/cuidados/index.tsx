import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ESPECIES } from '../../../src/constants/especies';
import { cuidadosApi } from '../../../src/api/saludApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { CategoriaCuidado, CuidadoRecomendacion, EspecieCuidado } from '../../../src/types';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { hapticLeve } from '../../../src/utils/haptics';

const ICONO_CATEGORIA: Record<CategoriaCuidado, keyof typeof Ionicons.glyphMap> = {
  alimentacion: 'restaurant-outline',
  higiene: 'water-outline',
  salud: 'medkit-outline',
  ejercicio: 'walk-outline',
  convivencia: 'home-outline',
};

/**
 * Guías de cuidado por especie.
 *
 * Se despliegan en la misma pantalla en vez de abrir un detalle: son textos
 * cortos y obligar a entrar y volver por cada uno haría que nadie los lea.
 */
export default function CuidadosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [especie, setEspecie] = useState<EspecieCuidado | null>(null);
  const [items, setItems] = useState<CuidadoRecomendacion[]>([]);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback((cual?: EspecieCuidado) => {
    setLoading(true);
    cuidadosApi.listar(cual).then((res) => {
      if (res.success && res.data) {
        setEspecie(res.data.especie);
        setItems(res.data.cuidados);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (especie === null) cargar();
    }, [cargar, especie])
  );

  const filtrados = useMemo(
    () =>
      filtrarPorTexto(items, busqueda, (c) => [
        c.titulo,
        c.resumen,
        c.cuerpo,
        t(`cuidados.categoria.${c.categoria}`),
      ]),
    [items, busqueda, t]
  );

  const categorias = [...new Set(filtrados.map((c) => c.categoria))] as CategoriaCuidado[];

  return (
    <Atmosphere>
      <ScrollView contentContainerStyle={[styles.contenedor, centeredContent]} showsVerticalScrollIndicator={false}>
        <Text style={[type.bodySm, { color: colors.textMuted, marginBottom: 12 }]}>
          {t('cuidados.subtitulo')}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          {ESPECIES.map((e) => {
            const activa = especie === e;
            return (
              <Pressable
                key={e}
                onPress={() => {
                  hapticLeve();
                  setAbierto(null);
                  setBusqueda('');
                  cargar(e);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: activa ? colors.primary : colors.border,
                    backgroundColor: activa ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: activa ? colors.primaryText : colors.text,
                    fontFamily: fonts.bodySemi,
                    fontSize: 13,
                  }}
                >
                  {t(`cuidados.especie.${e}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginHorizontal: -16 }}>
          <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon="book-outline"
            titulo={busqueda.trim() ? t('common.sinResultadosBusqueda') : t('cuidados.emptyLista')}
          />
        ) : (
          categorias.map((cat) => (
            <View key={cat} style={{ marginBottom: 18 }}>
              <View style={styles.catTitulo}>
                <Ionicons name={ICONO_CATEGORIA[cat]} size={16} color={colors.accent} />
                <Text style={[type.label, { color: colors.textMuted }]}>{t(`cuidados.categoria.${cat}`)}</Text>
              </View>

              {filtrados
                .filter((c) => c.categoria === cat)
                .map((c, i) => {
                  const expandida = abierto === c.cuidadoId;
                  return (
                    <Animated.View key={c.cuidadoId} entering={FadeInDown.delay(30 + i * 25).springify()}>
                      <Pressable
                        onPress={() => {
                          hapticLeve();
                          setAbierto(expandida ? null : c.cuidadoId);
                        }}
                        style={[
                          styles.tarjeta,
                          elevation.sm,
                          { backgroundColor: colors.surface, borderColor: expandida ? colors.primary : colors.border },
                        ]}
                      >
                        <View style={styles.tarjetaCabecera}>
                          <Text style={[styles.titulo, { color: colors.text }]}>{c.titulo}</Text>
                          <Ionicons
                            name={expandida ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.textMuted}
                          />
                        </View>
                        <Text style={[type.bodySm, { color: colors.textMuted }]}>{c.resumen}</Text>

                        {expandida ? (
                          <Text style={[styles.cuerpo, { color: colors.text, borderTopColor: colors.border }]}>
                            {c.cuerpo}
                          </Text>
                        ) : null}
                      </Pressable>
                    </Animated.View>
                  );
                })}
            </View>
          ))
        )}
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  chipsScroll: { flexGrow: 0, flexShrink: 0, marginHorizontal: -16, marginBottom: 12 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  catTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 2 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, padding: 14, marginBottom: 8, gap: 4 },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 15, flex: 1 },
  cuerpo: { fontSize: 14, lineHeight: 21, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
