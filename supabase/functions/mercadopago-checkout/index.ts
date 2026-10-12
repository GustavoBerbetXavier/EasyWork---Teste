// Cria (ou cancela) a assinatura mensal no Mercado Pago para o usuário logado.
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   MP_ACCESS_TOKEN  — Access Token da sua conta Mercado Pago (Suas integrações > Credenciais)
//   APP_RETURN_URL   — (opcional) página https para onde a pessoa volta depois de pagar
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRICES: Record<string, { amount: number; reason: string }> = {
  basico: { amount: 14.9, reason: 'EASY WORK · Plano Básico' },
  plus: { amount: 29.9, reason: 'EASY WORK · Plano Plus+' },
  premium: { amount: 49.9, reason: 'EASY WORK · Plano Premium' },
  empresarial: { amount: 85, reason: 'EASY WORK · Plano Empresarial' },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamentos ainda não configurados.' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth.user;
  if (!user) return json({ error: 'Entre na sua conta para assinar.' }, 401);

  const { action, plan } = await req.json().catch(() => ({}));
  const price = PRICES[plan];
  if (!price) return json({ error: 'Plano inválido.' }, 400);

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'profissional') {
    return json({ error: 'Os planos são exclusivos para profissionais.' }, 400);
  }

  if (action === 'cancel') {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('id, external_id')
      .eq('user_id', user.id)
      .eq('plan', plan)
      .in('status', ['authorized', 'pending', 'paused']);
    for (const sub of subs ?? []) {
      if (sub.external_id) {
        await fetch(`https://api.mercadopago.com/preapproval/${sub.external_id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      }
      await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
    }
    return json({ ok: true });
  }

  // Um profissional só tem um plano por vez: cancela o anterior quando o novo for autorizado (no webhook).
  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: price.reason,
      external_reference: `${user.id}:${plan}`,
      payer_email: user.email,
      back_url: Deno.env.get('APP_RETURN_URL') ?? 'https://www.mercadopago.com.br',
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: price.amount, currency_id: 'BRL' },
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.init_point) {
    console.error('Mercado Pago', result);
    return json({ error: 'O Mercado Pago recusou a criação da assinatura.' }, 502);
  }

  await admin.from('subscriptions').insert({ user_id: user.id, plan, status: 'pending', external_id: result.id });
  return json({ url: result.init_point });
});
