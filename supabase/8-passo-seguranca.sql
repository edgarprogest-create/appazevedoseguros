-- ============================================================
-- EXA Seguros — 8. SEGURANÇA
-- Correr UMA vez no Supabase → SQL Editor → New query → Run,
-- depois do 7-passo-protocolos.sql. Pode correr de novo sem problema.
--
-- O que muda:
--  • Só o próprio cliente (com sessão iniciada) lê os seus dados, pontos,
--    convites e investimentos. Antes bastava saber o NIF.
--  • Lista de renovações e de convites de todos: só para agentes (tabela agentes).
--  • Registo: exige os últimos 4+ dígitos de uma apólice ativa e não deixa
--    associar uma conta a um NIF que já tem conta (nem trocar o email).
--  • Login: o email só é devolvido com a palavra-passe certa (email_para_login).
--  • Área Empresa: as apólices só saem com o código do agente
--    (clientes.codigo_empresa), verificado no servidor.
--  • Limite de tentativas (registo, login, empresa).
--  • Tabelas com RLS: clientes, apolices, resgates, invest_reforcos,
--    import_clientes, import_apolices, agentes. As políticas antigas
--    destas tabelas são apagadas e substituídas pelas de baixo.
--
-- DEPOIS DE CORRER:
--  1) Registar o(s) agente(s) (conta criada em Authentication → Users):
--       insert into agentes (auth_id, nome)
--       select id, 'Edgar Azevedo' from auth.users where email = 'EMAIL-DO-AGENTE'
--       on conflict do nothing;
--  2) Dar um código Empresa a cada empresa (o agente envia-o ao cliente):
--       update clientes set codigo_empresa = '4821' where nif = '500000000';
--  3) Não voltar a correr os scripts 1 a 5 (repõem as funções sem proteção).
--     Se for preciso, correr este 8 outra vez a seguir.
-- ============================================================

create schema if not exists interno;
revoke all on schema interno from public;
revoke all on schema interno from anon, authenticated;

-- ------------------------------------------------------------
-- 1) Agentes
-- ------------------------------------------------------------
create table if not exists public.agentes (
  auth_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text,
  criado_em timestamptz default now()
);

create or replace function public.is_agente()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.agentes where auth_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 2) Limite de tentativas
-- ------------------------------------------------------------
create table if not exists interno.tentativas (
  chave text not null,
  em    timestamptz not null default now()
);
create index if not exists tentativas_idx on interno.tentativas(chave, em);

create or replace function interno.limite(p_chave text, p_max int, p_janela interval)
returns boolean language plpgsql security definer set search_path = interno, public as $$
declare n int;
begin
  delete from interno.tentativas where em < now() - interval '1 day';
  select count(*) into n from interno.tentativas where chave = p_chave and em > now() - p_janela;
  if n >= p_max then return false; end if;
  insert into interno.tentativas(chave) values (p_chave);
  return true;
end; $$;

-- O NIF pertence a quem tem a sessão iniciada (ou é um agente)?
create or replace function interno.pode_nif(p_nif text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_agente() or exists(
    select 1 from public.clientes
    where nif = regexp_replace(coalesce(p_nif,''), '\D', '', 'g')
      and auth_id is not null and auth_id = auth.uid());
$$;

-- Conta acabada de criar (signUp) que pode ser associada
create or replace function interno.conta_nova(p_auth_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_auth_id is null then false
    when auth.uid() is not null then auth.uid() = p_auth_id
    else exists(select 1 from auth.users u
                where u.id = p_auth_id and u.created_at > now() - interval '15 minutes')
  end;
$$;

-- Apólice ativa deste NIF que termina nestes dígitos?
create or replace function interno.digitos_ok(p_nif text, p_digitos text)
returns boolean language sql stable security definer set search_path = public as $$
  select length(coalesce(p_digitos,'')) >= 4 and exists(
    select 1 from public.apolices a
    where a.nif_cliente = p_nif
      and coalesce(a.situacao,'') not ilike '%cancel%'
      and coalesce(a.situacao,'') not ilike '%anula%'
      and a.numero_apolice like '%' || p_digitos);
$$;

-- ------------------------------------------------------------
-- 3) Funções antigas passam para o esquema "interno" (fora da API)
--    e ficam no lugar delas versões que verificam quem pede.
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'convites_do_cliente(text)', 'pontos_do_cliente(text)', 'gerar_codigo_convite(text)',
    'registar_resgate(text,text,text)', 'investimento_do_cliente(text)',
    'pedir_reforco(text,text,numeric)', 'reforcos_do_cliente(text)',
    'renovacoes_proximas(integer)', 'convites_todos()'
  ] loop
    if to_regprocedure('interno.' || f) is null and to_regprocedure('public.' || f) is not null then
      execute 'alter function public.' || f || ' set schema interno';
    end if;
  end loop;
end $$;

-- Correção: a versão do 5-passo dava erro "column reference id is ambiguous"
create or replace function interno.reforcos_do_cliente(p_nif text)
returns table(id uuid, produto text, valor numeric, estado text, criado_em timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query select r.id, r.produto, r.valor, r.estado, r.criado_em
    from public.invest_reforcos r
    where r.nif = p_nif order by r.criado_em desc limit 20;
end; $$;

create or replace function public.convites_do_cliente(p_nif text)
returns table(amigo_nif text, amigo_nome text, registado_em timestamptz,
              ramo text, produto text, data_inicio date, pontos int, elegivel boolean)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then return; end if;
  return query select * from interno.convites_do_cliente(p_nif);
end; $$;

create or replace function public.pontos_do_cliente(p_nif text)
returns table(ganhos int, resgatados int, ajuste int, saldo int)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then return; end if;
  return query select * from interno.pontos_do_cliente(p_nif);
end; $$;

create or replace function public.gerar_codigo_convite(p_nif text)
returns text
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then return null; end if;
  return interno.gerar_codigo_convite(p_nif);
end; $$;

create or replace function public.registar_resgate(p_nif text, p_loja text, p_morada text)
returns table(ok boolean, motivo text)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then
    return query select false, 'sem_permissao'::text; return;
  end if;
  return query select * from interno.registar_resgate(p_nif, p_loja, p_morada);
end; $$;

create or replace function public.investimento_do_cliente(p_nif text)
returns table(ativo boolean, produto text, valor numeric, desde date)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then return; end if;
  return query select * from interno.investimento_do_cliente(p_nif);
end; $$;

create or replace function public.pedir_reforco(p_nif text, p_produto text, p_valor numeric)
returns void
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then raise exception 'sem_permissao'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'valor_invalido'; end if;
  perform interno.pedir_reforco(p_nif, p_produto, p_valor);
end; $$;

create or replace function public.reforcos_do_cliente(p_nif text)
returns table(id uuid, produto text, valor numeric, estado text, criado_em timestamptz)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not interno.pode_nif(p_nif) then return; end if;
  return query select * from interno.reforcos_do_cliente(p_nif);
end; $$;

-- Painel do agente
create or replace function public.renovacoes_proximas(p_dias int default 8)
returns table(nome_cliente text, nif_cliente text, ramo text, numero_apolice text,
              premio_comercial numeric, fracionamento text, data_vencimento date, dias_restantes int)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not public.is_agente() then return; end if;
  return query select * from interno.renovacoes_proximas(p_dias);
end; $$;

create or replace function public.convites_todos()
returns table(convidador_nif text, convidador_nome text, codigo text,
              amigo_nif text, amigo_nome text, registado_em timestamptz,
              ramo text, pontos int, elegivel boolean)
language plpgsql security definer set search_path = public, interno as $$
begin
  if not public.is_agente() then return; end if;
  return query select * from interno.convites_todos();
end; $$;

-- ------------------------------------------------------------
-- 4) Registo, login e convites
-- ------------------------------------------------------------

-- Registo: valida NIF + dígitos. Já não devolve o email; o nome só se os dígitos baterem.
create or replace function public.verificar_registo(p_nif text, p_digitos text)
returns table(nome text, email text, valido boolean)
language plpgsql security definer set search_path = public, interno as $$
declare
  n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g');
  d text := regexp_replace(coalesce(p_digitos,''), '\D', '', 'g');
  v boolean;
begin
  if not interno.limite('registo:' || n, 10, interval '1 hour') then
    return query select null::text, null::text, false; return;
  end if;
  if not exists(select 1 from clientes c where c.nif = n) then return; end if;
  v := interno.digitos_ok(n, d);
  return query select case when v then c.nome end, null::text, v
               from clientes c where c.nif = n limit 1;
end; $$;

-- Associar a conta nova ao cliente. Devolve 'ok' ou o motivo da recusa.
drop function if exists public.ligar_auth(text, uuid, text);
create or replace function public.ligar_auth(p_nif text, p_auth_id uuid, p_email text, p_digitos text)
returns text
language plpgsql security definer set search_path = public, interno as $$
declare
  n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g');
  d text := regexp_replace(coalesce(p_digitos,''), '\D', '', 'g');
  atual uuid;
begin
  if not interno.conta_nova(p_auth_id) then return 'sem_permissao'; end if;
  if exists(select 1 from clientes where auth_id = p_auth_id and nif = n) then return 'ok'; end if;
  if exists(select 1 from clientes where auth_id = p_auth_id) then return 'ja_associada'; end if;
  if not interno.limite('ligar:' || n, 10, interval '1 hour') then return 'limite'; end if;
  select auth_id into atual from clientes where nif = n;
  if not found then return 'nif'; end if;
  if atual is not null then return 'ja_registado'; end if;
  if not interno.digitos_ok(n, d) then return 'digitos'; end if;
  update clientes
     set auth_id = p_auth_id,
         email = coalesce(nullif(trim(p_email),''), email)
   where nif = n and auth_id is null;
  return 'ok';
end; $$;

-- Login por NIF: devolve o email da conta só se a palavra-passe estiver certa.
create or replace function public.email_para_login(p_nif text, p_pass text)
returns text
language plpgsql security definer set search_path = public, extensions, interno as $$
declare
  n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g');
  v text;
begin
  if length(n) <> 9 or coalesce(p_pass,'') = '' then return null; end if;
  if not interno.limite('login:' || n, 10, interval '15 minutes') then return null; end if;
  select u.email into v
    from clientes c join auth.users u on u.id = c.auth_id
   where c.nif = n
     and u.encrypted_password is not null
     and u.encrypted_password = extensions.crypt(p_pass, u.encrypted_password)
   limit 1;
  return v;
end; $$;

-- Convidado (amigo que ainda não é cliente). Nunca mexe num cliente existente.
create or replace function public.criar_convidado(p_nif text, p_nome text, p_email text, p_codigo text, p_auth_id uuid)
returns table(ok boolean, motivo text)
language plpgsql security definer set search_path = public, interno as $$
declare n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g');
begin
  if not interno.conta_nova(p_auth_id) then return query select false, 'sem_permissao'::text; return; end if;
  if exists(select 1 from clientes where auth_id = p_auth_id) then return query select false, 'ja_associada'::text; return; end if;
  if length(n) <> 9 then return query select false, 'nif'::text; return; end if;
  if exists(select 1 from clientes where nif = n) then return query select false, 'ja_cliente'::text; return; end if;
  insert into clientes (nif, nome, email, auth_id, convidado_por)
  values (n, nullif(trim(p_nome),''), nullif(trim(p_email),''), p_auth_id, upper(nullif(trim(p_codigo),'')));
  return query select true, 'criado'::text;
end; $$;

-- Quem convidou: só o primeiro nome (já não devolve o NIF)
create or replace function public.dono_do_codigo(p_codigo text)
returns table(nif text, nome text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select null::text, split_part(coalesce(c.nome,''), ' ', 1)
  from clientes c
  where upper(c.codigo_convite) = upper(trim(p_codigo))
  limit 1;
end; $$;

-- ------------------------------------------------------------
-- 5) Área Empresa
-- ------------------------------------------------------------
alter table clientes add column if not exists codigo_empresa text;

-- Passo 1: confirma NIF + email (sem devolver apólices)
create or replace function public.empresa_login(p_nif text, p_email text)
returns table(nif text, nome text, apolices jsonb)
language plpgsql security definer set search_path = public, interno as $$
declare n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g');
begin
  if auth.uid() is null then return; end if;
  if not interno.limite('empresa1:' || n, 10, interval '1 hour') then return; end if;
  return query
  select c.nif::text, c.nome::text, null::jsonb
  from clientes c
  where c.nif = n and lower(c.email) = lower(trim(p_email))
  limit 1;
end; $$;

-- Passo 2: com o código do agente devolve as apólices
create or replace function public.empresa_apolices(p_nif text, p_email text, p_codigo text)
returns jsonb
language plpgsql security definer set search_path = public, interno as $$
declare n text := regexp_replace(coalesce(p_nif,''), '\D', '', 'g'); r jsonb;
begin
  if auth.uid() is null then return null; end if;
  if not interno.limite('empresa2:' || n, 5, interval '1 hour') then return null; end if;
  if not exists(
    select 1 from clientes c
    where c.nif = n and lower(c.email) = lower(trim(p_email))
      and coalesce(c.codigo_empresa,'') <> '' and c.codigo_empresa = trim(p_codigo)
  ) then return null; end if;
  select coalesce(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) into r from apolices a where a.nif_cliente = n;
  return r;
end; $$;

-- ------------------------------------------------------------
-- 6) Permissões das funções
-- ------------------------------------------------------------
revoke all on all functions in schema interno from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.email_do_nif(text)') is not null then
    execute 'revoke execute on function public.email_do_nif(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.confirmar_reforco(text)') is not null then
    execute 'revoke execute on function public.confirmar_reforco(text) from public, anon, authenticated';
  end if;
end $$;

grant execute on function public.is_agente() to anon, authenticated;
grant execute on function public.verificar_registo(text,text) to anon, authenticated;
grant execute on function public.ligar_auth(text,uuid,text,text) to anon, authenticated;
grant execute on function public.email_para_login(text,text) to anon, authenticated;
grant execute on function public.criar_convidado(text,text,text,text,uuid) to anon, authenticated;
grant execute on function public.dono_do_codigo(text) to anon, authenticated;
grant execute on function public.empresa_login(text,text) to authenticated;
grant execute on function public.empresa_apolices(text,text,text) to authenticated;
grant execute on function public.convites_do_cliente(text) to authenticated;
grant execute on function public.pontos_do_cliente(text) to authenticated;
grant execute on function public.gerar_codigo_convite(text) to authenticated;
grant execute on function public.registar_resgate(text,text,text) to authenticated;
grant execute on function public.investimento_do_cliente(text) to authenticated;
grant execute on function public.pedir_reforco(text,text,numeric) to authenticated;
grant execute on function public.reforcos_do_cliente(text) to authenticated;
grant execute on function public.renovacoes_proximas(int) to authenticated;
grant execute on function public.convites_todos() to authenticated;
revoke execute on function public.empresa_login(text,text) from public, anon;
revoke execute on function public.empresa_apolices(text,text,text) from public, anon;
revoke execute on function public.convites_do_cliente(text) from public, anon;
revoke execute on function public.pontos_do_cliente(text) from public, anon;
revoke execute on function public.gerar_codigo_convite(text) from public, anon;
revoke execute on function public.registar_resgate(text,text,text) from public, anon;
revoke execute on function public.investimento_do_cliente(text) from public, anon;
revoke execute on function public.pedir_reforco(text,text,numeric) from public, anon;
revoke execute on function public.reforcos_do_cliente(text) from public, anon;
revoke execute on function public.renovacoes_proximas(int) from public, anon;
revoke execute on function public.convites_todos() from public, anon;

-- ------------------------------------------------------------
-- 7) Tabelas: RLS (as políticas antigas destas tabelas são apagadas)
-- ------------------------------------------------------------
do $$
declare t text; p record;
begin
  foreach t in array array['clientes','apolices','resgates','invest_reforcos',
                           'import_clientes','import_apolices','agentes'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

create policy "cliente le os seus dados" on public.clientes
  for select to authenticated
  using (auth_id = auth.uid() or public.is_agente());

create policy "cliente le as suas apolices" on public.apolices
  for select to authenticated
  using (public.is_agente()
         or nif_cliente in (select c.nif from public.clientes c where c.auth_id = auth.uid()));

do $$
begin
  if to_regclass('public.resgates') is not null then
    execute 'create policy "agente le resgates" on public.resgates for select to authenticated using (public.is_agente())';
  end if;
  if to_regclass('public.invest_reforcos') is not null then
    execute 'create policy "agente le reforcos" on public.invest_reforcos for select to authenticated using (public.is_agente())';
  end if;
end $$;

-- Verificação rápida (deve mostrar rowsecurity = true em todas)
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('clientes','apolices','resgates','invest_reforcos','import_clientes','import_apolices','agentes')
order by tablename;
