/* ===== EXA SEGUROS — APP LOGIC ===== */
(function(){
'use strict';

/* ---------- STATE ---------- */
const LS = 'exa_app_state_v2';

function seedPolicies(){
  return {
    particular: [
      { id:p(), color:'coral',  ramo:'Auto',     nome:'Protec Ligeiros', num:'AU67521313', premio:'476,89€', per:'ano', inicio:'2021-03-12', coberturas:['vidros','natureza'], extra:{Matrícula:'AA-33-43', Veículo:'Renault Clio · 2022'}, irs:false },
      { id:p(), color:'indigo', ramo:'Saúde',    nome:'Saúde Família',   num:'SA91234567', premio:'312,00€', per:'ano', inicio:'2023-12-10', renov:'2026-12-10', opcao:'op1-amb1000', extra:{Cobertura:'Completa'}, irs:true },
      { id:p(), color:'plum',   ramo:'Vida',     nome:'Viva Plus',       num:'VI55678900', premio:'189,60€', per:'ano', inicio:'2019-05-20', extra:{Capital:'150.000€'}, irs:true },
      { id:p(), color:'pro',    ramo:'Vida Profissional', nome:'Ritmo Vida Profissional', num:'VP20481122', premio:'420,00€', per:'ano', inicio:'2020-02-03', ordem:'medicos', extra:{'Morte ou invalidez':'250.000€'}, irs:true },
      { id:p(), color:'emerald',ramo:'Casa',     nome:'Casa Segura',     num:'HA33219876', premio:'228,50€', per:'ano', inicio:'2022-11-15', coberturas:['vidros'], extra:{Morada:'R. da Paz, 12', Capital:'185.000€'}, irs:false },
    ],
    empresa: [
      { id:p(), color:'coral',  ramo:'Frota',    nome:'Protec Frota',    num:'FR88112233', premio:'1.842,00€', per:'ano', extra:{}, irs:false },
      { id:p(), color:'indigo', ramo:'Saúde PME',nome:'Saúde PME',       num:'SP44778899', premio:'3.215,40€', per:'ano', extra:{}, irs:false },
      { id:p(), color:'plum',   ramo:'RC',       nome:'RC Geral',        num:'RC22334455', premio:'486,75€',   per:'ano', extra:{}, irs:false },
      { id:p(), color:'emerald',ramo:'Património',nome:'Multirriscos Indústria',num:'MI66889900',premio:'957,30€',per:'ano',extra:{}, irs:false },
    ],
  };
}
function p(){ return 'p'+Math.random().toString(36).slice(2,9); }

const defaultState = {
  account: { firstName:'', lastName:'', nif:'', email:'', password:'', birthdate:'', gender:'M', phone:'', address:'', photo:null, since:new Date().getFullYear() },
  loggedIn:false,
  policies: { particular:[], empresa:[] },
  empresaLoaded:false,
  notifications:{ updates:true, renovacao:true, pagamentos:true, checkup:true, sazonal:true },
  points:0,
  invites:[],
  prizeStore:'pingo',
  theme:'coral',
  refCode:null,
  refInvites:[],
  refPoints:null,
};
const demoAccount = { firstName:'José', lastName:'Costa', nif:'123 456 789', email:'jose.costa@email.pt', password:'12345678', birthdate:'1985-07-12', gender:'M', phone:'+351 912 345 678', address:'R. da Paz, 12, Lisboa', photo:null, since:2018 };
const demoInvites = [
  { name:'Maria Antunes', ramo:'Seguro de Vida', date:'14 Mai', status:'done', pts:30 },
  { name:'Carlos Silva',  ramo:'Convite enviado', date:'22 Mai', status:'pending', pts:0 },
  { name:'Ana Ferreira',  ramo:'Convite enviado', date:'28 Mai', status:'pending', pts:0 },
];

let S = load();
function load(){
  try { const raw = localStorage.getItem(LS); if(raw) return Object.assign({}, defaultState, JSON.parse(raw)); }
  catch(e){}
  return JSON.parse(JSON.stringify(defaultState));
}
function save(){ try{ localStorage.setItem(LS, JSON.stringify(S)); }catch(e){} }

/* ---------- ROUTER ---------- */
const TAB_SCREENS = ['home'];
let stack = ['splash'];
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function nav(id, opts){
  opts = opts || {};
  const cur = stack[stack.length-1];
  if(cur === id) return;
  if(opts.back){ stack.pop(); }
  else if(opts.replace){ stack[stack.length-1] = id; }
  else { stack.push(id); }
  showScreen(id, opts.back);
  if(cur==='invest-painel' && id!=='invest-painel') playSegurosIntro();
  onEnter(id);
}
function showScreen(id, isBack){
  $$('.screen').forEach(s => { s.classList.remove('active','back'); });
  const el = document.getElementById('s-'+id);
  if(el){ el.classList.add('active'); el.scrollTop = 0; }
  // status bar theme
  const sb = $('#statusbar');
  const premId = id==='splash' || /^onb\d/.test(id);
  if(sb) sb.classList.toggle('dark', id==='admin' || id==='bday' || premId);
  if(sb) sb.classList.toggle('prem-sb', premId);
  const ph = document.querySelector('.phone');
  if(ph){ ph.classList.toggle('home-bg', id==='home'); ph.classList.toggle('invest-bg', id==='invest-painel'); }
  const tb = document.getElementById('home-tabbar');
  if(tb) tb.style.display = (id==='home') ? 'flex' : 'none';
  const itb = document.getElementById('invest-tabbar');
  if(itb) itb.style.display = (id==='invest-painel') ? 'flex' : 'none';
}
function back(){ if(stack.length>1) nav(stack[stack.length-2], {back:true}); }


/* ---------- INVEST — rentabilidade publicada ----------
   Actualize aqui quando a Ageas publicar novos valores.
   valor: null = ainda sem valor publicado. */
const RENTABILIDADE = [
  { nome:'Maximus Poupança', tipo:'Capital garantido', ano:2019, valor:1.05, historico:[[2016,1.60],[2017,1.53],[2018,1.00],[2019,1.05]] },
  { nome:'PPR+',             tipo:'Capital garantido', ano:null, valor:null, historico:[] },
  { nome:'Ageas Flex+',      tipo:'Sem garantia',      ano:null, valor:null, historico:[] },
  { nome:'Rendimento Flexível', tipo:'Sem garantia',   ano:null, valor:null, historico:[] },
];
function fmtPct(v){ return (v>=0?'+':'')+v.toFixed(2).replace('.',',')+'%'; }
async function loadRentab(){
  if(!window.EXASupabase || !window.EXASupabase.rentabilidade) return;
  try{
    const rows = await window.EXASupabase.rentabilidade();
    if(!rows) return;
    const byProd = {};
    rows.forEach(r=>{
      const k = r.produto;
      if(!byProd[k]) byProd[k] = { nome:k, tipo:r.tipo||'', ano:null, valor:null, historico:[] };
      if(r.ano!=null && r.valor!=null){
        byProd[k].historico.push([r.ano, Number(r.valor)]);
        if(byProd[k].ano==null || r.ano>byProd[k].ano){ byProd[k].ano=r.ano; byProd[k].valor=Number(r.valor); }
      }
    });
    RENTABILIDADE.length = 0;
    Object.keys(byProd).forEach(k=>RENTABILIDADE.push(byProd[k]));
    renderRentab(true);
  }catch(e){}
}
function renderRentab(fromDb){
  if(!fromDb) loadRentab();
  const box = document.getElementById('ipw-rentab');
  if(box) box.innerHTML = RENTABILIDADE.map(p=>'<div class="ipw-row"><span>'+esc(p.nome)+'</span>'+(p.valor==null?'<b class="na">—</b>':'<b>'+fmtPct(p.valor)+'</b>')+'</div>').join('');
  const full = document.getElementById('ipw-rentab-full');
  if(full) full.innerHTML = RENTABILIDADE.map(p=>{
    const hist = p.historico.length ? p.historico.map(r=>'<div class="yr"><span>'+r[0]+'</span><span>'+fmtPct(r[1])+'</span></div>').join('') : '<span>Rentabilidade a publicar em breve.</span>';
    return '<div><b>'+esc(p.nome)+'</b><span style="font-family:var(--mono);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:#D9A85C;">'+esc(p.tipo)+'</span>'+hist+'</div>';
  }).join('');
}

function playInvestIntro(){
  const el = document.getElementById('invest-intro'); if(!el) return;
  el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
  clearTimeout(playInvestIntro._t);
  playInvestIntro._t = setTimeout(()=>el.classList.remove('play'), 1900);
}
function playSegurosIntro(){
  const el = document.getElementById('seguros-intro'); if(!el) return;
  el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
  clearTimeout(playSegurosIntro._t);
  playSegurosIntro._t = setTimeout(()=>el.classList.remove('play'), 1900);
}
function onEnter(id){
  if(id==='invest-painel') playInvestIntro();
  if(id==='home'){ renderWallet(); updateGreeting(); maybeBirthday(); loadReferrals(); loadInvestimento(); }
  if(id==='invest-painel'){ investPanelEnter(); renderRentab(); }
  if(id==='profile'){ renderProfile(); }
  if(id==='montra'){ loadReferrals(); renderMontra(); }
  if(id==='convidado'){ setText('#cv-quem', convite ? (convite.nome||'').split(' ')[0] : 'um cliente'); }
  if(id==='detail'){ renderDetail(); }
  if(id==='admin'){ /* static */ }
}

/* ---------- HELPERS ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function initials(){ return (S.account.firstName[0]||'')+(S.account.lastName[0]||''); }
const PROF_TITULOS = { medicos:['Dr.','Dra.'], dentistas:['Dr.','Dra.'], veterinarios:['Dr.','Dra.'], farmaceuticos:['Dr.','Dra.'], enfermeiros:['Enf.','Enf.ª'], engenheiros:['Eng.','Eng.ª'], arquitetos:['Arq.','Arq.ª'] };
function title(){
  const f = ((S.demo ? guessGender(S.account.firstName||'') : S.account.gender) || guessGender(S.account.firstName||'')) === 'F';
  const t = S.protocolo && (PROF_TITULOS[S.protocolo.codigo] || (S.protocolo.titulo ? String(S.protocolo.titulo).split('|') : null));
  if(t) return f ? (t[1]||t[0]) : t[0];
  return f ? 'Sra.' : 'Sr.';
}
function guessGender(firstName){
  const f = (firstName||'').trim().toLowerCase();
  const excM = ['luca','joshua','elias','andré','isaías'];
  if(excM.includes(f)) return 'M';
  const excF = ['inês','ines','beatriz','raquel','isabel','carmen','rosário','rosario','conceição','assunção','luz','liz','ester','ruth','rute','miriam','lurdes','mercês','alice','leonor','matilde','denise','irene','madalena','sofie','margarida','íris','iris','noémi','yasmin','jasmim','carol','nicole','michelle','daniele','simone','aline','raquel','mabel','marisol','dolores','graciete','odete','ivone','elisabete','lisete','arlete','berenice','eunice','clarisse','beatrice','constance','yolanda'];
  if(excF.includes(f)) return 'F';
  return /[aã]$/.test(f) ? 'F' : 'M';
}
const DAYS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CHIP_MAP = {
  'Auto':       { cls:'auto',  hex:'#E50914', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">A</span>' },
  'Frota':      { cls:'auto',  hex:'#E50914', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">A</span>' },
  'Saúde':      { cls:'saude', hex:'#1E90FF', html:'<span style="color:#fff;font-weight:800;font-size:20px;line-height:1;font-family:var(--sans);">+</span>' },
  'Saúde PME':  { cls:'saude', hex:'#1E90FF', html:'<span style="color:#fff;font-weight:800;font-size:20px;line-height:1;font-family:var(--sans);">+</span>' },
  'Vida Profissional': { cls:'pro', hex:'#151515', html:'<span style="color:#E2C98A;font-weight:800;font-size:13px;line-height:1;font-family:var(--display);">VP</span>' },
  'Vida':       { cls:'vida',  hex:'#7A2AA0', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">V</span>' },
  'RC':         { cls:'vida',  hex:'#7A2AA0', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">V</span>' },
  'Acidentes':  { cls:'vida',  hex:'#7A2AA0', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">V</span>' },
  'Casa':       { cls:'casa',  hex:'#1DB954', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">C</span>' },
  'Habitação':  { cls:'casa',  hex:'#1DB954', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">C</span>' },
  'Património': { cls:'casa',  hex:'#1DB954', html:'<span style="color:#fff;font-weight:800;font-size:15px;line-height:1;font-family:var(--display);">C</span>' },
};

function toast(msg){
  const t = $('#toast'); if(!t) return;
  $('#toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=> t.classList.remove('show'), 2400);
}

/* ---------- NOTIFICATIONS (renewals) ---------- */
/* ---------- REFERRALS (Supabase) ---------- */
async function loadReferrals(){
  if(!window.EXASupabase || !S.account.nif) return;
  const nif = S.account.nif;
  try {
    const [code, inv, pts] = await Promise.all([
      window.EXASupabase.meuCodigo(nif),
      window.EXASupabase.convitesDoCliente(nif),
      window.EXASupabase.pontosDoCliente(nif)
    ]);
    if(code) S.refCode = code;
    if(inv && inv.ok) S.refInvites = inv.rows;
    if(pts) S.refPoints = pts;
    save();
    renderNotifs();
    if(document.querySelector('#s-montra.active')) renderMontra();
  } catch(e){}
}
function refNotifItems(){
  const out = [];
  (S.refInvites||[]).forEach(inv=>{
    if(!inv.elegivel || !inv.pontos) return;
    const d = parseAnyDate(inv.data_inicio) || parseAnyDate(inv.registado_em);
    const ramo = /vida/i.test(inv.ramo||'') ? 'vida' : 'saúde';
    out.push({
      kind:'ref', d: d || new Date(),
      title: 'Boa notícia — o seu convite realizou uma proteção de '+ramo+'. +'+inv.pontos+' pontos'
    });
  });
  const saldo = S.refPoints && S.refPoints.saldo;
  if(saldo >= 50){
    out.push({ kind:'redeem', d:new Date(), title:'Tem '+saldo+' pontos. Pode resgatar o seu cartão' });
  }
  return out;
}

/* Notificações do sistema. No Android (Chrome e app da Play Store) "new Notification()"
   não é permitido: tem de ser o service worker a mostrar. */
function notifOn(k){ return !S.notifications || S.notifications[k] !== false; }
function notificar(titulo, opts){
  if(S.demo || S.pushAtivo || pushEmCurso || !('Notification' in window) || Notification.permission!=='granted') return;
  opts = Object.assign({ icon:'icon-192.png', badge:'icon-192.png', data:{ url:'./' } }, opts||{});
  const direto = ()=>{ try{ new Notification(titulo, opts); }catch(e){} };
  if('serviceWorker' in navigator && navigator.serviceWorker.getRegistration){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg && reg.showNotification) reg.showNotification(titulo, opts).catch(direto); else direto();
    }).catch(direto);
  } else direto();
}
/* ---------- Notificações com a app fechada (Web Push via Supabase) ---------- */
function b64uParaBytes(b64){
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw, c=>c.charCodeAt(0));
}
function swPronto(ms){
  if(!('serviceWorker' in navigator)) return Promise.resolve(null);
  return Promise.race([ navigator.serviceWorker.ready, new Promise(r=>setTimeout(()=>r(null), ms||8000)) ]);
}
let pushEmCurso = null;
function ativarPush(){
  if(pushEmCurso) return pushEmCurso;
  pushEmCurso = (async ()=>{
    try{
      if(S.demo || !window.EXASupabase || !('PushManager' in window) || !('Notification' in window) || Notification.permission!=='granted') return false;
      if(!(await window.EXASupabase.temSessao())) return false;
      const reg = await swPronto(8000); if(!reg || !reg.pushManager) return false;
      const chave = await window.EXASupabase.pushChave(); if(!chave) return false;
      let sub = await reg.pushManager.getSubscription();
      if(sub && S.pushChave && S.pushChave !== chave){ try{ await sub.unsubscribe(); }catch(e){} sub = null; }
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64uParaBytes(chave) });
      const r = await window.EXASupabase.guardarPush(sub, S.notifications || {});
      S.pushAtivo = !!r.ok; S.pushChave = chave; S.pushEndpoint = (sub.toJSON ? sub.toJSON() : sub).endpoint; save();
      return S.pushAtivo;
    }catch(e){ return false; }
    finally{ pushEmCurso = null; }
  })();
  return pushEmCurso;
}
/* ---------- Visitantes (ainda não clientes): pedir notificações ao abrir a app ---------- */
const PEDIDO_NOTIF_K = 'exa_pedido_notif';
function podePedirNotif(){
  if(!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return false;
  if(Notification.permission !== 'default') return false;
  if(S.loggedIn && !S.demo) return false;               // clientes: pedido no Perfil / ao ativar avisos
  let ult = 0; try{ ult = +localStorage.getItem(PEDIDO_NOTIF_K) || 0; }catch(e){}
  return Date.now() - ult > 7*86400000;                  // "Agora não" → volta a perguntar daqui a 7 dias
}
function convidarNotificacoes(){
  if(!podePedirNotif()) return;
  if(document.querySelector('.sheet-wrap.open')) { setTimeout(convidarNotificacoes, 4000); return; }
  openSheet('sh-notif-visitante');
}
async function boasVindasLocal(){
  const reg = await swPronto(5000);
  try{
    if(reg && reg.showNotification) await reg.showNotification('Bem-vindo à EXA Seguros', { body:'Instalou a app EXA Seguros. Para simular o melhor seguro para si, entre em contacto connosco e tenha o controlo de todos os seus seguros num só sítio.', icon:'icon-192.png', badge:'icon-192.png', tag:'visit-bemvindo', data:{ url:'./' } });
    else new Notification('Bem-vindo à EXA Seguros', { body:'Instalou a app EXA Seguros. Para simular o melhor seguro para si, entre em contacto connosco.', icon:'icon-192.png' });
  }catch(e){}
}
async function ativarNotifVisitante(){
  try{ localStorage.setItem(PEDIDO_NOTIF_K, String(Date.now())); }catch(e){}
  closeSheet('sh-notif-visitante');
  if(!('Notification' in window)) return;
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  estadoPermNotif();
  if(perm !== 'granted'){ toast('Pode ativar mais tarde nas definições do telemóvel'); return; }
  // cliente com sessão: avisos normais
  if(window.EXASupabase && !S.demo && await window.EXASupabase.temSessao()){ ativarPush(); return; }
  let ok = false;
  try{
    const reg = await swPronto(8000);
    const chave = reg && reg.pushManager && window.EXASupabase ? await window.EXASupabase.pushChave() : null;
    if(chave){
      let sub = await reg.pushManager.getSubscription();
      if(sub && S.pushChave && S.pushChave !== chave){ try{ await sub.unsubscribe(); }catch(e){} sub = null; }
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64uParaBytes(chave) });
      const r = await window.EXASupabase.guardarPushVisitante(sub);
      ok = !!r.ok;
      if(ok){ S.pushChave = chave; S.pushVisitante = (sub.toJSON ? sub.toJSON() : sub).endpoint; save(); }
    }
  }catch(e){ ok = false; }
  if(!ok) boasVindasLocal();                              // servidor indisponível: boas-vindas local
  toast('Notificações ativas');
}
function recusarNotifVisitante(){
  try{ localStorage.setItem(PEDIDO_NOTIF_K, String(Date.now())); }catch(e){}
  closeSheet('sh-notif-visitante');
}
async function desativarPush(){
  const ep = S.pushEndpoint;
  S.pushAtivo = false; S.pushEndpoint = null; save();
  try{
    if(ep && window.EXASupabase) await window.EXASupabase.apagarPush(ep);
    const reg = await swPronto(3000);
    const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if(sub) await sub.unsubscribe();
  }catch(e){}
}
function pedirPermissaoNotif(){
  if(!('Notification' in window) || Notification.permission!=='default') return Promise.resolve(window.Notification ? Notification.permission : 'denied');
  return Notification.requestPermission().then(r=>{ estadoPermNotif(); if(r==='granted'){ renderNotifs(); ativarPush(); } return r; });
}
function estadoPermNotif(){
  const el = document.getElementById('notif-perm'); if(!el) return;
  if(!('Notification' in window)) { el.textContent='Este dispositivo não suporta notificações. Os avisos aparecem no sino da app.'; return; }
  const p = Notification.permission;
  el.textContent = p==='granted' ? (S.pushAtivo ? 'Notificações ativas neste dispositivo, mesmo com a app fechada.' : 'Notificações ativas neste dispositivo. Os avisos são verificados sempre que abre a app.')
    : p==='denied' ? 'As notificações estão bloqueadas. Ative-as nas definições do telemóvel (Apps → EXA Seguros → Notificações).'
    : 'Ao ativar um aviso, o telemóvel pede autorização para mostrar notificações.';
}
function pushRenov(items){
  let sent={}; try{ sent=JSON.parse(localStorage.getItem('exa_renov_push')||'{}'); }catch(e){}
  const novos = items.filter(it=>!sent[(it.p.num||it.p.nome)+'|'+it.d.toISOString().slice(0,10)]);
  if(!novos.length || S.demo || !('Notification' in window)) return;
  const fire = ()=>{ novos.forEach(it=>{ try{ notificar('Renovação: '+(it.p.nome||it.p.ramo), { body:'A sua apólice renova a '+fmtDateShort(it.d)+' (dentro de '+it.days+' dias). Caso necessite de ajustar, alterar ou verificar as condições, contacte o seu gestor de seguros.', icon:'logo-ageas.png', tag:'renov-'+(it.p.num||it.p.nome) }); }catch(e){} sent[(it.p.num||it.p.nome)+'|'+it.d.toISOString().slice(0,10)]=1; }); try{ localStorage.setItem('exa_renov_push', JSON.stringify(sent)); }catch(e){} };
  if(Notification.permission==='granted') fire();
  else if(Notification.permission==='default') Notification.requestPermission().then(r=>{ if(r==='granted') fire(); });
}
const SEASONS = [
  { id:'gripe', meses:[9,10,11,0,1], est:'Outono e inverno', t:'Está com gripe ou constipação?', m:'É a época de gripe. Se tiver febre, tosse ou dores no corpo, marque a sua consulta num hospital ou clínica da rede Medis perto de si. Com o seu seguro paga menos.', cta:'Hospitais perto de si' },
  { id:'alergias', meses:[2,3,4], est:'Primavera', t:'Alergias da primavera?', m:'Espirros, olhos irritados ou nariz entupido? Consulte um especialista em imunoalergologia da rede Medis perto de si.', cta:'Encontrar especialista' },
  { id:'verao', meses:[5,6,7], est:'Verão', t:'Proteja a pele este verão', m:'Antes das férias, faça o rastreio de sinais com um dermatologista da rede Medis. Em caso de insolação, procure o hospital Medis mais próximo.', cta:'Encontrar dermatologista' },
  { id:'regresso', meses:[8], est:'Regresso às aulas', t:'Regresso às aulas, regresso à rotina', m:'É uma boa altura para a consulta de pediatria e oftalmologia dos mais novos na rede Medis.', cta:'Encontrar médico' }
];
function seasonNow(){ const m=new Date().getMonth(); return SEASONS.find(s=>s.meses.includes(m)); }
function seasonItems(arr){
  if(!notifOn('sazonal')) return [];
  const s = seasonNow(); if(!s) return [];
  const p = arr.find(p=>/sa[uú]de/i.test(p.ramo||'') && !/cancel|anula/i.test(p.situacao||'')); if(!p) return [];
  const k = s.id+'-'+new Date().getFullYear()+(s.id==='gripe' && new Date().getMonth()<2 ? '-'+(new Date().getFullYear()-1) : '');
  let off={}; try{ off = S.demo ? (window.__demoSeason||{}) : JSON.parse(localStorage.getItem('exa_season')||'{}'); }catch(e){}
  if(off[k]) return [];
  const it = { kind:'season', p, s, k, d:new Date() };
  if(!S.demo && 'Notification' in window && Notification.permission==='granted'){
    let sent={}; try{ sent=JSON.parse(localStorage.getItem('exa_season_push')||'{}'); }catch(e){}
    if(!sent[k]){ notificar(s.t, { body:s.m, tag:'season-'+s.id }); sent[k]=1; try{ localStorage.setItem('exa_season_push', JSON.stringify(sent)); }catch(e){} }
  }
  return [it];
}
function checkupItems(arr){
  if(!notifOn('checkup')) return [];
  const DAY=86400000, SIX=182*DAY, now=Date.now();
  let done={}; try{ done = S.demo ? (window.__demoCheckup||{}) : JSON.parse(localStorage.getItem('exa_checkup')||'{}'); }catch(e){}
  return arr.filter(p=>/sa[uú]de/i.test(p.ramo||'') && !/cancel|anula/i.test(p.situacao||'')).map(p=>{
    const k = p.num||p.nome;
    const ini = parseAnyDate(p.inicio); const base = done[k] || (ini ? +ini : now - SIX);
    let next = base + SIX; while(!done[k] && next + SIX <= now) next += SIX;
    if(now < next) return null;
    return { kind:'checkup', p, d:new Date(next), k };
  }).filter(Boolean);
}
function pushCheckup(items){
  if(!items.length || S.demo || !('Notification' in window) || Notification.permission!=='granted') return;
  let sent={}; try{ sent=JSON.parse(localStorage.getItem('exa_checkup_push')||'{}'); }catch(e){}
  items.forEach(it=>{ const key=it.k+'|'+it.d.toISOString().slice(0,10); if(sent[key]) return; notificar('Está na altura do seu check-up', { body:'Passaram 6 meses. Marque uma consulta com o seu médico para confirmar que está tudo bem.', tag:'checkup-'+it.k }); sent[key]=1; });
  try{ localStorage.setItem('exa_checkup_push', JSON.stringify(sent)); }catch(e){}
}
function pagamentoItems(arr){
  if(!notifOn('pagamentos')) return [];
  const MESES = { mensal:1, trimestral:3, semestral:6, anual:12 };
  const today = new Date(); today.setHours(0,0,0,0);
  return arr.map(p=>{
    if(/cancel|anula/i.test(p.situacao||'')) return null;
    const frac = String(p.frac||'anual').toLowerCase(); const m = MESES[frac]; if(!m) return null;
    let d = parseAnyDate(p.inicio) || parseAnyDate(p.renov || (p.extra && p.extra['Renovação'])); if(!d) return null;
    d = new Date(d); let guard = 0;
    while(d < today && guard++ < 1200) d.setMonth(d.getMonth()+m);
    const days = Math.round((d - today)/86400000);
    if(days < 0 || days > 3) return null;
    const total = parsePremio(p.premio); const n = (FRAC[frac]||FRAC.anual).n;
    const valor = total!=null ? fmtEuro(total/n) : '';
    return { kind:'pay', p, d, days, valor, k:(p.num||p.nome)+'|'+d.toISOString().slice(0,10) };
  }).filter(Boolean);
}
function pushPagamentos(items){
  if(!items.length || S.demo || !('Notification' in window) || Notification.permission!=='granted') return;
  let sent={}; try{ sent=JSON.parse(localStorage.getItem('exa_pay_push')||'{}'); }catch(e){}
  items.forEach(it=>{ if(sent[it.k]) return;
    notificar('Pagamento '+(it.days===0?'hoje':'em '+it.days+(it.days===1?' dia':' dias'))+': '+(it.p.nome||it.p.ramo),
      { body:(it.valor?'Débito de '+it.valor+' a ':'Débito a ')+fmtDateShort(it.d)+'. Confirme que tem saldo na conta.', tag:'pay-'+(it.p.num||it.p.nome) });
    sent[it.k]=1; });
  try{ localStorage.setItem('exa_pay_push', JSON.stringify(sent)); }catch(e){}
}
function renderNotifs(){
  const list = $('#notifs-list'); if(!list) return;
  const arr = (S.policies[walletTab]||[]).slice();
  // compute days until renewal (renov is dd/mm/yyyy or yyyy-mm-dd)
  const today = new Date(); today.setHours(0,0,0,0);
  const items = arr.map(p=>{
    let d = parseAnyDate(p.renov || p.extra && p.extra['Renovação']);
    if(!d || d < today){ const pi = protecaoInfo(p); if(pi && pi.renova) d = pi.renova; }
    if(!d) return null;
    const days = Math.round((d - today) / 86400000);
    if(days < 0 || days > 60) return null;
    if(/cancel|anula/i.test(p.situacao||'')) return null;
    return { kind:'renov', p, d, days };
  }).filter(Boolean);
  if(notifOn('renovacao')) pushRenov(items);
  const refs = refNotifItems();
  const checks = seasonItems(arr).concat(checkupItems(arr));
  pushCheckup(checks.filter(it=>it.kind==='checkup'));
  const pays = pagamentoItems(arr);
  pushPagamentos(pays);
  const all = checks.concat(pays, items.concat(refs).sort((a,b)=> b.d - a.d));

  list.innerHTML = all.length ? all.map((it,idx)=>{
    if(it.kind==='season'){
      const s = it.s;
      const ctaS='flex:1;min-height:40px;display:flex;align-items:center;justify-content:center;border-radius:999px;font-family:var(--sans);font-size:12px;font-weight:600;text-decoration:none;';
      return '<div style="padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff;">'
        +'<div style="display:flex;align-items:center;gap:12px;">'
        +'<div style="width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="logo-medis.png" alt="" style="max-width:44px;max-height:28px;object-fit:contain;"></div>'
        +'<div style="flex:1;min-width:0;"><div style="font-family:var(--display);font-size:14px;font-weight:600;color:var(--ink);line-height:1.25;">'+s.t+'</div>'
        +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:2px;">'+s.est+' · '+esc(it.p.nome||'Saúde')+'</div></div></div>'
        +'<div style="font-size:12px;color:var(--ink-2);line-height:1.5;margin-top:10px;">'+s.m+'</div>'
        +'<div style="display:flex;gap:8px;margin-top:10px;">'
        +'<a href="https://www.medis.pt/guia-medis/" target="_blank" rel="noopener" style="'+ctaS+'background:var(--indigo);color:#fff;">'+s.cta+'</a>'
        +'<button type="button" data-act="season-x" data-k="'+it.k+'" style="'+ctaS+'background:#fff;color:var(--ink-2);border:1px solid var(--line);cursor:pointer;">Agora não</button>'
        +'</div></div>';
    }
    if(it.kind==='checkup'){
      const p = it.p;
      const waC=encodeURIComponent('Olá! Gostava de marcar a minha consulta de rotina pelo seguro '+(p.nome||'de saúde')+'.');
      const ctaS='flex:1;min-height:40px;display:flex;align-items:center;justify-content:center;border-radius:999px;font-family:var(--sans);font-size:12px;font-weight:600;text-decoration:none;';
      return '<div style="padding:12px;border:1px solid rgba(46,74,196,0.22);border-radius:14px;background:#F3F5FD;">'
        +'<div style="display:flex;align-items:center;gap:12px;">'
        +'<div style="width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="logo-medis.png" alt="" style="max-width:44px;max-height:28px;object-fit:contain;"></div>'
        +'<div style="flex:1;min-width:0;"><div style="font-family:var(--display);font-size:14px;font-weight:600;color:var(--ink);line-height:1.25;">Está na altura do seu check-up</div>'
        +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:2px;">'+esc(p.nome||'Saúde')+' · a cada 6 meses</div></div></div>'
        +'<div style="font-size:12px;color:var(--ink-2);line-height:1.5;margin-top:10px;">Passaram 6 meses. Marque uma consulta com o seu médico de família para confirmar que está tudo bem. Prevenir é a melhor forma de usar o seu seguro de saúde.</div>'
        +'<div style="display:flex;gap:8px;margin-top:10px;">'
        +'<a href="https://www.medis.pt/guia-medis/" target="_blank" rel="noopener" style="'+ctaS+'background:var(--indigo);color:#fff;">Encontrar médico</a>'
        +'<a href="https://wa.me/351913042770?text='+waC+'" target="_blank" rel="noopener" style="'+ctaS+'background:#fff;color:var(--ink);border:1px solid var(--line);">Falar com gestor</a>'
        +'</div>'
        +'<button type="button" data-act="checkup-done" data-k="'+esc(it.k)+'" style="margin-top:8px;width:100%;min-height:36px;border:none;background:none;font-family:var(--sans);font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;">Já fiz a consulta</button>'
        +'</div>';
    }
    if(it.kind==='pay'){
      return '<div style="padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff;">'
        +'<div style="display:flex;align-items:center;gap:12px;">'
        +'<div style="width:36px;height:36px;border-radius:10px;background:var(--ink);color:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;">€</div>'
        +'<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.35;">Pagamento '+(it.days===0?'hoje':'em '+it.days+(it.days===1?' dia':' dias'))+' · '+esc(it.p.nome||it.p.ramo)+'</div>'
        +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:3px;">'+(it.valor?esc(it.valor)+' · ':'')+fmtDateShort(it.d)+'</div></div></div></div>';
    }
    if(it.kind!=='renov'){
      const isRedeem = it.kind==='redeem';
      return '<div style="padding:12px;border:1px solid '+(isRedeem?'rgba(255,95,46,0.3)':'var(--line)')+';border-radius:14px;background:'+(isRedeem?'#FFF3EE':'#fff')+';">'
        +'<div style="display:flex;align-items:center;gap:12px;">'
        +'<div style="width:36px;height:36px;border-radius:10px;background:'+(isRedeem?'var(--accent)':'#0EA25F')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;">'+(isRedeem?'€':'+')+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.35;">'+esc(it.title)+'</div>'
        +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:3px;">'+fmtDateShort(it.d)+'</div>'
        +'</div></div></div>';
    }
    const p = it.p;
    const urgent = it.days<=30 && it.days>=0;
    const past = it.days<0;
    const cancelled = /cancel|anula/i.test(p.situacao||'');
    const label = past ? Math.abs(it.days)+' dias atrás' : (it.days===0 ? 'hoje' : 'em '+it.days+' dias');
    const ctaS='flex:1;min-height:40px;display:flex;align-items:center;justify-content:center;border-radius:999px;font-family:var(--sans);font-size:12px;font-weight:600;text-decoration:none;';
    const assunto=encodeURIComponent('Renovação — '+(p.nome||p.ramo)+' ('+(p.num||'')+')');
    const waT=encodeURIComponent('Olá! A minha apólice '+(p.nome||p.ramo)+' ('+(p.num||'')+') renova a '+fmtDateShort(it.d)+'. Gostava de rever as condições.');
    const renMsg = '<div style="font-size:12px;color:var(--ink-2);line-height:1.5;margin-top:10px;">A sua apólice renova '+(it.days===0?'hoje':'dentro de '+it.days+' dias')+'. Caso necessite de ajustar, alterar ou verificar as condições da apólice, entre em contacto com o seu gestor de seguros.</div>'
      +'<div style="display:flex;gap:8px;margin-top:10px;">'
      +'<a href="https://wa.me/351913042770?text='+waT+'" target="_blank" rel="noopener" style="'+ctaS+'background:#25D366;color:#fff;">WhatsApp</a>'
      +'<a href="mailto:edgar.azevedo@private.ageas.pt?subject='+assunto+'" style="'+ctaS+'background:var(--ink);color:#fff;">Email</a>'
      +'<a href="tel:+351913042770" style="'+ctaS+'background:#fff;color:var(--ink);border:1px solid var(--line);">Telefone</a>'
      +'</div>';
    const color = past ? '#B94A3B' : (urgent ? 'var(--accent)' : 'var(--ink-2)');
    const chip = CHIP_MAP[p.ramo];
    const iconBg = chip ? chip.hex : ('var(--'+(p.color==='coral'?'accent':p.color)+')');
    const iconHtml = chip ? chip.html : (p.ramo?p.ramo[0]:'•');
    return '<div style="padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff;">'
      +'<div style="display:flex;align-items:center;gap:12px;">'
      +'<div style="width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><img src="'+(seguradoraDe(p)==='medis'?'logo-medis.png':'logo-ageas-white.png')+'" alt="" style="max-width:44px;'+(seguradoraDe(p)==='medis'?'max-height:28px;':'height:18px;filter:brightness(0);')+'object-fit:contain;"></div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="display:flex;align-items:center;gap:6px;"><div style="font-family:var(--display);font-size:14px;font-weight:600;color:var(--ink);line-height:1.25;flex:1;min-width:0;">'+esc(p.nome||p.ramo)+'</div><div style="flex-shrink:0;margin-left:auto;text-align:right;line-height:0.85;font-family:Nunito,sans-serif;color:#000;"><div style="font-size:16px;font-weight:800;letter-spacing:-0.02em;">azevedo</div><div style="font-size:9px;font-weight:800;margin-top:-1px;">seguros</div></div>'+(cancelled?'<span style="font-family:var(--mono);font-size:9px;letter-spacing:0.05em;text-transform:uppercase;color:#B94A3B;background:rgba(185,74,59,0.1);padding:2px 6px;border-radius:6px;">Anulada</span>':'')+'</div>'
      +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:2px;">Renova '+fmtDateShort(it.d)+' · <span style="color:'+color+';font-weight:600;">'+label+'</span></div>'
      +'</div>'
      +'</div>'
      +(cancelled?'':renMsg)
      +(cancelled ? '<div style="margin-top:10px;"><textarea id="mot-'+idx+'" rows="2" placeholder="Motivo da anulação (opcional)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#F4F1EA;font-family:var(--sans);font-size:12px;color:var(--ink);resize:vertical;"></textarea><button type="button" data-act="motivo-send" data-idx="'+idx+'" style="margin-top:6px;padding:7px 12px;border-radius:8px;background:var(--ink);color:#fff;border:none;font-family:var(--mono);font-size:10px;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;">Enviar motivo ao mediador</button></div>' : '')
      +'</div>';
  }).join('') : '<div class="body-s" style="text-align:center;padding:24px;">Sem avisos.</div>';
  window.__notifItems = all;

  // badge count = renewals within 60 days + avisos de convites
  const soon = all.length;
  const badge = $('#bell-count');
  if(badge){
    badge.textContent = soon;
    badge.style.display = soon>0 ? 'inline-flex' : 'none';
  }
}
function parseAnyDate(s){
  if(!s) return null;
  if(s instanceof Date) return s;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);
  const pt = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/.exec(s);
  if(pt){ let y=+pt[3]; if(y<100) y+=2000; return new Date(y, +pt[2]-1, +pt[1]); }
  return null;
}
function sendMotivo(idx){
  const it = (window.__notifItems||[])[idx]; if(!it) return;
  const ta = $('#mot-'+idx);
  const mot = ta ? ta.value.trim() : '';
  const subject = encodeURIComponent('Anulação de apólice — '+S.account.firstName+' '+S.account.lastName+' (NIF '+S.account.nif+')');
  const body = encodeURIComponent('Apólice: '+(it.p.nome||it.p.ramo)+' ('+(it.p.num||'')+')\nRamo: '+it.p.ramo+'\nNIF: '+S.account.nif+'\nMotivo indicado: '+(mot||'Não indicado'));
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  toast('Motivo enviado ao mediador');
}
function fmtDateShort(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return dd+'/'+mm+'/'+d.getFullYear();
}

/* ---------- GREETING ---------- */
function updateGreeting(){
  const h = new Date().getHours();
  const g = h<12 ? 'Bom dia' : h<19 ? 'Boa tarde' : 'Boa noite';
  setText('#greet-label', g);
  if(walletTab==='empresa' && S.empresaClient && S.empresaClient.nome){
    setText('#greet-name', S.empresaClient.nome);
  } else {
    setText('#greet-name', title()+' '+S.account.firstName);
  }
  const day = DAYS[new Date().getDay()];
  const activeCount = (S.policies[walletTab]||[]).filter(pl=>!/cancel|anula/i.test(pl.situacao||'')).length;
  const tail = $('#greet-tail');
  if(tail) tail.innerHTML = activeCount>0 ? ', a sua proteção<br>está em ordem.' : ',<br>bem-vind'+(S.account.gender==='F'?'a':'o')+' à sua wallet.';
  const dayIdx = new Date().getDay();
  const masc = (dayIdx===0 || dayIdx===6);
  const foot = $('#weekday-greeting');
  const footName = (walletTab==='empresa' && S.empresaClient && S.empresaClient.nome) ? S.empresaClient.nome : (title()+' '+S.account.firstName);
  if(foot) foot.innerHTML = footName+', desejamos-lhe '+(masc?'um <b style="color:var(--ink);font-weight:600;">bom '+day+'</b>':'uma <b style="color:var(--ink);font-weight:600;">boa '+day+'</b>')+'.';
}
function setText(sel,val){ const el=$(sel); if(el) el.textContent=val; }

/* ---------- AUTH ---------- */
function aplicarCliente(res){
  const c = res.cliente;
  const parts = (c.nome||'').trim().split(' ');
  if(parts[0]){ S.account.firstName = parts[0]; S.account.lastName = parts.slice(1).join(' '); }
  S.account.nif = c.nif || S.account.nif;
  S.account.email = c.email || S.account.email;
  S.account.gender = c.genero || guessGender(parts[0]);
  if(c.telefone) S.account.phone = c.telefone;
  if(c.data_nascimento) S.account.birthdate = c.data_nascimento;
  if(c.morada) S.account.address = c.morada;
  S.policies.particular = res.apolices;
  S.protocolo = res.protocolo || null;
  S.demo = false;
  if(!S.empresaLoaded) S.policies.empresa = [];
  S.loggedIn = true; save();
}
async function restaurarSessao(){
  if(!window.EXASupabase) return false;
  try{
    const res = await window.EXASupabase.restaurarSessao();
    if(!res.ok) return false;
    S.demo=false;
    ativarPush();
    aplicarCliente(res);
    await loadReferrals();
    return true;
  }catch(e){ return false; }
}
function seedOrdem(k){ k = k||'medicos';
  let n=900; const p=()=>'o'+(n++);
  return { particular:[
    { id:p(), color:'pro',    ramo:'Vida Profissional', nome:'Ritmo Vida Profissional', num:'VP20481122', premio:'420,00€', per:'ano', inicio:'2020-02-03', ordem:k, extra:{'Morte ou invalidez':'250.000€'}, irs:true },
    { id:p(), color:'indigo', ramo:'Saúde', nome:'Saúde Família', num:'SA77120034', premio:'486,00€', per:'ano', inicio:'2021-06-01', opcao:'op1-amb1000', extra:{}, irs:true },
    { id:p(), color:'coral',  ramo:'Auto', nome:'Protec Ligeiros', num:'AU88213409', premio:'512,30€', per:'ano', inicio:'2022-04-18', coberturas:['vidros','choque','furto','natureza'], extra:{Matrícula:'BQ-12-RT', Veículo:'Volvo XC40 · 2023'} },
    { id:p(), color:'emerald',ramo:'Casa', nome:'Casa Segura', num:'HA55902218', premio:'264,00€', per:'ano', inicio:'2019-10-07', coberturas:['vidros','furto'], extra:{Morada:'Av. da Boavista, 1200', Capital:'320.000€'} }
  ], empresa:[] };
}
function entrarLivre(tipo, od){
  if(typeof introTimer!=='undefined' && introTimer){ clearTimeout(introTimer); introTimer=null; }
  const ordem = tipo==='ordem'; od = od || DEMO_ORDENS['202020.OM'];
  S.account = JSON.parse(JSON.stringify(demoAccount));
  if(ordem) Object.assign(S.account, { gender:guessGender(od.nome[0]), firstName:od.nome[0], lastName:od.nome[1], nif:'234 567 890', email:(od.nome[0]+'.'+od.nome[1]).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'@email.pt', phone:'+351 936 112 450', profissao:od.prof });
  S.policies = ordem ? seedOrdem(od.k) : seedPolicies();
  S.showEmpresa = ordem ? false : null;
  S.protocolo = ordem && window.exaProtocolo ? window.exaProtocolo(od.k) : null;
  S.points = 30;
  S.invites = JSON.parse(JSON.stringify(demoInvites));
  S.investList = [{ ativo:true, produto:'Maximus Poupança', valor:612.4, desde:'2026-01-10' },{ ativo:true, produto:'PPR+ tradicional', valor:1480, desde:'2025-03-15' }];
  S.investReal = S.investList[0];
  S.empresaLoaded = true;
  S.demo = true;
  S.loggedIn = true; save();
  nav('home', {replace:true}); stack = ['home'];
  document.body.classList.add('is-demo');
  if(!window.__wfMode) setTimeout(()=>openSheet('sh-demo'),500);
}
window.entrarLivre = entrarLivre;
const DEMO_CODIGO = '101010.EA';
const DEMO_ORDENS = {
  '202020.OM':  { k:'medicos',       nome:['Ana','Ribeiro'],  prof:'Médica' },
  '202021.OMD': { k:'dentistas',     nome:['Rui','Matos'],    prof:'Médico Dentista' },
  '202022.OF':  { k:'farmaceuticos', nome:['Sofia','Lopes'],  prof:'Farmacêutica' },
  '202023.OE':  { k:'enfermeiros',   nome:['Marta','Pinto'],  prof:'Enfermeira' },
  '202024.OMV': { k:'veterinarios',  nome:['Pedro','Faria'],  prof:'Médico Veterinário' },
  '202025.OEN': { k:'engenheiros',   nome:['Tiago','Sousa'],  prof:'Engenheiro' },
  '202026.OA':  { k:'arquitetos',    nome:['Inês','Carvalho'],prof:'Arquitecta' }
};
async function demoValidar(raw){
  const code = String(raw||'').trim().toUpperCase();
  if(!code) return { ok:false, msg:'Introduza o código.' };
  if(code===DEMO_CODIGO) return { ok:true };
  if(DEMO_ORDENS[code]) return { ok:true, tipo:'ordem', ordem:DEMO_ORDENS[code] };
  return { ok:false, msg:'Código inválido. Confirme com o seu gestor.' };
}
async function demoCodeSubmit(){
  const el=$('#demo-code'), err=$('#demo-err'); const r = await demoValidar(el&&el.value);
  if(!r.ok){ if(err) err.textContent=r.msg; return; }
  if(err) err.textContent=''; closeSheet('sh-demo-code'); entrarLivre(r.tipo, r.ordem);
}
async function demoFromUrl(){
  const m = location.search.match(/[?&]demo=([^&]+)/i); if(!m) return false;
  const r = await demoValidar(decodeURIComponent(m[1]));
  try{ history.replaceState(null,'',location.pathname); }catch(e){}
  if(r.ok){ entrarLivre(r.tipo, r.ordem); return true; }
  toast(r.msg); return false;
}
window.__wf = function(k){
  window.__wfMode = true;
  save = function(){};
  if(/^(splash|onb\d)$/.test(k)){ if(introTimer){ clearTimeout(introTimer); introTimer=null; } stack=[k]; showScreen(k); return; }
  if(k==='login'){ if(typeof introTimer!=='undefined' && introTimer){ clearTimeout(introTimer); introTimer=null; } stack=['login']; showScreen('login'); return; }
  entrarLivre();
  const find = re => (S.policies.particular||[]).find(p=>re.test(p.ramo||''));
  const corpo = re => { const p=find(re); if(!p) return; openPolicy(p.id,'particular'); setTimeout(()=>{ const b=document.querySelector('[data-act=corpo-open]'); if(b) b.click(); },500); };
  setTimeout(()=>{
    if(k==='detalhe'){ const p=find(/auto/i); if(p) openPolicy(p.id,'particular'); }
    else if(k==='saude') corpo(/sa[uú]de/i);
    else if(k==='vida') corpo(/vida/i);
    else if(k==='carro') corpo(/auto/i);
    else if(k==='casa') corpo(/casa/i);
    else if(k==='notifs'){ renderNotifs(); openSheet('sh-notifs'); }
    else if(k==='invest') nav('invest-painel');
    else if(k==='gestor') openSheet('sh-gestor');
  },300);
};
setTimeout(()=>Object.assign(window,{ exaOpenSheet:openSheet, exaCloseSheet:closeSheet, exaRequester:requesterInfo, exaToast:toast }),0);
function prepArea(){
  const ph=document.querySelector('.phone'); if(!ph) return;
  const old=document.getElementById('prep-area'); if(old) old.remove();
  const nm=(title()+' '+(S.account.firstName||'')).trim();
  const el=document.createElement('div'); el.id='prep-area'; el.setAttribute('role','status');
  el.innerHTML='<div class="pa-in"><img class="pa-logo" src="exa-logo-coral.png" alt="EXA"><div class="pa-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="pa-bg" cx="32" cy="32" r="28"></circle><circle class="pa-fg" cx="32" cy="32" r="28"></circle><path class="pa-ok" d="M21 33 l7 7 l15 -16"></path></svg></div><p class="pa-name">'+esc(nm)+',</p><p class="pa-msg"><span class="pa-a">estamos a preparar a sua área reservada<i>.</i><i>.</i><i>.</i></span><span class="pa-b">Concluído.</span></p></div>';
  ph.appendChild(el);
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(()=>el.classList.add('done'), rm?600:2100);
  setTimeout(()=>el.classList.add('out'), rm?1300:3100);
  setTimeout(()=>el.remove(), rm?1700:3700);
}
async function doLogin(){
  const idVal = $('#login-email').value.trim();
  const pass = $('#login-pass').value;
  const errEl = $('#login-err');
  if(!idVal || !pass){ errEl.textContent='Preencha o NIF e a palavra-passe.'; return; }
  errEl.textContent='A verificar…';
  if(window.EXASupabase){
    let res;
    try {
      res = await window.EXASupabase.login(idVal, pass);
    } catch(err){
      errEl.textContent='Não foi possível ligar. Verifique a internet e tente novamente.';
      return;
    }
    if(res.ok){
      ativarPush();
      aplicarCliente(res);
      errEl.textContent='';
      await loadReferrals();
      nav('home', {replace:true});
      stack = ['home'];
      prepArea();
      return;
    }
    if(res.offline){ errEl.textContent = res.error; return; }
  }
  errEl.textContent='Credenciais inválidas.';
}
/* ---------- CONVITE RECEBIDO ---------- */
let convite = null;
async function detectarConvite(){
  const m = /[?&]ref=([^&]+)/.exec(location.search);
  if(!m) return;
  const codigo = decodeURIComponent(m[1]).toUpperCase();
  if(!codigo) return;
  // mostra logo o ecrã de convite, mesmo antes de saber o nome
  convite = { codigo: codigo, nome: '', nif: '' };
  if(!window.EXASupabase) return;
  try {
    const dono = await window.EXASupabase.donoDoCodigo(codigo);
    if(!dono){ convite = null; return; }
    convite.nome = dono.nome || '';
    convite.nif = dono.nif || '';
    const primeiro = (dono.nome||'').split(' ')[0];
    setText('#conv-quem-linha', primeiro ? ('Foi convidado por '+primeiro+'. ') : '');
    setText('#conv-quem-splash', primeiro ? ('Foi convidado por '+primeiro+'. ') : '');
    const badge = $('#conv-badge');
    if(badge) badge.style.display = 'block';
    setText('#cv-quem', primeiro || 'um cliente');
  } catch(e){}
}async function doRegisterConvidado(){
  const nome = ($('#cv-nome').value||'').trim();
  const nif = ($('#cv-nif').value||'').trim();
  const email = ($('#cv-email').value||'').trim();
  const pass = $('#cv-pass').value;
  const pass2 = $('#cv-pass2').value;
  const errEl = $('#cv-err');
  if(!nome || !nif || !pass){ errEl.textContent='Preencha o nome, o NIF e a palavra-passe.'; return; }
  if(nif.replace(/\D/g,'').length !== 9){ errEl.textContent='O NIF deve ter 9 dígitos.'; return; }
  if(pass.length<8){ errEl.textContent='A palavra-passe deve ter pelo menos 8 caracteres.'; return; }
  if(pass!==pass2){ errEl.textContent='As palavras-passe não coincidem.'; return; }
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  errEl.textContent='A criar conta…';
  let res;
  try {
    res = await window.EXASupabase.criarConvidado(nif, nome, email, convite && convite.codigo, pass);
  } catch(e){
    errEl.textContent='Não foi possível ligar. Tente novamente.';
    return;
  }
  if(!res.ok){ errEl.textContent = res.error; return; }
  errEl.textContent='';
  avisarAgenteConvite(nome, nif, email, res.jaCliente);
  if(res.jaCliente) toast('Já era nosso cliente — bem-vindo de volta');
  $('#login-email').value = nif;
  $('#login-pass').value = pass;
  doLogin();
}
function avisarAgenteConvite(nome, nif, email, jaCliente){
  if(S.demo) return;
  const quem = convite ? (convite.nome+' ('+convite.codigo+')') : 'sem código';
  const dados = {
    _subject: 'Novo registo por convite — '+nome+' (NIF '+nif+')',
    _template: 'table',
    _captcha: 'false',
    _cc: 'edgar.azevedo@private.ageas.pt',
    'Nome': nome,
    'NIF': nif,
    'Email': email || '—',
    'Convidado por': quem,
    'Data': new Date().toLocaleString('pt-PT'),
    'Situação': jaCliente ? 'Este NIF já era cliente — não conta pontos.' : 'Novo contacto — apresentar propostas.'
  };
  try{
    fetch('https://formsubmit.co/ajax/edgarsegurosageas@gmail.com', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify(dados), keepalive:true }).catch(()=>{});
  }catch(e){}
}

async function doRegister(){
  const nif = ($('#reg-nif').value||'').trim();
  const digitos = ($('#reg-digitos').value||'').trim();
  const email = ($('#reg-email').value||'').trim();
  const pass = $('#reg-pass').value;
  const pass2 = $('#reg-pass2').value;
  const errEl = $('#reg-err');
  if(!nif || !digitos || !email || !pass){ errEl.textContent='Preencha o NIF, os dígitos da apólice, o email e a palavra-passe.'; return; }
  if(pass.length<8){ errEl.textContent='A palavra-passe deve ter pelo menos 8 caracteres.'; return; }
  if(pass!==pass2){ errEl.textContent='As palavras-passe não coincidem.'; return; }
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  errEl.textContent='A validar…';
  let check;
  try {
    check = await window.EXASupabase.verificarRegisto(nif, digitos);
  } catch(err){
    errEl.textContent='Não foi possível ligar. Tente novamente.';
    return;
  }
  if(!check.ok){
    errEl.textContent = check.error;
    if(check.notFound) avisarAgenteNifDesconhecido(nif, email);
    return;
  }
  let created;
  try {
    created = await window.EXASupabase.criarConta(nif, pass, email, digitos);
  } catch(err){
    errEl.textContent='Não foi possível criar a conta. Tente novamente.';
    return;
  }
  if(!created.ok){ errEl.textContent = created.error; return; }
  errEl.textContent='';
  $('#login-email').value = nif;
  $('#login-pass').value = pass;
  toast('Conta criada — a entrar');
  doLogin();
}
function avisarAgenteNifDesconhecido(nif, email){
  const subject = encodeURIComponent('Pedido de acesso — NIF não encontrado ('+nif+')');
  const body = encodeURIComponent('Um cliente tentou registar-se na app e o NIF não consta na base de dados.\n\nNIF indicado: '+nif+(email?'\nEmail indicado: '+email:'')+'\n\nContactar para confirmar os dados.');
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?cc=edgar.azevedo@private.ageas.pt&subject='+subject+'&body='+body;
}
function doRecuperarPassword(){
  const v = ($('#login-email').value||'').trim();
  const em = $('#rec-email'); if(em) em.value = v.indexOf('@')>0 ? v : '';
  const err = $('#rec-err'); if(err) err.textContent='';
  openSheet('sh-recuperar');
}
async function doRecuperarEnviar(){
  const email = ($('#rec-email').value||'').trim();
  const errEl = $('#rec-err');
  if(email.indexOf('@')<1){ errEl.textContent='Indique o email da sua conta.'; return; }
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  errEl.textContent='A enviar…';
  let res;
  try { res = await window.EXASupabase.recuperarPassword(email); }
  catch(err){ errEl.textContent='Não foi possível enviar o email. Tente novamente.'; return; }
  if(!res.ok){ errEl.textContent=res.error; return; }
  errEl.textContent='';
  closeSheet('sh-recuperar');
  toast('Se o email tiver conta, recebe um link para criar nova palavra-passe');
}
function abrirNovaPass(recuperacao){
  if(S.demo){ toast('Indisponível na demonstração'); return; }
  const sub = $('#np-sub');
  if(sub) sub.textContent = recuperacao ? 'Escolha a nova palavra-passe da sua conta.' : 'Escolha uma nova palavra-passe (mínimo 8 caracteres).';
  ['#np-pass','#np-pass2'].forEach(id=>{ const e=$(id); if(e) e.value=''; });
  const err=$('#np-err'); if(err) err.textContent='';
  openSheet('sh-nova-pass');
}
async function doNovaPass(){
  const p1 = $('#np-pass').value, p2 = $('#np-pass2').value, errEl = $('#np-err');
  if(!p1 || p1.length<8){ errEl.textContent='A palavra-passe deve ter pelo menos 8 caracteres.'; return; }
  if(p1!==p2){ errEl.textContent='As palavras-passe não coincidem.'; return; }
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  errEl.textContent='A guardar…';
  let res;
  try { res = await window.EXASupabase.alterarPassword(p1); }
  catch(e){ errEl.textContent='Não foi possível ligar. Tente novamente.'; return; }
  if(!res.ok){ errEl.textContent=res.error; return; }
  errEl.textContent='';
  closeSheet('sh-nova-pass');
  toast('Palavra-passe alterada');
}
function logout(){
  S.showEmpresa = null;
  document.body.classList.remove('is-demo');
  if(window.EXASupabase){ const sair = ()=>window.EXASupabase.signOut(); desativarPush().then(sair, sair); }
  S.demo=false;
  S.loggedIn=false;
  S.policies = { particular:[], empresa:[] };
  S.empresaLoaded = false; S.empresaClient = null;
  S.refCode = null; S.refInvites = []; S.refPoints = null;
  save();
  document.querySelectorAll('.sheet-wrap.open').forEach(s=>s.classList.remove('open'));
  stack=['splash']; showScreen('splash', true);
  try{ document.querySelectorAll('[data-dg-open],[data-nav="onb1"],[data-sheet="sh-demo-code"]').forEach(b=>b.disabled=false); }catch(e){}
  const pw = document.getElementById('login-pass'); if(pw) pw.value='';
}

/* ---------- WALLET ---------- */
let walletTab = 'particular';
function switchWalletTab(btn, target){
  if(target==='empresa' && !S.empresaLoaded){ openSheet('sh-empresa-login'); return; }
  walletTab = target;
  $$('[data-walletswitch]').forEach(b=>b.classList.toggle('on', b.dataset.walletswitch===target));
  renderWallet();
  updateGreeting();
}
let empresaPending = null;
async function doEmpresaConfirm(){
  const nif = ($('#emp-nif').value||'').trim();
  const email = ($('#emp-email').value||'').trim();
  const errEl = $('#emp-login-err');
  if(!nif || !email){ errEl.textContent='Preencha o NIF e o email.'; return; }
  errEl.textContent='A verificar…';
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  let res;
  try {
    res = await window.EXASupabase.loginEmpresa(nif, email);
  } catch(err){
    errEl.textContent='Não foi possível ligar. Tente novamente.';
    return;
  }
  if(!res.ok){ errEl.textContent=res.error; return; }
  const nome = (res.cliente && res.cliente.nome) || 'Empresa';
  const subject = encodeURIComponent('Confirmar acesso Empresa — '+nome+' (NIF '+nif+')');
  const body = encodeURIComponent('Pedido de acesso à área Empresa.\nEmpresa: '+nome+'\nNIF: '+nif+'\nEmail indicado: '+email);
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  empresaPending = { nif:nif, nome:nome, email:email };
  errEl.textContent='';
  $('#emp-step1').style.display='none';
  $('#emp-step2').style.display='block';
  $('#emp-code-msg').textContent='O seu agente vai fornecer-lhe um código de acesso.';
}
async function doEmpresaCodeVerify(){
  const code = ($('#emp-code').value||'').trim();
  const errEl = $('#emp-code-err');
  if(!empresaPending){ errEl.textContent='Confirme primeiro os dados.'; return; }
  if(!code){ errEl.textContent='Indique o código do seu agente.'; return; }
  if(!window.EXASupabase){ errEl.textContent='Ligação indisponível.'; return; }
  errEl.textContent='A verificar…';
  let r;
  try { r = await window.EXASupabase.empresaApolices(empresaPending.nif, empresaPending.email, code); }
  catch(e){ errEl.textContent='Não foi possível ligar. Tente novamente.'; return; }
  if(!r.ok){ errEl.textContent = r.error; return; }
  S.policies.empresa = r.apolices;
  S.empresaLoaded = true;
  S.empresaClient = { nif: empresaPending.nif, nome: empresaPending.nome };
  save();
  errEl.textContent='';
  $('#emp-code').value='';
  $('#emp-step1').style.display='block';
  $('#emp-step2').style.display='none';
  closeSheet('sh-empresa-login');
  walletTab = 'empresa';
  $$('[data-walletswitch]').forEach(b=>b.classList.toggle('on', b.dataset.walletswitch==='empresa'));
  renderWallet();
  updateGreeting();
  toast('Acesso confirmado');
}
function renderWallet(){
  renderProtocolo();
  applyEmpresaTab();
  // summary line
  const activeParticular = S.policies.particular.filter(pl=>!/cancel|anula/i.test(pl.situacao||''));
  const irsCount = activeParticular.filter(x=>x.irs).length;
  const sumEl = $('#wallet-summary');
  if(sumEl) sumEl.innerHTML = '<b style="font-weight:600;">'+activeParticular.length+'</b> apólices activas · <b style="font-weight:600;">'+irsCount+'</b> dedutíveis em IRS';
  // ===== WIDGETS =====
  const walletList = S.policies[walletTab] || [];
  const totalYear = walletList.reduce((s,p)=>{ const v=parsePremio(p.premio); return s+(v||0); },0);
  const savings = totalYear * 0.20;    // 20% poupança estimada
  const daily   = totalYear / 365;     // valor diário investido

  const cntEl = document.getElementById('wgt-count'); if(cntEl) cntEl.textContent = String(walletList.length);
  const dEl   = document.getElementById('wgt-daily'); if(dEl)   dEl.textContent   = fmtEuro(daily);
  const sEl   = document.getElementById('wgt-spend'); if(sEl)   sEl.textContent   = fmtEuro(savings);

  // Dynamic chips — one per unique ramo that has an active policy in the current tab
  const chipsWrap = document.getElementById('wgt-chips-container');
  if(chipsWrap){
    const seen = {};
    let chipsHTML = '';
    walletList.forEach(p=>{
      const m = (p.color==='pro' ? CHIP_MAP['Vida Profissional'] : null) || CHIP_MAP[p.ramo] || (/vida/i.test(p.ramo||'') ? CHIP_MAP['Vida'] : null);
      if(!m) return;
      const k = m.cls;
      if(seen[k]) return;
      seen[k] = true;
      chipsHTML += '<div class="wgt-chip '+k+'" title="'+esc(p.ramo)+'">'+m.html+'</div>';
    });
    chipsWrap.innerHTML = chipsHTML;
    chipsWrap.style.display = chipsHTML ? '' : 'none';
    window.exaCarteira = function(){ return [].concat(S.policies.particular||[], S.policies.empresa||[]).filter(p=>!/cancel|anula/i.test(p.situacao||'')); };
    if(window.exaDiagWidget) window.exaDiagWidget();
  }
  // Animated year bars — daily savings per year
  const barsWrap = document.getElementById('wgt-bars');
  if(barsWrap){
    const now = new Date();
    const monthLabel = MONTHS[now.getMonth()]+' '+now.getFullYear();
    barsWrap.innerHTML = ''; barsWrap.style.display='none';
  }
  // cards
  const stackEl = $('#wallet-cards');
  if(!stackEl) return;
  const list = (S.policies[walletTab] || []).filter(pl => !/cancel|anula/i.test(pl.situacao||''));
  // update count pill in toolbar
  const countEl = document.getElementById('wtb-count');
  if(countEl) countEl.textContent = String(list.length);
  let html = '';
  list.forEach(pl => {
    html += policyCardHTML(pl);
  });
  if(!list.length){
    const novo = !(S.policies.particular||[]).length && !(S.policies.empresa||[]).length;
    html = '<div class="pol-empty">'
      +'<div class="pe-lbl">'+(novo ? 'Bem-vind'+(S.account.gender==='F'?'a':'o')+' à sua wallet' : 'Sem apólices activas')+'</div>'
      +'<div class="pe-txt">'+(novo
        ? 'Ainda não tem apólices connosco. Fale com o seu mediador — ele mostra-lhe o que faz sentido para si, sem compromisso.'
        : 'As suas apólices ainda não estão disponíveis nesta área. Fale com o seu mediador para as associar à sua wallet.')+'</div>'
      +'<button type="button" class="pe-btn" data-sheet="sh-gestor">Falar com o mediador</button>'
      +'</div>';
  }
  stackEl.innerHTML = html;
  renderNotifs();
}
function protecaoInfo(pl){
  const DAY=86400000, today=new Date(); today.setHours(0,0,0,0);
  let ini = parseAnyDate(pl.inicio || (pl.extra&&pl.extra['Início']));
  let ren = parseAnyDate(pl.renov || (pl.extra&&pl.extra['Renovação']));
  if(!ini && ren){ ini = new Date(ren); ini.setFullYear(ini.getFullYear()-1); }
  if(!ini || ini>today) return null;
  let end = ren && ren>today ? new Date(ren) : null;
  if(!end){ end = new Date(ini); while(end<=today) end.setFullYear(end.getFullYear()+1); }
  const pStart = new Date(end); pStart.setFullYear(pStart.getFullYear()-1);
  const dias = Math.floor((today-ini)/DAY)+1;
  const sem = Math.max(1, Math.min(52, Math.ceil(((today-pStart)/DAY+1)/7)));
  return { dias, sem, renova:end, desde:ini };
}
function protOf(pl){
  if(!pl) return null;
  if(pl.ordem && window.exaProtocolo){ const p = window.exaProtocolo(pl.ordem); if(S.protocolo && S.protocolo.codigo===p.codigo) return S.protocolo; return p; }
  return null;
}
window.exaProtOf = protOf;
function renderProtocolo(){
  const pr = S.protocolo, el = document.getElementById('prot-strip');
  document.body.classList.toggle('has-prot', !!pr);
  if(pr){ document.body.style.setProperty('--prot-ac', pr.acento); document.body.dataset.protocolo = pr.codigo; } else { delete document.body.dataset.protocolo; }
  if(el) el.innerHTML = pr ? (pr.logo?'<img src="'+esc(pr.logo)+'" alt="">':'')+'<div><span>Cliente protocolo</span><b>'+esc(pr.nome)+'</b></div><em>Vantagens →</em>' : '';
  const sh = document.getElementById('prot-body');
  if(sh && pr) sh.innerHTML = '<div class="pv-head">'+(pr.logo?'<img src="'+esc(pr.logo)+'" alt="">':'')+'<div><b>'+esc(pr.nome)+'</b><span>Protocolo com a Ageas Seguros</span></div></div>'
    + '<div class="md-list">'+(window.EXA_PROT_VANTAGENS||[]).map((v,i)=>'<div class="md-i"><i>'+(i+1)+'</i><div><b>'+v[0]+'</b><span>'+v[1]+'</span></div></div>').join('')+'</div>';
}
function seguradoraDe(pl){
  const t=((pl.ramo||'')+' '+(pl.nome||'')).toLowerCase();
  return (/sa[uú]de|m[eé]dis/.test(t)) ? 'medis' : 'ageas';
}
function policyCardHTML(pl){
  const sg = seguradoraDe(pl);
  const prC = pl.color==='pro' ? protOf(pl) : null;
  return '<div class="pol '+pl.color+'" data-policy="'+pl.id+'" data-tab="'+walletTab+'"'+(prC?' style="--pro-bg:'+esc(prC.cor)+';--pro-ac:'+esc(prC.acento)+';"':'')+'>'+
    '<div class="top"><div>'+
      '<div class="lbl" style="color:rgba(255,255,255,0.75);">'+esc(pl.ramo)+'</div>'+
      '<div class="ttl">'+esc(pl.nome)+'</div>'+(pl.color==='pro'?'<div class="pol-pro">'+esc((protOf(pl)||{}).etiqueta||'Cliente protocolo')+'</div>':'')+
    '</div><div class="meta" style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;"><div style="display:flex;align-items:center;gap:8px;"><span>'+esc(pl.num)+'</span><span class="pol-logo '+sg+'"><img src="'+(sg==='medis'?'logo-medis.png':'logo-ageas-white.png')+'" alt="'+(sg==='medis'?'Medis':'Ageas Seguros')+'"></span></div>'+(pl.irs?'<div style="opacity:0.8;">Dedutível no '+(walletTab==='empresa'?'IRC':'IRS')+'</div>':'')+'</div></div>'+
    '<div class="row"><div class="price">'+esc(pl.premio)+'<small>/'+esc(pl.per)+'</small></div>'+
    '<div class="stat"><span class="d"></span>'+(function(){ const pi=protecaoInfo(pl); return pi ? 'Protegido há '+String(pi.dias).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+' dias' : 'Activa'; })()+'</div></div>'+
  '</div>';
}

/* ---------- ADD POLICY + CATALOG ---------- */
const AGEAS_CATALOG = [
  // ── PARTICULAR ──
  { sec:'Automóvel', color:'coral', ramo:'Auto', audience:'particular', items:['Protec Ligeiros','Protec Duas Rodas','Seguro por Dias'] },
  { sec:'Saúde', color:'indigo', ramo:'Saúde', audience:'particular', items:['Saúde Família','Saúde Senior','Medis Dental','Medis Light'] },
  { sec:'Casa', color:'emerald', ramo:'Casa', audience:'particular', items:['Casa Segura','Alojamento Local','Obras de Arte','RC Familiar'] },
  { sec:'Vida', color:'plum', ramo:'Vida', audience:'particular', items:['Ritmo Vida Família','Viva Plus','Solução Jovem','Multiplic Protecção+'] },
  { sec:'Viagem & Lazer', color:'amber', ramo:'Viagem', audience:'particular', items:['Viagem Segura','Bombordo','Pétis','Embarcações de Recreio'] },
  { sec:'Acidentes & Trabalho', color:'ink', ramo:'Acidentes', audience:'particular', items:['AP Individual','AT Conta Própria','Empregados Domésticos'] },
  { sec:'Poupança & Investimento', color:'emerald', ramo:'Poupança', audience:'particular', items:['Maximus Poupança','PPR+ 1.ª Série','PPR+ 2.ª Série','Rendimento Flexível','Invest Flex'] },
  // ── EMPRESA ──
  { sec:'Frota Automóvel', color:'coral', ramo:'Frota', audience:'empresa', items:['Protec Frota'] },
  { sec:'Saúde Colaboradores', color:'indigo', ramo:'Saúde PME', audience:'empresa', items:['Saúde PME','Empresa Viva','AP Colectivo','Medis Empresas'] },
  { sec:'Responsabilidade Civil', color:'plum', ramo:'RC', audience:'empresa', items:['RC Geral','Ecosfera Ambiental','D&O','Cyber Risks'] },
  { sec:'Património Empresa', color:'emerald', ramo:'Multirriscos', audience:'empresa', items:['Multirriscos Indústria','Avaria de Máquinas','Bens em Leasing'] },
];
window.exaCatalog = AGEAS_CATALOG;
const CAT_SWATCH = { coral:'var(--accent)', indigo:'var(--indigo)', emerald:'var(--emerald)', plum:'var(--plum)', amber:'var(--amber)', ink:'var(--ink)' };
let addDraft = { color:'coral', ramo:'Auto', nome:'', frac:'anual', inicio:'', renov:'', irs:false };

/* fracionamento info */
const FRAC = { mensal:{n:12,label:'mensal'}, trimestral:{n:4,label:'trimestral'}, semestral:{n:2,label:'semestral'}, anual:{n:1,label:'anual'} };
function parsePremio(str){
  if(!str) return null;
  let s = String(str).replace(/[€\s]/g,'').replace(/\./g,'').replace(',','.');
  const n = parseFloat(s);
  return isNaN(n)?null:n;
}
function fmtEuro(n){ return n.toFixed(2).replace('.',',')+'€'; }
function addPlusYear(iso){
  if(!iso) return '';
  const d = new Date(iso+'T00:00:00'); if(isNaN(d)) return '';
  d.setFullYear(d.getFullYear()+1);
  return d.toISOString().slice(0,10);
}
function initAddSheet(){
  const today = new Date().toISOString().slice(0,10);
  addDraft.inicio = today; addDraft.renov = addPlusYear(today); addDraft.frac='anual';
  const ini=$('#add-inicio'), ren=$('#add-renov');
  if(ini) ini.value=today; if(ren) ren.value=addDraft.renov;
  $$('#add-frac .b').forEach(b=>b.classList.toggle('on', b.dataset.frac==='anual'));
  updateDebitNote();
}
function updateDebitNote(){
  const note=$('#add-debit-note'); if(!note) return;
  const total = parsePremio($('#add-premio') ? $('#add-premio').value : '');
  const fi = FRAC[addDraft.frac] || FRAC.anual;
  if(total==null){ note.innerHTML='Indique o prémio e o fracionamento para calcular o débito.'; return; }
  const instNum = total/fi.n;
  const inst = fmtEuro(instNum);
  const exact = Math.abs(instNum*fi.n - total) < 0.005;
  const approx = exact ? '' : '~';
  const pagOn = notifOn('pagamentos');
  let calc = fi.n===1
    ? 'Pagamento <b>anual</b> de <b>'+fmtEuro(total)+'</b>.'
    : '<b>'+fi.n+'×</b> de '+approx+'<b>'+inst+'</b> = '+fmtEuro(total)+'/ano.';
  note.innerHTML = calc+'<br>'+
    (pagOn ? 'Será <b>notificado</b> antes de cada débito.' : 'Active <b>Notificações · Pagamentos</b> no perfil para ser avisado.');
}

function buildCatalog(audience){
  const list = $('#cat-list'); if(!list) return;
  const groups = audience ? AGEAS_CATALOG.filter(g=>g.audience===audience) : AGEAS_CATALOG;
  let html='';
  groups.forEach(g=>{
    html+='<div class="cat-group" data-sec="'+esc(g.sec)+'">';
    html+='<div class="lbl" style="margin:14px 0 8px;display:flex;align-items:center;gap:7px;"><span style="width:8px;height:8px;border-radius:50%;background:'+CAT_SWATCH[g.color]+';"></span>'+esc(g.sec)+'</div>';
    g.items.forEach(name=>{
      const irs = (g.ramo==='Vida'||g.ramo==='Saúde')?'1':'0';
      html+='<div class="pick cat-item" data-name="'+esc(name)+'" data-color="'+g.color+'" data-ramo="'+esc(g.ramo)+'" data-irs="'+irs+'">'+
        '<span class="swatch" style="background:'+CAT_SWATCH[g.color]+';"></span>'+
        '<div class="info"><div class="nm">'+esc(name)+'</div></div>'+
        '<span class="check">✓</span></div>';
    });
    html+='</div>';
  });
  list.innerHTML=html;
}
function chooseCatalog(el){
  addDraft.nome = el.dataset.name;
  addDraft.color = el.dataset.color;
  addDraft.ramo = el.dataset.ramo;
  addDraft.irs = el.dataset.irs==='1';
  const t = $('#add-nome-text'); if(t){ t.textContent=el.dataset.name; t.style.color='var(--ink)'; }
  closeSheet('sh-catalog');
}
function filterCatalog(q){
  q=(q||'').toLowerCase().trim();
  $$('#cat-list .cat-group').forEach(g=>{
    let any=false;
    g.querySelectorAll('.cat-item').forEach(it=>{
      const m = it.dataset.name.toLowerCase().includes(q);
      it.style.display = m?'':'none'; if(m) any=true;
    });
    g.style.display = any?'':'none';
  });
}
function setAddPer(btn, frac){
  addDraft.frac = frac;
  const seg = btn.closest('.seg'); if(seg) seg.querySelectorAll('.b').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  updateDebitNote();
}
function requesterInfo(){
  if(walletTab==='empresa' && S.empresaClient && S.empresaClient.nif){
    return { nif: S.empresaClient.nif, nome: S.empresaClient.nome || 'Empresa' };
  }
  return { nif: S.account.nif, nome: (S.account.firstName+' '+S.account.lastName).trim() };
}
let investRisco = null;
function investPanelEnter(){
  if(!investRisco) investRisco = 'garantido';
  investPick(investRisco);
  $('#ip-simular-view').style.display = 'none';
  $('#ip-card-view').style.display = 'block';
  const tab = $('#invest-tab-simular'); if(tab) tab.classList.remove('on');
  tickInvestClock();
  if(investClockTimer) clearInterval(investClockTimer);
  investClockTimer = setInterval(tickInvestClock, 1000);
  loadReforcos();
}
const PRODUTOS_LISTA = {
  garantido: [
    { nome:'Maximus Poupança', diff:'Entrega única, cresce com juro garantido.', sugerido:true },
    { nome:'PPR+ tradicional', diff:'Entregas mensais, com dedução em IRS.', sugerido:false }
  ],
  risco: [
    { nome:'Ageas Flex+', diff:'Entregas flexíveis, ligado a fundos de investimento.', sugerido:true },
    { nome:'Rendimento Flexível', diff:'Capital elevado, gera uma renda regular.', sugerido:false }
  ]
};
function investPick(risco){
  investRisco = risco;
  const gBtn = $('#ip-tog-garantido'), rBtn = $('#ip-tog-risco');
  if(gBtn) gBtn.style.background = risco==='garantido' ? '#0D6E58' : 'transparent';
  if(gBtn) gBtn.style.color = risco==='garantido' ? '#fff' : 'rgba(255,255,255,0.6)';
  if(rBtn) rBtn.style.background = risco==='risco' ? '#5E2A6E' : 'transparent';
  if(rBtn) rBtn.style.color = risco==='risco' ? '#fff' : 'rgba(255,255,255,0.6)';
  const info = INVEST_INFO[risco];
  const cat = $('#ip-categoria span:last-child');
  if(cat) cat.textContent = risco==='garantido' ? 'Capital Garantido' : 'Sem Garantia de Capital';
  const lista = $('#ip-produtos-lista');
  if(lista) lista.innerHTML = (PRODUTOS_LISTA[risco]||[]).map(p=>
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid '+(p.sugerido?'#D9A85C':'rgba(255,255,255,0.14)')+';background:'+(p.sugerido?'rgba(217,168,92,0.08)':'transparent')+';">'
      +'<div><div style="font-family:var(--display);font-size:16px;font-weight:600;color:#fff;">'+p.nome+'</div><div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;">'+p.diff+'</div></div>'
      +(p.sugerido?'<span style="font-family:var(--mono);font-size:8px;letter-spacing:0.06em;text-transform:uppercase;color:#241A10;background:#D9A85C;padding:3px 8px;border-radius:999px;flex-shrink:0;font-weight:700;">Sugerido</span>':'')
      +'</div>'
  ).join('');
  $('#ip-minimo').innerHTML = info.minimo;
  setText('#ip-fiscal-headline', info.fiscalHeadline);
  setText('#ip-risco-headline', info.risco);
  $('#ip-fiscal-lista').innerHTML = info.fiscal;
  const real = S.investReal;
  if(real && real.ativo){
    setText('#ip-valor-atual', (real.valor||0).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+'€');
    setText('#ip-valor-desde', real.desde ? 'Desde '+fmtDateShort(parseAnyDate(real.desde)) : '');
  } else {
    setText('#ip-valor-atual', 'Ainda sem investimento activo');
    setText('#ip-valor-desde', '');
  }
  const opts = REFORCO_OPTS[risco]||[];
  const optsWrap = $('#ip-reforco-opts');
  if(optsWrap) optsWrap.innerHTML = opts.map(v=>
    '<button type="button" data-act="ip-reforco-pick" data-valor="'+v+'" style="padding:11px 18px;border-radius:999px;border:1px solid #D9A85C;background:rgba(217,168,92,0.08);color:#D9A85C;font-family:var(--mono);font-size:12px;font-weight:700;cursor:pointer;transition:background 0.15s;">+'+v+'€</button>'
  ).join('');
  $('#ip-resgate-info').innerHTML = RESGATE_INFO[risco] || '—';
  renderInvestProductCard();
}
const INVEST_CARD_TONES = [
  ['#2E2013','#1B130C','#D9A85C'],
  ['#14281F','#0B1812','#7FD1A8'],
  ['#231A2E','#140F1B','#C4A0E0'],
  ['#1A2230','#0E141D','#8FB6E8']
];
function renderInvestProductCard(){
  const wrap = $('#ip-stack'); if(!wrap) return;
  const list = (S.investList && S.investList.length) ? S.investList : (S.investReal && S.investReal.ativo ? [S.investReal] : []);
  const cta = $('#ip-resgate-cta'); if(cta) cta.style.display = list.length ? 'flex' : 'none';
  const tot = list.reduce((s,p)=>s+(Number(p.valor)||0),0);
  const nm = ((S.account.firstName||'')+' '+(S.account.lastName||'')).trim();
  if($('#ivg-total')) $('#ivg-total').textContent = fmtEuro(tot);
  if($('#ivg-n')) $('#ivg-n').textContent = list.length+(list.length===1?' produto':' produtos');
  if($('#ivg-nm')) $('#ivg-nm').textContent = nm ? title()+' '+nm : 'Cliente';
  if($('#ivg-av')) $('#ivg-av').textContent = ((S.account.firstName||'C')[0]+((S.account.lastName||'').split(' ').pop()||'')[0]||'').toUpperCase();
  if(!list.length){
    wrap.innerHTML = '<div style="text-align:center;padding:36px 20px;border:1px dashed rgba(217,168,92,0.3);border-radius:22px;">'
      +'<div style="font-family:var(--mono);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#D9A85C;font-weight:600;">Sem produtos activos</div>'
      +'<div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:8px;line-height:1.5;">Explore as soluções em <b style="color:#fff;">Simular</b> ou fale com o seu gestor.</div>'
      +'</div>';
    return;
  }
  wrap.innerHTML = list.map((p,i)=>{
    const t = INVEST_CARD_TONES[i % INVEST_CARD_TONES.length];
    return '<div class="ip-card" style="position:relative;overflow:hidden;border-radius:24px;padding:22px;background:linear-gradient(160deg,'+t[0]+','+t[1]+');border:1px solid rgba(255,255,255,0.12);box-shadow:0 -6px 20px rgba(0,0,0,0.35);'+(i>0?'margin-top:-78px;':'')+'">'
      +'<span style="position:absolute;right:-50px;top:-50px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,'+t[2]+'38,transparent 70%);pointer-events:none;"></span>'
      +'<div style="position:relative;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
          +'<span style="font-family:var(--sans);font-size:13px;font-weight:600;color:'+t[2]+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(p.produto||'Produto')+'</span>'
          +'<span style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:rgba(63,203,122,0.14);border:1px solid rgba(63,203,122,0.3);"><span style="width:5px;height:5px;border-radius:50%;background:#3FCB7A;"></span><span style="font-family:var(--mono);font-size:8px;letter-spacing:0.06em;text-transform:uppercase;color:#3FCB7A;font-weight:700;">Activo</span></span>'
        +'</div>'
        +'<div style="font-family:var(--mono);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-top:22px;">Saldo actual</div>'
        +'<div style="font-family:var(--display);font-size:38px;font-weight:700;letter-spacing:-0.03em;color:#fff;margin-top:6px;line-height:1;">'+(p.valor!=null?fmtEuro(p.valor):'—')+'</div>'
        +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;gap:10px;">'
          +'<span style="font-family:var(--mono);font-size:10px;color:rgba(255,255,255,0.4);">'+(p.desde?'Desde '+fmtDateShort(parseAnyDate(p.desde)):'')+'</span>'
          +'<button type="button" data-act="ir-open" data-idx="'+i+'" style="flex-shrink:0;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.06);color:#fff;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:0.05em;cursor:pointer;">Resgate</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}
const INVEST_INFO = {
  garantido: { produto:'Maximus Poupança', tag:'Sugestão para si · Capital Garantido', cor:'#0D6E58', risco:'Baixo',
    fiscalHeadline:'Sobre a mais-valia',
    fiscal:'<b>Maximus Poupança:</b> tributação apenas sobre a mais-valia obtida, com taxas de IRS decrescentes quanto maior for o prazo do contrato.<br><b>PPR+ tradicional:</b> dedução em IRS sobre as entregas anuais, dentro dos limites legais para a sua idade.',
    desc:'Seguro de capitalização com capital garantido, indicado para quem quer fazer crescer as suas poupanças sem expor o valor investido ao risco de mercado.',
    minimo:'<b>Maximus Poupança:</b> investimento inicial único de cerca de 1.000€ (reforços livres depois, a partir de 100€).<br><b>Alternativa — PPR+ tradicional:</b> entregas mensais a partir de 25€, ou entrega única a partir de 500€.' },
  risco: { produto:'Ageas Flex+', tag:'Sugestão para si · Potencial de Rentabilidade', cor:'#5E2A6E', risco:'Variável',
    fiscalHeadline:'Sobre a mais-valia',
    fiscal:'<b>Ageas Flex+:</b> tributação apenas sobre a mais-valia obtida, com taxas de IRS decrescentes quanto maior for o prazo do contrato.<br><b>Rendimento Flexível:</b> enquadra-se no regime de Fundos de Pensões, com benefícios fiscais equivalentes aos PPR quando destinado à reforma.',
    desc:'Seguro ligado a fundos de investimento, indicado para quem aceita variações de valor em troca de maior potencial de rentabilidade.',
    minimo:'<b>Ageas Flex+:</b> entregas mensais a partir de 25€ a 30€, ou montante único a partir de 500€.<br><b>Alternativa — Rendimento Flexível:</b> indicado para quem já tem património acumulado; investimento inicial a partir de 10.000€.' }
};
const RESGATE_INFO = {
  garantido:'<b>Maximus Poupança:</b> resgate livre em qualquer momento, mas com taxas de penalização nos primeiros anos do contrato.<br><b>Alternativa — PPR+ tradicional:</b> resgate sujeito a condições legais (reforma, desemprego de longa duração, doença grave...); fora dessas condições há penalização fiscal.',
  risco:'<b>Ageas Flex+:</b> liquidez diária total — pode resgatar quando quiser, mas o valor flutua com o mercado e pode ser inferior ao investido.<br><b>Alternativa — Rendimento Flexível:</b> focado em rendas regulares, com resgates mais limitados.'
};
const REFORCO_OPTS = { garantido:[100,250], risco:[25,100] };
async function loadReforcos(){
  if(window.EXA_DEMO){
    const demoRows = [
      { estado:'confirmado', valor:100, criado_em:'2026-02-01', confirmado_em:'2026-02-02' },
      { estado:'confirmado', valor:100, criado_em:'2026-04-01', confirmado_em:'2026-04-02' },
      { estado:'confirmado', valor:100, criado_em:'2026-06-01', confirmado_em:'2026-06-02' }
    ];
    renderReforcos(demoRows);
    renderInvestChart(demoRows);
    return;
  }
  if(!window.EXASupabase || !window.EXASupabase.reforcosDoCliente || !S.account.nif) return;
  try {
    const rows = await window.EXASupabase.reforcosDoCliente(S.account.nif);
    renderReforcos(rows||[]);
    renderInvestChart(rows||[]);
  } catch(e){}
}
const ILLUSTRATIVE_PATH = 'M0 60 C40 56,70 50,100 44 S160 30,200 22 S260 10,300 6';
function renderInvestChart(rows){
  renderInvestProductCard();
  const path = $('#ip-chart-path'), dot = $('#ip-chart-dot'), label = $('#ip-chart-label');
  const real = S.investReal;
  if(!real || !real.ativo){
    if(path) path.setAttribute('d', ILLUSTRATIVE_PATH);
    if(dot){ dot.setAttribute('cx',300); dot.setAttribute('cy',6); }
    if(label) label.textContent = 'Estimativa ilustrativa';
    return;
  }
  const confirmed = rows.filter(r=>r.estado==='confirmado').sort((a,b)=>new Date(a.confirmado_em||a.criado_em)-new Date(b.confirmado_em||b.criado_em));
  const totalReforcos = confirmed.reduce((s,r)=>s+Number(r.valor||0),0);
  const baseline = Math.max(0, (real.valor||0) - totalReforcos);
  const pts = [baseline];
  let run = baseline;
  confirmed.forEach(r=>{ run += Number(r.valor||0); pts.push(run); });
  if(pts[pts.length-1] !== real.valor) pts.push(real.valor||0);
  if(pts.length < 2) pts.push(pts[0]);
  const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
  const range = Math.max(max-min, 1);
  const n = pts.length;
  const coords = pts.map((v,i)=>{
    const x = n>1 ? (i/(n-1))*300 : 300;
    const y = 64 - ((v-min)/range)*58;
    return [x,y];
  });
  let d = 'M'+coords[0][0]+' '+coords[0][1];
  for(let i=1;i<coords.length;i++) d += ' L'+coords[i][0]+' '+coords[i][1];
  if(path) path.setAttribute('d', d);
  const last = coords[coords.length-1];
  if(dot){ dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); }
  if(label) label.textContent = 'Evolução real do seu investimento';
}
function renderReforcos(rows){
  const pend = rows.find(r=>r.estado==='pendente');
  const pendEl = $('#ip-reforco-pendente');
  if(pendEl){
    if(pend){ pendEl.style.display='block'; pendEl.innerHTML = '<b>Pendente:</b> +'+Number(pend.valor).toLocaleString('pt-PT')+'€ · a aguardar confirmação do mediador'; }
    else { pendEl.style.display='none'; }
  }
  const hist = rows.filter(r=>r.estado==='confirmado').slice(0,5);
  const histEl = $('#ip-reforco-historico');
  if(histEl) histEl.innerHTML = hist.map(r=>
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.55);"><span>'+fmtDateShort(new Date(r.criado_em))+'</span><span style="color:#3FCB7A;">+'+Number(r.valor).toLocaleString('pt-PT')+'€ confirmado</span></div>'
  ).join('');
}
async function investReforcoPick(valor){
  if(!investRisco) return;
  const info = INVEST_INFO[investRisco];
  const who = requesterInfo();
  if(window.EXASupabase && window.EXASupabase.pedirReforco){
    try { await window.EXASupabase.pedirReforco(who.nif, info.produto, valor); } catch(e){}
  }
  const subject = encodeURIComponent('Pedido de reforço — '+info.produto+' — '+who.nome+' (NIF '+who.nif+')');
  const body = encodeURIComponent('Produto: '+info.produto+'\nNIF: '+who.nif+'\nReforço pedido: '+valor+'€');
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?cc=edgar.azevedo@private.ageas.pt&subject='+subject+'&body='+body;
  toast('Pedido enviado · fica pendente');
  loadReforcos();
}
let investClockTimer = null;
function tickInvestClock(){
  const el = $('#ip-clock'); if(!el) return;
  const d = new Date();
  el.textContent = 'Actualizado às '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');
}
function renderInvestPanel(){
  const real = S.investReal;
  const has = real && real.ativo;
  const realPanel = $('#inv-real-panel'), demoPanel = $('#inv-demo-panel');
  if(realPanel) realPanel.style.display = has ? 'block' : 'none';
  if(demoPanel) demoPanel.style.display = has ? 'none' : 'block';
  setText('#inv-heading', has ? 'O seu dinheiro,<br><em>já a crescer.</em>' : 'O seu dinheiro,<br><em>a trabalhar.</em>');
  const heading = $('#inv-heading'); if(heading) heading.innerHTML = has ? 'O seu dinheiro,<br><em>já a crescer.</em>' : 'O seu dinheiro,<br><em>a trabalhar.</em>';
  setText('#inv-sub', has ? 'Acompanhe aqui a evolução do seu produto de poupança.' : 'Soluções de poupança e capitalização Ageas, pensadas para os seus objectivos.');
  setText('#inv-resultado-lbl', has ? 'Se mantiver esta entrega' : 'Valor acumulado estimado');
  if(has){
    setText('#inv-real-produto', real.produto||'Produto de poupança');
    setText('#inv-real-valor', (real.valor||0).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+'€');
    setText('#inv-real-desde', real.desde ? 'Desde '+fmtDateShort(parseAnyDate(real.desde)) : '');
  }
}
async function loadInvestimento(){
  if(window.EXA_DEMO || S.demo) return;
  if(!window.EXASupabase || !window.EXASupabase.investimentoDoCliente || !S.account.nif){ S.investReal=null; return; }
  try {
    const rows = window.EXASupabase.investimentosDoCliente
      ? await window.EXASupabase.investimentosDoCliente(S.account.nif)
      : [await window.EXASupabase.investimentoDoCliente(S.account.nif)].filter(x=>x&&x.ativo);
    S.investList = rows || [];
    S.investReal = S.investList[0] || null;
    save();
  } catch(e){ S.investReal = null; S.investList = []; }
}
function investResgateSend(){
  const nif = ($('#ir-nif').value||'').trim();
  const msg = ($('#ir-msg').value||'').trim();
  const errEl = $('#ir-err');
  if(!nif){ errEl.textContent='Confirme o seu NIF.'; return; }
  errEl.textContent='';
  const who = requesterInfo();
  const real = investList()[resgateSel] || {};
  if(!real.produto){ errEl.textContent='Escolha o produto a resgatar.'; return; }
  const subject = encodeURIComponent('Pedido de resgate — '+(real.produto||'Invest')+' — '+who.nome+' (NIF '+nif+')');
  const idadeR = parseInt(($('#ir-idade')||{}).value,10), alvoR = parseInt(($('#ir-idade-resgate')||{}).value,10);
  const refR = parseFloat(($('#ir-reforco')||{}).value) || 0;
  const simLine = (idadeR && alvoR && alvoR>idadeR) ? '\nSimulação: idade '+idadeR+', resgatar aos '+alvoR+(refR>0?', reforço '+refR+'€/mês':'') : '';
  const body = encodeURIComponent('Produto: '+(real.produto||'—')+'\nSaldo actual: '+(real.valor!=null?fmtEuro(real.valor):'—')+'\nNIF: '+nif+simLine+'\nMensagem: '+(msg||'Não indicado'));
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  closeSheet('sh-invest-resgate');
  toast('Pedido de resgate enviado');
}
let resgateSel = 0;
function investList(){
  return (S.investList && S.investList.length) ? S.investList : (S.investReal && S.investReal.ativo ? [S.investReal] : []);
}
function renderResgateProdutos(){
  const wrap = $('#ir-produtos'); if(!wrap) return;
  const list = investList();
  if(resgateSel >= list.length) resgateSel = 0;
  wrap.innerHTML = list.length ? list.map((p,i)=>{
    const on = i===resgateSel;
    return '<button type="button" data-act="ir-pick" data-idx="'+i+'" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:12px 14px;border-radius:14px;cursor:pointer;text-align:left;border:1px solid '+(on?'#D9A85C':'rgba(255,255,255,0.14)')+';background:'+(on?'rgba(217,168,92,0.12)':'rgba(255,255,255,0.04)')+';">'
      +'<span style="min-width:0;"><span style="display:block;font-family:var(--sans);font-size:13px;font-weight:600;color:'+(on?'#D9A85C':'#fff')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(p.produto||'Produto')+'</span>'
      +'<span style="display:block;font-family:var(--mono);font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;">'+(p.valor!=null?fmtEuro(p.valor):'—')+'</span></span>'
      +'<span style="width:18px;height:18px;border-radius:50%;flex-shrink:0;border:1.5px solid '+(on?'#D9A85C':'rgba(255,255,255,0.3)')+';display:flex;align-items:center;justify-content:center;">'+(on?'<span style="width:8px;height:8px;border-radius:50%;background:#D9A85C;"></span>':'')+'</span>'
      +'</button>';
  }).join('') : '<div style="font-size:12px;color:rgba(255,255,255,0.5);">Sem produtos activos.</div>';
}
function resgateTaxa(p){
  return /flex|rendimento/i.test((p&&p.produto)||'') ? 0.08 : 0.02;
}
function renderResgateSim(){
  const out = $('#ir-sim-out'); if(!out) return;
  const p = investList()[resgateSel];
  const idade = parseInt(($('#ir-idade')||{}).value,10);
  const alvo = parseInt(($('#ir-idade-resgate')||{}).value,10);
  if(!p || p.valor==null){ out.innerHTML=''; return; }
  if(!idade || !alvo){
    out.innerHTML = '<div style="font-size:11px;color:rgba(255,255,255,0.4);">Indique a sua idade e a idade a que pensa resgatar.</div>';
    return;
  }
  if(alvo <= idade){
    out.innerHTML = '<div style="font-size:11px;color:#E8B4A0;">A idade de resgate tem de ser superior à sua idade actual.</div>';
    return;
  }
  const r = resgateTaxa(p), anos = alvo - idade;
  const mensal = Math.max(0, parseFloat(($('#ir-reforco')||{}).value) || 0);
  const meses = anos*12, rm = Math.pow(1+r, 1/12) - 1;
  const futuroSaldo = p.valor * Math.pow(1+r, anos);
  const futuroReforcos = mensal>0 ? mensal * (Math.pow(1+rm, meses) - 1) / rm : 0;
  const futuro = futuroSaldo + futuroReforcos;
  const totalReforcos = mensal * meses;
  const ganho = futuro - p.valor - totalReforcos;
  out.innerHTML =
    '<div style="display:flex;border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;">'
      +'<div style="flex:1;padding:10px 12px;"><div style="font-family:var(--mono);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Se resgatar agora</div><div style="font-family:var(--display);font-size:18px;font-weight:700;color:#fff;margin-top:4px;">'+fmtEuro(p.valor)+'</div></div>'
      +'<div style="width:1px;background:rgba(255,255,255,0.12);"></div>'
      +'<div style="flex:1;padding:10px 12px;"><div style="font-family:var(--mono);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Aos '+alvo+' anos</div><div style="font-family:var(--display);font-size:18px;font-weight:700;color:#D9A85C;margin-top:4px;">'+fmtEuro(futuro)+'</div></div>'
    +'</div>'
    +(mensal>0
      ? '<div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.6);line-height:1.5;">Saldo actual '+fmtEuro(p.valor)+' + reforços '+fmtEuro(totalReforcos)+' ('+fmtEuro(mensal)+'/mês × '+meses+' meses)</div>'
        +'<div style="margin-top:3px;font-size:11px;color:#3FCB7A;font-weight:600;">+'+fmtEuro(ganho)+' de rendimento estimado</div>'
      : '<div style="margin-top:8px;font-size:11px;color:#3FCB7A;font-weight:600;">+'+fmtEuro(ganho)+' se mantiver mais '+anos+' ano'+(anos>1?'s':'')+'</div>')
    +'<div style="margin-top:4px;font-size:9px;color:rgba(255,255,255,0.35);line-height:1.4;">Ilustrativo · '+(r===0.08?'8%/ano, sem garantia de capital':'2%/ano, capital garantido')+'. '+(mensal>0?'Não inclui':'Sem reforços. Não inclui')+' taxas nem impostos.</div>';
}
function investResgatePrefill(){
  renderResgateProdutos();
  renderResgateSim();
  const el = $('#ir-nif');
  if(el && !el.value) el.value = S.account.nif || '';
}
function showInvestCards(){
  $('#ip-simular-view').style.display = 'none';
  $('#ip-card-view').style.display = 'block';
  const tab = $('#invest-tab-simular'); if(tab) tab.classList.remove('on');
  const w = $('#invest-tab-wallet'); if(w) w.classList.add('on');
}
function toggleInvestSimular(){
  const simView = $('#ip-simular-view'), cardView = $('#ip-card-view'), chartView = $('#ip-card-chart'), tab = $('#invest-tab-simular');
  const showingSim = simView.style.display !== 'none';
  simView.style.display = showingSim ? 'none' : 'block';
  cardView.style.display = showingSim ? 'block' : 'none';
  if(tab) tab.classList.toggle('on', !showingSim);
  const w = $('#invest-tab-wallet'); if(w) w.classList.toggle('on', showingSim);
}
function investInfo(produto){
  const who = requesterInfo();
  const subject = encodeURIComponent('Pedido de informação — '+produto+' — '+who.nome+' (NIF '+who.nif+')');
  const body = encodeURIComponent('Produto: '+produto+'\nNIF: '+who.nif);
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?cc=edgar.azevedo@private.ageas.pt&subject='+subject+'&body='+body;
  toast('Pedido enviado ao mediador');
}

function addPolicy(){
  const goalBtn = $('#add-goal .b.on');
  const goal = goalBtn ? goalBtn.dataset.goal : 'nova';
  const goalLabel = goal==='transferir' ? 'Transferir apólice existente' : 'Nova proteção';
  const ramoBtn = $('#sh-add [data-ramo-pick].on');
  const ramo = ramoBtn ? ramoBtn.dataset.ramoPick : 'Auto';
  const nota = ($('#add-nota').value||'').trim();
  const who = requesterInfo();
  const subject = encodeURIComponent(goalLabel+' — '+who.nome+' (NIF '+who.nif+')');
  const body = encodeURIComponent('Pedido: '+goalLabel+'\nRamo: '+ramo+'\nNIF: '+who.nif+'\nDescrição: '+(nota||'Não indicado'));
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  $('#add-nota').value='';
  $$('#add-goal .b').forEach((b,i)=>b.classList.toggle('on', i===0));
  $$('#sh-add [data-ramo-pick]').forEach((b,i)=>b.classList.toggle('on', i===0));
  closeSheet('sh-add');
  toast('Pedido enviado ao seu mediador');
}
function autoNum(ramo){
  const pre = (ramo[0]||'X').toUpperCase() + (ramo[1]||'X').toUpperCase();
  return pre + Math.floor(10000000+Math.random()*89999999);
}

/* ---------- DETAIL ---------- */
let currentPolicy = null;
function openPolicy(id, tab){
  currentPolicy = (S.policies[tab]||[]).find(x=>x.id===id) || null;
  if(currentPolicy){ currentPolicy._tab = tab; nav('detail'); }
}
function renderDetail(){
  const pl = currentPolicy; if(!pl) return;
  const hero = $('#detail-hero');
  hero.className = 'pol dt-card '+pl.color;
  const sgD = seguradoraDe(pl), lg = $('#detail-logo');
  if(lg){ lg.className = 'pol-logo '+sgD; lg.innerHTML = '<img src="'+(sgD==='medis'?'logo-medis.png':'logo-ageas-white.png')+'" alt="'+(sgD==='medis'?'Medis':'Ageas Seguros')+'">'; }
  setText('#detail-ramo', pl.ramo);
  setText('#detail-title', pl.nome);
  setText('#detail-num', pl.num);
  setText('#detail-premio', pl.premio);
  setText('#detail-premio-per', '/'+pl.per);
  // kv
  const kv = $('#detail-kv');
  let rows = [['Tomador', S.account.firstName+' '+S.account.lastName],['NIF', S.account.nif]];
  Object.keys(pl.extra||{}).forEach(k=> rows.push([k, pl.extra[k]]));
  rows.push(['Mediador','Edgar Azevedo']);
  rows.push(['Seguradora', seguradoraDe(pl)==='medis' ? 'Medis · Ageas Seguros' : 'Ageas Seguros']);
  kv.innerHTML = rows.map(r=>'<div class="kv"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>').join('');
  const pb = $('#detail-prot');
  if(pb){
    const pi = protecaoInfo(pl);
    if(!pi){ pb.style.display='none'; }
    else {
      pb.style.display='';
      const cor = getComputedStyle(hero).backgroundColor;
      pb.style.setProperty('--prot', cor);
      let dots=''; for(let i=1;i<=52;i++) dots+='<i class="'+(i<pi.sem?'f':i===pi.sem?'n':i===52?'r':'')+'"></i>';
      const prD = protOf(pl);
      pb.innerHTML = (prD ? '<div class="dp-ordem">'+(prD.logo?'<img src="'+esc(prD.logo)+'" alt="">':'')+'<div><b>'+esc(prD.nome)+'</b><span>Protocolo · '+esc(pl.nome||prD.produto||'')+'</span></div><img class="dp-ordem-ag" src="logo-ageas-white.png" alt="Ageas Seguros"></div>' : '')+'<div class="dp-head"><div><div class="dp-big">'+String(pi.dias).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'</div><div class="dp-l">dias protegido desde '+fmtDateShort(pi.desde)+'</div></div></div>'
        +'<div class="dp-grid" aria-hidden="true">'+dots+'</div>'
        +'<div class="dp-leg"><span><b>'+pi.sem+'/52</b> semanas desta anuidade</span><span>Renova a '+fmtDateShort(pi.renova)+'</span></div>'
        +(/vida/i.test(pl.ramo||'') ? '<button type="button" class="dp-corpo" data-act="corpo-open"><span>'+(pl.color==='pro'?'Ver a minha profissão protegida':'Ver a minha vida protegida')+'</span><span>→</span></button>' : '')+(/casa|habita|multirrisc|patrim/i.test(pl.ramo||'') ? '<button type="button" class="dp-corpo" data-act="corpo-open"><span>Ver a minha casa protegida</span><span>→</span></button>' : '')+(/auto|frota/i.test(pl.ramo||'') ? '<button type="button" class="dp-corpo" data-act="corpo-open"><span>Ver o meu carro protegido</span><span>→</span></button>' : '')+(seguradoraDe(pl)==='medis' ? '<button type="button" class="dp-corpo" data-act="corpo-open"><span>Ver o meu corpo protegido</span><span>→</span></button>'+'<a class="dp-rede" href="https://www.medis.pt/guia-medis/" target="_blank" rel="noopener">Consultar rede Medis — hospitais e médicos ↗</a>' : '');
    }
  }
  // colour the "Participar sinistro" button to match the policy card
  const btn = $('#detail-btn-sinistro');
  if(btn){
    btn.className = 'btn tone-'+pl.color;
  }
}
function condQs(pl){
  const r=((pl&&pl.ramo)||'')+' '+((pl&&pl.nome)||'');
  if(/profissional/i.test(r)||(pl&&pl.ordem)) return ['Qual o capital por incapacidade das mãos?','O subsídio diário cobre baixa por doença?','Posso aumentar o capital de morte ou invalidez?','O prémio é dedutível no IRS?'];
  if(/sa[uú]de/i.test(r)) return ['Quanto pago por consulta de especialidade?','Qual o limite de internamento hospitalar?','Os estomatologia e óculos estão incluídos?','Posso incluir o meu cônjuge ou filhos?','Qual o período de carência?'];
  if(/vida/i.test(r)) return ['Qual o capital em caso de morte ou invalidez?','Que doenças graves estão cobertas?','Quem são os beneficiários?','Posso ajustar o capital ao crédito habitação?'];
  if(/auto|frota/i.test(r)) return ['Tenho cobertura de danos próprios?','A quebra de vidros está incluída?','Tenho veículo de substituição?','O que cobre a assistência em viagem?','Qual a franquia em caso de acidente?'];
  if(/casa|habita|multirrisc|patrim/i.test(r)) return ['O capital do edifício está atualizado?','Danos por água e infiltrações estão cobertos?','O recheio está incluído?','Tenho cobertura de fenómenos sísmicos?','Como funciona a assistência ao lar 24h?'];
  if(/acidente/i.test(r)) return ['O que está coberto em caso de acidente?','Tenho subsídio por incapacidade temporária?','As despesas de tratamento estão incluídas?'];
  if(/rc|responsabilidade/i.test(r)) return ['Qual o capital de responsabilidade civil?','Que atividades estão cobertas?','Existe franquia?'];
  if(/ppr|reforma|poupan|capitaliza|invest|maximus|flex/i.test(r)) return ['Qual o valor acumulado até hoje?','Qual a rentabilidade deste ano?','Posso fazer um reforço?','Quais as condições de resgate?','Qual o benefício fiscal?'];
  return ['Que coberturas tenho incluídas?','Qual o capital seguro?','Existe franquia?','Quando renova a apólice?'];
}
function condicoesSend(){
  const pl = currentPolicy;
  const ta = $('#cond-texto');
  const txt = ta ? ta.value.trim() : '';
  const errEl = $('#cond-err');
  if(!txt){ if(errEl) errEl.textContent='Escreva a sua pergunta.'; return; }
  if(errEl) errEl.textContent='';
  const who = requesterInfo();
  const ref = pl ? (pl.nome||pl.ramo)+' · '+(pl.num||'') : 'Apólice não identificada';
  const subject = encodeURIComponent('Pedido de condições — '+(pl?(pl.nome||pl.ramo):'apólice')+' — '+who.nome+' (NIF '+who.nif+')');
  const body = encodeURIComponent(
    'Pedido de condições de apólice.\n\n'
    +'Cliente: '+who.nome+'\nNIF: '+who.nif+'\n'
    +'Apólice: '+ref+'\n'
    +(pl && pl.ramo ? 'Ramo: '+pl.ramo+'\n' : '')
    +(pl && pl.premio ? 'Prémio: '+pl.premio+'/'+(pl.per||'ano')+'\n' : '')
    +'\nPergunta do cliente:\n'+txt
  );
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?cc=edgar.azevedo@private.ageas.pt&subject='+subject+'&body='+body;
  if(ta) ta.value='';
  closeSheet('sh-condicoes');
  toast('Pergunta enviada ao seu mediador');
}

function deletePolicy(){
  if(!currentPolicy) return;
  const tab = currentPolicy._tab;
  S.policies[tab] = S.policies[tab].filter(x=>x.id!==currentPolicy.id);
  save(); currentPolicy=null;
  back(); renderWallet();
  toast('Apólice removida');
}

/* ---------- SHEETS ---------- */
function openSheet(id){
  const el=document.getElementById(id); if(!el) return;
  el.classList.add('open');
  document.body.classList.add('sheet-open');
  if(id==='sh-sinistro') buildSinistroPolicies();
  if(id==='sh-invest-resgate') investResgatePrefill();
  if(id==='sh-condicoes'){
    const pl = currentPolicy;
    setText('#cond-apolice', pl ? (pl.nome||pl.ramo) : 'a sua apólice');
    const q=$('#cond-q'); if(q){ q.innerHTML=condQs(pl).map(t=>'<button type="button" class="cond-chip" data-cq>'+esc(t)+'</button>').join(''); }
    const ta=$('#cond-texto'); if(ta) ta.value='';
  }
  if(id==='sh-convite') renderMontra();
  if(id==='sh-add') initAddSheet();
  if(id==='sh-catalog'){
    // filter products by the active wallet tab (Particular vs Empresa)
    buildCatalog(walletTab);
    const search = $('#cat-search'); if(search) search.value='';
    // rebuild subtitle for clarity
    const sub = el.querySelector('.sub');
    if(sub) sub.innerHTML = 'A mostrar produtos <b style="color:var(--ink);">'+(walletTab==='empresa'?'para Empresas':'para Particulares')+'</b>.';
  }
}
function closeSheet(id){
  setTimeout(()=>{ if(!document.querySelector('.sheet-wrap.open')) document.body.classList.remove('sheet-open'); }, 0); const el=document.getElementById(id); if(el) el.classList.remove('open'); }
function pick(el, group){
  const c = el.closest('[data-group="'+group+'"]'); if(!c) return;
  c.querySelectorAll('.pick').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
  if(group==='sim-contact'){
    const locs=$('#presencial-locs');
    if(locs) locs.style.display = el.id==='presencial-pick' ? 'block':'none';
  }
  if(group==='prize-store'){ S.prizeStore = el.dataset.store || S.prizeStore; save(); }
}
function buildSinistroPolicies(){
  const wrap = $('#sin-policies'); if(!wrap) return;
  const list = S.policies.particular.concat(S.policies.empresa).filter(pl=>!/cancel|anula/i.test(pl.situacao||''));
  wrap.innerHTML = list.map((pl,i)=>(
    '<div class="pick'+(i===0?' on':'')+'" data-pick="sin"><span class="swatch" style="background:'+CAT_SWATCH[pl.color]+';"></span>'+
    '<div class="info"><div class="nm">'+esc(pl.nome)+'</div><div class="ds">'+esc(pl.ramo)+' · '+esc(pl.num)+'</div></div>'+
    '<span class="check">✓</span></div>'
  )).join('');
}
function submitSheet(id, msg){ closeSheet(id); toast(msg); }
function simularSend(){
  const prodBtn = $('#sh-simular [data-pgroup="sim-prod"] .pick.on');
  let produto = prodBtn ? prodBtn.querySelector('.nm').textContent.trim() : '—';
  if(produto==='Outro'){ produto = ($('#sim-outro-text').value||'Outro').trim(); }
  const nif = ($('#sim-nif').value||'').trim();
  const contactBtn = $('#sh-simular [data-pgroup="sim-contact"].on');
  let contacto = contactBtn ? contactBtn.querySelector('.nm').textContent.trim() : 'WhatsApp';
  if(contacto==='Presencial'){
    const locBtn = $('#presencial-locs [data-pick="loc"].on');
    const loc = locBtn ? locBtn.querySelector('.nm').textContent.trim() : '';
    contacto += loc ? ' — '+loc : '';
  }
  const who = requesterInfo();
  if(contacto==='WhatsApp' || contacto.indexOf('Presencial')===0){
    const waText = encodeURIComponent('Olá! Gostaria de simular um seguro de '+produto+' ('+contacto+'). NIF: '+(nif||who.nif)+'.');
    window.open('https://wa.me/351913042770?text='+waText, '_blank');
  } else {
    const subject = encodeURIComponent('Pedido de cotação — '+produto+' — '+who.nome+' (NIF '+(nif||who.nif)+')');
    const body = encodeURIComponent('Seguro pretendido: '+produto+'\nNIF: '+(nif||who.nif)+'\nContacto preferido: '+contacto);
    window.location.href = 'mailto:edgarsegurosageas@gmail.com?subject='+subject+'&body='+body;
  }
  closeSheet('sh-simular');
  toast('Pedido de cotação enviado');
}
function sinistroSend(){
  const polBtn = $('#sin-policies .pick.on');
  const polLabel = polBtn ? polBtn.querySelector('.nm').textContent.trim() : '—';
  const nif = ($('#sin-nif').value||'').trim();
  const nota = ($('#sin-nota').value||'').trim();
  const who = requesterInfo();
  const subject = encodeURIComponent('Participar sinistro — '+who.nome+' (NIF '+(nif||who.nif)+')');
  const body = encodeURIComponent('Apólice: '+polLabel+'\nNIF: '+(nif||who.nif)+'\nDescrição: '+(nota||'Não indicado'));
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?subject='+subject+'&body='+body;
  $('#sin-nota').value='';
  closeSheet('sh-sinistro');
  toast('Sinistro enviado ao seu gestor');
}
function transferSend(){
  const ramoBtn = $('#sh-transfer [data-pick].on');
  const ramo = ramoBtn ? ramoBtn.dataset.pick : 'Outro';
  const nota = ($('#tr-nota').value||'').trim();
  const tipoBtn = $('#tr-tipo .b.on');
  const tipo = tipoBtn ? tipoBtn.dataset.tipo : 'individual';
  let who;
  if(tipo==='empresa'){
    const empNif = ($('#tr-emp-nif').value||'').trim();
    who = { nif: empNif || '—', nome: 'Empresa' };
  } else {
    who = { nif: S.account.nif, nome: (S.account.firstName+' '+S.account.lastName).trim() };
  }
  const subject = encodeURIComponent('Avaliar transferência ('+(tipo==='empresa'?'Empresa':'Individual')+') — '+who.nome+' (NIF '+who.nif+')');
  const body = encodeURIComponent('Tipo: '+(tipo==='empresa'?'Empresa':'Individual')+'\nRamo: '+ramo+'\nNIF: '+who.nif+'\nDescrição: '+(nota||'Não indicado'));
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  $('#tr-nota').value=''; $('#tr-emp-nif').value='';
  closeSheet('sh-transfer');
  toast('Pedido de avaliação enviado');
}

/* ---------- TEMA ---------- */
const THEME_HEX = { coral:'#FF5F2E', indigo:'#1E2752', emerald:'#0D6E58', plum:'#5E2A6E', ink:'#0A0A0B' };
function applyTheme(){
  const t = S.theme || 'coral';
  if(t==='coral') document.body.removeAttribute('data-theme');
  else document.body.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t==='coral' ? '#EDEAE3' : THEME_HEX[t]);
  $$('.theme-sw').forEach(b=>b.classList.toggle('on', b.dataset.theme===t));
  paintAppIcon();
}
function setTheme(t){
  if(!THEME_HEX[t]) return;
  S.theme = t; save();
  applyTheme();
}
const WP_HEX = { branco:'#FFFFFF', creme:'#F6F2EA', areia:'#ECE4D6', salva:'#E4ECE3', ceu:'#E3EAF3', rosa:'#F4E6E3' };
function applyWallpaper(){
  const w = S.wallpaper || 'branco';
  const home = document.getElementById('s-home'); if(!home) return;
  let foto = null; try{ foto = localStorage.getItem('exa_wallpaper_foto'); }catch(e){}
  if(w==='foto' && foto){
    home.style.background = 'linear-gradient(rgba(255,255,255,0.74),rgba(255,255,255,0.86)),url('+foto+') center/cover no-repeat';
  } else {
    home.style.background = WP_HEX[w] || '#fff';
  }
  const bg = (w==='foto' && foto) ? '#fff' : (WP_HEX[w]||'#fff');
  const ph = document.querySelector('.phone'); if(ph) ph.style.setProperty('--home-bg', bg);
  $$('.wp-sw').forEach(b=>b.classList.toggle('on', b.dataset.wp===((w==='foto'&&!foto)?'branco':w)));
  const fl = document.querySelector('.wp-foto'); if(fl && foto) fl.style.backgroundImage = 'url('+foto+')';
}
function setWallpaper(w){ S.wallpaper = w; save(); applyWallpaper(); }
function loadWallpaperFile(file){
  if(!file) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const s = Math.min(1, 900/Math.max(img.width,img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      try{ localStorage.setItem('exa_wallpaper_foto', c.toDataURL('image/jpeg',0.8)); setWallpaper('foto'); toast('Fundo actualizado'); }
      catch(e){ toast('Imagem demasiado grande'); }
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}
document.addEventListener('change', e=>{ if(e.target && e.target.id==='wp-file') loadWallpaperFile(e.target.files[0]); });
function paintAppIcon(){
  const els = $$('[data-app-icon]');
  if(!els.length) return;
  const hex = THEME_HEX[S.theme || 'coral'];
  els.forEach(el=>{ el.style.background = hex; });
}

/* ---------- PROFILE ---------- */
function renderProfile(){
  setText('#prof-name', (S.protocolo ? title()+' ' : '')+S.account.firstName+' '+S.account.lastName);
  setText('#prof-nif', 'NIF '+S.account.nif);
  setText('#prof-since', 'Cliente desde '+S.account.since);
  setText('#prof-email', S.account.email);
  setText('#prof-phone', S.account.phone);
  const bd = S.account.birthdate ? fmtDate(S.account.birthdate) : '—';
  setText('#prof-bd', bd);
  const pts = pointsBalance();
  setText('#prof-points', pts+' pts');
  const need = Math.max(0, 50 - pts);
  setText('#prof-need', need>0 ? ('Faltam '+need+' pts para 50€') : 'Pode resgatar 50€!');
  const bar = $('#prof-bar'); if(bar) bar.style.width = Math.min(100,(pts/50)*100)+'%';
  // toggles reflect state
  setToggle('updates', true); // locked on
  setToggle('renovacao', notifOn('renovacao'));
  setToggle('pagamentos', notifOn('pagamentos'));
  setToggle('checkup', notifOn('checkup'));
  setToggle('sazonal', notifOn('sazonal'));
  estadoPermNotif();
  setToggle('empresaTab', empresaTabVisible());
}
function setToggle(key, on){ const el=$('[data-toggle="'+key+'"]'); if(el) el.dataset.on = on?'1':'0'; }
function temEmpresa(){ return !!(S.empresaClient || (S.policies.empresa||[]).length || S.demo); }
function empresaTabVisible(){ return S.showEmpresa===undefined || S.showEmpresa===null ? temEmpresa() : !!S.showEmpresa; }
function applyEmpresaTab(){
  const show = empresaTabVisible(), w = document.getElementById('wallet-seg-wrap');
  if(w) w.style.display = show ? '' : 'none';
  const onEmp = walletTab==='empresa' || !!document.querySelector('[data-walletswitch="empresa"].on');
  if(!show && onEmp && !applyEmpresaTab._busy){ applyEmpresaTab._busy=true; try{ switchWalletTab(null,'particular'); } finally { applyEmpresaTab._busy=false; } }
}
function toggleNotif(el){
  const key = el.dataset.toggle;
  if(key==='updates') return; // locked
  if(key==='empresaTab'){ el.dataset.on = el.dataset.on==='1'?'0':'1'; S.showEmpresa = el.dataset.on==='1'; save(); applyEmpresaTab(); return; }
  el.dataset.on = el.dataset.on==='1'?'0':'1';
  S.notifications[key] = el.dataset.on==='1'; save();
  if(el.dataset.on==='1') pedirPermissaoNotif();
  renderNotifs();
  ativarPush().then(estadoPermNotif);
}
function fmtDate(iso){
  const d = new Date(iso+'T00:00:00'); if(isNaN(d)) return iso;
  return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();
}

/* ---------- MONTRA / POINTS (Supabase) ---------- */
function meName(){ return (S.account.firstName+' '+S.account.lastName).trim(); }
function refData(){ return window.EXAStore.load(); }
function myRedemptions(){ return refData().redemptions.filter(r=>r.client===meName()); }
function pointsBalance(){
  if(S.refPoints && typeof S.refPoints.saldo === 'number') return S.refPoints.saldo;
  return 0;
}

function renderMontra(){
  const pts = pointsBalance();
  setText('#montra-points', pts);
  const need = Math.max(0,50-pts);
  const bar = $('#montra-bar'); if(bar) bar.style.width = Math.min(100,(pts/50)*100)+'%';
  setText('#montra-need', need>0 ? ('Faltam '+need+' pontos para o cartão de 50€') : 'Já pode resgatar o cartão de 50€!');
  const codeEl = $('#montra-code');
  if(codeEl) codeEl.textContent = S.refCode || '—';
  const linkEl = $('#invite-link-text');
  if(linkEl) linkEl.textContent = S.refCode ? inviteLink() : '—';
  // history
  const h = $('#montra-history');
  const list = S.refInvites || [];
  if(h) h.innerHTML = list.length ? list.map(inv=>{
    const nome = (inv.amigo_nome||'').split(' ').slice(0,2).join(' ');
    const when = inv.registado_em ? fmtDateShort(new Date(inv.registado_em)) : '';
    if(inv.elegivel && inv.pontos){
      return '<div class="li" style="cursor:default;"><div><div class="nm" style="font-size:13px;">'+esc(nome)+'</div>'
        +'<div class="ds">'+esc(inv.produto||inv.ramo||'Aderiu')+' · '+esc(when)+'</div></div>'
        +'<span class="chip em" style="padding:3px 10px;font-size:10px;">+'+inv.pontos+' pts</span></div>';
    }
    const label = inv.ramo ? 'A confirmar condições' : 'Registou-se · sem apólice';
    return '<div class="li" style="cursor:default;"><div><div class="nm" style="font-size:13px;">'+esc(nome)+'</div>'
      +'<div class="ds">'+esc(label)+(when?' · '+esc(when):'')+'</div></div>'
      +'<span class="chip am" style="padding:3px 10px;font-size:10px;">Pendente</span></div>';
  }).join('') : '<div class="li" style="cursor:default;"><div class="ds" style="font-size:12px;">Ainda não tem convites. Partilhe o seu código!</div></div>';
  // redeem button
  const btn = $('#montra-redeem');
  if(btn){
    if(pts>=50){ btn.removeAttribute('disabled'); btn.querySelector('span').textContent='Resgatar cartão de 50€'; }
    else { btn.setAttribute('disabled','true'); btn.querySelector('span').textContent='Resgatar aos 50 pts'; }
  }
}
async function redeem(){
  if(pointsBalance()<50){ toast('Precisa de 50 pontos para resgatar'); return; }
  const stores={pingo:'Pingo Doce',continente:'Continente',lidl:'Lidl'};
  const loja = stores[S.prizeStore] || 'Pingo Doce';
  const morada = S.account.address || 'Morada não indicada';
  if(window.EXASupabase && window.EXASupabase.registarResgate){
    const r = await window.EXASupabase.registarResgate(S.account.nif, loja, morada);
    if(!r.ok){ toast(r.error||'Não foi possível resgatar'); return; }
  }
  const subject = encodeURIComponent('Resgate de cartão 50€ — '+meName()+' (NIF '+S.account.nif+')');
  const body = encodeURIComponent('Cliente: '+meName()+'\nNIF: '+S.account.nif+'\nCartão: '+loja+' · 50€\nMorada de envio: '+morada);
  window.location.href = 'mailto:edgarsegurosageas@gmail.com?cc=edgar.azevedo@private.ageas.pt&subject='+subject+'&body='+body;
  await loadReferrals();
  renderMontra();
  closeSheet('sh-convite');
  toast('Resgate pedido · notificámos o mediador');
}
function fmtShort(d){ return d.getDate()+' '+MONTHS[d.getMonth()].slice(0,3); }
function inviteLink(){
  const code = S.refCode || '';
  return 'https://app.easegurosageas.com/?ref='+encodeURIComponent(code);
}
function inviteText(){
  return 'Olá! Sou cliente da Mediação Edgar Azevedo Seguros e queria partilhar consigo. Use o meu convite: '+inviteLink();
}
function copyInvite(){
  const link = inviteLink();
  if(navigator.clipboard) navigator.clipboard.writeText(link).catch(()=>{});
  toast('Link copiado para a área de transferência');
}
function shareWhatsApp(){
  window.open('https://wa.me/?text='+encodeURIComponent(inviteText()), '_blank');
}
function investConviteText(){
  const nm = ((S.account.firstName||'')+' '+(S.account.lastName||'')).trim() || 'Um amigo';
  const link = S.refCode ? '\n'+inviteLink() : '';
  return nm+' recomendou-lhe o seu mediador Ageas, Edgar Azevedo, para conhecer os produtos de investimento (poupança, PPR e capitalização).\n\nContacto directo: 913 042 770'+link;
}
function investConvite(via){
  const txt = investConviteText();
  closeSheet('sh-inv-conv');
  if(via==='share' && navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)){ navigator.share({ title:'Mediação Edgar Azevedo', text:txt }).catch(()=>{}); return; }
  window.open('https://wa.me/?text='+encodeURIComponent(txt), '_blank');
}
function shareSMS(){
  window.location.href = 'sms:?&body='+encodeURIComponent(inviteText());
}

/* ---------- BIRTHDAY ---------- */
function maybeBirthday(){
  const bd = S.account.birthdate; if(!bd) return;
  const today = new Date();
  const d = new Date(bd+'T00:00:00');
  const isBday = d.getDate()===today.getDate() && d.getMonth()===today.getMonth();
  const seen = sessionStorage.getItem('exa_bday_seen');
  if(isBday && !seen){ showBirthday(); }
}
function showBirthday(){
  const b = $('#bday-banner');
  if(!b) return;
  $('#bday-text').innerHTML = 'Feliz aniversário, '+title()+' '+esc(S.account.firstName)+'. Desejamos-lhe um dia cheio de saúde, paz e alegria.';
  b.classList.add('show');
  sessionStorage.setItem('exa_bday_seen','1');
  setTimeout(()=> b.classList.remove('show'), 6000);
}
function showBirthdayDemo(){ sessionStorage.removeItem('exa_bday_seen'); showBirthday(); }

/* ---------- RESET ---------- */
function resetApp(){ localStorage.removeItem(LS); S = load(); stack=['splash']; nav('splash',{replace:true}); toast('App reposta'); }

/* ---------- GLOBAL CLICK DELEGATION ---------- */
document.addEventListener('input', function(e){
  if(e.target && (e.target.id==='ir-idade' || e.target.id==='ir-idade-resgate' || e.target.id==='ir-reforco')) renderResgateSim();
});
document.addEventListener('click', function(e){
  // tabbar pill visual switch (ignores if item has data-nav/data-sheet — those navigate elsewhere)
  const tab = e.target.closest('.tabbar .t');
  if(tab && !tab.dataset.sheet && !tab.dataset.nav && !tab.dataset.act){
    const bar = tab.parentElement;
    bar.querySelectorAll('.t').forEach(x=>x.classList.remove('on'));
    tab.classList.add('on');
  }
  const themeBtn = e.target.closest('.theme-sw');
  if(themeBtn){ setTheme(themeBtn.dataset.theme); return; }
  const t = e.target.closest('[data-act],[data-nav],[data-back],[data-policy],[data-pick],[data-sheet],[data-close],[data-tab],[data-cat],[data-toggle],[data-per],[data-store],[data-ramo-pick]');
  if(!t) return;
  // navigation
  if(t.dataset.nav){ nav(t.dataset.nav); return; }
  if(t.hasAttribute('data-back')){ back(); return; }
  // sheets
  if(t.dataset.sheet){ if(t.dataset.sheet==='sh-notifs') renderNotifs(); openSheet(t.dataset.sheet); return; }
  if(t.dataset.close){ closeSheet(t.dataset.close); return; }
  // policy card open
  if(t.dataset.act==='motivo-send'){ sendMotivo(+t.dataset.idx); return; }
  if(t.dataset.policy){ openPolicy(t.dataset.policy, t.dataset.tab); return; }
  // catalog item
  if(t.classList.contains('cat-item')){ chooseCatalog(t); return; }
  // generic picks
  if(t.dataset.pick){
    const wrap=t.parentElement; wrap.querySelectorAll('.pick').forEach(x=>x.classList.remove('on')); t.classList.add('on');
    if(t.dataset.pick==='sp'){
      const ow=document.getElementById('sim-outro-wrap');
      if(ow) ow.style.display = (t.id==='sim-outro') ? 'block':'none';
    }
    return;
  }
  // toggles
  if(t.dataset.toggle!==undefined){ toggleNotif(t); return; }
  // actions
  const a = t.dataset.act;
  // actions that benefit from a short loading state
  const loadingActs = { 'login':1, 'register':1, 'add-confirm':1, 'redeem':1, 'sinistro-send':1, 'simular-send':1, 'transferir-send':1 };
  if(loadingActs[a]){
    const btn = t.classList.contains('btn') ? t : t.closest('.btn');
    withLoading(btn, 650, function(){ runAct(a, t); });
    return;
  }
  runAct(a, t);
});

function runAct(a, t){
  if(a==='login'){ const b=document.querySelector('.lg-go'); if(b && !b.classList.contains('busy')){ b.classList.add('busy'); const sc=document.getElementById('s-login'); Promise.resolve(doLogin()).finally(()=>{ const ok=!sc.classList.contains('active'); if(ok){ const v=document.createElement('div'); v.className='lg-veil'; document.body.appendChild(v); setTimeout(()=>v.remove(),900); } setTimeout(()=>b.classList.remove('busy'),ok?600:350); }); } else if(!b) doLogin(); }
  else if(a==='register') doRegister();
  else if(a==='recuperar-pass') doRecuperarPassword();
  else if(a==='recuperar-enviar') doRecuperarEnviar();
  else if(a==='notif-vis-sim') ativarNotifVisitante();
  else if(a==='notif-vis-nao') recusarNotifVisitante();
  else if(a==='nova-pass') doNovaPass();
  else if(a==='abrir-nova-pass') abrirNovaPass(false);
  else if(a==='skip-intro') skipIntro();
  else if(a==='logout') logout();
  else if(a==='add-policy') openSheet('sh-add');
  else if(a==='add-confirm') addPolicy();
  else if(a==='condicoes-send') condicoesSend();
  else if(a==='del-policy') deletePolicy();
  else if(a==='invest-info') investInfo(t.dataset.produto||'Invest');
  else if(a==='inv-pick') investPick(t.dataset.risco);
  else if(a==='ip-reforco-pick') investReforcoPick(+t.dataset.valor);
  else if(a==='invest-resgate-send') investResgateSend();
  else if(a==='ip-toggle-simular') toggleInvestSimular();
  else if(a==='ip-show-cards') showInvestCards();
  else if(a==='ir-pick'){ resgateSel = +t.dataset.idx; renderResgateProdutos(); renderResgateSim(); }
  else if(a==='aviso-med-x'){ document.body.classList.add('am-off'); try{ localStorage.setItem('exa_aviso_med_v2', String(Date.now())); }catch(e){} }
  else if(a==='md-share-wa'||a==='md-share'){ const txt=mediadorShareText(); if(a==='md-share' && navigator.share){ navigator.share({title:'Nem todos os mediadores são iguais',text:txt}).catch(()=>{}); } else if(a==='md-share'){ try{ navigator.clipboard.writeText(txt); toast('Texto copiado'); }catch(e){} } else { window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); } }
  else if(a==='season-x'){ if(S.demo){ window.__demoSeason=Object.assign(window.__demoSeason||{},{[t.dataset.k]:1}); } else { let d={}; try{ d=JSON.parse(localStorage.getItem('exa_season')||'{}'); }catch(e){} d[t.dataset.k]=1; try{ localStorage.setItem('exa_season', JSON.stringify(d)); }catch(e){} } renderNotifs(); }
  else if(a==='checkup-done'){ if(S.demo){ window.__demoCheckup=Object.assign(window.__demoCheckup||{},{[t.dataset.k]:Date.now()}); } else { let d={}; try{ d=JSON.parse(localStorage.getItem('exa_checkup')||'{}'); }catch(e){} d[t.dataset.k]=Date.now(); try{ localStorage.setItem('exa_checkup', JSON.stringify(d)); }catch(e){} } renderNotifs(); toast('Próximo lembrete daqui a 6 meses'); }
  else if(a==='demo-code') demoCodeSubmit();
  else if(a==='corpo-open'){ if(window.exaCorpo && currentPolicy) window.exaCorpo(currentPolicy, protecaoInfo(currentPolicy), currentPolicy.color==='pro' ? '#8A6A2A' : getComputedStyle($('#detail-hero')).backgroundColor); }
  else if(a==='inv-conv-open'){ const m=$('#inv-conv-msg'); if(m) m.textContent=investConviteText(); openSheet('sh-inv-conv'); }
  else if(a==='inv-conv-wa') investConvite('wa');
  else if(a==='inv-conv-share') investConvite('share');
  else if(a==='ir-open'){ resgateSel = +t.dataset.idx; openSheet('sh-invest-resgate'); }
  else if(a==='empresa-login-submit') doEmpresaConfirm();
  else if(a==='empresa-code-verify') doEmpresaCodeVerify();
  else if(a==='redeem') redeem();
  else if(a==='copy-invite') copyInvite();
  else if(a==='share-whatsapp') shareWhatsApp();
  else if(a==='share-sms') shareSMS();
  else if(a==='register-convidado') doRegisterConvidado();
  else if(a==='reset') resetApp();
  else if(a==='sinistro-send') sinistroSend();
  else if(a==='simular-send') simularSend();
  else if(a==='transferir-send') transferSend();
}

// segmented & special groups via direct handlers (set in HTML through data attrs)
document.addEventListener('input', function(e){
  if(e.target && (e.target.id==='ir-idade' || e.target.id==='ir-idade-resgate' || e.target.id==='ir-reforco')) renderResgateSim();
});
document.addEventListener('click', function(e){
  // catalog item selection (data-* not in main selector → handle here)
  const cat = e.target.closest('.cat-item');
  if(cat){ chooseCatalog(cat); return; }
  const seg = e.target.closest('[data-walletswitch]');
  if(seg){ switchWalletTab(seg, seg.dataset.walletswitch); return; }
  const per = e.target.closest('[data-per]');
  if(per){ setAddPer(per, per.dataset.per); return; }
  const frac = e.target.closest('[data-frac]');
  if(frac){ setAddPer(frac, frac.dataset.frac); return; }
  const goal = e.target.closest('[data-goal]');
  if(goal){ const seg=goal.closest('.seg'); if(seg) seg.querySelectorAll('.b').forEach(b=>b.classList.remove('on')); goal.classList.add('on'); return; }
  const tipo = e.target.closest('[data-tipo]');
  if(tipo){ const seg=tipo.closest('.seg'); if(seg) seg.querySelectorAll('.b').forEach(b=>b.classList.remove('on')); tipo.classList.add('on'); const w=$('#tr-emp-nif-wrap'); if(w) w.style.display = tipo.dataset.tipo==='empresa' ? 'block':'none'; return; }
  const cc = e.target.closest('[data-cardcolor]');
  if(cc){ const g=cc.closest('[data-group="add-color"]'); if(g) g.querySelectorAll('.cardsw').forEach(x=>x.classList.remove('on')); cc.classList.add('on'); addDraft.color=cc.dataset.cardcolor; return; }
  const ramo = e.target.closest('[data-ramo-pick]');
  if(ramo){
    const g=ramo.closest('[data-group="add-ramo"]'); if(g) g.querySelectorAll('.pick').forEach(x=>x.classList.remove('on'));
    ramo.classList.add('on'); addDraft.color=ramo.dataset.color; addDraft.ramo=ramo.dataset.ramoPick; addDraft.irs=(ramo.dataset.ramoPick==='Vida'||ramo.dataset.ramoPick==='Saúde');
    // sync card colour swatches to the ramo's default colour
    document.querySelectorAll('#sh-add [data-cardcolor]').forEach(s=> s.classList.toggle('on', s.dataset.cardcolor===addDraft.color));
    return;
  }
  const pg = e.target.closest('[data-pgroup]');
  if(pg){ pick(pg, pg.dataset.pgroup); return; }
  const store = e.target.closest('[data-store]');
  if(store){ const w=store.parentElement; w.querySelectorAll('.pick').forEach(x=>x.classList.remove('on')); store.classList.add('on'); S.prizeStore=store.dataset.store; save(); return; }
});

// catalog search
document.addEventListener('input', function(e){
  if(e.target.id==='cat-search') filterCatalog(e.target.value);
  if(e.target.id==='add-premio') updateDebitNote();
  if(e.target.id==='add-inicio'){
    addDraft.inicio = e.target.value;
    addDraft.renov = addPlusYear(e.target.value);
    const ren=document.getElementById('add-renov'); if(ren) ren.value=addDraft.renov;
    updateDebitNote();
  }
});

// close sheet on backdrop
document.addEventListener('input', function(e){
  if(e.target && (e.target.id==='ir-idade' || e.target.id==='ir-idade-resgate' || e.target.id==='ir-reforco')) renderResgateSim();
});
document.addEventListener('click', function(e){
  if(e.target.classList.contains('sheet-wrap')) e.target.classList.remove('open');
});

/* ---------- MOTION HELPERS ---------- */
// ripple on any .btn
document.addEventListener('pointerdown', function(e){
  return;
  const b = e.target.closest('.btn');
  if(!b || b.classList.contains('is-loading')) return;
  const r = b.getBoundingClientRect();
  const s = Math.max(r.width, r.height);
  const rp = document.createElement('span');
  rp.className = 'ripple';
  rp.style.width = rp.style.height = s + 'px';
  rp.style.left = (e.clientX - r.left - s/2) + 'px';
  rp.style.top  = (e.clientY - r.top  - s/2) + 'px';
  b.appendChild(rp);
  setTimeout(()=>rp.remove(), 600);
});

// tiny loading helper — wraps a button click with spinner + delay
window.withLoading = function(btnEl, ms, done){
  if(!btnEl) return done && done();
  btnEl.classList.add('is-loading');
  if(!btnEl.querySelector('.spinner')){
    const sp = document.createElement('span');
    sp.className = 'spinner';
    btnEl.appendChild(sp);
  }
  setTimeout(function(){
    btnEl.classList.remove('is-loading');
    const sp = btnEl.querySelector('.spinner');
    if(sp) sp.remove();
    if(done) done();
  }, ms);
};

let introTimer = null;
function skipIntro(){
  if(introTimer){ clearTimeout(introTimer); introTimer = null; }
  stack = ['intro'];
  if(convite){
    nav('convidado', {replace:true});
    stack = ['convidado'];
    return;
  }
  nav('splash', {replace:true});
  stack = ['splash'];
}
/* ---------- INIT ---------- */
function init(){
  buildCatalog();
  applyTheme();
  if(window.EXA_DEMO){
    S.account = JSON.parse(JSON.stringify(demoAccount));
    S.policies = seedPolicies();
    S.points = 30;
    S.invites = JSON.parse(JSON.stringify(demoInvites));
    S.investReal = { ativo:true, produto:'Maximus Poupança', valor:612.4, desde:'2026-01-10' };
    S.investList = [
      { ativo:true, produto:'Maximus Poupança', valor:612.4, desde:'2026-01-10' },
      { ativo:true, produto:'PPR+ tradicional', valor:1480, desde:'2025-03-15' }
    ];
    S.empresaLoaded = true;
    S.loggedIn = true;
    stack=['home']; showScreen('home'); onEnter('home');
    return;
  }
  // if already logged in, skip to home
  if(S.loggedIn){
    stack=['home']; showScreen('home'); onEnter('home');
    restaurarSessao().then(ok=>{ if(ok && stack[stack.length-1]==='home') onEnter('home'); });
  } else {
    detectarConvite();
    skipIntro();
    demoFromUrl();
    restaurarSessao().then(ok=>{
      if(!ok || convite) return;
      if(introTimer){ clearTimeout(introTimer); introTimer=null; }
      stack=['home']; nav('home',{replace:true}); stack=['home'];
    });
  }
}
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', ()=>setTimeout(convidarNotificacoes, 3500));
// link de recuperação de palavra-passe (email do Supabase) → pedir a nova palavra-passe
if(window.EXASupabase && window.EXASupabase.aoRecuperar) window.EXASupabase.aoRecuperar(()=>abrirNovaPass(true));

if('serviceWorker' in navigator && location.protocol === 'https:'){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

// expose for inline & debugging
window.EXA = { nav, back, S:()=>S, reset:resetApp, notificar, renderNotifs };
})();

(function(){const car=document.getElementById('ob-car'),cd=document.getElementById('ob-cd');if(!car||!cd)return;car.addEventListener('scroll',()=>{const i=Math.round(car.scrollLeft/(car.clientWidth-36));[...cd.children].forEach((d,k)=>d.classList.toggle('on',k===i));},{passive:true});})();

(function(){
  const car=document.getElementById('ob-car'); if(!car) return;
  const D=[
    [['Cabeça e mente','Consultas de especialidade e psicologia'],['Olhos','Oftalmologia e exames de visão'],['Dentes','Estomatologia (rede Medis Dental)'],['Coração e pulmões','Exames de diagnóstico e análises'],['Tronco e abdómen','Internamento e cirurgia'],['Ossos e músculos','Fisioterapia e ortopedia']],
    [['Cérebro','AVC, Parkinson, Alzheimer · capital a indemnizar'],['Coração','Enfarte do Miocárdio, bypass · capital a indemnizar'],['Pulmões','Doença pulmonar terminal · capital a indemnizar'],['Rins','Insuficiência Renal · capital a indemnizar']],
    [['Quebra de vidros','Para-brisas, óculo e vidros laterais'],['Choque e colisão','Danos no seu próprio carro'],['Furto ou roubo','Do veículo ou de peças'],['Fenómenos da natureza','Tempestades, inundações, granizo'],['Responsabilidade civil','Danos que cause a terceiros'],['Assistência 24h','Reboque, desempanagem e transporte']],
    [['Incêndio, raio e explosão','Edifício e recheio'],['Fenómenos da natureza','Tempestades, inundações, sismos'],['Quebra de vidros','Janelas, espelhos e loiças'],['Responsabilidade civil','Danos a vizinhos e terceiros'],['Assistência ao lar 24h','Canalizador, eletricista, serralheiro'],['Furto ou roubo','Do recheio da habitação'],['Danos por água','Roturas e infiltrações']]
  ];
  [...car.querySelectorAll('.ob-sl')].forEach((sl,si)=>{
    const fig=sl.querySelector('.ob-fig'); const pop=document.createElement('div'); pop.className='ob-pop'; fig.appendChild(pop);
    [...sl.querySelectorAll('.ob-pd')].forEach((p,pi)=>{
      const d=(D[si]||[])[pi]; if(!d) return;
      p.setAttribute('role','button'); p.setAttribute('tabindex','0'); p.setAttribute('aria-label',d[0]);
      p.addEventListener('click',ev=>{ev.stopPropagation();
        const on=p.classList.contains('sel'); sl.querySelectorAll('.ob-pd').forEach(x=>x.classList.remove('sel'));
        if(on){pop.classList.remove('show');return;}
        p.classList.add('sel'); pop.innerHTML='<b>'+d[0]+'</b><span>'+d[1]+'</span><em>Coberto</em>'; pop.classList.add('show');
      });
    });
    fig.addEventListener('click',()=>{pop.classList.remove('show');sl.querySelectorAll('.ob-pd').forEach(x=>x.classList.remove('sel'));});
  });
})();

(function(){
  const car=document.getElementById('ob-car'); if(!car) return;
  const w=()=>car.querySelector('.ob-sl').offsetWidth+12;
  const cur=()=>Math.round(car.scrollLeft/w());
  const go=i=>car.scrollTo({left:Math.max(0,Math.min(3,i))*w(),behavior:'smooth'});
  document.addEventListener('click',e=>{const s=e.target.closest('[data-ob-step]');if(s){go(cur()+(+s.dataset.obStep));return;}const g=e.target.closest('[data-ob-go]');if(g)go(+g.dataset.obGo);});
  let down=false,sx=0,sl=0,moved=false;
  car.addEventListener('mousedown',e=>{down=true;moved=false;sx=e.clientX;sl=car.scrollLeft;car.style.scrollSnapType='none';});
  window.addEventListener('mousemove',e=>{if(!down)return;const dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;car.scrollLeft=sl-dx;});
  window.addEventListener('mouseup',()=>{if(!down)return;down=false;car.style.scrollSnapType='';go(cur());});
  car.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
})();

try{ if(S.demo && S.loggedIn) document.body.classList.add('is-demo'); }catch(e){}

try{ const t=+localStorage.getItem('exa_aviso_med_v2'); if(t && Date.now()-t < 30*86400000) document.body.classList.add('am-off'); }catch(e){}

function mediadorShareText(){
  return 'Nem todos os mediadores de seguros são iguais.\n\n'
   +'• Um bom mediador acompanha a apólice todos os anos, não só na venda.\n'
   +'• Num sinistro, é o mediador que defende os seus interesses junto da seguradora.\n'
   +'• Rever coberturas e prémios todos os anos evita pagar a mais.\n'
   +'• Mudar de mediador é recomeçar com quem não conhece o seu histórico.\n'
   +'• Antes de mudar, peça por escrito o que muda nas condições.\n\n'
   +'A Mediação Azevedo Seguros (Edgar Azevedo, agente exclusivo Ageas) presta serviço em Portugal Continental e Ilhas, presencialmente, digitalmente e por telefone.\n\n'
   +'Os nossos clientes têm acesso à nossa app e também à app da Ageas Seguros. Se acontecer outra pandemia ou outro motivo que impeça a deslocação, o serviço continua igual: digital e por telefone.\n\nContacto: 913 042 770.';
}

(function(){
  const W={0:['Céu limpo','☀️'],1:['Pouco nublado','🌤️'],2:['Parcialmente nublado','⛅'],3:['Nublado','☁️'],45:['Nevoeiro','🌫️'],48:['Nevoeiro','🌫️'],51:['Chuvisco','🌦️'],53:['Chuvisco','🌦️'],55:['Chuvisco','🌦️'],61:['Chuva fraca','🌧️'],63:['Chuva','🌧️'],65:['Chuva forte','🌧️'],80:['Aguaceiros','🌦️'],81:['Aguaceiros','🌦️'],82:['Aguaceiros fortes','⛈️'],95:['Trovoada','⛈️'],96:['Trovoada','⛈️'],99:['Trovoada','⛈️'],71:['Neve','🌨️'],73:['Neve','🌨️'],75:['Neve','🌨️']};
  const el=()=>document.getElementById('wx');
  function show(d){ const e=el(); if(!e||!d) return; const w=W[d.code]||['','🌡️']; e.innerHTML='<span>'+w[1]+'</span><b>'+Math.round(d.t)+'°</b><span>'+w[0]+(d.city?' · '+d.city:'')+'</span>'; e.classList.add('on'); }
  async function load(lat,lon,city){
    try{
      const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,weather_code&timezone=auto');
      const j=await r.json(); const d={t:j.current.temperature_2m,code:j.current.weather_code,city,ts:Date.now()};
      try{ localStorage.setItem('exa_wx',JSON.stringify(d)); }catch(e){}
      show(d);
    }catch(e){}
  }
  async function cityOf(lat,lon){
    try{ const r=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+lat+'&longitude='+lon+'&localityLanguage=pt'); const j=await r.json(); return j.city||j.locality||''; }catch(e){ return ''; }
  }
  function start(){
    try{ const c=JSON.parse(localStorage.getItem('exa_wx')||'null'); if(c){ show(c); if(Date.now()-c.ts<30*60000) return; } }catch(e){}
    const fallback=()=>load(41.15,-8.61,'Porto');
    if(!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(async p=>{ const {latitude:la,longitude:lo}=p.coords; load(la,lo,await cityOf(la,lo)); }, fallback, {timeout:6000,maximumAge:1800000});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
  setInterval(start, 30*60000);
})();

try{ if(!localStorage.getItem('exa_checkup_reset1')){ localStorage.removeItem('exa_checkup'); localStorage.setItem('exa_checkup_reset1','1'); } }catch(e){}

document.addEventListener('click', e=>{ const t=e.target.closest('[data-cq]'); if(!t) return; const ta=$('#cond-texto'); if(ta && !t.classList.contains('on')){ ta.value=(ta.value.trim()?ta.value.trim()+'\n':'')+t.textContent; } t.classList.add('on'); });

function bcText(){ return 'Edgar Azevedo · Mediação Edgar Azevedo Seguros\nAgeas Seguros · Rede Private\n\nTelefone/WhatsApp: +351 913 042 770\nEmail: edgar.azevedo@private.ageas.pt\n\nProteção pessoal, familiar, patrimonial, profissional e empresarial. Porto e Lisboa, presencial, por telefone e digital.'; }
function bcVcf(){ return ['BEGIN:VCARD','VERSION:3.0','N:Azevedo;Edgar;;;','FN:Edgar Azevedo','ORG:Mediação Edgar Azevedo Seguros · Ageas Seguros','TITLE:Mediador de Seguros · Rede Private','TEL;TYPE=CELL:+351913042770','EMAIL;TYPE=WORK:edgar.azevedo@private.ageas.pt','URL:https://wa.me/351913042770','END:VCARD'].join('\r\n'); }
document.addEventListener('click', e=>{
  const f=e.target.closest('[data-bc-flip]'); if(f){ f.classList.toggle('flip'); return; }
  const t=e.target.closest('[data-act^="bc-"]'); if(!t) return;
  const a=t.dataset.act;
  if(a==='bc-wa') window.open('https://wa.me/?text='+encodeURIComponent(bcText()),'_blank');
  else if(a==='bc-vcf'){ const b=new Blob([bcVcf()],{type:'text/vcard'}), u=URL.createObjectURL(b), l=document.createElement('a'); l.href=u; l.download='Edgar Azevedo.vcf'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }
  else if(a==='bc-share'){
    const file = (typeof File!=='undefined') ? new File([bcVcf()],'Edgar Azevedo.vcf',{type:'text/vcard'}) : null;
    if(navigator.share){ const d={title:'Edgar Azevedo · Ageas Seguros', text:bcText()}; if(file && navigator.canShare && navigator.canShare({files:[file]})) d.files=[file]; navigator.share(d).catch(()=>{}); }
    else { try{ navigator.clipboard.writeText(bcText()); toast('Contacto copiado'); }catch(_){ } }
  }
});

(function(){
  const phone=document.querySelector('.phone'), B=document.body;
  const clear=v=>!v||v==='none'||v==='transparent'||/^rgba\(0, 0, 0, 0\)$/.test(v);
  const SPL='linear-gradient(180deg,rgba(11,11,13,.35) 0%,rgba(11,11,13,.12) 24%,rgba(11,11,13,0) 42%,rgba(11,11,13,0) 55%,rgba(11,11,13,.55) 74%,rgba(11,11,13,.88) 100%),linear-gradient(180deg,#7ea3b9 0,#91b2c4 16vh,rgba(145,178,196,0) 30vh),url(splash-estrada.avif),linear-gradient(180deg,#7ea3b9 0%,#91b2c4 100%)';
  let last='';
  function apply(key,col,img,pos,splash){
    if(key===last) return; last=key;
    B.style.setProperty('--side-bg',col);
    B.style.setProperty('--side-img',img||'none');
    B.style.setProperty('--side-pos',img?pos:'center');
    B.classList.toggle('splash-side',splash);
    B.classList.toggle('side-login',key==='login');
  }
  function sync(){
    const sc=document.querySelector('.screen.active'); if(!sc||!phone) return;
    if(sc.id==='s-splash'){ apply('splash','#91b2c4',SPL,'center top,center top,center top 16vh,center top',true); return; }
    if(sc.id==='s-login'){ apply('login','#0B0B0D','linear-gradient(180deg,rgba(11,11,13,.55) 0%,rgba(11,11,13,.05) 35%,rgba(11,11,13,.25) 62%,rgba(11,11,13,.85) 100%),url(splash-estrada.avif)','center 30%',false); return; }
    let cs=getComputedStyle(sc), col=cs.backgroundColor, img=cs.backgroundImage;
    if(clear(col)&&clear(img)){ const p=getComputedStyle(phone); col=p.backgroundColor; img=p.backgroundImage; }
    if(clear(col) && !clear(img)){ const ms=img.match(/rgb\([^)]*\)|#[0-9a-f]{3,8}/gi); col=ms&&ms.length?ms[ms.length-1]:'#fff'; }
    if(clear(col)){ const inl=sc.style.background||sc.style.backgroundColor; if(inl) col=inl; }
    col=clear(col)?'#fff':col; img=clear(img)?'':img;
    apply(sc.id+'|'+col+'|'+img,col,img,'center',false);
  }
  let pend=false; const q=()=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false; sync(); }); };
  const vp=document.querySelector('.viewport');
  if(vp) new MutationObserver(q).observe(vp,{subtree:true,attributes:true,attributeFilter:['class']});
  if(phone) new MutationObserver(q).observe(phone,{attributes:true,attributeFilter:['class']});
  window.addEventListener('load',q); q();
})();

/* ps-go-intercept: estrela cai no Entrar, depois abre o login */
document.addEventListener('click',function(e){
  const b=e.target.closest('#s-splash .ps-pill[data-nav="login"]'); if(!b) return;
  if(b.dataset.goOk){ delete b.dataset.goOk; return; }
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const sc=document.getElementById('s-splash'); if(sc.classList.contains('go')) return;
  sc.classList.add('go');
  const R=sc.getBoundingClientRect(), br=b.getBoundingClientRect();
  const tx=br.left-R.left+br.width/2, ty=br.top-R.top+br.height/2;
  const sx=R.width*0.92, sy=R.height*0.06;
  const ang=Math.atan2(ty-sy,tx-sx)*180/Math.PI;
  const st=document.createElement('div'); st.className='ps-star'; sc.appendChild(st);
  const W=150, pos=(x,y,sc_)=>'translate('+(x-W)+'px,'+(y-1)+'px) rotate('+ang+'deg) scaleX('+sc_+')';
  st.animate([{transform:pos(sx,sy,.2),opacity:0},{transform:pos(sx+(tx-sx)*.15,sy+(ty-sy)*.15,1),opacity:1,offset:.15},{transform:pos(tx,ty,.6),opacity:1,offset:.92},{transform:pos(tx,ty,0),opacity:0}],{duration:780,easing:'cubic-bezier(.5,0,.75,.4)',fill:'forwards'});
  setTimeout(()=>{ b.classList.add('hit'); },700);
  setTimeout(()=>{
    st.remove();
    const lg=document.getElementById('s-login');
    const pr=(document.querySelector('.phone')||sc).getBoundingClientRect();
    lg.style.setProperty('--rx',(br.left-pr.left+br.width/2)+'px'); lg.style.setProperty('--ry',(br.top-pr.top+br.height/2)+'px');
    lg.classList.add('lg-enter');
    b.dataset.goOk='1'; b.click();
    setTimeout(()=>{ sc.classList.remove('go'); b.classList.remove('hit'); },300);
    setTimeout(()=>lg.classList.remove('lg-enter'),1300);
  },980);
},true);

/* ps-links-motion: toque com motion em Descobrir / Check-up / Código */
document.addEventListener('click',function(e){
  const b=e.target.closest('#s-splash .ps-links button'); if(!b) return;
  if(b.dataset.goOk){ delete b.dataset.goOk; return; }
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const r=b.getBoundingClientRect(), rip=document.createElement('span'); rip.className='rip';
  rip.style.left=(e.clientX? e.clientX-r.left : r.width/2)+'px'; rip.style.top=(e.clientY? e.clientY-r.top : r.height/2)+'px';
  b.appendChild(rip); b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap');
  setTimeout(()=>{ rip.remove(); b.classList.remove('tap'); },600);
  setTimeout(()=>{
    if(b.dataset.nav==='onb1'){ const o=document.getElementById('s-onb1'); if(o){ o.classList.add('ob-enter'); setTimeout(()=>o.classList.remove('ob-enter'),900); } }
    b.dataset.goOk='1'; b.click();
  },260);
},true);
