-- ============================================================
-- EXA Seguros — 14. NOVIDADES (painel "Informações" da app, botão "i")
-- Correr UMA vez no SQL Editor. Pode correr de novo sem problema.
--
-- Escrever novidades: Table Editor → novidades → Insert row
--   tipo   = mediacao  (aparece em "Novidades da sua mediação")
--            ageas     (aparece em "Notícias Ageas")
--   titulo = título curto
--   texto  = uma ou duas frases
--   link   = opcional; só links https:// (ex.: https://www.ageas.pt/...)
--   data   = data da novidade (as mais recentes aparecem primeiro)
--   ativo  = false para esconder sem apagar
-- A app mostra as 12 mais recentes. Só clientes com sessão as veem.
-- ============================================================

create table if not exists public.novidades (
  id        serial primary key,
  tipo      text not null default 'mediacao' check (tipo in ('mediacao','ageas')),
  titulo    text not null,
  texto     text,
  link      text check (link is null or link ~ '^https://'),
  data      date not null default current_date,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.novidades enable row level security;
drop policy if exists "novidades leitura" on public.novidades;
create policy "novidades leitura" on public.novidades
  for select to authenticated using (ativo);
revoke all on public.novidades from anon;

-- Exemplo (apague ou edite no Table Editor):
-- insert into novidades (tipo, titulo, texto) values
--   ('mediacao', 'Reveja as coberturas antes do inverno',
--    'Tempestades e inundações: confirme connosco se a sua casa está bem protegida.');
