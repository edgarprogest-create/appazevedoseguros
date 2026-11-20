/* Check-up de Proteção (diagnóstico avançado por áreas) */
(function(){
  const WA = '351913042770', KEY = 'exa_checkup';
  const D = () => window.EXA_CHECKUP;
  let S = load(), view = 'medos', cur = null;
  function load(){ try{ return Object.assign({ medos:[], ans:{}, done:{} }, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return { medos:[], ans:{}, done:{} }; } }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
  const STORY = {
    prof:'Imagine: acorda numa segunda-feira e a mão direita não responde como devia. Não está doente para a vida, mas está para o seu trabalho.',
    casa:'Imagine: chega a casa numa sexta à noite e a água do vizinho de cima já passou pelo teto da sala.',
    vida:'Imagine: um acidente de carro num dia normal. Sobrevive, mas não volta a trabalhar. As contas continuam a chegar todos os meses.',
    saude:'Imagine: o médico diz que é preciso operar. No público, a espera é de meses. No privado, a fatura chega antes da alta.',
    auto:'Imagine: um despiste numa manhã de chuva, sem mais ninguém envolvido. O carro vai para a oficina, e a fatura é sua.',
    reforma:'Imagine: o último dia de trabalho. No mês seguinte, a pensão que chega é metade do salário a que estava habituado.',
    acidentes:'Imagine: uma queda de bicicleta num domingo de manhã. Três meses de fisioterapia e sem poder trabalhar.',
    rc:'Imagine: um cliente alega que um serviço da sua empresa lhe causou prejuízo e avança com um pedido de indemnização. O processo pode arrastar-se durante anos.',
    filhos:'Imagine: o seu filho parte um braço no futebol ao sábado. O seguro da escola não cobre o fim de semana.',
    empresa:'Imagine: um curto-circuito à noite e o seu espaço fica fechado três meses. A renda, os salários e os fornecedores não param.',
    animais:'Imagine: o seu cão engole algo que não devia. A cirurgia de urgência é nessa noite, e o pagamento também.'
  };
  const area = id => D().areas.find(a=>a.id===id);
  const CART = [
    { a:'casa',     re:/casa|habita|multirrisc/i },
    { a:'vida',     re:/vida/i },
    { a:'saude',    re:/sa[uú]de|m[eé]dis/i },
    { a:'auto',     re:/auto|frota|ligeiro|moto/i },
    { a:'reforma',  re:/ppr|reforma|poupan|capitaliz|maximus|flex/i },
    { a:'acidentes',re:/acidente|\bap\b/i },
    { a:'rc',       re:/respons|\brc\b/i },
    { a:'empresa',  re:/empresa|pme|trabalho|frota|comerc/i },
    { a:'animais',  re:/p[eé]tis|animal/i },
    { a:'prof',     re:/profissional/i }
  ];
  const OWNQ = { casa:['mr','ok'], vida:['seg','sim'], saude:['seg','full'], auto:['tem','s'], reforma:['poupa','ppr'], acidentes:['seg','s'], rc:['fam','s'], animais:['tem','s'] };
  function ansOf(a){ const ans = S.ans[a.id] = S.ans[a.id]||{}, o = OWNQ[a.id]; if(o && carteira()[a.id]) ans[o[0]] = o[1]; return ans; }
  function carteira(){
    const ps = (window.exaCarteira && window.exaCarteira()) || [], got = {};
    ps.forEach(p=>{ const s=(p.ramo||'')+' '+(p.nome||'')+' '+(p.produto||''); CART.forEach(c=>{ if(c.re.test(s)) (got[c.a]=got[c.a]||[]).push(p.nome||p.ramo); }); });
    return got;
  }
  const visQ = (a, ans) => a.q.filter(q=>!q.show || q.show(ans));
  function calc(a){
    const ans = ansOf(a); let na=false, sum=0, n=0, flags=[];
    visQ(a, ans).forEach(q=>{ const o = q.o.find(x=>x.v===ans[q.id]); if(!o) return; if(o.na) na=true; if(o.s!=null){ sum+=o.s; n++; } if(o.f) flags.push(Object.assign({ area:a.nome, aid:a.id, cor:a.cor }, o.f)); });
    const own = carteira()[a.id];
    if(own) flags = flags.filter(f=>!/^Revis/.test(f.rec||''));
    let pct = n ? Math.round(sum/n) : null;
    if(own && pct!=null) pct = Math.max(pct, 75);
    return { na, pct, flags, own };
  }
  function nivel(p){
    if(p<40) return { n:1, nome:'Vulnerável', cls:'v' };
    if(p<70) return { n:2, nome:'Proteção Básica', cls:'b' };
    if(p<90) return { n:3, nome:'Proteção Equilibrada', cls:'e' };
    return { n:4, nome:'Proteção Completa', cls:'c' };
  }
  function total(){
    const got = carteira();
    const rs = D().areas.filter(a=>S.done[a.id] || got[a.id]).map(a=> S.done[a.id] ? calc(a) : { na:false, pct:80, flags:[], own:got[a.id] }).filter(r=>!r.na && r.pct!=null);
    if(!rs.length) return null;
    let pct = Math.round(rs.reduce((s,r)=>s+r.pct,0)/rs.length);
    const core = ['casa','vida','saude','auto','reforma'].filter(id=>got[id]).length;
    if(core>=3) pct = Math.max(pct, 70);
    pct = Math.min(100, pct + Math.min(10, Object.keys(got).length*2));
    return Object.assign({ pct, f: rs.reduce((s,r)=>s+r.flags.length,0), areas: rs.length, cart: Object.keys(got).length }, nivel(pct));
  }
  function priority(){ const p={}; S.medos.forEach(m=>{ const x=D().medos.find(y=>y.id===m); if(x) p[x.a]=true; }); return p; }
  const ring = (pct, cls, big) => '<div class="dg-ring'+(big?'':' dg-ring-sm')+' dg-'+cls+'" style="--p:'+pct+'"><div><b>'+pct+'%</b></div></div>';
  function persist(){
    const t = total();
    try{ if(t) localStorage.setItem('exa_diag', JSON.stringify({ pct:t.pct, n:t.n, nome:t.nome, cls:t.cls, f:t.f, areas:t.areas, ts:Date.now() })); else localStorage.removeItem('exa_diag'); }catch(e){}
    if(window.exaDiagWidget) window.exaDiagWidget();
  }

  function vMedos(){
    return '<div class="dg-s"><div class="dg-k">Check-up de Proteção</div><h2 class="dg-h">O que mais o preocupa?</h2><p class="dg-p">Escolha as situações que mais o inquietam. Começamos a análise por aí.</p><div class="dg-medos">'
      + D().medos.map(m=>'<button type="button" class="dg-chip'+(S.medos.includes(m.id)?' on':'')+'" data-ck-medo="'+m.id+'">'+m.t+'</button>').join('')
      + '</div><button type="button" class="btn accent dg-next" data-ck-go="hub"><span>'+(S.medos.length?'Continuar':'Saltar este passo')+'</span><span class="arr">→</span></button>'+'<p class="dg-legal">Este check-up é meramente indicativo e serve apenas para orientação. Não dispensa a análise personalizada de um profissional de seguros.</p>'+'</div>';
  }
  function vHub(){
    const p = priority(), t = total();
    const list = D().areas.slice().sort((a,b)=>(p[b.id]?1:0)-(p[a.id]?1:0));
    return '<div class="dg-s"><div class="dg-k">Check-up de Proteção</div><h2 class="dg-h">Por onde quer começar?</h2>'
      + (t ? '<div class="dg-hub-sum">'+ring(t.pct,t.cls,false)+'<div><b class="dg-lvl-'+t.cls+'">'+t.nome+'</b><span>'+t.areas+' de '+D().areas.length+' áreas analisadas</span></div></div>' : '<p class="dg-p">Responda às áreas que quiser, pela ordem que preferir. Cada área demora menos de um minuto.</p>')
      + (Object.keys(carteira()).length ? '<p class="dg-cart">Já contamos com os seguros que tem connosco: '+Object.keys(carteira()).length+' '+(Object.keys(carteira()).length===1?'área protegida':'áreas protegidas')+' na sua carteira.</p>' : '')
      + '<div class="dg-areas">' + list.map(a=>{
          const r = S.done[a.id] ? calc(a) : null;
          const own = carteira()[a.id];
          const st = !r ? (own ? '<em class="dg-own">Na sua carteira</em>' : '<em>Por analisar</em>') : r.na ? '<em>Não se aplica</em>' : '<em class="dg-lvl-'+nivel(r.pct).cls+'">'+r.pct+'%</em>';
          return '<button type="button" class="dg-area" data-ck-area="'+a.id+'"><span class="dg-dot" style="background:'+a.cor+'"></span><span class="dg-an"><b>'+a.nome+'</b>'+(p[a.id]?'<small>Prioridade para si</small>':'')+(own?'<small class="dg-own-s">'+own.slice(0,2).join(' · ')+'</small>':'')+'</span>'+st+'<i aria-hidden="true">›</i></button>';
        }).join('') + '</div>'
      + '<button type="button" class="btn accent dg-next"'+(t?'':' disabled')+' data-ck-go="res"><span>Ver a minha análise</span><span class="arr">→</span></button></div>';
  }
  function vArea(){
    const a = area(cur), ans = ansOf(a), ownA = carteira()[a.id], oq = ownA && OWNQ[a.id] ? OWNQ[a.id][0] : null, qs = visQ(a, ans).filter(q=>q.id!==oq);
    const naHit = qs.some(q=>{ const o=q.o.find(x=>x.v===ans[q.id]); return o&&o.na; });
    const shown = naHit ? qs.filter((q,i)=>i<=qs.findIndex(q2=>{ const o=q2.o.find(x=>x.v===ans[q2.id]); return o&&o.na; })) : qs;
    const ok = naHit || shown.every(q=>ans[q.id]!=null);
    return '<div class="dg-s"><button type="button" class="dg-back" data-ck-go="hub">‹ Áreas</button><div class="dg-k" style="color:'+a.cor+'">Análise</div><h2 class="dg-h">'+a.nome+'</h2>'+(ownA?'<p class="dg-cart">Já tem na sua carteira: '+[...new Set(ownA)].join(' · ')+'. Vamos só confirmar alguns pormenores.</p>':'')
      + shown.map((q,i)=> (i===0||ans[shown[i-1].id]!=null) ? '<div class="dg-qb"><p class="dg-q">'+q.t+'</p>'+q.o.map(o=>'<button type="button" class="dg-opt'+(ans[q.id]===o.v?' on':'')+'" data-ck-q="'+q.id+'" data-v="'+o.v+'"><i></i><span>'+o.l+'</span></button>').join('')+'</div>' : '').join('')
      + '<button type="button" class="btn accent dg-next"'+(ok?'':' disabled')+' data-ck-go="done"><span>Concluir '+a.nome.toLowerCase()+'</span><span class="arr">→</span></button></div>';
  }
  function vRes(){
    const t = total(); if(!t) return vHub();
    const got = carteira();
    const done = D().areas.filter(a=>S.done[a.id] || got[a.id]).map(a=> S.done[a.id] ? Object.assign({ a }, calc(a)) : { a, na:false, pct:80, flags:[], own:got[a.id] });
    const flags = done.reduce((s,r)=>s.concat(r.flags),[]);
    const recs = {}; flags.forEach(f=>{ if(!/^Revis|^Simula/.test(f.rec) || true){ (recs[f.rec]=recs[f.rec]||[]).push(f.area); } });
    const medos = S.medos.map(m=>(D().medos.find(x=>x.id===m)||{}).t).filter(Boolean);
    const msg = 'Olá Edgar, fiz o Check-up de Proteção na app.\nResultado: '+t.nome+' ('+t.pct+'%).\n'
      + done.filter(r=>!r.na).map(r=>'• '+r.a.nome+': '+r.pct+'%').join('\n')
      + (flags.length ? '\n\nPontos de atenção:\n'+flags.map(f=>'• '+f.area+': '+f.rec).join('\n') : '')
      + (medos.length ? '\n\nO que mais me preocupa: '+medos.join(', ')+'.' : '')
      + (Object.keys(got).length ? '\n\nJá tenho na carteira: '+D().areas.filter(a=>got[a.id]).map(a=>a.nome).join(', ')+'.' : '')
      + '\n\nGostava de rever a minha proteção.';
    return '<div class="dg-s dg-res"><div class="dg-k">A sua análise</div>'+ring(t.pct,t.cls,true)
      + '<h2 class="dg-h dg-lvl-'+t.cls+'">'+t.nome+'</h2><p class="dg-p">'+(t.f ? 'Encontrámos '+t.f+' '+(t.f===1?'ponto de atenção':'pontos de atenção')+' em '+t.areas+' '+(t.areas===1?'área analisada':'áreas analisadas')+'.' : 'Não encontrámos pontos de atenção nas áreas analisadas.')+'</p>'
      + (Object.keys(got).length ? '<div class="dg-sec"><h3>Já protegido na sua carteira</h3>'+D().areas.filter(a=>got[a.id]).map(a=>'<div class="dg-cr"><span class="dg-dot" style="background:'+a.cor+'"></span><b>'+a.nome+'</b><span>'+[...new Set(got[a.id])].join(' · ')+'</span><i>✓</i></div>').join('')+'</div>' : '')
      + (medos.length ? '<div class="dg-sec"><h3>As suas preocupações</h3><div class="dg-medos dg-medos-ro">'+medos.map(m=>'<span class="dg-chip on">'+m+'</span>').join('')+'</div></div>' : '')
      + '<div class="dg-sec"><h3>Nota por área</h3>'+done.map(r=>'<div class="dg-nr"><span>'+r.a.nome+'</span>'+(r.na?'<em>Não se aplica</em>':'<div class="dg-nb"><i class="dg-'+nivel(r.pct).cls+'" style="width:'+r.pct+'%"></i></div><b>'+r.pct+'%</b>')+'</div>').join('')+'</div>'
      + (flags.length ? '<div class="dg-sec"><h3>Pontos de atenção</h3>'+flags.map((f,i)=>'<div class="dg-pa"><span class="dg-dot" style="background:'+f.cor+'"></span><div><small>'+f.area+'</small>'+(STORY[f.aid] && !got[f.aid] && flags.findIndex(g=>g.aid===f.aid)===i ? '<p class="dg-story">'+STORY[f.aid]+'</p>' : '')+'<p>'+f.t+'</p>'+(f.c&&f.c!=='—'?'<span class="dg-cost">Custo potencial: <b>'+f.c+'</b></span>':'')+'</div></div>').join('')+'</div>' : '')
      + (Object.keys(recs).length ? '<div class="dg-sec"><h3>Recomendações</h3>'+Object.keys(recs).map(k=>'<div class="dg-rec"><b>'+k+'</b><span>'+[...new Set(recs[k])].join(' · ')+'</span></div>').join('')+'</div>' : '')
      + '<div class="dg-note"><div class="dg-note-h"><div class="dg-note-ph"><image-slot id="gestor-photo" shape="circle" placeholder="Foto"></image-slot></div><div><b>Edgar Azevedo</b><span>O seu consultor</span></div></div><p>'+(t.f ? 'Obrigado por ter feito este check-up. Cada ponto de atenção serve para recordar que não devemos depender apenas da proteção do Estado, como a Segurança Social ou o SNS.' : 'Obrigado por ter feito este check-up. A sua proteção está bem cuidada. Vamos mantê-la assim, revendo-a sempre que a sua vida mudar.')+'</p></div>'
      + '<p class="dg-disc">Este check-up é meramente indicativo e serve apenas para orientação. Não dispensa a análise personalizada de um profissional de seguros. Os custos potenciais são estimativas; os valores reais dependem de cada situação e das condições de cada apólice.</p>'
      + '<a class="btn accent dg-next dg-wa" href="https://wa.me/'+WA+'?text='+encodeURIComponent(msg)+'" target="_blank" rel="noopener"><span>'+(t.f?'Rever com o meu consultor':'Falar com o consultor')+'</span><span class="arr">→</span></a>'
      + '<button type="button" class="dg-again" data-ck-go="hub">Analisar mais áreas</button><button type="button" class="dg-again" data-ck-go="reset">Recomeçar o check-up</button></div>';
  }
  let lastView = null, lastQ = 0;
  function draw(){
    const b = document.getElementById('dg-body'); if(!b || !D()) return;
    const changed = view!==lastView || (view==='area' && b.dataset.area!==cur);
    b.innerHTML = view==='medos' ? vMedos() : view==='area' ? vArea() : view==='res' ? vRes() : vHub();
    b.dataset.area = cur||'';
    const s = b.firstElementChild; if(s && changed) s.classList.add('dg-anim');
    const qs = b.querySelectorAll('.dg-qb'); qs.forEach((q,i)=>{ if(!changed && i>=lastQ) q.classList.add('dg-new'); });
    lastQ = qs.length; lastView = view;
    const done = D().areas.filter(a=>S.done[a.id]).length;
    const bar = document.getElementById('dg-prog'); if(bar) bar.style.width = (view==='res'?100:Math.round(done/D().areas.length*100))+'%';
    const w = document.getElementById('dg-wrap'); if(w){ w.dataset.step = view; w.scrollTop = 0; }
  }
  function open(){ S = load(); view = Object.keys(S.done).length ? (total()?'res':'hub') : (S.medos.length?'hub':'medos'); const w=document.getElementById('dg-wrap'); if(!w) return; w.classList.add('show'); draw(); }
  function close(){ const w=document.getElementById('dg-wrap'); if(w) w.classList.remove('show'); }
  document.addEventListener('click', e=>{
    if(e.target.closest('[data-dg-open]')){ e.preventDefault(); open(); return; }
    if(e.target.closest('[data-dg-close]')){ close(); return; }
    const m = e.target.closest('[data-ck-medo]');
    if(m){ const id=m.dataset.ckMedo; S.medos = S.medos.includes(id) ? S.medos.filter(x=>x!==id) : S.medos.concat(id); save(); draw(); return; }
    const ar = e.target.closest('[data-ck-area]'); if(ar){ cur = ar.dataset.ckArea; view='area'; draw(); return; }
    const q = e.target.closest('[data-ck-q]');
    if(q){ const a=area(cur), ans=S.ans[cur]=S.ans[cur]||{}; ans[q.dataset.ckQ]=q.dataset.v;
      visQ(a, ans); a.q.forEach(x=>{ if(x.show && !x.show(ans)) delete ans[x.id]; }); save(); const y=document.getElementById('dg-wrap').scrollTop; draw(); document.getElementById('dg-wrap').scrollTop=y; return; }
    const g = e.target.closest('[data-ck-go]'); if(!g || g.disabled) return;
    const a = g.dataset.ckGo;
    if(a==='done'){ S.done[cur]=true; save(); persist(); view='hub'; }
    else if(a==='reset'){ S = { medos:[], ans:{}, done:{} }; save(); persist(); view='medos'; }
    else view = a;
    draw();
  });
  window.exaDiagOpen = open;
  window.exaDiagWidget = function(){
    const w = document.getElementById('wgt-chips-container'); if(!w) return;
    S = load(); const t = total(); let r = t ? { pct:t.pct, n:t.n, nome:t.nome, cls:t.cls, f:t.f, areas:t.areas } : null;
    w.style.display=''; w.classList.add('dg-wgt-on');
    w.innerHTML = r && r.areas
      ? '<button type="button" class="dg-wgt dg-'+r.cls+'" data-dg-open><span class="dg-mini" style="--p:'+r.pct+'"><b>'+r.pct+'%</b></span><span class="dg-wgt-t"><b>Nível '+r.n+' · '+r.nome+'</b><em>'+r.areas+' de '+(D()?D().areas.length:11)+' áreas'+(r.f?' · '+r.f+' '+(r.f===1?'ponto':'pontos')+' de atenção':'')+'</em></span><i aria-hidden="true">→</i></button>'
      : '<button type="button" class="dg-wgt dg-none" data-dg-open><span class="dg-mini dg-mini-q" style="--p:0"><b>?</b></span><span class="dg-wgt-t"><b>Faça o seu check-up</b><em>'+(D()?D().areas.length:11)+' áreas, comece por onde quiser</em></span><i aria-hidden="true">→</i></button>';
  };
  try{ const old = JSON.parse(localStorage.getItem('exa_diag')||'null'); if(old && !old.areas) localStorage.removeItem('exa_diag'); }catch(e){}
})();
