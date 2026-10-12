import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AuthScreen, auth } from '@/components/AuthScreen';
import { CityPicker } from '@/components/CityPicker';
import { AppIcon, AuthField, Checkbox, PasswordToggle, PrimaryButton } from '@/components/ui';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { isValidEmail, maskPhone, notify, passwordProblem } from '@/lib/format';
import type { Role } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'city' | 'password' | 'confirm' | 'terms' | 'form', string>>;

export default function SignUpScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<Role>(params.role === 'profissional' ? 'profissional' : 'contratante');
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Campo Mourão, PR');
  const [cityPicker, setCityPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Errors = {};
    if (name.trim().split(' ').filter(Boolean).length < 2) next.name = 'Digite seu nome e sobrenome.';
    if (!isValidEmail(email)) next.email = 'Digite um e-mail válido.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Digite um telefone com DDD.';
    if (!city.trim()) next.city = 'Escolha sua cidade.';
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (!problem && confirm !== password) next.confirm = 'As senhas não são iguais.';
    if (!accepted) next.terms = 'Você precisa aceitar os termos para criar a conta.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp({ email, password, fullName: name, phone, city, role });
      if (needsConfirmation) {
        notify('Confirme seu e-mail', `Enviamos um link de confirmação para ${email.trim()}. Depois de confirmar, entre com seu e-mail e senha.`);
        router.replace({ pathname: '/login', params: { role } });
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
      title="Criar conta"
      subtitle={role === 'profissional' ? 'Divulgue seus serviços para clientes da sua região.' : 'Encontre profissionais de confiança perto de você.'}
      footer={
        <TouchableOpacity style={auth.switchRow} onPress={() => router.replace({ pathname: '/login', params: { role } })}>
          <Text style={auth.switchText}>Já tem conta?</Text>
          <Text style={auth.linkStrong}>Entrar</Text>
        </TouchableOpacity>
      }
    >
      <View style={auth.form}>
        <View style={signup.roleRow}>
          {(['contratante', 'profissional'] as Role[]).map((option) => {
            const active = role === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, signup.roleChip, active && styles.filterChipActive]}
                onPress={() => setRole(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <AppIcon name={option === 'profissional' ? 'construct-outline' : 'search-outline'} size={15} color={active ? C.white : C.secondary} />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {option === 'profissional' ? 'Sou profissional' : 'Sou contratante'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <AuthField label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome e sobrenome" autoCapitalize="words" autoComplete="name" error={errors.name} />
        <AuthField label="E-mail" value={email} onChangeText={setEmail} placeholder="nome@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
        <AuthField label="Telefone (WhatsApp)" value={phone} onChangeText={(value) => setPhone(maskPhone(value))} placeholder="(44) 99999-0000" keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
        <View style={signup.cityGroup}>
          <Text style={signup.label}>Cidade</Text>
          <TouchableOpacity style={[signup.cityButton, errors.city ? { borderColor: '#FCA5A5' } : null]} onPress={() => setCityPicker(true)}>
            <AppIcon name="location-outline" color={C.teal} size={18} />
            <Text style={[signup.cityText, !city && { color: C.muted }]}>{city || 'Escolha sua cidade'}</Text>
            <AppIcon name="chevron-down" color={C.secondary} size={18} />
          </TouchableOpacity>
          {errors.city ? <Text style={signup.error}>{errors.city}</Text> : null}
        </View>
        <AuthField
          label="Senha"
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
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repita a senha"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          error={errors.confirm}
        />
        <View style={{ gap: 6 }}>
          <Checkbox
            checked={accepted}
            onToggle={() => setAccepted((value) => !value)}
            label={<Text style={signup.termsText}>Li e concordo com os <Text style={signup.termsStrong}>Termos de Uso</Text> e a <Text style={signup.termsStrong}>Política de Privacidade</Text>.</Text>}
          />
          {errors.terms ? <Text style={signup.error}>{errors.terms}</Text> : null}
        </View>
        {errors.form ? <Text style={auth.formError}>{errors.form}</Text> : null}
        <PrimaryButton label="Criar conta" onPress={submit} loading={loading} />
      </View>
      <CityPicker visible={cityPicker} current={city} onClose={() => setCityPicker(false)} onSelect={(value) => { setCity(value); setCityPicker(false); }} />
    </AuthScreen>
  );
}

const signup = StyleSheet.create({
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 11 },
  cityGroup: { gap: 8 },
  label: { color: C.text, fontSize: 14, fontWeight: '600' },
  cityButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white, paddingHorizontal: 16 },
  cityText: { flex: 1, color: C.text, fontSize: 15 },
  error: { color: C.red, fontSize: 12 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.secondary },
  termsStrong: { color: C.navy, fontWeight: '700' },
});
