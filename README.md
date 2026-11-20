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

Scripts já corridos em produção (20/11/2026), por cima dos originais 1–3, 6 e 7:
- `supabase/8-passo-seguranca.sql` — RLS em `clientes`, `apolices`, `resgates`, `invest_reforcos`,
  `import_*`, `agentes`; funções por NIF só para o próprio cliente autenticado (versões originais em
  esquema `interno`, fora da API); funções do painel do agente só para quem está em `agentes`;
  registo exige dígitos de apólice ativa e não reassocia contas; `email_para_login` (email só com
  palavra-passe certa); área Empresa com `clientes.codigo_empresa` verificado no servidor;
  limite de tentativas.
- `supabase/9-passo-invest-seguro.sql` — EXA Invest (substitui os passos 4 e 5 originais).

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
Mostradas pelo service worker (`registration.showNotification`; no Android `new Notification()` não é
permitido). O cliente escolhe no Perfil: renovações, pagamentos, check-up de saúde, dicas da época.
Funcionam quando a app é aberta. **Por fazer:** push com a app fechada (FCM ou OneSignal + tarefa
diária no Supabase via pg_cron/Edge Function).

## Demonstração
Códigos: `101010.EA` e Ordens `202020.OM` … `202026.OA` (`DEMO_ORDENS` em `exa-app.js`), ou `?demo=CÓDIGO` no URL.
Não existe acesso de teste por NIF/palavra-passe.

## Play Store
Empacotar como TWA (PWABuilder ou Bubblewrap). Colocar o `assetlinks.json` gerado em
`.well-known/assetlinks.json` na raiz deste repositório (sem ele a app abre com barra do browser).

## Pendentes conhecidos
- Push com a app fechada (ver acima).
- Painel do agente (`EXA Agente.html`) não está neste repositório: passa a precisar de login Supabase com conta em `agentes`.
- Confirmar licença das imagens `carro-xray.webp` e `casa.webp`; valores de exemplo do Check-up e do Ritmo Vida Profissional.
- Registos de convidados são enviados por formsubmit.co para email — referir na política de privacidade.
