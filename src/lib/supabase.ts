import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Sem as variáveis do .env (ou da Vercel) o app mostra uma tela avisando que falta configurar. */
export const isSupabaseConfigured = supabaseUrl.startsWith('https://') && supabasePublishableKey.length > 20;

/*
 * "Lembrar-me": marcado = sessão guardada no aparelho (continua logado ao reabrir);
 * desmarcado = sessão só na memória (termina ao fechar o app). A senha nunca é salva.
 */
const REMEMBER_KEY = 'ew_remember';
const memorySession = new Map<string, string>();

const sessionStorage = {
  getItem: (key: string) => localStorage.getItem(key) ?? memorySession.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (localStorage.getItem(REMEMBER_KEY) === '0') {
      memorySession.set(key, value);
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
      memorySession.delete(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    memorySession.delete(key);
  },
};

export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://nao-configurado.supabase.co',
  isSupabaseConfigured ? supabasePublishableKey : 'nao-configurado',
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

if (isSupabaseConfigured && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
