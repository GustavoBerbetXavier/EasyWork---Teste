import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { AuthScreen, auth } from '@/components/AuthScreen';
import { AuthField, Checkbox, PasswordToggle, PrimaryButton } from '@/components/ui';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { isValidEmail, notify } from '@/lib/format';
import type { Role } from '@/lib/types';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === 'profissional' ? 'profissional' : 'contratante';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Digite um e-mail válido.';
    if (!password) nextErrors.password = 'Digite sua senha.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      const accountRole = await signIn(email, password, rememberMe, role);
      if (accountRole !== role) {
        notify(
          'Conta encontrada',
          accountRole === 'profissional'
            ? 'Esta conta está cadastrada como profissional. Abrimos a área do profissional.'
            : 'Esta conta está cadastrada como contratante. Abrimos a área do contratante.',
        );
      }
    } catch (error) {
      setErrors({ form: authErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      role={role}
      title="Entrar"
      subtitle="Acesse sua conta para gerenciar seus projetos e acompanhar o trabalho da sua equipe."
      footer={
        <>
          <Text style={auth.terms}>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade da EASY WORK.</Text>
          <TouchableOpacity style={auth.switchRow} onPress={() => router.push({ pathname: '/cadastro', params: { role } })}>
            <Text style={auth.switchText}>Não tem conta?</Text>
            <Text style={auth.linkStrong}>Criar conta</Text>
          </TouchableOpacity>
        </>
      }
    >
      <View style={auth.form}>
        <AuthField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder={role === 'profissional' ? 'nome@empresa.com' : 'nome@email.com'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
          returnKeyType="next"
        />
        <AuthField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          error={errors.password}
          returnKeyType="go"
          onSubmitEditing={submit}
          right={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />}
        />
        <View style={auth.actionsRow}>
          <Checkbox checked={rememberMe} label="Lembrar-me" onToggle={() => setRememberMe((value) => !value)} />
          <TouchableOpacity onPress={() => router.push({ pathname: '/recuperar-senha', params: { role, email } })}>
            <Text style={auth.linkStrong}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>
        {errors.form ? <Text style={auth.formError}>{errors.form}</Text> : null}
        <PrimaryButton label="Entrar" onPress={submit} loading={loading} />
      </View>
    </AuthScreen>
  );
}
