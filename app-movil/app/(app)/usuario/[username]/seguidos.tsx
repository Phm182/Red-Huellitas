import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { seguimientoApi } from '../../../../src/api/seguimientoApi';
import { usuariosApi } from '../../../../src/api/usuariosApi';
import { ListaUsuarios } from '../../../../src/components/ListaUsuarios';

export default function SeguidosScreen() {
  const { t } = useTranslation();
  const { username } = useLocalSearchParams<{ username: string }>();

  const cargar = async () => {
    const perfil = await usuariosApi.perfilPorUsername(username);
    if (!perfil.success || !perfil.data) return [];
    const res = await seguimientoApi.seguidos(perfil.data.userId);
    return res.success && res.data ? res.data.usuarios : [];
  };

  return <ListaUsuarios cargar={cargar} emptyLabel={t('perfil.emptyFollowing')} />;
}
