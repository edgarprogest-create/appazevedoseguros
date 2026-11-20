-- ============================================================
-- EXA Seguros — 9. EXA INVEST (versão segura dos passos 4 e 5)
-- Correr UMA vez, depois do 8-passo-seguranca.sql.
-- Pode correr de novo sem problema.
-- ============================================================

-- Colunas de investimento no cliente (passo 4)
alter table public.clientes add column if not exists invest_ativo boolean default false;
alter table public.clientes add column if not exists invest_produto text;
alter table public.clientes add column if not exists invest_valor numeric;
alter table public.clientes add column if not exists invest_desde date;

-- Pedidos de reforço (passo 5)
create table if not exists public.invest_reforcos (
  id uuid primary key default gen_random_uuid(),
  nif text,
  produto text,
  valor numeric,
  estado text default 'pendente',
  criado_em timestamptz default now(),
  confirmado_em timestamptz
);
create index if not exists invest_reforcos_nif_idx on public.invest_reforcos(nif);
alter table public.invest_reforcos enable row level security;
drop policy if exists "agente le reforcos" on public.invest_reforcos;
create policy "agente le reforcos" on public.invest_reforcos
  for select to authenticated using (public.is_agente());

-- Funções internas (as públicas, criadas no passo 8, verificam quem pede)
create or replace function interno.investimento_do_cliente(p_nif text)
returns table(ativo boolean, produto text, valor numeric, desde date)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select coalesce(c.invest_ativo,false), c.invest_produto, c.invest_valor, c.invest_desde
  from public.clientes c where c.nif = p_nif;
end; $$;

create or replace function interno.pedir_reforco(p_nif text, p_produto text, p_valor numeric)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.invest_reforcos (nif, produto, valor) values (p_nif, p_produto, p_valor);
end; $$;

-- Confirmar um reforço: só no SQL Editor, depois de falar com o cliente
--   select * from confirmar_reforco('123456789');
create or replace function public.confirmar_reforco(p_nif text)
returns table(ok boolean, valor numeric)
language plpgsql security definer set search_path = public as $$
declare rid uuid; rv numeric;
begin
  select r.id, r.valor into rid, rv from public.invest_reforcos r
   where r.nif = p_nif and r.estado = 'pendente' order by r.criado_em asc limit 1;
  if rid is null then return query select false, 0::numeric; return; end if;
  update public.invest_reforcos set estado = 'confirmado', confirmado_em = now() where id = rid;
  update public.clientes set invest_valor = coalesce(invest_valor,0) + rv, invest_ativo = true where nif = p_nif;
  return query select true, rv;
end; $$;

revoke all on all functions in schema interno from public, anon, authenticated;
revoke execute on function public.confirmar_reforco(text) from public, anon, authenticated;

-- Verificação: as 9 funções protegidas devem existir em "interno"
select p.proname as funcao_protegida
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'interno'
  and p.proname in ('convites_do_cliente','pontos_do_cliente','gerar_codigo_convite','registar_resgate',
                    'investimento_do_cliente','pedir_reforco','reforcos_do_cliente','renovacoes_proximas','convites_todos')
order by 1;
