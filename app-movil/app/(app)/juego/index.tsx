import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { juegoApi } from '../../../src/api/juegoApi';
import { MascotaAvatar } from '../../../src/components/MascotaAvatar';
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
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.lista, centeredContent]}
      data={mascotas}
      keyExtractor={(m) => String(m.mascotaId)}
      ListEmptyComponent={
        <Text style={{ color: colors.textMuted, marginTop: 24, textAlign: 'center' }}>
          {mensaje ?? t('juego.sinMascotas')}
        </Text>
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
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
