import React from 'react';
import { useTranslation } from 'react-i18next';
import { HubScreen } from '../../../src/components/navigation/HubScreen';

export default function RescateScreen() {
  const { t } = useTranslation();
  return <HubScreen hubKey="rescate" descripcion={t('nav.rescateDesc')} />;
}
