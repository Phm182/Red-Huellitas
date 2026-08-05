import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/api/authApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { FechaNacimientoField } from '../../src/components/FechaNacimientoField';
import { centeredContent } from '../../src/theme/layout';
import { radii } from '../../src/theme/elevation';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Backfill bloqueante de la fecha de nacimiento.
 *
 * Las cuentas creadas antes de que existiera el campo no tienen edad, y sin
 * edad la protección de menores falla cerrado: el chat queda cerrado. Esta
 * pantalla es la única salida, por eso no tiene botón de volver ni de omitir.
 */
export default function FechaNacimientoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, actualizarUsuario } = useAuth();

  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!fecha) {
      setError(t('fechaNac.incompleta'));
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await authApi.guardarFechaNacimiento(fecha);
    setGuardando(false);

    if (!res.success || !res.data) {
      setError(res.message);
      return;
    }

    if (user) {
      actualizarUsuario({
        ...user,
        fechaNacimiento: res.data.fechaNacimiento,
        requiereFechaNacimiento: false,
        edad: res.data.edad,
      });
    }
    router.replace('/');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenido, centeredContent]}
    >
      <View style={[styles.icono, { backgroundColor: `${colors.primary}1A` }]}>
        <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
      </View>

      <Text style={[styles.titulo, { color: colors.text }]}>{t('fechaNac.titulo')}</Text>
      <Text style={[styles.bajada, { color: colors.textMuted }]}>{t('fechaNac.bajada')}</Text>

      <View style={[styles.caja, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FechaNacimientoField
          value={fecha}
          onChange={(v) => {
            setFecha(v);
            setError(null);
          }}
          label={t('fechaNac.label')}
          ayuda={t('fechaNac.ayuda')}
        />
      </View>

      {error ? (
        <View style={[styles.error, { backgroundColor: `${colors.danger}18`, borderColor: colors.danger }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={guardar}
        disabled={guardando || !fecha}
        style={[
          styles.boton,
          { backgroundColor: !fecha || guardando ? colors.border : colors.primary },
        ]}
      >
        {guardando ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={[styles.botonTexto, { color: colors.surface }]}>{t('fechaNac.guardar')}</Text>
        )}
      </Pressable>

      <Text style={[styles.nota, { color: colors.textMuted }]}>{t('fechaNac.unaVez')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 24, paddingTop: 64, alignItems: 'center' },
  icono: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  titulo: { fontSize: 22, fontFamily: fonts.displaySemi, textAlign: 'center' },
  bajada: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  caja: { width: '100%', borderWidth: 1, borderRadius: radii.lg, padding: 16 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    marginTop: 14,
    width: '100%',
  },
  boton: {
    width: '100%',
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 16 },
  nota: { fontSize: 12, textAlign: 'center', marginTop: 14 },
});
