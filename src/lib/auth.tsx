import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getMyProfile, updateMyProfile } from './api';
import { isSupabaseConfigured, setRememberMe, supabase } from './supabase';
import type { PrivateInfo, Profile, Role } from './types';

type SignUpInput = { email: string; password: string; fullName: string; phone: string; city: string; role: Role };

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  userId: string | null;
  email: string | null;
  emailConfirmed: boolean;
  /** `false` até a pessoa concluir o passo a passo de configuração. */
  onboarded: boolean;
  profile: Profile | null;
  privateInfo: PrivateInfo | null;
  profileError: string | null;
  signIn: (email: string, password: string, remember: boolean, chosenRole: Role) => Promise<Role>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendRecoveryCode: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  reloadProfile: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>, privatePatch?: Partial<PrivateInfo>) => Promise<void>;
  finishOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Traduz as mensagens de erro do Supabase para o português. */
export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/already registered|already been registered/i.test(message)) return 'Este e-mail já tem cadastro. Entre ou recupere sua senha.';
  if (/password should be at least|weak password/i.test(message)) return 'A senha precisa ter pelo menos 8 caracteres, com letras e números.';
  if (/token has expired|invalid|otp/i.test(message) && /token|otp|code/i.test(message)) return 'Código inválido ou expirado. Peça um novo código.';
  if (/only request this after|rate limit|too many/i.test(message)) return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  if (/unable to validate email|invalid email|email address .* is invalid/i.test(message)) return 'Digite um e-mail válido.';
  if (/network|fetch/i.test(message)) return 'Sem conexão com a internet. Verifique e tente novamente.';
  if (/same password|different from the old/i.test(message)) return 'A nova senha precisa ser diferente da anterior.';
  return message || 'Algo deu errado. Tente novamente.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  // Perfil carregado, sempre ligado ao usuário a que pertence (ao sair, deixa de valer sozinho).
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; privateInfo: PrivateInfo | null; error: string | null } | null>(null);
  // Durante a redefinição de senha a sessão só é liberada depois de trocar a senha.
  const holdSession = useRef(false);
  const pendingSession = useRef<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (holdSession.current) {
        pendingSession.current = nextSession;
        return;
      }
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  const profile = loaded && loaded.userId === userId ? loaded.profile : null;
  const privateInfo = loaded && loaded.userId === userId ? loaded.privateInfo : null;
  const profileError = loaded && loaded.userId === userId ? loaded.error : null;

  const fetchProfile = useCallback(async (id: string) => {
    try {
      const result = await getMyProfile(id);
      return { userId: id, profile: result.profile, privateInfo: result.private, error: null };
    } catch (error) {
      return { userId: id, profile: null, privateInfo: null, error: authErrorMessage(error) };
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [userId, fetchProfile]);

  const signIn = useCallback(async (rawEmail: string, password: string, remember: boolean, chosenRole: Role) => {
    setRememberMe(remember);
    const { data, error } = await supabase.auth.signInWithPassword({ email: rawEmail.trim().toLowerCase(), password });
    if (error) throw new Error(authErrorMessage(error));
    const { data: row } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    return (row?.role as Role) ?? chosenRole;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    setRememberMe(true);
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim(), phone: input.phone.trim(), city: input.city.trim(), role: input.role, onboarded: false },
      },
    });
    if (error) throw new Error(authErrorMessage(error));
    // Se identities vier vazio, o e-mail já estava cadastrado.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('Este e-mail já tem cadastro. Entre ou recupere sua senha.');
    }
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    setLoaded(null);
    await supabase.auth.signOut();
  }, []);

  const sendRecoveryCode = useCallback(async (rawEmail: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(rawEmail.trim().toLowerCase());
    if (error) throw new Error(authErrorMessage(error));
  }, []);

  const resetPassword = useCallback(async (rawEmail: string, code: string, newPassword: string) => {
    holdSession.current = true;
    try {
      const { error } = await supabase.auth.verifyOtp({ email: rawEmail.trim().toLowerCase(), token: code.trim(), type: 'recovery' });
      if (error) throw new Error(authErrorMessage(error));
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        await supabase.auth.signOut();
        pendingSession.current = null;
        throw new Error(authErrorMessage(updateError));
      }
    } finally {
      holdSession.current = false;
      const next = pendingSession.current;
      pendingSession.current = null;
      if (next) setSession(next);
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!userId) return;
    const result = await fetchProfile(userId);
    // Uma falha ao atualizar não derruba um perfil que já estava carregado.
    setLoaded((current) => (result.error && current?.userId === userId && current.profile ? current : result));
  }, [userId, fetchProfile]);

  const saveProfile = useCallback(async (patch: Partial<Profile>, privatePatch?: Partial<PrivateInfo>) => {
    if (!userId) return;
    const result = await updateMyProfile(userId, patch, privatePatch);
    setLoaded({ userId, profile: result.profile, privateInfo: result.private, error: null });
  }, [userId]);

  const finishOnboarding = useCallback(async () => {
    const { data, error } = await supabase.auth.updateUser({ data: { onboarded: true } });
    if (error) throw new Error(authErrorMessage(error));
    if (data.user) setSession((current) => (current ? { ...current, user: data.user } : current));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    configured: isSupabaseConfigured,
    userId,
    email,
    emailConfirmed: Boolean(session?.user.email_confirmed_at),
    onboarded: session?.user.user_metadata?.onboarded === true,
    profile,
    privateInfo,
    profileError,
    signIn,
    signUp,
    signOut,
    sendRecoveryCode,
    resetPassword,
    reloadProfile,
    saveProfile,
    finishOnboarding,
  }), [ready, userId, email, session, profile, privateInfo, profileError, signIn, signUp, signOut, sendRecoveryCode, resetPassword, reloadProfile, saveProfile, finishOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

/** Atalho para telas que só aparecem com o usuário logado. */
export function useSignedIn() {
  const auth = useAuth();
  if (!auth.userId || !auth.profile) throw new Error('Usuário não autenticado.');
  return { ...auth, userId: auth.userId, profile: auth.profile };
}
