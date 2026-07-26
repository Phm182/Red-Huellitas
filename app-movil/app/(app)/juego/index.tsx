import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { juegoApi } from '../../../src/api/juegoApi';
import { MascotaAvatar } from '../../../src/components/MascotaAvatar';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { MascotaJuegoResumen } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function JuegoSelectorScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [mascotas, setMascotas] = useState<MascotaJuegoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      juegoApi.misMascotas().then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const lista = res.data.mascotas;
          // Con una sola mascota el selector no aporta nada: se entra directo.
          if (lista.length === 1) {
            router.replace({ pathname: '/(app)/juego/[mascotaId]', params: { mascotaId: lista[0].mascotaId } });
            return;
          }
          setMascotas(lista);
        } else {
          setMensaje(res.message);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.lista, centeredContent, mascotas.length === 0 && styles.listaEmpty]}
      data={mascotas}
      keyExtractor={(m) => String(m.mascotaId)}
      ListEmptyComponent={
        <EmptyState icon="game-controller-outline" titulo={mensaje ?? t('juego.sinMascotas')} />
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/(app)/juego/[mascotaId]', params: { mascotaId: item.mascotaId } })}
        >
          <MascotaAvatar
            avatarPath={item.avatarPath}
            animo={item.animo}
            especie={item.especie}
            tamano={64}
          />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.nombre}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t(`juego.animo.${item.animo}`)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {item.empezado
                ? `${t('juego.nivel', { nivel: item.nivel })}${item.rachaDias > 0 ? ` · 🔥 ${item.rachaDias}` : ''}`
                : t('juego.sinEmpezar')}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16 },
  listaEmpty: { flexGrow: 1 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
