import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';

export default function NotificacionesScreen() {
  const { t } = useTranslation();
  return (
    <Atmosphere>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="notifications-outline"
          titulo={t('notificaciones.vacio')}
          descripcion={t('notificaciones.vacioDesc')}
        />
      </View>
    </Atmosphere>
  );
}
