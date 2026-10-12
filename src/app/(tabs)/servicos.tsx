import React from 'react';

import { ServiceSearch } from '@/features/client/ServiceSearch';
import { MyServices } from '@/features/provider/MyServices';
import { useSignedIn } from '@/lib/auth';

export default function ServicosScreen() {
  const { profile } = useSignedIn();
  return profile.role === 'profissional' ? <MyServices /> : <ServiceSearch />;
}
