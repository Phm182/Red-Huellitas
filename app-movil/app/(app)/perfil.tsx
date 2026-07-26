import React from 'react';
import { useAuth } from '../../src/auth/AuthProvider';
import { PerfilBody } from '../../src/components/PerfilBody';

export default function MiPerfilScreen() {
  const { user } = useAuth();
  if (!user) return null;
  // key estable: no remountar PerfilBody cuando solo cambia avatarPath del user.
  return <PerfilBody userId={user.userId} />;
}
