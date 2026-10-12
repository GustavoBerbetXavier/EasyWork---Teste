import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Sem as variáveis do .env o app roda em modo demonstração (dados locais, nada vai para a internet). */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && !supabaseUrl.includes('SEU-PROJETO') && supabasePublishableKey.length > 20 && !supabasePublishableKey.includes('xxxx');

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

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
