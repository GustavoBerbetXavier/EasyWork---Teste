import React from 'react';

import { ClientHome } from '@/features/client/ClientHome';
import { ProviderDashboard } from '@/features/provider/ProviderDashboard';
import { useSignedIn } from '@/lib/auth';

export default function InicioScreen() {
  const { profile } = useSignedIn();
  return profile.role === 'profissional' ? <ProviderDashboard /> : <ClientHome />;
}
