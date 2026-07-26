import React from 'react';
import { useTranslation } from 'react-i18next';
import { HubScreen } from '../../../src/components/navigation/HubScreen';

export default function SaludScreen() {
  const { t } = useTranslation();
  return <HubScreen hubKey="salud" descripcion={t('nav.saludDesc')} />;
}
