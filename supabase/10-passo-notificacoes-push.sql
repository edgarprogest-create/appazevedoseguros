-- ============================================================
-- EXA Seguros — 10. NOTIFICAÇÕES COM A APP FECHADA (Web Push)
--
-- ANTES de correr este script, criar a Edge Function "enviar-avisos"
-- (Edge Functions → Deploy a new function → Via Editor → nome: enviar-avisos,
--  colar o ficheiro supabase/functions/enviar-avisos/index.ts → Deploy).
--
-- Depois correr este script UMA vez (SQL Editor → New query → Run).
-- Pode correr de novo sem problema.
--
-- O que faz:
--  • push_subscricoes: um registo por telemóvel que aceitou notificações
--    (com as preferências escolhidas no Perfil da app)
--  • push_enviados: o que já foi enviado (para não repetir)
--  • push_config: chaves de envio e segredo do agendamento (gerados sozinhos)
--  • Agenda o envio diário às 09:00 (hora de Lisboa no inverno; 10:00 no verão)
--  • Chama a função uma vez agora, para ela criar as chaves de envio
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Registos dos telemóveis
create table if not exists public.push_subscricoes (
  endpoint      text primary key,
  auth_id       uuid not null references auth.users(id) on delete cascade,
  p256dh        text not null,
  auth          text not null,
  prefs         jsonb not null default '{}'::jsonb,
  user_agent    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists push_subscricoes_auth_idx on public.push_subscricoes(auth_id);

-- Histórico de envios (evita repetir o mesmo aviso)
create table if not exists public.push_enviados (
  chave      text primary key,
  enviado_em timestamptz not null default now()
);

-- Configuração interna (chaves VAPID e segredo do agendamento)
create table if not exists public.push_config (
  chave text primary key,
  valor text not null
);
insert into public.push_config (chave, valor)
values ('cron_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (chave) do nothing;

-- Só a Edge Function (service role) mexe nestas tabelas diretamente
alter table public.push_subscricoes enable row level security;
alter table public.push_enviados    enable row level security;
alter table public.push_config      enable row level security;
revoke all on public.push_subscricoes, public.push_enviados, public.push_config from anon, authenticated;

-- A app pede a chave pública para registar o telemóvel
create or replace function public.push_chave_publica()
returns text language sql stable security definer set search_path = public as $$
  select valor from public.push_config where chave = 'vapid_public';
$$;

-- A app guarda (ou atualiza) o registo do telemóvel e as preferências do cliente
create or replace function public.guardar_push(p_endpoint text, p_p256dh text, p_auth text, p_prefs jsonb, p_ua text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if coalesce(p_endpoint,'') !~ '^https://' or coalesce(p_p256dh,'') = '' or coalesce(p_auth,'') = '' then
    return false;
  end if;
  insert into public.push_subscricoes (endpoint, auth_id, p256dh, auth, prefs, user_agent)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, coalesce(p_prefs,'{}'::jsonb), left(p_ua, 200))
  on conflict (endpoint) do update
    set auth_id = excluded.auth_id, p256dh = excluded.p256dh, auth = excluded.auth,
        prefs = excluded.prefs, user_agent = excluded.user_agent, atualizado_em = now();
  -- no máximo 10 telemóveis por cliente
  delete from public.push_subscricoes
   where auth_id = auth.uid()
     and endpoint not in (select endpoint from public.push_subscricoes where auth_id = auth.uid()
                          order by atualizado_em desc limit 10);
  return true;
end; $$;

-- Ao terminar sessão, o telemóvel deixa de receber avisos desse cliente
create or replace function public.apagar_push(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscricoes where endpoint = p_endpoint and auth_id = auth.uid();
end; $$;

revoke execute on function public.guardar_push(text,text,text,jsonb,text) from public, anon;
revoke execute on function public.apagar_push(text) from public, anon;
grant execute on function public.guardar_push(text,text,text,jsonb,text) to authenticated;
grant execute on function public.apagar_push(text) to authenticated;
grant execute on function public.push_chave_publica() to anon, authenticated;

-- Chamar a função enviar-avisos (usado pelo agendamento e para testes)
create or replace function public.chamar_enviar_avisos(p_corpo jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare id bigint;
begin
  select net.http_post(
    url := 'https://hbyavmpefqlwaoileduc.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieWF2bXBlZnFsd2FvaWxlZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDQzMzcsImV4cCI6MjA5MzU4MDMzN30.0WuU_hSWus--my4WyU1tGlCPgO3qCYLafB1QfOq42P8',
      'x-cron-secret', (select valor from public.push_config where chave = 'cron_secret')),
    body := coalesce(p_corpo, '{}'::jsonb),
    timeout_milliseconds := 60000
  ) into id;
  return id;
end; $$;
revoke execute on function public.chamar_enviar_avisos(jsonb) from public, anon, authenticated;

-- Envio diário às 09:00 UTC
do $$
begin
  if exists (select 1 from cron.job where jobname = 'enviar-avisos-diario') then
    perform cron.unschedule('enviar-avisos-diario');
  end if;
end $$;
select cron.schedule('enviar-avisos-diario', '0 9 * * *', $$ select public.chamar_enviar_avisos('{}'::jsonb); $$);

-- Primeira chamada: a função cria as chaves de envio (demora uns segundos)
select public.chamar_enviar_avisos('{"acao":"iniciar"}'::jsonb) as pedido;
