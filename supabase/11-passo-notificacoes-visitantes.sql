-- ============================================================
-- EXA Seguros — 11. NOTIFICAÇÕES PARA QUEM AINDA NÃO É CLIENTE
-- Correr depois do 10 e depois de atualizar a Edge Function "enviar-avisos".
-- Pode correr de novo sem problema (não apaga mensagens que tenha editado).
--
-- Quem instala a app e aceita notificações (sem ter conta) recebe:
--   • logo a seguir: a mensagem de boas-vindas (dia 0)
--   • depois: as mensagens dos dias seguintes (tabela push_mensagens_visitantes)
-- Quando a pessoa cria conta e entra, deixa de receber estas mensagens.
--
-- EDITAR AS MENSAGENS: Table Editor → push_mensagens_visitantes
--   dia    = dias depois de aceitar notificações (0 = logo a seguir)
--   titulo / corpo = texto da notificação
--   url    = o que abre ao tocar ('./' abre a app; um link wa.me abre o WhatsApp)
--   ativo  = false para deixar de enviar essa mensagem
-- ============================================================

-- Visitantes: registo sem conta
alter table public.push_subscricoes alter column auth_id drop not null;

create table if not exists public.push_mensagens_visitantes (
  id     serial primary key,
  dia    int  not null default 0,
  titulo text not null,
  corpo  text not null,
  url    text not null default './',
  ativo  boolean not null default true
);
alter table public.push_mensagens_visitantes enable row level security;
revoke all on public.push_mensagens_visitantes from anon, authenticated;

insert into public.push_mensagens_visitantes (dia, titulo, corpo, url)
select * from (values
  (0,  'Bem-vindo à EXA Seguros',
       'Instalou a app EXA Seguros. Para simular o melhor seguro para si, entre em contacto connosco e tenha o controlo de todos os seus seguros num só sítio.',
       './'),
  (2,  'Quanto paga hoje pelos seus seguros?',
       'Envie-nos as suas apólices atuais e fazemos uma simulação sem compromisso. Toque para falar com o gestor no WhatsApp.',
       'https://wa.me/351913042770?text=Ol%C3%A1!%20Instalei%20a%20app%20EXA%20Seguros%20e%20gostava%20de%20simular%20os%20meus%20seguros.'),
  (7,  'Já fez o check-up de proteção?',
       'Em 2 minutos veja o seu grau de blindagem: saúde, vida, casa e carro. Toque para abrir a app.',
       './'),
  (30, 'Continuamos ao seu dispor',
       'Auto, casa, saúde ou vida: fale com o seu gestor Edgar Azevedo e simule sem compromisso.',
       'https://wa.me/351913042770?text=Ol%C3%A1!%20Gostava%20de%20simular%20um%20seguro.')
) as v(dia, titulo, corpo, url)
where not exists (select 1 from public.push_mensagens_visitantes);

-- A app regista o telemóvel de um visitante (sem conta)
create or replace function public.guardar_push_visitante(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns boolean language plpgsql security definer set search_path = public, interno as $$
declare novo boolean;
begin
  -- só serviços de push reais (Google/Chrome, Mozilla, Apple, Microsoft)
  if coalesce(p_endpoint,'') !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
     or coalesce(p_p256dh,'') = '' or coalesce(p_auth,'') = '' then
    return false;
  end if;
  if not interno.limite('push-visitante', 2000, interval '1 hour') then return false; end if;

  insert into public.push_subscricoes (endpoint, auth_id, p256dh, auth, prefs, user_agent)
  values (p_endpoint, null, p_p256dh, p_auth, '{}'::jsonb, left(p_ua, 200))
  on conflict (endpoint) do nothing;
  novo := found;

  if not novo then
    -- já existia: atualiza as chaves só se continuar a ser visitante (nunca mexe no de um cliente)
    update public.push_subscricoes set p256dh = p_p256dh, auth = p_auth, atualizado_em = now()
     where endpoint = p_endpoint and auth_id is null;
  else
    -- boas-vindas logo a seguir (enviada pela Edge Function)
    perform public.chamar_enviar_avisos(jsonb_build_object('acao','bem_vindo','endpoint',p_endpoint));
  end if;
  return true;
end; $$;

revoke execute on function public.guardar_push_visitante(text,text,text,text) from public;
grant execute on function public.guardar_push_visitante(text,text,text,text) to anon, authenticated;

-- Quantos visitantes têm notificações ativas (para consultar)
--   select count(*) from push_subscricoes where auth_id is null;
