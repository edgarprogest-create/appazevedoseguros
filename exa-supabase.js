/* ===== EXA — SUPABASE BRIDGE =====
   Connects the app to real client/apólice data in Supabase.
   Falls back silently if the library or credentials aren't available. */
(function(){
  'use strict';
  var URL = 'https://hbyavmpefqlwaoileduc.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieWF2bXBlZnFsd2FvaWxlZHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDQzMzcsImV4cCI6MjA5MzU4MDMzN30.0WuU_hSWus--my4WyU1tGlCPgO3qCYLafB1QfOq42P8';
  var sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(URL, ANON) : null;

  var RAMO_COLOR = { 'Auto':'coral','Frota':'coral','Saúde':'indigo','Saúde PME':'indigo','Vida':'plum','RC':'plum','Casa':'emerald','Multirriscos':'emerald','Património':'emerald','Viagem':'amber','Acidentes':'ink','Poupança':'emerald' };
  var IRS_RAMOS = ['Vida','Saúde'];

  function fmtEuroLocal(n){ return n.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+'€'; }

  function colorForRamo(ramo){
    if(RAMO_COLOR[ramo]) return RAMO_COLOR[ramo];
    var r = ramo||'';
    if(/vida/i.test(r)) return 'plum';
    if(/sa[uú]de/i.test(r)) return 'indigo';
    if(/auto|frota/i.test(r)) return 'coral';
    if(/casa|multirriscos|patrim[oó]nio/i.test(r)) return 'emerald';
    if(/viagem/i.test(r)) return 'amber';
    return 'ink';
  }
  function irsForRamo(ramo){ return /vida|sa[uú]de/i.test(ramo||''); }
  function activeOnly(row){ return !/cancel|anula/i.test(row.situacao||''); }

  function listFrom(v){
    if(!v) return [];
    if(Array.isArray(v)) return v.map(String);
    return String(v).split(/[,;|]/).map(x=>x.trim()).filter(Boolean);
  }
  function extraFrom(row){
    var e = {};
    if(row.matricula) e['Matrícula'] = row.matricula;
    if(row.veiculo) e['Veículo'] = row.veiculo;
    if(row.morada_risco || row.morada) e['Morada'] = row.morada_risco || row.morada;
    if(row.capital!=null) e['Capital'] = fmtEuroLocal(Number(row.capital));
    if(row.pessoa_segura) e['Pessoa segura'] = row.pessoa_segura;
    if(row.cobertura) e['Cobertura'] = row.cobertura;
    if(row.extra && typeof row.extra==='object') Object.assign(e, row.extra);
    return e;
  }
  function mapApolice(row){
    var ramo = row.ramo || '';
    return {
      id: row.id,
      color: (row.protocolo || row.ordem || /profissional/i.test((row.produto||'')+' '+ramo)) ? 'pro' : colorForRamo(ramo),
      ordem: (row.protocolo || row.ordem) ? String(row.protocolo || row.ordem) : null,
      ramo: ramo,
      nome: row.produto || row.sub_ramo || ramo,
      num: row.numero_apolice || '',
      premio: row.premio_comercial!=null ? fmtEuroLocal(Number(row.premio_comercial)) : '—',
      per: 'ano',
      extra: extraFrom(row),
      coberturas: listFrom(row.coberturas),
      capital: row.capital!=null ? Number(row.capital) : null,
      irs: irsForRamo(ramo),
      situacao: row.situacao || '',
      frac: (row.fracionamento||'anual').toLowerCase(),
      inicio: row.data_inicio || '',
      opcao: row.opcao || row.plano || '',
      renov: row.data_vencimento || '',
      installment: '',
      notify: true
    };
  }

  async function login(nifRaw, password){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var emails = [];
    var er = await sb.rpc('email_do_nif', { p_nif: nif });
    if(!er.error && er.data) emails.push(er.data);
    emails.push(nif+'@exaseguros.local');
    var authed = null, lastErr = null;
    for(var i=0;i<emails.length;i++){
      var r = await sb.auth.signInWithPassword({ email: emails[i], password: password });
      if(!r.error){ authed = r; break; }
      lastErr = r.error;
    }
    if(!authed) return { ok:false, error:'Credenciais inválidas.' };
    return await carregarCliente(nif);
  }

  async function restaurarSessao(){
    if(!sb) return { ok:false };
    var s = await sb.auth.getSession();
    if(!s.data || !s.data.session) return { ok:false };
    return await carregarCliente();
  }

  async function renovacoes(dias){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var res = await sb.rpc('renovacoes_proximas', { p_dias: dias || 8 });
    if(res.error) return { ok:false, error:'Não foi possível carregar as renovações.' };
    return { ok:true, rows: res.data || [] };
  }
  async function carregarCliente(nif){
    var uRes = await sb.auth.getUser();
    var uid = uRes.data && uRes.data.user && uRes.data.user.id;
    var cRes = await sb.from('clientes').select('*').eq('auth_id', uid).limit(1);
    if(cRes.error || !cRes.data || !cRes.data.length) return { ok:false, error:'Cliente não encontrado.' };
    var cliente = cRes.data[0];
    var aRes = await sb.from('apolices').select('*').eq('nif_cliente', cliente.nif);
    var apolices = (aRes.data||[]).filter(activeOnly).map(mapApolice);
    var protocolo = null;
    if(cliente.protocolo){
      var pdb = null;
      try{ var pr = await sb.from('protocolos').select('*').eq('codigo', String(cliente.protocolo).toLowerCase()).maybeSingle(); if(!pr.error) pdb = pr.data; }catch(e){}
      protocolo = window.exaProtocolo ? window.exaProtocolo(cliente.protocolo, pdb) : null;
      if(protocolo) apolices.forEach(function(a){ if(a.ordem || (protocolo.produto && String(a.nome||'').toLowerCase()===String(protocolo.produto).toLowerCase())){ a.ordem = protocolo.codigo; a.color = 'pro'; } });
    }
    return { ok:true, cliente:cliente, apolices:apolices, protocolo:protocolo };
  }

  async function loginEmpresa(nifRaw, email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var rpcRes = await sb.rpc('empresa_login', { p_nif: nif, p_email: email });
    if(rpcRes.error || !rpcRes.data || !rpcRes.data.length) return { ok:false, error:'Empresa não encontrada ou email não corresponde.' };
    var row = rpcRes.data[0];
    var apolices = (row.apolices||[]).filter(activeOnly).map(mapApolice);
    return { ok:true, cliente:{ nif:row.nif, nome:row.nome }, apolices:apolices };
  }

  async function requestEmpresaOtp(nifRaw, email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var cRes = await sb.from('clientes').select('*').eq('nif', nif).maybeSingle();
    if(cRes.error || !cRes.data) return { ok:false, error:'Empresa não encontrada.' };
    var cliente = cRes.data;
    if((cliente.email||'').trim().toLowerCase() !== String(email).trim().toLowerCase()){
      return { ok:false, error:'Email não corresponde ao NIF indicado.' };
    }
    var otpRes = await sb.auth.signInWithOtp({ email: email, options:{ shouldCreateUser:true } });
    if(otpRes.error) return { ok:false, error:'Não foi possível enviar o código.' };
    return { ok:true };
  }

  async function verifyEmpresaOtp(nifRaw, email, token){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var verifyRes = await sb.auth.verifyOtp({ email: email, token: token, type:'email' });
    if(verifyRes.error) return { ok:false, error:'Código inválido ou expirado.' };
    var cRes = await sb.from('clientes').select('*').eq('nif', nif).maybeSingle();
    if(cRes.error || !cRes.data) return { ok:false, error:'Empresa não encontrada.' };
    var cliente = cRes.data;
    var aRes = await sb.from('apolices').select('*').eq('nif_cliente', nif);
    var apolices = (aRes.data||[]).map(mapApolice);
    return { ok:true, cliente:cliente, apolices:apolices };
  }

  async function verificarRegisto(nifRaw, digitos){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var d = String(digitos).replace(/\D/g,'');
    var res = await sb.rpc('verificar_registo', { p_nif: nif, p_digitos: d });
    if(res.error) return { ok:false, error:'Não foi possível validar. Tente novamente.' };
    if(!res.data || !res.data.length) return { ok:false, notFound:true, error:'Não encontrámos estes dados.' };
    var row = res.data[0];
    if(!row.valido) return { ok:false, error:'Os dígitos da apólice não correspondem a este NIF.' };
    return { ok:true, nome:row.nome, email:row.email, nif:nif };
  }

  async function criarConta(nifRaw, password, email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var authEmail = (email && email.indexOf('@')>0) ? email : (nif+'@exaseguros.local');
    var up = await sb.auth.signUp({ email: authEmail, password: password });
    if(up.error){
      if(/already/i.test(up.error.message||'')) return { ok:false, error:'Já existe uma conta com este email ou NIF. Faça login.' };
      return { ok:false, error:'Não foi possível criar a conta.' };
    }
    var uid = up.data && up.data.user && up.data.user.id;
    if(!uid) return { ok:false, error:'Não foi possível criar a conta.' };
    var link = await sb.rpc('ligar_auth', { p_nif: nif, p_auth_id: uid, p_email: email||null });
    if(link.error) return { ok:false, error:'Conta criada, mas não ficou associada. Contacte o seu mediador.' };
    return { ok:true };
  }

  async function recuperarPassword(nifRaw){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var res = await sb.rpc('email_do_nif', { p_nif: nif });
    if(res.error) return { ok:false, error:'NIF não encontrado.' };
    var email = res.data;
    if(!email) return { ok:false, error:'Não temos email registado. Contacte o seu mediador.' };
    var r = await sb.auth.resetPasswordForEmail(email);
    if(r.error) return { ok:false, error:'Não foi possível enviar o email.' };
    return { ok:true, email:email };
  }

  async function meuCodigo(nif){
    if(!sb) return null;
    var r = await sb.rpc('gerar_codigo_convite', { p_nif: String(nif).replace(/\D/g,'') });
    return r.error ? null : r.data;
  }

  async function donoDoCodigo(codigo){
    if(!sb) return null;
    var r = await sb.rpc('dono_do_codigo', { p_codigo: codigo });
    if(r.error || !r.data || !r.data.length) return null;
    return r.data[0];
  }

  async function criarConvidado(nif, nome, email, codigo, password){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var n = String(nif).replace(/\D/g,'');
    var authEmail = (email && email.indexOf('@')>0) ? email : (n+'@exaseguros.local');
    var up = await sb.auth.signUp({ email: authEmail, password: password });
    if(up.error){
      if(/already/i.test(up.error.message||'')) return { ok:false, error:'Já existe uma conta com este NIF. Faça login.' };
      return { ok:false, error:'Não foi possível criar a conta.' };
    }
    var uid = up.data && up.data.user && up.data.user.id;
    if(!uid) return { ok:false, error:'Não foi possível criar a conta.' };
    var r = await sb.rpc('criar_convidado', { p_nif:n, p_nome:nome, p_email:email||null, p_codigo:codigo||null, p_auth_id:uid });
    if(r.error) return { ok:false, error:'Conta criada, mas não ficou associada. Contacte o mediador.' };
    var row = (r.data && r.data.length) ? r.data[0] : {};
    return { ok:true, jaCliente: row.motivo === 'ja_cliente' };
  }

  async function convitesDoCliente(nif){
    if(!sb) return { ok:false, rows:[] };
    var r = await sb.rpc('convites_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error) return { ok:false, rows:[] };
    return { ok:true, rows: r.data || [] };
  }

  async function pontosDoCliente(nif){
    if(!sb) return null;
    var r = await sb.rpc('pontos_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error || !r.data || !r.data.length) return null;
    return r.data[0];
  }

  async function convitesTodos(){
    if(!sb) return { ok:false, rows:[] };
    var r = await sb.rpc('convites_todos');
    if(r.error) return { ok:false, rows:[] };
    return { ok:true, rows: r.data || [] };
  }

  async function registarResgate(nif, loja, morada){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var r = await sb.rpc('registar_resgate', { p_nif:String(nif).replace(/\D/g,''), p_loja:loja, p_morada:morada });
    if(r.error) return { ok:false, error:'Não foi possível registar o resgate.' };
    var row = (r.data && r.data.length) ? r.data[0] : {};
    if(!row.ok) return { ok:false, error:'Pontos insuficientes.' };
    return { ok:true };
  }

  async function investimentoDoCliente(nif){
    if(!sb) return null;
    var r = await sb.rpc('investimento_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error || !r.data || !r.data.length) return null;
    return r.data[0];
  }

  async function investimentosDoCliente(nif){
    if(!sb) return [];
    var r = await sb.rpc('investimento_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error || !r.data) return [];
    return r.data.filter(function(x){ return x && x.ativo; });
  }

  async function pedirReforco(nif, produto, valor){
    if(!sb) return { ok:false };
    var r = await sb.rpc('pedir_reforco', { p_nif:String(nif).replace(/\D/g,''), p_produto:produto, p_valor:valor });
    return { ok: !r.error };
  }

  async function reforcosDoCliente(nif){
    if(!sb) return [];
    var r = await sb.rpc('reforcos_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    return r.error ? [] : (r.data||[]);
  }

  async function rentabilidade(){
    if(!sb) return null;
    var r = await sb.from('rentabilidade').select('produto,tipo,ano,valor').order('ano',{ascending:true});
    if(r.error || !r.data || !r.data.length) return null;
    return r.data;
  }

  async function validarDemo(codigo){
    if(!sb) return { ok:false, offline:true };
    try{
      var r = await sb.from('demo_convites').select('codigo,nome,expira').eq('codigo', codigo).maybeSingle();
      if(r.error) return { ok:false, offline:true };
      if(!r.data) return { ok:false };
      if(r.data.expira && new Date(r.data.expira) < new Date()) return { ok:false, expirado:true };
      try{ await sb.from('demo_acessos').insert({ codigo:codigo, user_agent:navigator.userAgent.slice(0,200) }); }catch(e){}
      return { ok:true, nome:r.data.nome||'' };
    }catch(e){ return { ok:false, offline:true }; }
  }
  window.EXASupabase = { validarDemo:validarDemo, rentabilidade:rentabilidade, login:login, restaurarSessao:restaurarSessao, signOut:function(){ return sb ? sb.auth.signOut() : null; }, loginEmpresa:loginEmpresa, verificarRegisto:verificarRegisto, criarConta:criarConta, recuperarPassword:recuperarPassword, renovacoes:renovacoes, meuCodigo:meuCodigo, donoDoCodigo:donoDoCodigo, criarConvidado:criarConvidado, convitesDoCliente:convitesDoCliente, pontosDoCliente:pontosDoCliente, convitesTodos:convitesTodos, registarResgate:registarResgate, investimentoDoCliente:investimentoDoCliente, investimentosDoCliente:investimentosDoCliente, pedirReforco:pedirReforco, reforcosDoCliente:reforcosDoCliente, mapApolice:mapApolice };
})();
