import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { esJuegoDuelo, JUEGOS_CATALOGO, ordenarJuegos } from '../../juego/hueplay/catalogo';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

type Tipo = 'partida' | 'sala' | 'torneo';

/**
 * El "＋ Crear" de Multiplayer: antes empujaba a `desafios.tsx` (la pantalla
 * vieja, selector de juego + bandeja) y confundía. Ahora es un modal de dos
 * pasos — elegí qué (partida / sala / torneo) y con qué juego — y recién ahí
 * abre la pantalla de configuración puntual.
 */
export function CrearMultiplayerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tipo, setTipo] = useState<Tipo | null>(null);

  const cerrar = () => {
    setTipo(null);
    onClose();
  };

  const opciones: { tipo: Tipo; icono: keyof typeof Ionicons.glyphMap; titulo: string; desc: string }[] = [
    {
      tipo: 'partida',
      icono: 'flash',
      titulo: t('hueplay.multiplayer.crearPartida'),
      desc: t('hueplay.multiplayer.crearPartidaDesc'),
    },
    {
      tipo: 'sala',
      icono: 'people',
      titulo: t('hueplay.multiplayer.crearSala'),
      desc: t('hueplay.multiplayer.crearSalaDesc'),
    },
    {
      tipo: 'torneo',
      icono: 'trophy',
      titulo: t('hueplay.multiplayer.crearTorneo'),
      desc: t('hueplay.multiplayer.crearTorneoDesc'),
    },
  ];

  const juegos = ordenarJuegos(
    JUEGOS_CATALOGO.filter((j) => (tipo === 'sala' ? j.esSala || esJuegoDuelo(j.codigo) : esJuegoDuelo(j.codigo))),
    [],
    (j) => j.codigo,
    (j) => j.titulo
  );

  const elegirJuego = (codigo: string) => {
    hapticLeve();
    const destino =
      tipo === 'partida'
        ? { pathname: '/(app)/hueplay/retar', params: { juego: codigo } }
        : tipo === 'sala'
          ? { pathname: '/(app)/hueplay/sala-crear', params: { juego: codigo } }
          : { pathname: '/(app)/hueplay/torneo-crear', params: { juego: codigo } };
    cerrar();
    router.push(destino as never);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable style={styles.backdrop} onPress={cerrar}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {tipo === null ? (
            <>
              <Text style={[styles.titulo, { color: colors.text }]}>{t('hueplay.multiplayer.crearTitulo')}</Text>
              {opciones.map((o) => (
                <Pressable
                  key={o.tipo}
                  onPress={() => {
                    hapticLeve();
                    setTipo(o.tipo);
                  }}
                  style={[styles.opcion, { borderColor: colors.border }]}
                >
                  <View style={[styles.opcionIcono, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name={o.icono} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>{o.titulo}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{o.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </>
          ) : (
            <>
              <View style={styles.headerPaso}>
                <Pressable onPress={() => setTipo(null)} hitSlop={10} style={styles.volver}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
                <Text style={[styles.titulo, { color: colors.text, marginBottom: 0 }]}>
                  {t('hueplay.multiplayer.elegiJuego')}
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.grilla}>
                {juegos.map((j) => (
                  <Pressable
                    key={j.codigo}
                    onPress={() => elegirJuego(j.codigo)}
                    style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <MaterialCommunityIcons name={j.icono} size={16} color={j.color} />
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12, flexShrink: 1 }}
                    >
                      {j.titulo}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: radii.lg, padding: 18 },
  titulo: { fontFamily: fonts.displaySemi, fontSize: 17, marginBottom: 12 },
  headerPaso: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  volver: { padding: 2 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  opcionIcono: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '47%',
    justifyContent: 'center',
  },
});
