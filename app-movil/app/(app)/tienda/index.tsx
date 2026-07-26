import React from 'react';
import { useTranslation } from 'react-i18next';
import { HubScreen } from '../../../src/components/navigation/HubScreen';

export default function TiendaScreen() {
  const { t } = useTranslation();
  return <HubScreen hubKey="tienda" descripcion={t('nav.tiendaDesc')} />;
}
