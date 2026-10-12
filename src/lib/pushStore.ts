// Guarda no banco o aparelho/navegador que recebe notificações e lembra qual é o deste aparelho,
// para removê-lo ao sair da conta (assim outra pessoa no mesmo aparelho não recebe suas mensagens).
import { supabase } from './supabase';

const DEVICE_TOKEN_KEY = 'ew_push_token';

export async function rememberDeviceToken(_userId: string, kind: 'web' | 'expo', token: string, keys: unknown) {
  const { error } = await supabase.rpc('claim_push_token', { p_kind: kind, p_token: token, p_keys: keys });
  if (error) throw new Error(error.message);
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

export async function forgetDeviceToken() {
  const token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) return;
  await supabase.from('push_subscriptions').delete().eq('token', token);
  localStorage.removeItem(DEVICE_TOKEN_KEY);
}
