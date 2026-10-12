import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { AuthScreen, auth } from '@/components/AuthScreen';
import { AuthField, DemoNotice, PasswordToggle, PrimaryButton } from '@/components/ui';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { isValidEmail, notify, passwordProblem } from '@/lib/format';
import type { Role } from '@/lib/types';
import { C } from '@/theme/colors';

const RESEND_SECONDS = 60;

export default function RecoverPasswordScreen() {
  const params = useLocalSearchParams<{ role?: string; email?: string }>();
  const role: Role = params.role === 'profissional' ? 'profissional' : 'contratante';
  const { sendRecoveryCode, resetPassword, isDemo } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'email' | 'code' | 'password' | 'confirm' | 'form', string>>>({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setErrors({ email: 'Digite um e-mail válido.' });
      return;
    }
    if (isDemo) {
      notify('Modo de demonstração', 'A recuperação de senha funciona quando o app estiver ligado ao banco de dados (Supabase).');
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await sendRecoveryCode(email);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      setErrors({ form: authErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const next: typeof errors = {};
    if (!/^\d{6,10}$/.test(code.trim())) next.code = 'Digite o código que chegou no seu e-mail.';
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (!problem && confirm !== password) next.confirm = 'As senhas não são iguais.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await resetPassword(email, code, password);
      notify('Senha alterada', 'Pronto! Sua nova senha já está valendo e você está conectado.');
    } catch (error) {
      setErrors({ form: authErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      role={role}
      title="Recuperar senha"
      subtitle={
        step === 'email'
          ? 'Digite o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.'
          : `Enviamos um código para ${email.trim()}. Digite o código e escolha sua nova senha.`
      }
      footer={
        <TouchableOpacity style={auth.switchRow} onPress={() => router.replace({ pathname: '/login', params: { role } })}>
          <Text style={auth.switchText}>Lembrou a senha?</Text>
          <Text style={auth.linkStrong}>Entrar</Text>
        </TouchableOpacity>
      }
    >
      {step === 'email' ? (
        <View style={auth.form}>
          <AuthField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="nome@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          {errors.form ? <Text style={auth.formError}>{errors.form}</Text> : null}
          <PrimaryButton label="Enviar código" onPress={sendCode} loading={loading} />
          {isDemo ? <DemoNotice text="Modo de demonstração: a recuperação de senha será ativada quando o Supabase estiver configurado." /> : null}
        </View>
      ) : (
        <View style={auth.form}>
          <AuthField
            label="Código de verificação"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 10))}
            placeholder="000000"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            error={errors.code}
          />
          <AuthField
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres, letras e números"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
            right={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />}
          />
          <AuthField
            label="Confirmar nova senha"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a nova senha"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            error={errors.confirm}
          />
          {errors.form ? <Text style={auth.formError}>{errors.form}</Text> : null}
          <PrimaryButton label="Redefinir senha" onPress={reset} loading={loading} />
          <View style={auth.actionsRow}>
            <TouchableOpacity onPress={() => { setStep('email'); setErrors({}); }}>
              <Text style={auth.switchText}>Trocar e-mail</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendCode} disabled={cooldown > 0 || loading}>
              <Text style={[auth.linkStrong, cooldown > 0 && { color: C.muted }]}>
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AuthScreen>
  );
}
