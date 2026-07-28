import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TipoEquipo } from '../types/equipo';

type Props = {
  tipo: TipoEquipo;
  /** El tilde de verificado, que lo pone moderación. */
  verificado?: boolean;
  size?: 'sm' | 'md';
};

/**
 * La insignia de un equipo: ícono + nombre del tipo, en el color del tipo.
 *
 * El ícono y el color vienen del catálogo del backend (TipoEquipoCatalogo) y
 * no de un mapa acá: así, sumar "Municipalidad" o "Cátedra veterinaria" es
 * una fila en la base y no un deploy de la app.
 */
export function InsigniaEquipo({ tipo, verificado = false, size = 'md' }: Props) {
  const chico = size === 'sm';
  const alto = chico ? 20 : 24;
  const fuente = chico ? 10 : 12;
  const icono = chico ? 11 : 13;

  return (
    <View
      style={[
        styles.caja,
        {
          height: alto,
          borderRadius: alto / 2,
          paddingHorizontal: chico ? 7 : 9,
          backgroundColor: tipo.color + '22',
          borderColor: tipo.color + '66',
        },
      ]}
    >
      <Ionicons name={tipo.icono as never} size={icono} color={tipo.color} />
      <Text style={{ color: tipo.color, fontWeight: '700', fontSize: fuente }}>{tipo.nombre}</Text>
      {verificado ? <Ionicons name="checkmark-circle" size={icono} color={tipo.color} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
