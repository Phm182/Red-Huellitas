import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { PerfilBody } from '../../../src/components/PerfilBody';

export default function PerfilUsuarioScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <PerfilBody username={username} />;
}
