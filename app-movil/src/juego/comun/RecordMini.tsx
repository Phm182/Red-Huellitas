import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

/**
 * "Récord: N" chiquito, arriba de todo, mientras se está jugando — para
 * tenerlo siempre a la vista como objetivo a superar, no sólo antes de
 * arrancar (`RecordBadge`, en la pantalla de intro).
 *
 * `null` mientras todavía no llegó del servidor: no se muestra nada (mejor
 * nada que un "Récord: 0" que después salta al número real).
 */
export function RecordMini({ record, color }: { record: number | null; color: string }) {
  const { t } = useTranslation();
  if (record === null) return null;
  return <Text style={{ fontSize: 10, color, marginTop: 2 }}>{t('hueplay.recordMini', { n: record })}</Text>;
}
