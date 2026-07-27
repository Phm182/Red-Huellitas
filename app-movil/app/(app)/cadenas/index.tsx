import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cadenasApi } from '../../../src/api/historiasApi';
import { Cadena } from '../../../src/types';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListEndAddButton } from '../../../src/components/ui/ListEndAddButton';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/** Avatares apilados de los últimos que se sumaron. */
function PilaAvatares({ cadena }: { cadena: Cadena }) {
  const { colors } = useTheme();
  const preview = cadena.participantesPreview;

  return (
    <View style={styles.pila}>
      {preview.map((p, i) => (
        <View key={p.userId} style={[styles.pilaItem, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
          {p.avatarPath ? (
            <Image
              source={{ uri: rhMediaUrl(p.avatarPath) }}
              style={[styles.pilaAvatar, { borderColor: colors.surface }]}
              contentFit="cover"
              transition={160}
            />
          ) : (
            <View
              style={[
                styles.pilaAvatar,
                styles.pilaVacio,
                { backgroundColor: colors.accentSoft, borderColor: colors.surface },
              ]}
            >
              <Ionicons name="person" size={12} color={colors.accent} />
            </View>
          )}
        </View>
      ))}
      {cadena.totalParticipantes > preview.length ? (
        <View style={[styles.pilaMas, { backgroundColor: colors.backgroundAlt, borderColor: colors.surface }]}>
          <Text style={[type.caption, { color: colors.textMuted }]}>
            +{cadena.totalParticipantes - preview.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Explorar cadenas.
 *
 * Vienen ordenadas por actividad reciente (la última historia vigente), no por
 * fecha de creación: una cadena vieja a la que alguien se sumó recién es más
 * interesante que una nueva y muerta.
 */
export default function CadenasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [cadenas, setCadenas] = useState<Cadena[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    cadenasApi.listar().then((res) => {
      if (res.success && res.data) {
        setCadenas(res.data.cadenas);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const cargarMas = async () => {
    if (!nextCursor) return;
    const res = await cadenasApi.listar(nextCursor);
    if (res.success && res.data) {
      setCadenas((prev) => [...prev, ...res.data!.cadenas]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const onRefrescar = async () => {
    setRefrescando(true);
    const res = await cadenasApi.listar();
    if (res.success && res.data) {
      setCadenas(res.data.cadenas);
      setNextCursor(res.data.nextCursor);
    }
    setRefrescando(false);
  };

  if (loading) return <SkeletonList />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={[styles.lista, centeredContent]}
        data={cadenas}
        keyExtractor={(c) => String(c.cadenaId)}
        refreshing={refrescando}
        onRefresh={onRefrescar}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState
            icon="link-outline"
            titulo="Todavía no hay cadenas"
            descripcion="Una cadena es un tema que alguien propone y el resto continúa con su propia historia. Creá la primera."
            accionLabel="Crear una cadena"
            onAccion={() => router.push('/(app)/cadenas/nueva')}
          />
        }
        ListFooterComponent={
          cadenas.length > 0 ? (
            <ListEndAddButton
              label={t('cadenas.tituloNueva')}
              onPress={() => router.push('/(app)/cadenas/nueva')}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).springify()}>
            <Pressable
              style={[
                styles.card,
                elevation.sm,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => router.push(`/(app)/cadenas/${item.cadenaId}` as never)}
            >
              <View style={styles.cardEncabezado}>
                <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="link" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.titleSm, { color: colors.text }]} numberOfLines={1}>
                    {item.tema}
                  </Text>
                  {item.creador ? (
                    <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                      La empezó {item.creador.nombreCompleto}
                    </Text>
                  ) : null}
                </View>
                {item.yaParticipa ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                ) : null}
              </View>

              {item.descripcion ? (
                <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 8 }]} numberOfLines={2}>
                  {item.descripcion}
                </Text>
              ) : null}

              <View style={styles.cardPie}>
                <PilaAvatares cadena={item} />
                <Text style={[type.caption, { color: colors.textMuted }]}>
                  {item.totalHistorias} {item.totalHistorias === 1 ? 'historia' : 'historias'} ahora
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: radii.md, padding: 16, marginBottom: 12 },
  cardEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 42, height: 42, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  cardPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  pila: { flexDirection: 'row', alignItems: 'center' },
  pilaItem: {},
  pilaAvatar: { width: 28, height: 28, borderRadius: radii.pill, borderWidth: 2 },
  pilaVacio: { alignItems: 'center', justifyContent: 'center' },
  pilaMas: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
});
