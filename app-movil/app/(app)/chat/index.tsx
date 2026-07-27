import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { EmptyState } from '../../../src/components/ui/EmptyState';

export default function ChatScreen() {
  const { t } = useTranslation();
  return (
    <Atmosphere>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          titulo={t('chat.vacio')}
          descripcion={t('chat.vacioDesc')}
        />
      </View>
    </Atmosphere>
  );
}
