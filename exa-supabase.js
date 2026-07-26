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

  function mapApolice(row){
    var ramo = row.ramo || '';
    return {
      id: row.id,
      color: colorForRamo(ramo),
      ramo: ramo,
      nome: row.produto || row.sub_ramo || ramo,
      num: row.numero_apolice || '',
      premio: row.premio_comercial!=null ? fmtEuroLocal(Number(row.premio_comercial)) : '—',
      per: 'ano',
      extra: {},
      irs: irsForRamo(ramo),
      situacao: row.situacao || '',
      frac: (row.fracionamento||'anual').toLowerCase(),
      inicio: row.data_inicio || '',
      renov: row.data_vencimento || '',
      installment: '',
      notify: true
    };
  }

  async function login(nifRaw, password){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var email = nif + '@exaseguros.local';
    var authRes = await sb.auth.signInWithPassword({ email:email, password:password });
    if(authRes.error) return { ok:false, error:'Credenciais inválidas.' };
    var uid = authRes.data.user.id;
    var cRes = await sb.from('clientes').select('*').eq('auth_id', uid).limit(1);
    if(cRes.error || !cRes.data || !cRes.data.length) return { ok:false, error:'Cliente não encontrado.' };
    var cliente = cRes.data[0];
    var aRes = await sb.from('apolices').select('*').eq('nif_cliente', cliente.nif);
    var apolices = (aRes.data||[]).map(mapApolice);
    return { ok:true, cliente:cliente, apolices:apolices };
  }

  async function loginEmpresa(nifRaw, email){
    if(!sb) return { ok:false, error:'Ligação indisponível.' };
    var nif = String(nifRaw).replace(/\D/g,'');
    var rpcRes = await sb.rpc('empresa_login', { p_nif: nif, p_email: email });
    if(rpcRes.error || !rpcRes.data || !rpcRes.data.length) return { ok:false, error:'Empresa não encontrada ou email não corresponde.' };
    var row = rpcRes.data[0];
    var apolices = (row.apolices||[]).map(mapApolice);
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

  window.EXASupabase = { login:login, loginEmpresa:loginEmpresa, requestEmpresaOtp:requestEmpresaOtp, verifyEmpresaOtp:verifyEmpresaOtp, mapApolice:mapApolice };
})();
