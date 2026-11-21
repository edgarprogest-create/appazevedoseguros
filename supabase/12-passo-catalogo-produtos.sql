-- ============================================================
-- EXA Seguros — 12. CATÁLOGO DE PRODUTOS (reconhecer o seguro pelo nome)
-- Correr UMA vez no SQL Editor. Pode correr de novo sem problema
-- (não apaga nem altera produtos que já tenha editado).
--
-- Para que serve:
--   Na apólice basta pôr o nome do produto (ex.: "Proteção Casa+").
--   A app procura esse nome no catálogo e vai buscar o tipo de seguro
--   (ramo), as coberturas e a opção do plano. O que estiver preenchido
--   na própria apólice tem sempre prioridade.
--
-- EDITAR O CATÁLOGO: Table Editor → produtos
--   nome       = nome do produto (ex.: Casa+)
--   aliases    = outros nomes por que aparece, separados por vírgulas
--                (ex.: Proteção Casa+, Protecao Casa Mais)
--   ramo       = Auto, Casa, Saúde, Vida, Viagem, Acidentes, Poupança, Frota,
--                Saúde PME, RC, Multirriscos
--   coberturas = Auto: vidros, choque, furto, natureza (ou "todos")
--                Casa: furto, vidros (ou "todos")
--                (as coberturas de base aparecem sempre)
--   opcao      = Saúde Médis: op1, op1-amb1000, op1-amb200, op2, op2-esto,
--                op3, op3-esto, vintage, vintageplus
--   extra      = campos extra em JSON (ex.: capitais do Ritmo Vida Profissional)
--
-- Como o nome é reconhecido: sem maiúsculas, acentos nem pontuação, e basta
-- que o nome (ou um alias) apareça dentro do nome da apólice. Se vários
-- servirem, ganha o mais comprido ("Casa+" ganha a "Casa").
-- ============================================================

create table if not exists public.produtos (
  id         serial primary key,
  nome       text not null unique,
  aliases    text,
  ramo       text,
  coberturas text,
  opcao      text,
  extra      jsonb,
  ativo      boolean not null default true
);
alter table public.produtos enable row level security;
drop policy if exists "produtos leitura" on public.produtos;
create policy "produtos leitura" on public.produtos for select using (true);

-- Produtos já conhecidos pela app (coberturas por preencher)
insert into public.produtos (nome, ramo, aliases) values
  ('Protec Ligeiros','Auto',null), ('Protec Duas Rodas','Auto',null), ('Seguro por Dias','Auto',null),
  ('Saúde Família','Saúde',null), ('Saúde Senior','Saúde',null), ('Médis Dental','Saúde',null), ('Médis Light','Saúde',null),
  ('Casa Segura','Casa',null), ('Casa+','Casa','Proteção Casa+, Protecao Casa+, Casa Mais'),
  ('Alojamento Local','Casa',null), ('Obras de Arte','Casa',null), ('RC Familiar','Casa',null),
  ('Ritmo Vida Família','Vida',null), ('Ritmo Vida Profissional','Vida',null), ('Viva Plus','Vida',null),
  ('Solução Jovem','Vida',null), ('Multiplic Protecção+','Vida','Multiplic Proteção+'),
  ('Viagem Segura','Viagem',null), ('Bombordo','Viagem',null), ('Pétis','Viagem',null), ('Embarcações de Recreio','Viagem',null),
  ('AP Individual','Acidentes',null), ('AT Conta Própria','Acidentes',null), ('Empregados Domésticos','Acidentes',null),
  ('Maximus Poupança','Poupança',null), ('PPR+ 1.ª Série','Poupança',null), ('PPR+ 2.ª Série','Poupança',null),
  ('Rendimento Flexível','Poupança',null), ('Invest Flex','Poupança',null),
  ('Protec Frota','Frota',null),
  ('Saúde PME','Saúde PME',null), ('Empresa Viva','Saúde PME',null), ('AP Colectivo','Saúde PME',null), ('Médis Empresas','Saúde PME',null),
  ('RC Geral','RC',null), ('Ecosfera Ambiental','RC',null), ('D&O','RC',null), ('Cyber Risks','RC',null),
  ('Multirriscos Indústria','Multirriscos',null), ('Avaria de Máquinas','Multirriscos',null), ('Bens em Leasing','Multirriscos',null)
on conflict (nome) do nothing;

-- Normalizar nomes: minúsculas, sem acentos, só letras/números/+ separados por espaço
create or replace function public.norm_produto(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(
    translate(lower(coalesce(t,'')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9+]+', ' ', 'g'),
    ' \+', '+', 'g'));   -- "Casa +" = "Casa+"
$$;

-- Produto do catálogo que corresponde a um nome de apólice (o mais comprido que servir)
create or replace function public.produto_do_nome(p_nome text)
returns setof public.produtos language sql stable set search_path = public as $$
  select p.*
  from public.produtos p
  cross join lateral (
    select public.norm_produto(x) as chave
    from unnest(array[p.nome] || coalesce(string_to_array(p.aliases, ','), '{}'::text[])) x
  ) k
  where p.ativo and k.chave <> ''
    and (' ' || public.norm_produto(p_nome) || ' ') like ('% ' || k.chave || ' %')
  order by length(k.chave) desc, p.id
  limit 1;
$$;

-- Apólices com o catálogo aplicado (é isto que a app e os avisos leem).
-- security_invoker: as regras de acesso (RLS) de "apolices" continuam a valer.
drop view if exists public.apolices_app;
create view public.apolices_app with (security_invoker = true) as
select a.*,
       p.nome       as cat_nome,
       p.ramo       as cat_ramo,
       p.coberturas as cat_coberturas,
       p.opcao      as cat_opcao,
       p.extra      as cat_extra
from public.apolices a
left join lateral public.produto_do_nome(coalesce(nullif(to_jsonb(a)->>'produto',''), to_jsonb(a)->>'sub_ramo')) p on true;

grant select on public.apolices_app to authenticated;
revoke all on public.apolices_app from anon;

-- Área Empresa passa a usar o catálogo
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
  select coalesce(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) into r from apolices_app a where a.nif_cliente = n;
  return r;
end; $$;

-- Ver que produto cada apólice reconheceu (para confirmar)
--   select numero_apolice, produto, cat_nome, coalesce(nullif(ramo,''), cat_ramo) as ramo,
--          coalesce(nullif(coberturas,''), cat_coberturas) as coberturas
--   from apolices_app order by cat_nome nulls first;
