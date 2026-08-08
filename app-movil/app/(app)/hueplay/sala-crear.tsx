import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { HuePlayRival, PoliticaAbandonoSala } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

const PLAZOS = [1, 6, 12, 24];
const POLITICAS: PoliticaAbandonoSala[] = ['espera', 'ia', 'expulsa'];

/**
 * Arma una sala nueva: cuántos asientos, si se completan con IA, qué pasa si
 * alguien no responde a tiempo, y a quién invitar de una — el resto se puede
 * sumar después con el código, desde el lobby.
 */
export default function SalaCrearScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ juego?: string }>();
  const juegoCodigo = params.juego === 'huerummy' ? 'huerummy' : 'hueludo';
  const tituloJuego = juegoCodigo === 'huerummy' ? 'HueRummy' : 'HueLudo';

  const [maxJugadores, setMaxJugadores] = useState(4);
  const [completarConIA, setCompletarConIA] = useState(true);
  const [politicaAbandono, setPoliticaAbandono] = useState<PoliticaAbandonoSala>('espera');
  const [plazoTurnoHoras, setPlazoTurnoHoras] = useState(24);

  const [busqueda, setBusqueda] = useState('');
  const [rivales, setRivales] = useState<HuePlayRival[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitados, setInvitados] = useState<HuePlayRival[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    hueplayApi.rivales(juegoCodigo, busqueda.trim() || undefined).then((res) => {
      if (res.success && res.data) setRivales(res.data.rivales);
      setLoading(false);
    });
  }, [busqueda, juegoCodigo]);

  const alternarInvitado = (r: HuePlayRival) => {
    hapticLeve();
    setInvitados((prev) =>
      prev.some((i) => i.userId === r.userId) ? prev.filter((i) => i.userId !== r.userId) : [...prev, r]
    );
  };

  const cuposLibres = maxJugadores - 1 - invitados.length;

  const crear = async () => {
    hapticMedio();
    setCreando(true);
    setError(null);
    const res = await hueplayApi.crearSala(juegoCodigo, {
      maxJugadores,
      completarConIA,
      politicaAbandono,
      plazoTurnoHoras,
      invitadosUserIds: invitados.map((i) => i.userId),
    });
    setCreando(false);
    if (res.success && res.data) {
      hapticExito();
      router.replace({ pathname: '/(app)/hueplay/sala-lobby/[salaId]', params: { salaId: res.data.sala.salaId } });
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <Text style={{ color: colors.text, fontFamily: fonts.displaySemi, fontSize: 20, marginBottom: 4 }}>
        {t('hueplay.sala.nuevaSala', { juego: tituloJuego })}
      </Text>
      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.sala.cuantosJugadores')}</Text>
      <ChipRow
        opciones={[2, 3, 4].map((n) => ({ valor: n, label: String(n) }))}
        seleccionado={maxJugadores}
        onSelect={(n) => {
          setMaxJugadores(n);
          if (invitados.length > n - 1) setInvitados(invitados.slice(0, n - 1));
        }}
        scrollable={false}
      />

      <View style={[styles.filaSwitch, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.sala.completarConIA')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.sala.completarConIADesc')}</Text>
        </View>
        <Switch value={completarConIA} onValueChange={setCompletarConIA} />
      </View>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.sala.siAlguienNoResponde')}</Text>
      <ChipRow
        opciones={POLITICAS.map((p) => ({ valor: p, label: t(`hueplay.sala.politica.${p}`) }))}
        seleccionado={politicaAbandono}
        onSelect={setPoliticaAbandono}
        scrollable={false}
      />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
        {t(`hueplay.sala.politica.${politicaAbandono}Desc`)}
      </Text>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.plazoTurno')}</Text>
      <ChipRow
        opciones={PLAZOS.map((h) => ({ valor: h, label: t('hueplay.plazoHoras', { n: h }) }))}
        seleccionado={plazoTurnoHoras}
        onSelect={setPlazoTurnoHoras}
        scrollable={false}
      />

      <Text style={[styles.seccion, { color: colors.textMuted }]}>
        {t('hueplay.sala.invitarGente', { n: cuposLibres })}
      </Text>

      {invitados.length > 0 ? (
        <View style={styles.invitadosFila}>
          {invitados.map((i) => (
            <Pressable
              key={i.userId}
              onPress={() => alternarInvitado(i)}
              style={[styles.invitadoChip, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontSize: 12 }} numberOfLines={1}>
                {i.username ? `@${i.username}` : i.nombreCompleto}
              </Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {cuposLibres > 0 ? <ListSearchBar value={busqueda} onChangeText={setBusqueda} /> : null}

      {cuposLibres > 0 ? (
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          rivales.map((r) => {
            const marcado = invitados.some((i) => i.userId === r.userId);
            return (
              <Pressable
                key={r.userId}
                onPress={() => alternarInvitado(r)}
                style={[styles.fila, { backgroundColor: colors.surface, borderColor: marcado ? colors.primary : colors.border }]}
              >
                {r.avatarPath ? (
                  <Image source={{ uri: rhAvatarUrl(r.avatarPath) }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="person" size={18} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
                    {r.username ? `@${r.username}` : r.nombreCompleto}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('hueplay.nivelCorto', { n: r.nivel })}</Text>
                </View>
                <Ionicons
                  name={marcado ? 'checkmark-circle' : 'add-circle-outline'}
                  size={22}
                  color={marcado ? colors.primary : colors.textMuted}
                />
              </Pressable>
            );
          })
        )
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      <Pressable
        disabled={creando}
        onPress={crear}
        style={[styles.botonCrear, { backgroundColor: colors.primary, opacity: creando ? 0.6 : 1 }]}
      >
        {creando ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>
            {t('hueplay.sala.crearSala')}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.push('/(app)/hueplay/sala-unirse' as never)} style={styles.unirseLink}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>{t('hueplay.sala.tenesCodigo')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginTop: 14,
  },
  invitadosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  invitadoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  botonCrear: { borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  unirseLink: { alignItems: 'center', marginTop: 14, padding: 8 },
});
