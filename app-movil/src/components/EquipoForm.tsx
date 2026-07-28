import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppInput } from './AppInput';
import { ChipRow } from './ui/ChipRow';
import { DatosEquipo } from '../api/equiposApi';
import { TipoEquipo } from '../types/equipo';
import { radii } from '../theme/elevation';
import { centeredContent } from '../theme/layout';
import { fonts } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';

type Props = {
  tipos: TipoEquipo[];
  inicial?: Partial<DatosEquipo>;
  guardando: boolean;
  labelGuardar: string;
  onSubmit: (datos: DatosEquipo) => void;
};

/**
 * Formulario de alta y edición de un equipo.
 *
 * Es el mismo en los dos lados —los campos que se cargan al crear son los que
 * se corrigen después— así que vive en un componente y no duplicado en dos
 * pantallas que se irían separando con cada retoque.
 */
export function EquipoForm({ tipos, inicial, guardando, labelGuardar, onSubmit }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState(inicial?.tipo ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '');
  const [sitioWeb, setSitioWeb] = useState(inicial?.sitioWeb ?? '');
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '');
  const [zonaDescripcion, setZonaDescripcion] = useState(inicial?.zonaDescripcion ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    inicial?.zonaLat != null && inicial?.zonaLng != null
      ? { lat: inicial.zonaLat, lng: inicial.zonaLng }
      : null
  );
  const [ubicando, setUbicando] = useState(false);

  const obtenerUbicacion = async () => {
    hapticLeve();
    setUbicando(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
    setUbicando(false);
  };

  const puedeGuardar = nombre.trim().length > 0 && tipo !== '' && !guardando;

  return (
    <ScrollView contentContainerStyle={[styles.container, centeredContent]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('equipos.nombreLabel')}</Text>
      <AppInput
        value={nombre}
        onChangeText={setNombre}
        placeholder={t('equipos.nombrePlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('equipos.tipoLabel')}</Text>
      <ChipRow
        opciones={tipos.map((tp) => ({ valor: tp.codigo, label: tp.nombre }))}
        seleccionado={tipo}
        onSelect={setTipo}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('equipos.descripcionLabel')}</Text>
      <AppInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('equipos.descripcionPlaceholder')}
        multiline
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('equipos.contactoLabel')}</Text>
      <AppInput value={email} onChangeText={setEmail} placeholder="contacto@ejemplo.org" keyboardType="email-address" autoCapitalize="none" />
      <AppInput value={telefono} onChangeText={setTelefono} placeholder="+54 11 …" keyboardType="phone-pad" />
      <AppInput value={sitioWeb} onChangeText={setSitioWeb} placeholder="https://…" autoCapitalize="none" />

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.direccionLabel')}</Text>
      <AppInput
        value={direccion}
        onChangeText={setDireccion}
        placeholder={t('campanias.direccionPlaceholder')}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('campanias.zonaLabel')}</Text>
      <AppInput
        value={zonaDescripcion}
        onChangeText={setZonaDescripcion}
        placeholder={t('campanias.zonaPlaceholder')}
      />

      <Pressable
        onPress={obtenerUbicacion}
        disabled={ubicando}
        style={[styles.ubicacion, { borderColor: colors.primary }]}
      >
        {ubicando ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons
              name={coords ? 'checkmark-circle' : 'location-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {coords ? t('onboarding.locationObtained') : t('onboarding.getLocation')}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() =>
          onSubmit({
            nombre: nombre.trim(),
            tipo,
            descripcion: descripcion.trim() || undefined,
            email: email.trim() || undefined,
            telefono: telefono.trim() || undefined,
            sitioWeb: sitioWeb.trim() || undefined,
            direccion: direccion.trim() || undefined,
            zonaDescripcion: zonaDescripcion.trim() || undefined,
            zonaLat: coords?.lat ?? null,
            zonaLng: coords?.lng ?? null,
          })
        }
        disabled={!puedeGuardar}
        style={[
          styles.guardar,
          { backgroundColor: puedeGuardar ? colors.primary : colors.border },
        ]}
      >
        {guardando ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>{labelGuardar}</Text>
        )}
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, marginTop: 14, marginBottom: 6 },
  ubicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 12,
    marginTop: 12,
  },
  guardar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: 14,
    marginTop: 22,
  },
});
