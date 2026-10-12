import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AuthScreen, auth } from '@/components/AuthScreen';
import { AppIcon, DemoNotice, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { C } from '@/theme/colors';

const OPTIONS: { role: Role; title: string; description: string; icon: IconName; background: string; color: string }[] = [
  {
    role: 'contratante',
    title: 'Sou contratante',
    description: 'Quero encontrar profissionais de confiança e contratar serviços perto de mim.',
    icon: 'search-outline',
    background: C.tealLight,
    color: C.teal,
  },
  {
    role: 'profissional',
    title: 'Sou profissional',
    description: 'Quero divulgar meus serviços e receber contatos de clientes da minha região.',
    icon: 'construct-outline',
    background: C.amberLight,
    color: '#D97706',
  },
];

/** Tela inicial: separa contratante de profissional antes do login. */
export default function WelcomeScreen() {
  const { isDemo } = useAuth();
  return (
    <AuthScreen
      showBack={false}
      title="Como você quer usar?"
      subtitle="Escolha seu perfil para entrar ou criar sua conta na EASY WORK."
      footer={<Text style={auth.terms}>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade da EASY WORK.</Text>}
    >
      <View style={welcome.options}>
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.role}
            style={welcome.card}
            onPress={() => router.push({ pathname: '/login', params: { role: option.role } })}
            accessibilityRole="button"
            accessibilityLabel={option.title}
          >
            <View style={[welcome.icon, { backgroundColor: option.background }]}>
              <AppIcon name={option.icon} color={option.color} size={26} />
            </View>
            <View style={welcome.cardBody}>
              <Text style={welcome.cardTitle}>{option.title}</Text>
              <Text style={welcome.cardText}>{option.description}</Text>
            </View>
            <AppIcon name="chevron-forward" color={C.muted} size={20} />
          </TouchableOpacity>
        ))}
      </View>
      {isDemo ? <DemoNotice text="Modo de demonstração: o app ainda não está ligado ao banco de dados. Qualquer e-mail e senha funcionam." /> : null}
    </AuthScreen>
  );
}

const welcome = StyleSheet.create({
  options: { gap: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  icon: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: C.navy, fontSize: 17, fontWeight: '800' },
  cardText: { color: C.secondary, fontSize: 13, lineHeight: 19 },
});
