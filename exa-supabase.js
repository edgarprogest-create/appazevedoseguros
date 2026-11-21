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
  // Segurança: os textos vindos da base de dados nunca levam HTML (impede injeção de código na app)
  function limpar(v){
    if(typeof v === 'string') return v.replace(/[<>]/g,'').replace(/"/g,'”').replace(/`/g,'´');
    if(Array.isArray(v)) return v.map(limpar);
    if(v && typeof v === 'object'){ var o={}; Object.keys(v).forEach(function(k){ o[limpar(k)] = limpar(v[k]); }); return o; }
    return v;
  }
  // Catálogo de produtos (12-passo-catalogo-produtos.sql): o que falta na apólice vem do produto
  function comCatalogo(row){
    if(!row || !row.cat_nome) return row;
    var r = Object.assign({}, row);
    if(!r.ramo && r.cat_ramo) r.ramo = r.cat_ramo;
    if((!r.coberturas || !String(r.coberturas).trim()) && r.cat_coberturas) r.coberturas = r.cat_coberturas;
    if(!r.opcao && r.cat_opcao) r.opcao = r.cat_opcao;
    if(r.cat_extra && typeof r.cat_extra === 'object') r.extra = Object.assign({}, r.cat_extra, (r.extra && typeof r.extra === 'object') ? r.extra : {});
    return r;
  }
  function mapApolice(row){
    row = comCatalogo(limpar(row));
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

  var OFFLINE_MSG = 'Sem ligação à internet. Verifique a rede e tente novamente.';
  function semRede(err){
    if(!err) return false;
    if(typeof navigator!=='undefined' && navigator.onLine===false) return true;
    return err.status===0 || /fetch|network|load failed|timeout/i.test(String(err.message||err.name||''));
  }

  async function login(idRaw, password){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var id = String(idRaw).trim();
    var emails = [];
    if(id.indexOf('@')>0){
      emails.push(id);
    } else {
      var nif = id.replace(/\D/g,'');
      // O email só é devolvido se a palavra-passe estiver certa (8-passo-seguranca.sql)
      var er = await sb.rpc('email_para_login', { p_nif: nif, p_pass: password });
      if(er.error && semRede(er.error)) return { ok:false, offline:true, error:OFFLINE_MSG };
      if(!er.error && er.data) emails.push(er.data);
      emails.push(nif+'@exaseguros.local');
    }
    var authed = null, lastErr = null;
    for(var i=0;i<emails.length;i++){
      var r = await sb.auth.signInWithPassword({ email: emails[i], password: password });
      if(!r.error){ authed = r; break; }
      lastErr = r.error;
      if(semRede(lastErr)) return { ok:false, offline:true, error:OFFLINE_MSG };
    }
    if(!authed) return { ok:false, error:'Credenciais inválidas.' };
    return await carregarCliente();
  }

  async function alterarPassword(nova){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var s = await sb.auth.getSession();
    if(!s.data || !s.data.session) return { ok:false, error:'A sessão expirou. Entre de novo ou use o link do email.' };
    var r = await sb.auth.updateUser({ password: nova });
    if(r.error){
      if(semRede(r.error)) return { ok:false, error:OFFLINE_MSG };
      if(/different|same/i.test(r.error.message||'')) return { ok:false, error:'A nova palavra-passe tem de ser diferente da anterior.' };
      return { ok:false, error:'Não foi possível alterar a palavra-passe.' };
    }
    return { ok:true };
  }

  // Link "recuperar palavra-passe" do email: avisa a app para pedir a nova palavra-passe
  function aoRecuperar(cb){
    if(!sb) return;
    sb.auth.onAuthStateChange(function(ev){ if(ev==='PASSWORD_RECOVERY') setTimeout(cb, 0); });
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
  async function carregarCliente(){
    var uRes = await sb.auth.getUser();
    var uid = uRes.data && uRes.data.user && uRes.data.user.id;
    var cRes = await sb.from('clientes').select('*').eq('auth_id', uid).limit(1);
    if(cRes.error || !cRes.data || !cRes.data.length) return { ok:false, error:'Cliente não encontrado.' };
    var cliente = limpar(cRes.data[0]);
    var aRes = await sb.from('apolices_app').select('*').eq('nif_cliente', cliente.nif);
    if(aRes.error) aRes = await sb.from('apolices').select('*').eq('nif_cliente', cliente.nif);   // catálogo ainda não instalado
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

  // Área Empresa, passo 1: confirma NIF + email (não devolve apólices)
  async function loginEmpresa(nifRaw, email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var rpcRes = await sb.rpc('empresa_login', { p_nif: nif, p_email: email });
    if(rpcRes.error && semRede(rpcRes.error)) return { ok:false, error:OFFLINE_MSG };
    if(rpcRes.error || !rpcRes.data || !rpcRes.data.length) return { ok:false, error:'Empresa não encontrada ou email não corresponde.' };
    var row = limpar(rpcRes.data[0]);
    return { ok:true, cliente:{ nif:row.nif, nome:row.nome } };
  }

  // Área Empresa, passo 2: o código do agente é verificado no servidor
  async function empresaApolices(nifRaw, email, codigo){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var r = await sb.rpc('empresa_apolices', { p_nif: nif, p_email: email, p_codigo: String(codigo||'').trim() });
    if(r.error && semRede(r.error)) return { ok:false, error:OFFLINE_MSG };
    if(r.error || !Array.isArray(r.data)) return { ok:false, error:'Código inválido. Confirme com o seu agente.' };
    return { ok:true, apolices: r.data.filter(activeOnly).map(mapApolice) };
  }

  async function verificarRegisto(nifRaw, digitos){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var d = String(digitos).replace(/\D/g,'');
    if(d.length<4) return { ok:false, error:'Indique pelo menos os últimos 4 dígitos da apólice.' };
    var res = await sb.rpc('verificar_registo', { p_nif: nif, p_digitos: d });
    if(res.error && semRede(res.error)) return { ok:false, error:OFFLINE_MSG };
    if(res.error) return { ok:false, error:'Não foi possível validar. Tente novamente.' };
    if(!res.data || !res.data.length) return { ok:false, notFound:true, error:'Não encontrámos estes dados.' };
    var row = res.data[0];
    if(!row.valido) return { ok:false, error:'Os dígitos da apólice não correspondem a este NIF (ou foram feitas demasiadas tentativas; tente daqui a uma hora).' };
    return { ok:true, nome:row.nome, nif:nif };
  }

  var LIGAR_ERROS = {
    ja_registado:'Este NIF já tem conta. Faça login ou use "Esqueceu a palavra-passe?".',
    ja_associada:'Esta conta já está associada a outro NIF. Contacte o seu mediador.',
    digitos:'Os dígitos da apólice não correspondem a este NIF.',
    nif:'Não encontrámos este NIF. Contacte o seu mediador.',
    limite:'Demasiadas tentativas. Tente novamente daqui a uma hora.',
    sem_permissao:'Não foi possível confirmar a conta. Tente novamente.'
  };

  async function criarConta(nifRaw, password, email, digitos){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var authEmail = (email && email.indexOf('@')>0) ? email.trim() : (nif+'@exaseguros.local');
    var uid = null;
    var up = await sb.auth.signUp({ email: authEmail, password: password });
    if(up.error){
      if(semRede(up.error)) return { ok:false, error:OFFLINE_MSG };
      if(!/already/i.test(up.error.message||'')) return { ok:false, error:'Não foi possível criar a conta.' };
      // a conta já existe (ex.: registo começado como convidado): entra e associa
      var si = await sb.auth.signInWithPassword({ email: authEmail, password: password });
      if(si.error) return { ok:false, error:'Já existe uma conta com este email. Faça login.' };
      uid = si.data && si.data.user && si.data.user.id;
    } else {
      uid = up.data && up.data.user && up.data.user.id;
    }
    if(!uid) return { ok:false, error:'Não foi possível criar a conta.' };
    var link = await sb.rpc('ligar_auth', { p_nif: nif, p_auth_id: uid, p_email: email||null, p_digitos: String(digitos||'').replace(/\D/g,'') });
    if(link.error) return { ok:false, error:'Conta criada, mas não ficou associada. Contacte o seu mediador.' };
    if(link.data !== 'ok'){ try{ await sb.auth.signOut(); }catch(e){} return { ok:false, error: LIGAR_ERROS[link.data] || LIGAR_ERROS.sem_permissao }; }
    return { ok:true };
  }

  // Recuperação: o cliente indica o email da conta (já não se obtém o email a partir do NIF)
  async function recuperarPassword(email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    email = String(email||'').trim();
    if(email.indexOf('@')<1) return { ok:false, error:'Indique o email da sua conta.' };
    var volta = location.origin + location.pathname;
    var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: volta });
    if(r.error){
      if(semRede(r.error)) return { ok:false, error:OFFLINE_MSG };
      if(/rate|seconds/i.test(r.error.message||'')) return { ok:false, error:'Aguarde um minuto antes de pedir outro email.' };
      return { ok:false, error:'Não foi possível enviar o email.' };
    }
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
    return limpar(r.data[0]);
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
    if(row.ok) return { ok:true };
    try{ await sb.auth.signOut(); }catch(e){}
    if(row.motivo === 'ja_cliente') return { ok:false, jaCliente:true, error:'Este NIF já é nosso cliente. Use "Criar conta" com os últimos 4 dígitos de uma apólice.' };
    return { ok:false, error: LIGAR_ERROS[row.motivo] || 'Não foi possível criar a conta. Contacte o mediador.' };
  }

  async function convitesDoCliente(nif){
    if(!sb) return { ok:false, rows:[] };
    var r = await sb.rpc('convites_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error) return { ok:false, rows:[] };
    return { ok:true, rows: limpar(r.data || []) };
  }

  async function pontosDoCliente(nif){
    if(!sb) return null;
    var r = await sb.rpc('pontos_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error || !r.data || !r.data.length) return null;
    return limpar(r.data[0]);
  }

  async function convitesTodos(){
    if(!sb) return { ok:false, rows:[] };
    var r = await sb.rpc('convites_todos');
    if(r.error) return { ok:false, rows:[] };
    return { ok:true, rows: limpar(r.data || []) };
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
    return limpar(r.data[0]);
  }

  async function investimentosDoCliente(nif){
    if(!sb) return [];
    var r = await sb.rpc('investimento_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    if(r.error || !r.data) return [];
    return limpar(r.data.filter(function(x){ return x && x.ativo; }));
  }

  async function pedirReforco(nif, produto, valor){
    if(!sb) return { ok:false };
    var r = await sb.rpc('pedir_reforco', { p_nif:String(nif).replace(/\D/g,''), p_produto:produto, p_valor:valor });
    return { ok: !r.error };
  }

  async function reforcosDoCliente(nif){
    if(!sb) return [];
    var r = await sb.rpc('reforcos_do_cliente', { p_nif: String(nif).replace(/\D/g,'') });
    return r.error ? [] : limpar(r.data||[]);
  }

  async function rentabilidade(){
    if(!sb) return null;
    var r = await sb.from('rentabilidade').select('produto,tipo,ano,valor').order('ano',{ascending:true});
    if(r.error || !r.data || !r.data.length) return null;
    return limpar(r.data);
  }

  // ---------- Notificações com a app fechada (Web Push) ----------
  async function pushChave(){
    if(!sb) return null;
    var r = await sb.rpc('push_chave_publica');
    return (r.error || !r.data) ? null : r.data;
  }
  async function guardarPush(sub, prefs){
    if(!sb || !sub) return { ok:false };
    var j = sub.toJSON ? sub.toJSON() : sub;
    if(!j || !j.endpoint || !j.keys) return { ok:false };
    var r = await sb.rpc('guardar_push', { p_endpoint:j.endpoint, p_p256dh:j.keys.p256dh, p_auth:j.keys.auth, p_prefs:prefs||{}, p_ua:(navigator.userAgent||'').slice(0,200) });
    return { ok: !r.error && r.data === true };
  }
  async function apagarPush(endpoint){
    if(!sb || !endpoint) return;
    try{ await sb.rpc('apagar_push', { p_endpoint:endpoint }); }catch(e){}
  }
  async function guardarPushVisitante(sub){
    if(!sb || !sub) return { ok:false };
    var j = sub.toJSON ? sub.toJSON() : sub;
    if(!j || !j.endpoint || !j.keys) return { ok:false };
    var r = await sb.rpc('guardar_push_visitante', { p_endpoint:j.endpoint, p_p256dh:j.keys.p256dh, p_auth:j.keys.auth, p_ua:(navigator.userAgent||'').slice(0,200) });
    return { ok: !r.error && r.data === true };
  }
  async function temSessao(){
    if(!sb) return false;
    try{ var s = await sb.auth.getSession(); return !!(s.data && s.data.session); }catch(e){ return false; }
  }

  // Novidades da mediação (tabela "novidades", 14-passo-novidades.sql)
  async function novidades(){
    if(!sb) return null;
    try{ var r = await sb.from('novidades').select('tipo,titulo,texto,link,data').eq('ativo',true).order('data',{ascending:false}).limit(12); if(r.error) return null; return limpar(r.data||[]); }catch(e){ return null; }
  }
  window.EXASupabase = { novidades:novidades, guardarPushVisitante:guardarPushVisitante, pushChave:pushChave, guardarPush:guardarPush, apagarPush:apagarPush, temSessao:temSessao, rentabilidade:rentabilidade, login:login, restaurarSessao:restaurarSessao, signOut:function(){ return sb ? sb.auth.signOut() : null; }, loginEmpresa:loginEmpresa, empresaApolices:empresaApolices, alterarPassword:alterarPassword, aoRecuperar:aoRecuperar, verificarRegisto:verificarRegisto, criarConta:criarConta, recuperarPassword:recuperarPassword, renovacoes:renovacoes, meuCodigo:meuCodigo, donoDoCodigo:donoDoCodigo, criarConvidado:criarConvidado, convitesDoCliente:convitesDoCliente, pontosDoCliente:pontosDoCliente, convitesTodos:convitesTodos, registarResgate:registarResgate, investimentoDoCliente:investimentoDoCliente, investimentosDoCliente:investimentosDoCliente, pedirReforco:pedirReforco, reforcosDoCliente:reforcosDoCliente, mapApolice:mapApolice };
})();
