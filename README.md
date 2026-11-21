# EXA Seguros — app (PWA)

App da Mediação Edgar Azevedo Seguros (agente Ageas / Médis). HTML + CSS + JS simples, sem build.
Publicada em `https://app.easegurosageas.com` a partir da raiz deste repositório (branch `main`).

## Estrutura
- `index.html` — ponto de entrada (ecrãs e folhas)
- `exa-app.js` — app principal (wallet, detalhe, avisos, perfil, empresa, convites)
- `exa-supabase.js` — ligação ao Supabase (login, registo, recuperação, apólices, convites, investimento)
- `supabase-js-2.119.2.js` — biblioteca Supabase incluída no repositório (sem CDN)
- `exa-corpo.js`, `exa-saude-planos.js`, `exa-protocolos.js`, `exa-checkup-data.js`, `exa-diag.js`, `exa-objetivos.js`, `exa-store.js`
- `exa-app.css` — estilos (ajustes para ecrãs estreitos e letra grande no fim do ficheiro)
- `sw.js` — service worker (cache `exa-seguros-vN`; subir N a cada publicação) e clique nas notificações
- `manifest.json`, ícones `icon-*.png`, `privacidade.html`
- `.nojekyll` — para o GitHub Pages publicar `.well-known/`
- `supabase/` — scripts SQL de segurança (ver abaixo)

Ao alterar CSS/JS, subir também o `?v=` correspondente no `index.html`.

## Supabase
Projeto `hbyavmpefqlwaoileduc`. A chave em `exa-supabase.js` é a **anon key** (pública por natureza).
A segurança está nas funções e no RLS, não na chave.

Scripts de segurança e funcionalidades, por cima dos originais 1–3, 6 e 7 (o 10 exige antes criar a Edge Function):
- `supabase/8-passo-seguranca.sql` — RLS em `clientes`, `apolices`, `resgates`, `invest_reforcos`,
  `import_*`, `agentes`; funções por NIF só para o próprio cliente autenticado (versões originais em
  esquema `interno`, fora da API); funções do painel do agente só para quem está em `agentes`;
  registo exige dígitos de apólice ativa e não reassocia contas; `email_para_login` (email só com
  palavra-passe certa); área Empresa com `clientes.codigo_empresa` verificado no servidor;
  limite de tentativas.
- `supabase/9-passo-invest-seguro.sql` — EXA Invest (substitui os passos 4 e 5 originais).
- `supabase/10-passo-notificacoes-push.sql` — notificações com a app fechada (ver Notificações).
- `supabase/11-passo-notificacoes-visitantes.sql` — notificações para quem ainda não é cliente.
- `supabase/13-passo-seguranca-extra.sql` — catálogo `produtos` só para quem tem sessão; verificação de tabelas sem RLS.
- `supabase/12-passo-catalogo-produtos.sql` — catálogo `produtos`: basta o nome do produto na apólice (ex.:
  "Proteção Casa+") para a app saber ramo, coberturas, opção Médis e extra. Reconhecimento sem maiúsculas,
  acentos nem pontuação, por nome ou `aliases`; ganha o nome mais comprido. A app e os avisos leem a vista
  `apolices_app` (security_invoker, mantém o RLS); o que está na apólice tem prioridade sobre o catálogo.

**Não voltar a correr os scripts originais 1 a 5** (repõem funções sem proteção). Se acontecer, correr o 8 e o 9 a seguir.

Operações no SQL Editor:
```sql
-- registar um agente (conta criada em Authentication → Users)
insert into agentes (auth_id, nome) select id, 'Nome' from auth.users where email = '...' on conflict do nothing;
-- código da área Empresa (o agente envia ao cliente)
update clientes set codigo_empresa = '1234' where nif = '500000000';
-- confirmar reforço de investimento
select * from confirmar_reforco('123456789');
```

Definições de Auth necessárias: **Confirm email desligado** (há contas `NIF@exaseguros.local`);
**Site URL** e **Redirect URLs** = endereço da app (link de recuperação de palavra-passe).

Dados: `clientes.nif` com 9 algarismos; `apolices.nif_cliente` igual; `numero_apolice` (registo usa os
últimos 4 dígitos); `situacao` sem "cancel"/"anula" para apólices ativas; `data_vencimento` (aviso de
renovação a 60 dias); `data_inicio` + `fracionamento` (aviso de pagamento 3 dias antes); `auth_id` é
preenchido pela app no registo — não editar à mão.

## Notificações
- **Com a app fechada (Web Push):** Edge Function `supabase/functions/enviar-avisos/index.ts`, chamada todos os
  dias às 09:00 UTC pelo pg_cron (`supabase/10-passo-notificacoes-push.sql`). Envia renovações (60/30/7/1 dias),
  pagamentos (3 dias antes do débito), check-up de saúde (6 em 6 meses) e dica da época (1 por estação),
  segundo as preferências do Perfil. Não repete (`push_enviados`) e apaga registos de telemóveis que já não
  existem (404/410). Usa `SUPABASE_DB_URL`; as chaves VAPID são criadas na 1.ª chamada e guardadas em
  `push_config` (RLS, sem acesso pela API). A app regista o telemóvel em `push_subscricoes` via
  `guardar_push` após login / ao mudar preferências e apaga-o ao terminar sessão (`apagar_push`).
- **Visitantes (ainda não clientes):** ao abrir a app, um painel pede para ativar notificações (volta a perguntar
  após 7 dias se a pessoa disser "Agora não"). O telemóvel fica em `push_subscricoes` com `auth_id` nulo
  (`guardar_push_visitante`, só aceita serviços de push reais), recebe logo a mensagem do dia 0 e depois as
  restantes de `push_mensagens_visitantes` (editável no Table Editor: dia, título, corpo, url, ativo; um link
  wa.me abre o WhatsApp). Ao entrar com conta, o registo passa a cliente e a sequência pára
  (`supabase/11-passo-notificacoes-visitantes.sql`).
- Teste no SQL Editor: `select public.chamar_enviar_avisos('{"acao":"teste","nif":"123456789"}');` e
  ver a resposta em `select * from net._http_response order by id desc limit 1;`
- **Com a app aberta:** se o push do servidor não estiver ativo no telemóvel, a app mostra os mesmos avisos
  localmente pelo service worker (`registration.showNotification`; no Android `new Notification()` não é permitido).
- iPhone: só recebe com a app instalada no ecrã principal (iOS 16.4+). Play Store (TWA): ativar a delegação de
  notificações no Bubblewrap/PWABuilder.

## Demonstração
Códigos: `101010.EA` e Ordens `202020.OM` … `202026.OA` (`DEMO_ORDENS` em `exa-app.js`), ou `?demo=CÓDIGO` no URL.
Não existe acesso de teste por NIF/palavra-passe.

## Play Store
Empacotar como TWA (PWABuilder ou Bubblewrap). Colocar o `assetlinks.json` gerado em
`.well-known/assetlinks.json` na raiz deste repositório (sem ele a app abre com barra do browser).

## Pendentes conhecidos
- Painel do agente (`EXA Agente.html`) não está neste repositório: passa a precisar de login Supabase com conta em `agentes`.
- Confirmar licença das imagens `carro-xray.webp` e `casa.webp`; valores de exemplo do Check-up e do Ritmo Vida Profissional.
- Registos de convidados são enviados por formsubmit.co para email — referir na política de privacidade.

## Segurança da app (não desfazer)
- **CSP** no `<head>` do `index.html`: só corre JavaScript dos ficheiros do próprio site (nada inline, nem
  `onclick=`), e a app só comunica com o Supabase, open-meteo, bigdatacloud e formsubmit. Se acrescentar
  um serviço externo, acrescentá-lo ao `connect-src`. Código novo: em ficheiros `.js`, nunca `<script>` inline.
- **viewport.js**: impede que a app seja mostrada dentro de outra página (clickjacking) e ajusta a largura.
- **Dados do Supabase**: passam por `limpar()` em `exa-supabase.js` (sem `<`, `>`, aspas). Ao mostrar dados
  com `innerHTML`, usar sempre `esc()`.
- **Base de dados**: RLS em todas as tabelas; funções por NIF só para o próprio cliente (scripts 8–13).

