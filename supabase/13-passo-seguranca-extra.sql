-- ============================================================
-- EXA Seguros — 13. SEGURANÇA EXTRA
-- Correr depois do 12. Pode correr de novo sem problema.
--
--  • Catálogo de produtos (coberturas configuradas) deixa de ser público:
--    só clientes com sessão iniciada o leem (a app só precisa disso).
--  • Confirmação rápida do estado de segurança no fim.
-- ============================================================

drop policy if exists "produtos leitura" on public.produtos;
create policy "produtos leitura" on public.produtos
  for select to authenticated using (true);
revoke all on public.produtos from anon;

-- Funções que não devem estar abertas a visitantes sem sessão
do $$
declare f text;
begin
  foreach f in array array['norm_produto(text)','produto_do_nome(text)'] loop
    if to_regprocedure('public.' || f) is not null then
      execute 'revoke execute on function public.' || f || ' from public, anon';
      execute 'grant execute on function public.' || f || ' to authenticated';
    end if;
  end loop;
end $$;

-- Verificação: tabelas sem RLS no esquema public (deve vir vazio)
select tablename as tabela_sem_rls
from pg_tables
where schemaname = 'public' and not rowsecurity
order by 1;
