/* ===== EXA SEGUROS — APP LOGIC ===== */
(function(){
'use strict';

/* ---------- STATE ---------- */
const LS = 'exa_app_state_v1';

function seedPolicies(){
  return {
    particular: [
      { id:p(), color:'coral',  ramo:'Auto',     nome:'Protec Ligeiros', num:'AU67521313', premio:'476,89€', per:'ano', extra:{Matrícula:'AA-33-43', Veículo:'Renault Clio · 2022'}, irs:false },
      { id:p(), color:'indigo', ramo:'Saúde',    nome:'Saúde Família',   num:'SA91234567', premio:'312,00€', per:'ano', extra:{Cobertura:'Completa'}, irs:true },
      { id:p(), color:'plum',   ramo:'Vida',     nome:'Viva Plus',       num:'VI55678900', premio:'189,60€', per:'ano', extra:{Capital:'150.000€'}, irs:true },
      { id:p(), color:'emerald',ramo:'Casa',     nome:'Casa Segura',     num:'HA33219876', premio:'228,50€', per:'ano', extra:{Morada:'R. da Paz, 12'}, irs:false },
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
  account: { firstName:'José', lastName:'Costa', nif:'123 456 789', email:'jose.costa@email.pt', password:'12345678', birthdate:'1985-07-12', gender:'M', phone:'+351 912 345 678', address:'R. da Paz, 12, Lisboa', photo:null, since:2018 },
  loggedIn:false,
  policies: seedPolicies(),
  empresaLoaded:false,
  notifications:{ updates:true, renovacao:true, pagamentos:true, novidades:false, mensagens:true, faceId:true },
  points:30,
  invites:[
    { name:'Maria Antunes', ramo:'Seguro de Vida', date:'14 Mai', status:'done', pts:30 },
    { name:'Carlos Silva',  ramo:'Convite enviado', date:'22 Mai', status:'pending', pts:0 },
    { name:'Ana Ferreira',  ramo:'Convite enviado', date:'28 Mai', status:'pending', pts:0 },
  ],
  prizeStore:'pingo',
};

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
  onEnter(id);
}
function showScreen(id, isBack){
  $$('.screen').forEach(s => { s.classList.remove('active','back'); });
  const el = document.getElementById('s-'+id);
  if(el){ el.classList.add('active'); el.scrollTop = 0; }
  // status bar theme
  const sb = $('#statusbar');
  if(sb) sb.classList.toggle('dark', id==='admin' || id==='bday');
  const ph = document.querySelector('.phone');
  if(ph) ph.classList.toggle('home-bg', id==='home');
}
function back(){ if(stack.length>1) nav(stack[stack.length-2], {back:true}); }

function onEnter(id){
  if(id==='home'){ renderWallet(); updateGreeting(); maybeBirthday(); }
  if(id==='profile'){ renderProfile(); }
  if(id==='montra'){ renderMontra(); }
  if(id==='detail'){ renderDetail(); }
  if(id==='admin'){ /* static */ }
}

/* ---------- HELPERS ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function initials(){ return (S.account.firstName[0]||'')+(S.account.lastName[0]||''); }
function title(){ return S.account.gender==='F' ? 'Sra.' : 'Sr.'; }
function guessGender(firstName){
  const f = (firstName||'').trim().toLowerCase();
  const excM = ['luca','joshua','elias','andré','isaías'];
  if(excM.includes(f)) return 'M';
  return /[aã]$/.test(f) ? 'F' : 'M';
}
const DAYS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CHIP_MAP = {
  'Auto':       { cls:'auto',  hex:'#E50914', html:'🚗' },
  'Frota':      { cls:'auto',  hex:'#E50914', html:'🚗' },
  'Saúde':      { cls:'saude', hex:'#1E90FF', html:'<span style="color:#fff;font-weight:800;font-size:20px;line-height:1;font-family:var(--sans);">+</span>' },
  'Saúde PME':  { cls:'saude', hex:'#1E90FF', html:'<span style="color:#fff;font-weight:800;font-size:20px;line-height:1;font-family:var(--sans);">+</span>' },
  'Vida':       { cls:'vida',  hex:'#7A2AA0', html:'❤️' },
  'RC':         { cls:'vida',  hex:'#7A2AA0', html:'❤️' },
  'Acidentes':  { cls:'vida',  hex:'#7A2AA0', html:'❤️' },
  'Casa':       { cls:'casa',  hex:'#1DB954', html:'🏠' },
  'Habitação':  { cls:'casa',  hex:'#1DB954', html:'🏠' },
  'Património': { cls:'casa',  hex:'#1DB954', html:'🏠' },
};

function toast(msg){
  const t = $('#toast'); if(!t) return;
  $('#toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=> t.classList.remove('show'), 2400);
}

/* ---------- NOTIFICATIONS (renewals) ---------- */
function renderNotifs(){
  const list = $('#notifs-list'); if(!list) return;
  const arr = (S.policies[walletTab]||[]).slice();
  // compute days until renewal (renov is dd/mm/yyyy or yyyy-mm-dd)
  const today = new Date(); today.setHours(0,0,0,0);
  const items = arr.map(p=>{
    const d = parseAnyDate(p.renov || p.extra && p.extra['Renovação']);
    if(!d) return null;
    const days = Math.round((d - today) / 86400000);
    return { p, d, days };
  }).filter(Boolean).sort((a,b)=>a.days-b.days);

  list.innerHTML = items.length ? items.map((it,idx)=>{
    const p = it.p;
    const urgent = it.days<=30 && it.days>=0;
    const past = it.days<0;
    const cancelled = /cancel|anula/i.test(p.situacao||'');
    const label = past ? Math.abs(it.days)+' dias atrás' : (it.days===0 ? 'hoje' : 'em '+it.days+' dias');
    const color = past ? '#B94A3B' : (urgent ? 'var(--accent)' : 'var(--ink-2)');
    const chip = CHIP_MAP[p.ramo];
    const iconBg = chip ? chip.hex : ('var(--'+(p.color==='coral'?'accent':p.color)+')');
    const iconHtml = chip ? chip.html : (p.ramo?p.ramo[0]:'•');
    return '<div style="padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff;">'
      +'<div style="display:flex;align-items:center;gap:12px;">'
      +'<div style="width:36px;height:36px;border-radius:10px;background:'+iconBg+';flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--display);font-weight:700;font-size:16px;">'+iconHtml+'</div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="display:flex;align-items:center;gap:6px;"><div style="font-family:var(--display);font-size:14px;font-weight:600;color:var(--ink);line-height:1.25;">'+esc(p.nome||p.ramo)+'</div>'+(cancelled?'<span style="font-family:var(--mono);font-size:9px;letter-spacing:0.05em;text-transform:uppercase;color:#B94A3B;background:rgba(185,74,59,0.1);padding:2px 6px;border-radius:6px;">Anulada</span>':'')+'</div>'
      +'<div style="font-family:var(--mono);font-size:10px;color:var(--ink-2);letter-spacing:0.05em;margin-top:2px;">Renova '+fmtDateShort(it.d)+' · <span style="color:'+color+';font-weight:600;">'+label+'</span></div>'
      +'</div>'
      +'</div>'
      +(cancelled ? '<div style="margin-top:10px;"><textarea id="mot-'+idx+'" rows="2" placeholder="Motivo da anulação (opcional)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#F4F1EA;font-family:var(--sans);font-size:12px;color:var(--ink);resize:vertical;"></textarea><button type="button" data-act="motivo-send" data-idx="'+idx+'" style="margin-top:6px;padding:7px 12px;border-radius:8px;background:var(--ink);color:#fff;border:none;font-family:var(--mono);font-size:10px;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;">Enviar motivo ao mediador</button></div>' : '')
      +'</div>';
  }).join('') : '<div class="body-s" style="text-align:center;padding:24px;">Sem renovações próximas.</div>';
  window.__notifItems = items;

  // badge count = renewals within 60 days
  const soon = items.filter(it=>it.days>=0 && it.days<=60).length;
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
  const g = h<12 ? 'Bom dia ☀️' : h<19 ? 'Boa tarde ☕' : 'Boa noite 🌙';
  setText('#greet-label', g);
  if(walletTab==='empresa' && S.empresaClient && S.empresaClient.nome){
    setText('#greet-name', S.empresaClient.nome);
  } else {
    setText('#greet-name', title()+' '+S.account.firstName);
  }
  const day = DAYS[new Date().getDay()];
  const dayIdx = new Date().getDay();
  const masc = (dayIdx===0 || dayIdx===6);
  const foot = $('#weekday-greeting');
  const footName = (walletTab==='empresa' && S.empresaClient && S.empresaClient.nome) ? S.empresaClient.nome : (title()+' '+S.account.firstName);
  if(foot) foot.innerHTML = footName+', desejamos-lhe '+(masc?'um <b style="color:var(--ink);font-weight:600;">bom '+day+'</b>':'uma <b style="color:var(--ink);font-weight:600;">boa '+day+'</b>')+'.';
}
function setText(sel,val){ const el=$(sel); if(el) el.textContent=val; }

/* ---------- AUTH ---------- */
async function doLogin(){
  const idVal = $('#login-email').value.trim();
  const pass = $('#login-pass').value;
  const errEl = $('#login-err');
  if(!idVal || !pass){ errEl.textContent='Preencha o NIF e a palavra-passe.'; return; }
  errEl.textContent='A verificar…';
  if(window.EXASupabase){
    const res = await window.EXASupabase.login(idVal, pass);
    if(res.ok){
      const c = res.cliente;
      const parts = (c.nome||'').trim().split(' ');
      if(parts[0]){ S.account.firstName = parts[0]; S.account.lastName = parts.slice(1).join(' '); }
      S.account.nif = c.nif || S.account.nif;
      S.account.email = c.email || S.account.email;
      if(c.genero) S.account.gender = c.genero;
      else S.account.gender = guessGender(parts[0]);
      if(c.telefone) S.account.phone = c.telefone;
      if(c.data_nascimento) S.account.birthdate = c.data_nascimento;
      if(c.morada) S.account.address = c.morada;
      S.policies.particular = res.apolices;
      S.policies.empresa = [];
      S.empresaLoaded = false;
      errEl.textContent='';
      S.loggedIn = true; save();
      nav('home', {replace:true});
      stack = ['home'];
      return;
    }
  }
  if(idVal.toLowerCase() === S.account.email.toLowerCase() && pass === S.account.password){
    errEl.textContent='';
    S.loggedIn = true; save();
    nav('home', {replace:true});
    stack = ['home'];
    return;
  }
  errEl.textContent='Credenciais inválidas.';
}
function doRegister(){
  const fn = $('#reg-nome').value.trim();
  const nif = $('#reg-nif').value.trim();
  const email = $('#reg-email').value.trim();
  const bd = $('#reg-bd').value;
  const pass = $('#reg-pass').value;
  const pass2 = $('#reg-pass2').value;
  const errEl = $('#reg-err');
  if(!fn || !nif || !email || !pass){ errEl.textContent='Preencha todos os campos.'; return; }
  if(pass.length<8){ errEl.textContent='A palavra-passe deve ter pelo menos 8 caracteres.'; return; }
  if(pass!==pass2){ errEl.textContent='As palavras-passe não coincidem.'; return; }
  errEl.textContent='';
  const parts = fn.split(' ');
  S.account.firstName = parts[0];
  S.account.lastName = parts.slice(1).join(' ') || '';
  S.account.nif = nif;
  S.account.email = email;
  S.account.birthdate = bd || S.account.birthdate;
  S.account.password = pass;
  S.account.since = new Date().getFullYear();
  // gender from selector, fallback to name heuristic
  const gEl = document.querySelector('[data-group="reg-gender"] .b.on');
  if(gEl && gEl.dataset.pick){
    S.account.gender = gEl.dataset.pick;
  } else {
    const first = (S.account.firstName || '').toLowerCase();
    S.account.gender = /[aã]$/.test(first) ? 'F' : 'M';
  }
  S.loggedIn = true; save();
  nav('home', {replace:true});
  stack = ['home'];
}
function logout(){
  S.loggedIn=false; save();
  stack=['splash']; nav('splash',{replace:true});
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
  const res = await window.EXASupabase.loginEmpresa(nif, email);
  if(!res.ok){ errEl.textContent=res.error; return; }
  const nome = (res.cliente && res.cliente.nome) || 'Empresa';
  const subject = encodeURIComponent('Confirmar acesso Empresa — '+nome+' (NIF '+nif+')');
  const body = encodeURIComponent('Pedido de acesso à área Empresa.\nEmpresa: '+nome+'\nNIF: '+nif+'\nEmail indicado: '+email);
  window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
  empresaPending = { nif:nif, nome:nome, apolices:res.apolices };
  errEl.textContent='';
  $('#emp-step1').style.display='none';
  $('#emp-step2').style.display='block';
  $('#emp-code-msg').textContent='O seu agente vai fornecer-lhe um código de acesso.';
}
function doEmpresaCodeVerify(){
  const code = ($('#emp-code').value||'').trim();
  const errEl = $('#emp-code-err');
  if(!empresaPending){ errEl.textContent='Confirme primeiro os dados.'; return; }
  if(code !== '1917'){ errEl.textContent='Código inválido.'; return; }
  S.policies.empresa = empresaPending.apolices;
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
      const m = CHIP_MAP[p.ramo];
      if(!m) return;
      const k = m.cls;
      if(seen[k]) return;
      seen[k] = true;
      chipsHTML += '<div class="wgt-chip '+k+'" title="'+esc(p.ramo)+'">'+m.html+'</div>';
    });
    chipsWrap.innerHTML = chipsHTML;
  }
  // Animated year bars — daily savings per year
  const barsWrap = document.getElementById('wgt-bars');
  if(barsWrap){
    const now = new Date();
    const monthLabel = MONTHS[now.getMonth()]+' '+now.getFullYear();
    barsWrap.innerHTML = '<div class="wgt-month-now"><div class="month">'+monthLabel+'</div><span class="dot"></span></div>';
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
  stackEl.innerHTML = html;
  renderNotifs();
}
function policyCardHTML(pl){
  return '<div class="pol '+pl.color+'" data-policy="'+pl.id+'" data-tab="'+walletTab+'">'+
    '<span class="glyph"></span>'+
    '<div class="top"><div>'+
      '<div class="lbl" style="color:rgba(255,255,255,0.75);">'+esc(pl.ramo)+'</div>'+
      '<div class="ttl">'+esc(pl.nome)+'</div>'+
    '</div><div class="meta" style="text-align:right;">'+esc(pl.num)+(pl.irs?'<div style="margin-top:2px;opacity:0.8;">Beneficio Fiscal</div>':'')+'</div></div>'+
    '<div class="row"><div class="price">'+esc(pl.premio)+'<small>/'+esc(pl.per)+'</small></div>'+
    '<div class="stat"><span class="d"></span>Activa</div></div>'+
  '</div>';
}

/* ---------- ADD POLICY + CATALOG ---------- */
const AGEAS_CATALOG = [
  // ── PARTICULAR ──
  { sec:'Automóvel', color:'coral', ramo:'Auto', audience:'particular', items:['Protec Ligeiros','Protec Duas Rodas','Seguro por Dias'] },
  { sec:'Saúde', color:'indigo', ramo:'Saúde', audience:'particular', items:['Saúde Família','Saúde Senior','Médis Dental','Médis Light'] },
  { sec:'Casa', color:'emerald', ramo:'Casa', audience:'particular', items:['Casa Segura','Alojamento Local','Obras de Arte','RC Familiar'] },
  { sec:'Vida', color:'plum', ramo:'Vida', audience:'particular', items:['Ritmo Vida Família','Viva Plus','Solução Jovem','Multiplic Protecção+'] },
  { sec:'Viagem & Lazer', color:'amber', ramo:'Viagem', audience:'particular', items:['Viagem Segura','Bombordo','Pétis','Embarcações de Recreio'] },
  { sec:'Acidentes & Trabalho', color:'ink', ramo:'Acidentes', audience:'particular', items:['AP Individual','AT Conta Própria','Empregados Domésticos'] },
  { sec:'Poupança & Investimento', color:'emerald', ramo:'Poupança', audience:'particular', items:['Maximus Poupança','PPR+ 1.ª Série','PPR+ 2.ª Série','Rendimento Flexível','Invest Flex'] },
  // ── EMPRESA ──
  { sec:'Frota Automóvel', color:'coral', ramo:'Frota', audience:'empresa', items:['Protec Frota'] },
  { sec:'Saúde Colaboradores', color:'indigo', ramo:'Saúde PME', audience:'empresa', items:['Saúde PME','Empresa Viva','AP Colectivo','Médis Empresas'] },
  { sec:'Responsabilidade Civil', color:'plum', ramo:'RC', audience:'empresa', items:['RC Geral','Ecosfera Ambiental','D&O','Cyber Risks'] },
  { sec:'Património Empresa', color:'emerald', ramo:'Multirriscos', audience:'empresa', items:['Multirriscos Indústria','Avaria de Máquinas','Bens em Leasing'] },
];
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
  const notifOn = S.notifications.pagamentos;
  let calc = fi.n===1
    ? 'Pagamento <b>anual</b> de <b>'+fmtEuro(total)+'</b>.'
    : '<b>'+fi.n+'×</b> de '+approx+'<b>'+inst+'</b> = '+fmtEuro(total)+'/ano.';
  note.innerHTML = (notifOn?'🔔 ':'🔕 ')+calc+'<br>'+
    (notifOn ? 'Será <b>notificado</b> antes de cada débito.' : 'Active <b>Notificações · Pagamentos</b> no perfil para ser avisado.');
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
  hero.className = 'pol '+pl.color;
  setText('#detail-ramo', pl.ramo);
  $('#detail-title').innerHTML = '<em style="font-style:italic;font-weight:500;">'+esc(pl.nome.split(' ')[0])+'</em>'+(pl.nome.split(' ').slice(1).length?'<br>'+esc(pl.nome.split(' ').slice(1).join(' '))+'.':'.');
  setText('#detail-num', pl.num);
  setText('#detail-premio', pl.premio);
  setText('#detail-premio-per', '/'+pl.per);
  // kv
  const kv = $('#detail-kv');
  let rows = [['Tomador', S.account.firstName+' '+S.account.lastName],['NIF', S.account.nif]];
  Object.keys(pl.extra||{}).forEach(k=> rows.push([k, pl.extra[k]]));
  rows.push(['Mediador','Edgar Azevedo']);
  rows.push(['Seguradora','Ageas Seguros']);
  kv.innerHTML = rows.map(r=>'<div class="kv"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(r[1])+'</span></div>').join('');
  // colour the "Participar sinistro" button to match the policy card
  const btn = $('#detail-btn-sinistro');
  if(btn){
    btn.className = 'btn tone-'+pl.color;
  }
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
  if(id==='sh-sinistro') buildSinistroPolicies();
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
function closeSheet(id){ const el=document.getElementById(id); if(el) el.classList.remove('open'); }
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

/* ---------- PROFILE ---------- */
function renderProfile(){
  setText('#prof-name', S.account.firstName+' '+S.account.lastName);
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
  setToggle('renovacao', S.notifications.renovacao);
  setToggle('pagamentos', S.notifications.pagamentos);
  setToggle('novidades', S.notifications.novidades);
  setToggle('mensagens', S.notifications.mensagens);
  setToggle('faceId', S.notifications.faceId);
}
function setToggle(key, on){ const el=$('[data-toggle="'+key+'"]'); if(el) el.dataset.on = on?'1':'0'; }
function toggleNotif(el){
  const key = el.dataset.toggle;
  if(key==='updates') return; // locked
  el.dataset.on = el.dataset.on==='1'?'0':'1';
  S.notifications[key] = el.dataset.on==='1'; save();
}
function fmtDate(iso){
  const d = new Date(iso+'T00:00:00'); if(isNaN(d)) return iso;
  return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();
}

/* ---------- MONTRA / POINTS (derived from shared referral store) ---------- */
function meName(){ return (S.account.firstName+' '+S.account.lastName).trim(); }
function refData(){ return window.EXAStore.load(); }
function myReferrals(){ return refData().referrals.filter(r=>r.referrer===meName()); }
function myRedemptions(){ return refData().redemptions.filter(r=>r.client===meName()); }
function pointsEarned(){ return myReferrals().filter(r=>r.status==='confirmed').reduce((s,r)=>s+(r.points||0),0); }
function pointsBalance(){ return pointsEarned() - myRedemptions().length*50; }

function renderMontra(){
  const pts = pointsBalance();
  setText('#montra-points', pts);
  const need = Math.max(0,50-pts);
  const bar = $('#montra-bar'); if(bar) bar.style.width = Math.min(100,(pts/50)*100)+'%';
  setText('#montra-need', need>0 ? ('Faltam '+need+' pontos para o cartão de 50€') : 'Já pode resgatar o cartão de 50€!');
  // history
  const h = $('#montra-history');
  const list = myReferrals();
  if(h) h.innerHTML = list.length ? list.map(inv=>(
    '<div class="li" style="cursor:default;"><div><div class="nm" style="font-size:13px;">'+esc(inv.friend)+'</div>'+
    '<div class="ds">'+(inv.status==='confirmed'? esc(inv.product||'Aderiu') : 'Convite enviado')+' · '+esc(inv.date)+'</div></div>'+
    (inv.status==='confirmed'
      ? '<span class="chip em" style="padding:3px 10px;font-size:10px;">+'+inv.points+' pts</span>'
      : '<span class="chip am" style="padding:3px 10px;font-size:10px;">Pendente</span>')+
    '</div>'
  )).join('') : '<div class="li" style="cursor:default;"><div class="ds" style="font-size:12px;">Ainda não tem convites. Partilhe o seu link!</div></div>';
  // redeem button
  const btn = $('#montra-redeem');
  if(btn){
    if(pts>=50){ btn.removeAttribute('disabled'); btn.querySelector('span').textContent='Resgatar cartão de 50€'; }
    else { btn.setAttribute('disabled','true'); btn.querySelector('span').textContent='Resgatar aos 50 pts'; }
  }
}
function redeem(){
  if(pointsBalance()<50){ toast('Precisa de 50 pontos para resgatar'); return; }
  const stores={pingo:'Pingo Doce',continente:'Continente',lidl:'Lidl'};
  const data = refData();
  data.redemptions.push({ id:window.EXAStore.rid(), client:meName(), nif:S.account.nif, store:stores[S.prizeStore], value:50, address:S.account.address||'Morada registada', status:'pedido', date:fmtShort(new Date()), notifiedTo:'edgar.azevedo@private.ageas.pt' });
  window.EXAStore.save(data);
  renderMontra();
  closeSheet('sh-convite');
  toast('Resgate pedido · notificámos o gestor por email');
}
function fmtShort(d){ return d.getDate()+' '+MONTHS[d.getMonth()].slice(0,3); }
function inviteLink(){
  const a = S.account;
  return 'exaseguros.pt/convite?nome='+encodeURIComponent(a.firstName)+'&apelido='+encodeURIComponent(a.lastName)+'&tel='+encodeURIComponent((a.phone||'').replace(/\s|\+351/g,''));
}
function copyInvite(){
  const link = inviteLink();
  if(navigator.clipboard) navigator.clipboard.writeText(link).catch(()=>{});
  toast('Link copiado para a área de transferência');
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
  $('#bday-text').innerHTML = 'Feliz aniversário, '+title()+' '+esc(S.account.firstName)+' 🎂 Desejamos-lhe um dia cheio de saúde, paz e alegria.';
  b.classList.add('show');
  sessionStorage.setItem('exa_bday_seen','1');
  setTimeout(()=> b.classList.remove('show'), 6000);
}
function demoBirthday(){ sessionStorage.removeItem('exa_bday_seen'); showBirthday(); }

/* ---------- RESET ---------- */
function resetApp(){ localStorage.removeItem(LS); S = load(); stack=['splash']; nav('splash',{replace:true}); toast('App reposta'); }

/* ---------- GLOBAL CLICK DELEGATION ---------- */
document.addEventListener('click', function(e){
  // tabbar pill visual switch (ignores if item has data-nav/data-sheet — those navigate elsewhere)
  const tab = e.target.closest('.tabbar .t');
  if(tab){
    const bar = tab.parentElement;
    bar.querySelectorAll('.t').forEach(x=>x.classList.remove('on'));
    tab.classList.add('on');
  }
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
    withLoading(btn, 650, function(){ runAct(a); });
    return;
  }
  runAct(a);
});

function runAct(a){
  if(a==='login') doLogin();
  else if(a==='register') doRegister();
  else if(a==='logout') logout();
  else if(a==='add-policy') openSheet('sh-add');
  else if(a==='add-confirm') addPolicy();
  else if(a==='del-policy') deletePolicy();
  else if(a==='empresa-login-submit') doEmpresaConfirm();
  else if(a==='empresa-code-verify') doEmpresaCodeVerify();
  else if(a==='redeem') redeem();
  else if(a==='copy-invite') copyInvite();
  else if(a==='demo-bday') demoBirthday();
  else if(a==='reset') resetApp();
  else if(a==='sinistro-send') sinistroSend();
  else if(a==='simular-send') simularSend();
  else if(a==='transferir-send') transferSend();
}

// segmented & special groups via direct handlers (set in HTML through data attrs)
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
document.addEventListener('click', function(e){
  if(e.target.classList.contains('sheet-wrap')) e.target.classList.remove('open');
});

/* ---------- MOTION HELPERS ---------- */
// ripple on any .btn
document.addEventListener('pointerdown', function(e){
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

/* ---------- INIT ---------- */
function init(){
  buildCatalog();
  // dynamic onboarding nav handled by data-nav
  // if already logged in, skip to home
  if(S.loggedIn){ stack=['home']; showScreen('home'); onEnter('home'); }
  else { showScreen('splash'); }
}
document.addEventListener('DOMContentLoaded', init);

// expose for inline & debugging
window.EXA = { nav, back, S:()=>S, reset:resetApp };
})();
