import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppIcon, LoadingView, PrimaryButton } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { InboxProvider } from '@/lib/inbox';
import { syncPush, usePushNavigation } from '@/lib/push';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <InboxProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </InboxProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { ready, configured, userId, profile, profileError, onboarded, reloadProfile, signOut } = useAuth();

  if (!configured) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: C.bg }}>
        <AppIcon name="construct-outline" size={34} color={C.muted} />
        <Text style={styles.pageTitle}>App em manutenção</Text>
        <Text style={styles.bodyText}>
          O EASY WORK ainda não está ligado ao banco de dados. Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja CONFIGURACAO.md).
        </Text>
      </View>
    );
  }

  if (!ready || (userId && !profile && !profileError)) return <LoadingView />;

  if (userId && profileError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: C.bg }}>
        <AppIcon name="cloud-offline-outline" size={34} color={C.muted} />
        <Text style={styles.pageTitle}>Não foi possível carregar seu perfil</Text>
        <Text style={styles.bodyText}>{profileError}</Text>
        <PrimaryButton label="Tentar de novo" onPress={reloadProfile} />
        <TouchableOpacity onPress={signOut} style={styles.registerLink}>
          <Text style={styles.registerText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const signedIn = Boolean(userId && profile);

  return <SignedInEffects userId={signedIn ? userId : null}><AppStack signedIn={signedIn} onboarded={onboarded} /></SignedInEffects>;
}

/** Com a conta aberta: registra este aparelho para notificações e abre a conversa ao tocar na notificação. */
function SignedInEffects({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  usePushNavigation(Boolean(userId));
  useEffect(() => {
    if (userId) syncPush(userId);
  }, [userId]);
  return <>{children}</>;
}

function AppStack({ signedIn, onboarded }: { signedIn: boolean; onboarded: boolean }) {

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="recuperar-senha" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="configuracao" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" options={{ contentStyle: { backgroundColor: C.white } }} />
        <Stack.Screen name="profissional/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
