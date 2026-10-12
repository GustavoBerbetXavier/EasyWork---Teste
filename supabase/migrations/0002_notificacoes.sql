-- =====================================================================
-- EASY WORK — notificações de mensagens (navegador e celular)
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- =====================================================================

-- Cada aparelho/navegador onde a pessoa ativou as notificações.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('web', 'expo')),
  -- web: endereço do navegador (endpoint); expo: token do celular (ExponentPushToken[...])
  token text not null unique,
  -- web: chaves de criptografia do navegador (p256dh e auth)
  keys jsonb,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "usuário vê os próprios aparelhos" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "usuário cadastra os próprios aparelhos" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "usuário remove os próprios aparelhos" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke update on public.push_subscriptions from anon, authenticated;

-- Registra o aparelho para o usuário logado. Se o aparelho era de outra conta
-- (ex.: alguém saiu e outra pessoa entrou no mesmo celular), passa a ser deste usuário.
create or replace function public.claim_push_token(p_kind text, p_token text, p_keys jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  delete from public.push_subscriptions where token = p_token;
  insert into public.push_subscriptions (user_id, kind, token, keys)
  values ((select auth.uid()), p_kind, p_token, p_keys);
end;
$$;

revoke execute on function public.claim_push_token(text, text, jsonb) from public, anon;
grant execute on function public.claim_push_token(text, text, jsonb) to authenticated;
