import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { cadenasApi } from '../../../src/api/historiasApi';
import { AppButton } from '../../../src/components/AppButton';
import { AppInput } from '../../../src/components/AppInput';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticError, hapticExito } from '../../../src/utils/haptics';

/** Ejemplos que muestran de qué se trata mejor que cualquier explicación. */
const EJEMPLOS = ['Chapuzón', 'Siesta', 'Primer día en casa', 'Antes y después', 'Cara de culpable'];

export default function NuevaCadenaScreen() {
  const { colors } = useTheme();

  const [tema, setTema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    const t = tema.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setError(null);

    const res = await cadenasApi.crear(t, descripcion.trim() || undefined);
    setEnviando(false);

    if (res.success && res.data) {
      hapticExito();
      // Se va directo a la cámara con la cadena adjunta: una cadena sin la
      // primera historia no aparece en el listado, así que dejarlo acá sería
      // crear algo invisible.
      router.replace(`/(app)/historias/nueva?cadenaId=${res.data.cadenaId}` as never);
    } else {
      hapticError();
      setError(res.message);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.contenedor, centeredContent, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.explicacion, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="link" size={22} color={colors.primary} />
        <Text style={[type.bodySm, { color: colors.text, flex: 1 }]}>
          Proponés un tema y el resto lo continúa con su propia historia. La cadena sigue viva aunque
          las historias venzan a las 24hs.
        </Text>
      </View>

      <AppInput
        label="Tema"
        placeholder="Chapuzón"
        value={tema}
        onChangeText={setTema}
        maxLength={60}
        autoFocus
      />

      <Text style={[type.caption, { color: colors.textMuted, marginBottom: 8 }]}>Ideas:</Text>
      <View style={styles.ejemplos}>
        {EJEMPLOS.map((e) => (
          <Text
            key={e}
            onPress={() => setTema(e)}
            style={[
              type.label,
              styles.ejemplo,
              { color: colors.primary, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {e}
          </Text>
        ))}
      </View>

      <AppInput
        label="Descripción (opcional)"
        placeholder="Tu mascota disfrutando del agua"
        value={descripcion}
        onChangeText={setDescripcion}
        maxLength={200}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      {error ? (
        <Text style={[type.bodySm, { color: colors.danger, marginBottom: 12 }]}>{error}</Text>
      ) : null}

      <AppButton
        label="Crear y subir mi historia"
        onPress={crear}
        loading={enviando}
        disabled={!tema.trim()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, flexGrow: 1 },
  explicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 20,
  },
  ejemplos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  ejemplo: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
});
