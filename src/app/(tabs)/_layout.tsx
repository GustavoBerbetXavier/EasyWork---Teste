import { Tabs } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/BottomNav';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function TabsLayout() {
  return (
    <SafeAreaView style={styles.appShell} edges={['top', 'bottom']}>
      <Tabs
        tabBar={(props) => <BottomNav {...props} />}
        backBehavior="history"
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      >
        <Tabs.Screen name="inicio" />
        <Tabs.Screen name="servicos" />
        <Tabs.Screen name="mensagens" />
        <Tabs.Screen name="perfil" />
        <Tabs.Screen name="planos" options={{ href: null }} />
        <Tabs.Screen name="avaliacoes" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
