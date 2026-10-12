import { router } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Role } from '@/lib/types';
import { C } from '@/theme/colors';
import { AppIcon, Brand } from './ui';

/** Estrutura das telas de acesso (medidas do layout de Login no Figma). */
export function AuthScreen({
  role,
  title,
  subtitle,
  showBack = true,
  children,
  footer,
}: {
  role?: Role;
  title: string;
  subtitle: string;
  showBack?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <SafeAreaView style={auth.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={auth.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={auth.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {showBack ? (
            <TouchableOpacity
              style={auth.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityLabel="Voltar"
            >
              <AppIcon name="arrow-back" color={C.navy} size={22} />
            </TouchableOpacity>
          ) : null}
          <View style={auth.top}>
            <Brand variant="login" badge={role === 'profissional' ? 'PRESTADOR' : undefined} />
            <View style={auth.intro}>
              <Text style={auth.title}>{title}</Text>
              <Text style={auth.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>
          {footer ? <View style={auth.bottom}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const auth = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 27, width: '100%', maxWidth: 460, alignSelf: 'center' },
  backButton: { position: 'absolute', top: 8, left: 16, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  top: { gap: 24 },
  intro: { gap: 8 },
  title: { textAlign: 'center', fontSize: 28, lineHeight: 34, fontWeight: '700', color: C.navy },
  subtitle: { textAlign: 'center', color: C.secondary, fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkStrong: { fontSize: 14, color: C.navy, fontWeight: '700' },
  bottom: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 32, gap: 24 },
  terms: { color: C.secondary, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  switchText: { fontSize: 14, color: C.secondary },
  formError: { color: C.red, fontSize: 13, textAlign: 'center' },
});
