import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { hueplayApi } from '../../../src/api/hueplayApi';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { PlazoPartidaSelector } from '../../../src/components/ui/PlazoPartidaSelector';
import { PlazoTurnoSelector } from '../../../src/components/ui/PlazoTurnoSelector';
import { esJuegoDuelo, JUEGOS_TURNOS, juegoDelCatalogo } from '../../../src/juego/hueplay/catalogo';
import { HuePlayRival, TorneoFormato } from '../../../src/types/hueplay';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../src/utils/media';

/** Arma un torneo nuevo de un juego de duelo: formato, tamaño, plazos, y a
 * quién invitar de una — el resto se suma con el código o desde el
 * visualizador de torneos abiertos. */
export default function TorneoCrearScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ juego?: string }>();
  const juegoCodigo = params.juego && esJuegoDuelo(params.juego) ? params.juego : 'hueajedrez';
  const tituloJuego = juegoDelCatalogo(juegoCodigo)?.titulo ?? juegoCodigo;
  const esTurnos = JUEGOS_TURNOS.includes(juegoCodigo);

  const [formato, setFormato] = useState<TorneoFormato>('eliminacion');
  const [tamano, setTamano] = useState(8);
  const [esPublico, setEsPublico] = useState(true);
  // Si no se toca el selector, el plazo por turno queda en el máximo (7
  // días) — mismo criterio que `retar.tsx`/`sala-crear.tsx`.
  const [plazoTurnoSegundos, setPlazoTurnoSegundos] = useState(604800);
  const [plazoRondaMinutos, setPlazoRondaMinutos] = useState(0);

  const [busqueda, setBusqueda] = useState('');
  const [rivales, setRivales] = useState<HuePlayRival[]>([]);
  const [invitados, setInvitados] = useState<HuePlayRival[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    hueplayApi.rivales(juegoCodigo, busqueda.trim() || undefined).then((res) => {
      if (res.success && res.data) setRivales(res.data.rivales);
      setLoading(false);
    });
  }, [busqueda, juegoCodigo]);

  const alternar = (r: HuePlayRival) => {
    hapticLeve();
    setInvitados((prev) =>
      prev.some((i) => i.userId === r.userId) ? prev.filter((i) => i.userId !== r.userId) : prev.slice(0, tamano - 1).concat(r)
    );
  };

  const crear = async () => {
    hapticMedio();
    setCreando(true);
    setError(null);
    const res = await hueplayApi.crearTorneo(juegoCodigo, {
      formato,
      tamano,
      esPublico,
      plazoTurnoSegundos,
      plazoRondaMinutos,
      invitadosUserIds: invitados.map((i) => i.userId),
    });
    setCreando(false);
    if (res.success && res.data) {
      hapticExito();
      router.replace({ pathname: '/(app)/hueplay/torneo-lobby/[torneoId]', params: { torneoId: res.data.torneo.torneoId } });
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <Text style={{ color: colors.text, fontFamily: fonts.displaySemi, fontSize: 20, marginBottom: 4 }}>
        {t('hueplay.torneo.nuevo', { juego: tituloJuego })}
      </Text>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.torneo.formato')}</Text>
      <ChipRow
        opciones={[
          { valor: 'eliminacion' as TorneoFormato, label: t('hueplay.torneo.eliminacion') },
          { valor: 'liga' as TorneoFormato, label: t('hueplay.torneo.liga') },
        ]}
        seleccionado={formato}
        onSelect={setFormato}
        scrollable={false}
      />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
        {formato === 'eliminacion' ? t('hueplay.torneo.eliminacionDesc') : t('hueplay.torneo.ligaDesc')}
      </Text>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.torneo.tamano')}</Text>
      <ChipRow
        opciones={[4, 8, 16].map((n) => ({ valor: n, label: String(n) }))}
        seleccionado={tamano}
        onSelect={(n) => {
          setTamano(n);
          if (invitados.length > n - 1) setInvitados(invitados.slice(0, n - 1));
        }}
        scrollable={false}
      />

      <View style={[styles.filaSwitch, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 }}>{t('hueplay.torneo.publico')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {esPublico ? t('hueplay.torneo.publicoDesc') : t('hueplay.torneo.privadoDesc')}
          </Text>
        </View>
        <Switch value={esPublico} onValueChange={setEsPublico} />
      </View>

      {esTurnos ? (
        <>
          <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.plazoTurno')}</Text>
          <PlazoTurnoSelector valorSegundos={plazoTurnoSegundos} onChange={setPlazoTurnoSegundos} />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, paddingHorizontal: 16 }}>
            {t('hueplay.plazoTurnoAyuda')}
          </Text>
        </>
      ) : null}

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.torneo.plazoRonda')}</Text>
      <PlazoPartidaSelector valorMinutos={plazoRondaMinutos} onChange={setPlazoRondaMinutos} />

      <Text style={[styles.seccion, { color: colors.textMuted }]}>{t('hueplay.torneo.invitar', { n: tamano - 1 - invitados.length })}</Text>
      {invitados.length > 0 ? (
        <View style={styles.chips}>
          {invitados.map((i) => (
            <Pressable
              key={i.userId}
              onPress={() => alternar(i)}
              style={[styles.chipInv, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontSize: 12 }} numberOfLines={1}>
                {i.username ? `@${i.username}` : i.nombreCompleto}
              </Text>
              <Ionicons name="close" size={13} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        rivales.map((r) => {
          const marcado = invitados.some((i) => i.userId === r.userId);
          return (
            <Pressable
              key={r.userId}
              onPress={() => alternar(r)}
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
              <Ionicons name={marcado ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={marcado ? colors.primary : colors.textMuted} />
            </Pressable>
          );
        })
      )}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      <Pressable
        disabled={creando}
        onPress={crear}
        style={[styles.botonCrear, { backgroundColor: colors.primary, opacity: creando ? 0.6 : 1 }]}
      >
        {creando ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>{t('hueplay.torneo.crear')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 40 },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radii.lg, padding: 12, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chipInv: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radii.lg, padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  botonCrear: { borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
