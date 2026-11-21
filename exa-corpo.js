/* Saúde — "O seu corpo, protegido" */
(function(){
  const Q = s => document.querySelector(s);
  const ZONAS = [
    { id:'cabeca',  nome:'Cabeça e mente',     cob:'Consultas de especialidade e psicologia', x:42, y:4.5 },
    { id:'olhos',   nome:'Olhos',              cob:'Oftalmologia e exames de visão',          x:55, y:7.5 },
    { id:'dentes',  nome:'Dentes',             cob:'Estomatologia (rede Medis Dental)',       x:49.5, y:10.8 },
    { id:'coracao', nome:'Coração e pulmões',  cob:'Exames de diagnóstico e análises',        x:57, y:23 },
    { id:'tronco',  nome:'Tronco e abdómen',   cob:'Internamento e cirurgia',                 x:50, y:34 },
    { id:'ossos',   nome:'Ossos e músculos',   cob:'Fisioterapia e ortopedia',                x:40, y:69 }
  ];
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  function arc(pct){
    const r=110, cx=130, cy=130, a0=Math.PI, a1=Math.PI+Math.PI*Math.max(0.02,Math.min(1,pct));
    const p=a=>[cx+r*Math.cos(a), cy+r*Math.sin(a)];
    const [x0,y0]=p(a0),[x1,y1]=p(a1),[xe,ye]=p(2*Math.PI);
    let ticks=''; for(let i=0;i<=26;i++){ const a=Math.PI+Math.PI*i/26, c=Math.cos(a), s=Math.sin(a); ticks+='<line x1="'+(cx+(r+10)*c)+'" y1="'+(cy+(r+10)*s)+'" x2="'+(cx+(r+(i%13===0?20:15))*c)+'" y2="'+(cy+(r+(i%13===0?20:15))*s)+'"></line>'; }
    return '<svg class="cp-arc" viewBox="0 0 260 140" aria-hidden="true"><g class="cp-ticks">'+ticks+'</g>'
      +'<path class="cp-track" d="M'+x0+' '+y0+' A'+r+' '+r+' 0 0 1 '+xe+' '+ye+'"></path>'
      +'<path class="cp-fill" d="M'+x0+' '+y0+' A'+r+' '+r+' 0 0 1 '+x1+' '+y1+'"></path></svg>';
  }
  let curPl=null, curPi=null;
  const OPK='exa_saude_opcao';
  function getOp(pl){ let m={}; try{ m=JSON.parse(localStorage.getItem(OPK)||'{}'); }catch(e){} return String(pl.opcao || (pl.extra&&pl.extra['Opção']) || '').trim().toLowerCase(); }
  function setOp(pl,op){ let m={}; try{ m=JSON.parse(localStorage.getItem(OPK)||'{}'); }catch(e){} m[pl.num]=op; try{ localStorage.setItem(OPK,JSON.stringify(m)); }catch(e){} }
  function rowHTML(id,nome,cob,op,all){
    const S=window.EXA_SAUDE, det = (S&&op) ? S.condicoes(op,id) : null;
    const tem = !op || (det && det.length);
    const corpo = !op ? '<p class="cp-empty">O seu gestor ainda não associou a opção do plano. Os valores aparecem aqui assim que for actualizada.</p>'
      : (det && det.length) ? det.map(d=>'<div class="cp-kv"><span>'+d[0]+'</span><b>'+d[1]+'</b></div>').join('')
      : '<p class="cp-empty">Não incluído nesta opção. Fale com o seu gestor para acrescentar.</p>';
    return '<div class="cp-row'+(all?' cp-all':'')+'" data-zona="'+id+'"><button type="button" class="cp-rh" data-cp-toggle aria-expanded="false"><div><b>'+nome+'</b><span>'+cob+'</span></div><i'+(tem?'':' class="cp-add"')+'>'+(tem?'Coberto':'Acrescentar')+'</i><em class="cp-plus" aria-hidden="true">+</em></button><div class="cp-det">'+corpo+'</div></div>';
  }
  function planoHTML(op){
    const S=window.EXA_SAUDE, nome = S && S.NOMES[op];
    return '<div class="cp-plano"><span>Plano do cliente</span><b>'+(nome ? 'Saúde Sénior · '+nome : 'A confirmar pelo seu gestor')+'</b></div>';
  }
  const ZONAS_VIDA = [
    { id:'cerebro', nome:'Cérebro', x:49.5, y:4,  side:'r', d:['Acidente Vascular Cerebral (AVC)','Tumor cerebral benigno','Esclerose múltipla','Doença de Parkinson','Doença de Alzheimer','Coma'] },
    { id:'olhos',   nome:'Visão e audição', x:45, y:8, side:'l', d:['Cegueira','Surdez','Perda da fala'] },
    { id:'pulmoes', nome:'Pulmões', x:41, y:21.5, side:'l', d:['Doença pulmonar terminal'] },
    { id:'coracao', nome:'Coração', x:56, y:22.5, side:'r', d:['Enfarte do Miocárdio','Cirurgia de bypass coronário','Cirurgia de válvulas cardíacas'] },
    { id:'figado',  nome:'Fígado', x:42, y:29.5, side:'l', d:['Doença hepática terminal'] },
    { id:'rins',    nome:'Rins', x:56, y:32, side:'r', d:['Insuficiência Renal'] },
    { id:'cancro',  nome:'Cancro', x:49.5, y:39, side:'l', d:['Cancro'] },
    { id:'membros', nome:'Membros', x:40, y:69, side:'r', d:['Paralisia','Perda de membros'] }
  ];
  const ZONAS_PRO = [
    { id:'maos',   nome:'Mãos', key:'Mãos', cap:'100.000€', x:27, y:50, side:'r', d:['Perda funcional das mãos ou dedos','Incapacidade para realizar atos clínicos ou cirúrgicos'] },
    { id:'olhos',  nome:'Olhos e visão', key:'Visão', cap:'100.000€', x:45, y:8, side:'l', d:['Perda total ou parcial da visão','Incapacidade para a prática clínica'] },
    { id:'coluna', nome:'Coluna e postura', key:'Coluna', cap:'75.000€', x:50, y:30, side:'r', d:['Lesões da coluna vertebral','Hérnias com incapacidade profissional'] },
    { id:'temp',   nome:'Incapacidade temporária', key:'Subsídio diário', cap:'75€/dia', x:50, y:44, side:'l', d:['Subsídio diário enquanto não puder exercer','Por doença ou acidente'] },
    { id:'dg',     nome:'Doenças graves', key:'Doenças graves', cap:'50.000€', x:56, y:22.5, side:'r', d:['Cancro, enfarte, AVC','Insuficiência renal e outras'] }
  ];
  const proCap = (pl,z) => (pl && pl.extra && pl.extra[z.key]) || z.cap;
  let dgCap = '', curPro = false;
  function dgPop(id){
    const z = ((curPro && ZONAS_PRO.find(x=>x.id===id)) || ZONAS_VIDA.concat(ZONAS_CARRO,ZONAS_CASA).find(x=>x.id===id)), el = Q('#cp-pop'); if(!z||!el) return;
    if(ZONAS_PRO.includes(z)){ el.innerHTML = '<button type="button" class="cp-pop-x" data-cp-popx aria-label="Fechar">×</button><span class="cp-pop-k">'+z.nome+' · valor a indemnizar</span><ul>'+z.d.map(x=>'<li>'+x+'</li>').join('')+'</ul><div class="cp-pop-v">'+proCap(curPl,z)+'</div>'; el.classList.add('show'); document.querySelectorAll('#sh-corpo .cp-dot').forEach(d=>d.classList.toggle('on', d.dataset.zona===id)); return; }
    if(ZONAS_CARRO.includes(z)||ZONAS_CASA.includes(z)){ el.innerHTML = '<button type="button" class="cp-pop-x" data-cp-popx aria-label="Fechar">×</button><span class="cp-pop-k">'+z.nome+'</span><ul>'+z.d.map(x=>'<li>'+x+'</li>').join('')+'</ul><div class="cp-pop-v" style="font-size:20px;font-weight:600;">'+z.cob+'</div>'; el.classList.add('show'); document.querySelectorAll('#sh-corpo .cp-dot').forEach(d=>d.classList.toggle('on', d.dataset.zona===id)); return; }
    el.innerHTML = '<button type="button" class="cp-pop-x" data-cp-popx aria-label="Fechar">×</button><span class="cp-pop-k">Valor a indemnizar em caso de</span><ul>'+z.d.map(x=>'<li>'+x+'</li>').join('')+'</ul><div class="cp-pop-v">'+(dgCap||'Capital da sua apólice')+'</div>';
    el.classList.add('show');
    document.querySelectorAll('#sh-corpo .cp-dot').forEach(d=>d.classList.toggle('on', d.dataset.zona===id));
  }
  function kvRow(id,nome,cob,linhas,all){
    return '<div class="cp-row'+(all?' cp-all':'')+'" data-zona="'+id+'"><button type="button" class="cp-rh" data-cp-toggle aria-expanded="false"><div><b>'+nome+'</b><span>'+cob+'</span></div><i>Coberto</i><em class="cp-plus" aria-hidden="true">+</em></button><div class="cp-det">'
      +(linhas.length ? linhas.map(d=>'<div class="cp-kv"><span>'+d[0]+'</span><b>'+d[1]+'</b></div>').join('') : '<p class="cp-empty">Condições detalhadas na sua apólice.</p>')+'</div></div>';
  }
  const ZONAS_CASA = [
    { id:'incendio', nome:'Incêndio, raio e explosão', cob:'Edifício e recheio', x:55, y:18, side:'r', base:1, d:['Incêndio, queda de raio e explosão','Edifício e recheio'] },
    { id:'agua',     nome:'Danos por água', cob:'Roturas e infiltrações', x:50, y:90, side:'l', base:1, d:['Rotura de canalizações','Infiltrações e entupimentos'] },
    { id:'natureza', nome:'Fenómenos da natureza', cob:'Tempestades, inundações, sismos', x:16, y:30, side:'r', base:1, d:['Tempestade e inundação','Fenómenos sísmicos (se contratado)'] },
    { id:'furto',    nome:'Furto ou roubo', cob:'Do recheio da habitação', x:30, y:72, side:'r', base:0, d:['Furto ou roubo do recheio','Danos por arrombamento'] },
    { id:'vidros',   nome:'Quebra de vidros e sanitários', cob:'Janelas, espelhos e loiças', x:45, y:40, side:'r', base:0, d:['Vidros, espelhos e loiças sanitárias'] },
    { id:'rc',       nome:'Responsabilidade civil', cob:'Danos causados a vizinhos e terceiros', x:84, y:50, side:'l', base:1, d:['Danos a terceiros enquanto proprietário'] },
    { id:'assist',   nome:'Assistência ao lar 24h', cob:'Canalizador, eletricista, serralheiro', x:60, y:70, side:'l', base:1, d:['Canalizador, eletricista e serralheiro','Envio de técnicos 24h'] }
  ];
  const ZONAS_CARRO = [
    { id:'rc',      nome:'Responsabilidade civil', cob:'Danos que cause a terceiros', x:82, y:64, side:'l', base:1, d:['Danos materiais a terceiros','Danos corporais a terceiros'] },
    { id:'vidros',  nome:'Quebra de vidros', cob:'Para-brisas, óculo e vidros laterais', x:37, y:46, side:'r', base:0, d:['Reparação ou substituição de vidros'] },
    { id:'choque',  nome:'Choque, colisão e capotamento', cob:'Danos no seu próprio carro', x:9, y:62, side:'r', base:0, d:['Danos próprios por acidente'] },
    { id:'furto',   nome:'Furto ou roubo', cob:'Do veículo ou de peças', x:55, y:62, side:'r', base:0, d:['Furto ou roubo do veículo','Danos por tentativa de furto'] },
    { id:'natureza',nome:'Fenómenos da natureza', cob:'Tempestades, inundações, granizo', x:62, y:40, side:'l', base:0, d:['Tempestade, inundação, granizo','Queda de árvores'] },
    { id:'assist',  nome:'Assistência em viagem 24h', cob:'Reboque, desempanagem e transporte', x:93, y:54, side:'l', base:1, d:['Reboque e desempanagem','Transporte dos ocupantes'] }
  ];
  function render(pl, pi, cor){
    curPl=pl; curPi=pi;
    const vida = /vida/i.test(pl.ramo||'');
    const prt = window.exaProtOf ? window.exaProtOf(pl) : null;
    const pro = prt ? prt.corpo==='pro' : /profissional/i.test((pl.ramo||'')+' '+(pl.nome||'')); curPro = pro;
    const carro = /auto|frota/i.test(pl.ramo||'');
    const casa = /casa|habita|multirrisc|patrim/i.test(pl.ramo||''); const obj = carro||casa;
    const shc=document.querySelector('#sh-corpo .cp-sheet'); if(shc) shc.classList.toggle('cp-white', obj);
    const op = (vida||obj) ? '' : getOp(pl);
    const body = Q('#corpo-body'); if(!body) return;
    const wrap = Q('#sh-corpo .sheet'); if(wrap) wrap.style.setProperty('--cp', cor||'#1E90FF');
    const h3 = Q('#sh-corpo h3'); if(h3) h3.innerHTML = pro ? 'A sua profissão, <em>protegida.</em>' : casa ? 'A sua casa, <em>protegida.</em>' : carro ? 'O seu carro, <em>protegido.</em>' : vida ? 'A sua vida, <em>protegida.</em>' : 'O seu corpo, <em>protegido.</em>';
    const zonas = pro ? ZONAS_PRO : casa ? ZONAS_CASA : carro ? ZONAS_CARRO : vida ? ZONAS_VIDA : ZONAS;
    const cap = (pl.extra && (pl.extra.Capital || pl.extra['Capital seguro'])) || pl.capital || '';
    const capL = cap ? [['Capital seguro', cap]] : [];
    let lista, extra, lock, nota;
    if(casa){
      const cobs = (pl.coberturas||[]).map(x=>String(x).toLowerCase());
      const tem = z => z.base || cobs.some(c=>c.includes(z.id));
      const mor = pl.extra && pl.extra.Morada ? [['Morada', pl.extra.Morada]] : [];
      lista = kvRow('todo','A sua casa, dia e noite','O edifício, o recheio e quem lá vive, acompanhados pela sua apólice',mor.concat(capL,[['Apólice', pl.nome||'Casa']]),true)
        + ZONAS_CASA.map(z=>'<div class="cp-row" data-zona="'+z.id+'"><button type="button" class="cp-rh" data-cp-toggle aria-expanded="false"><div><b>'+z.nome+'</b><span>'+z.cob+'</span></div><i'+(tem(z)?'':' class="cp-add"')+'>'+(tem(z)?'Coberto':'Acrescentar')+'</i><em class="cp-plus" aria-hidden="true">+</em></button><div class="cp-det">'+(tem(z)?z.d.map(x=>'<div class="cp-kv"><span>'+x+'</span><b>Incluído</b></div>').join(''):'<p class="cp-empty">Não incluído na sua apólice. Fale com o seu gestor para acrescentar.</p>')+'</div></div>').join('');
      extra = '';
      lock = '<div class="cp-lock"><b>Quanto mais tempo, mais protegido.</b> '+(pi?'Há '+fmt(pi.dias)+' dias que a sua casa está segura connosco. ':'')+'Mantenha o capital atualizado para estar sempre bem protegido.</div>';
      nota = '<p class="cp-nota">Condições detalhadas na sua apólice '+(pl.nome||'')+'.</p>';
    } else if(carro){
      const cobs = (pl.coberturas||[]).map(x=>String(x).toLowerCase());
      const tem = z => z.base || cobs.some(c=>c.includes(z.id)) || /danos|todos/i.test(String(pl.extra&&pl.extra.Cobertura||''));
      const veic = pl.extra && (pl.extra['Veículo']||pl.extra.Matrícula) ? [['Veículo', (pl.extra['Veículo']||'')+(pl.extra.Matrícula?' · '+pl.extra.Matrícula:'')]] : [];
      lista = kvRow('todo','Na estrada, todos os dias','O seu carro e quem o conduz, acompanhados pela sua apólice',veic.concat([['Apólice', pl.nome||'Auto']]),true)
        + ZONAS_CARRO.map(z=>'<div class="cp-row" data-zona="'+z.id+'"><button type="button" class="cp-rh" data-cp-toggle aria-expanded="false"><div><b>'+z.nome+'</b><span>'+z.cob+'</span></div><i'+(tem(z)?'':' class="cp-add"')+'>'+(tem(z)?'Coberto':'Acrescentar')+'</i><em class="cp-plus" aria-hidden="true">+</em></button><div class="cp-det">'+(tem(z)?z.d.map(x=>'<div class="cp-kv"><span>'+x+'</span><b>Incluído</b></div>').join(''):'<p class="cp-empty">Não incluído na sua apólice. Fale com o seu gestor para acrescentar.</p>')+'</div></div>').join('');
      extra = '';
      lock = '<div class="cp-lock"><b>Quanto mais tempo, mais protegido.</b> '+(pi?'Há '+fmt(pi.dias)+' dias que o seu carro está seguro connosco. ':'')+'O seu histórico sem sinistros conta para o prémio que paga.</div>';
      nota = '<p class="cp-nota">Condições detalhadas na sua apólice '+(pl.nome||'')+'.</p>';
    } else if(pro){
      const mi = (pl.extra && (pl.extra['Morte ou invalidez'] || pl.extra.Capital)) || '250.000€';
      lista = kvRow('todo','Morte ou invalidez','A sua família e o seu consultório protegidos',[['Capital', mi],['Apólice', pl.nome||'Ritmo Vida Profissional']],true)
        + '<div class="cp-dg-h"><b>Proteção para quem vive das mãos e dos olhos</b><span>Toque num ponto do corpo para ver o valor a indemnizar</span></div>'
        + ZONAS_PRO.map(z=>kvRow(z.id,z.nome,z.d[0],[[z.d[1], proCap(pl,z)]])).join('');
      extra = '';
      lock = '<div class="cp-lock"><b>Feito para a sua profissão.</b> '+(pi?'Há '+fmt(pi.dias)+' dias que o seu rendimento profissional está protegido. ':'')+'Se não puder exercer, o seu seguro garante o rendimento que a sua profissão exige.</div>';
      nota = '<p class="cp-nota">'+(pl.extra && pl.extra['Mãos'] ? '' : 'Valores de exemplo. ')+'Condições detalhadas na sua apólice '+(pl.nome||'')+'.</p>';
    } else if(vida){
      dgCap = (pl.extra && (pl.extra['Doenças graves'] || pl.extra.Capital)) || pl.capital || '';
      lista = kvRow('todo','Morte ou invalidez','A sua família fica protegida, aconteça o que acontecer',capL.concat([['Apólice', pl.nome||'Vida']]),true)
        + '<div class="cp-dg-h"><b>Até 28 doenças graves cobertas</b><span>Toque num ponto do corpo para ver o valor a indemnizar</span></div>'
        + ZONAS_VIDA.map(z=>kvRow(z.id,z.nome,z.d.slice(0,2).join(' · ')+(z.d.length>2?' e mais':''),z.d.map(x=>[x, dgCap||'Coberto'])) ).join('');
      extra = '';
      lock = '<div class="cp-lock"><b>Quanto mais tempo, mais protegido.</b> '+(pi?'Há '+fmt(pi.dias)+' dias que a sua família conta com esta protecção. ':'')+'Num seguro novo, o prémio seria calculado para a sua idade actual e poderia exigir novos exames médicos.</div>';
      nota = '<p class="cp-nota">Condições detalhadas na sua apólice '+(pl.nome||'')+'.</p>';
    } else {
      lista = planoHTML(op)+rowHTML('todo','Da cabeça aos pés','Todo o seu corpo está protegido pelo seu seguro de saúde',op,true)+ZONAS.map(z=>rowHTML(z.id,z.nome,z.cob,op)).join('');
      extra = '<a class="cp-rede" href="https://www.medis.pt/guia-medis/" target="_blank" rel="noopener"><span><b>Consultar rede Medis</b><small>Hospitais, clínicas e médicos perto de si</small></span><em aria-hidden="true">↗</em></a>';
      lock = '<div class="cp-lock"><b>Quanto mais tempo, mais protegido.</b> '+(pi?'Há '+fmt(pi.dias)+' dias que o seu seguro acompanha cada parte do seu corpo. ':'')+'Num seguro novo, os períodos de carência voltariam a contar do zero.</div>';
      nota = '<p class="cp-nota">Valores da '+(window.EXA_SAUDE?window.EXA_SAUDE.fonte:'simulação')+'. Condições detalhadas na sua apólice.</p>';
    }
    if(vida && !obj && !pro) setTimeout(()=>{ const b=Q('#corpo-body'); if(b && !b.querySelector('.cp-vq')){ const g=b.querySelector('.cp-gauge'); (g||b).insertAdjacentHTML(g?'afterend':'afterbegin','<p class="cp-vq">Hoje é uma fonte de rendimento para a sua família. Se um dia deixar de o ser, estes são os capitais que o seu seguro de Vida garante.</p>'); } },0);
    body.innerHTML =
      (casa ? '<div class="cp-fig cp-fig-car"><div class="cp-car cp-casa"><img class="cp-car-img cp-casa-img" src="casa.webp" alt="Casa">' : carro ? '<div class="cp-fig cp-fig-car"><div class="cp-car"><img class="cp-car-img" src="carro-xray.webp" alt="Carro">' : '<div class="cp-fig"><div class="cp-body"><img src="corpo-frente.png" alt="Corpo humano"><span class="cp-shield" aria-hidden="true"></span><span class="cp-scan" aria-hidden="true"></span>')
        + zonas.map((z,i)=>'<button type="button" class="cp-dot" data-zona="'+z.id+'" style="left:'+z.x+'%;top:'+z.y+'%;" aria-label="'+z.nome+'">'+(obj?'<b>'+(i+1)+'</b>':'')+'</button>'+(vida?'<span class="cp-chip cp-chip-'+z.side+'" style="left:'+z.x+'%;top:'+z.y+'%;" data-zona="'+z.id+'">'+z.nome+'</span>':'')).join('')
      +'</div>'+(obj?'<div class="cp-leg">'+zonas.map((z,i)=>'<button type="button" data-zona="'+z.id+'" class="cp-leg-i"><b>'+(i+1)+'</b><span>'+z.nome+'</span></button>').join('')+'</div>':'')+((vida||obj)?'<div class="cp-pop" id="cp-pop"></div>':'<div class="cp-tag">Corpo inteiro coberto</div>')+'</div>'
      +'<div class="cp-panel">'
        +'<div class="cp-gauge">'+arc(pi?pi.sem/52:0)
          +'<div class="cp-num"><b>'+(pi?fmt(pi.dias):'—')+'</b><span>'+(casa?'dias com a casa protegida':carro?'dias com o carro protegido':vida?'dias com a vida protegida':'dias com o corpo protegido')+'</span></div></div>'
        +'<div class="cp-list">'+lista+'</div>'+extra+lock+nota
      +'</div>';
    if(window.exaOpenSheet) window.exaOpenSheet('sh-corpo');
  }
  function foco(id){
    document.querySelectorAll('#sh-corpo [data-zona]').forEach(el=>el.classList.toggle('on', el.dataset.zona===id));
    const row = Q('#sh-corpo .cp-row.on'), sc = Q('#sh-corpo .sheet');
    if(row && sc) sc.scrollTo({ top: row.offsetTop - sc.clientHeight/2, behavior:'smooth' });
  }
  document.addEventListener('click', e=>{
    const tg = e.target.closest('#sh-corpo [data-cp-toggle]');
    if(tg){ const row=tg.parentNode, open=!row.classList.contains('open'); row.classList.toggle('open',open); tg.setAttribute('aria-expanded',open); return; }
    if(e.target.closest('[data-cp-popx]')){ const p=Q('#cp-pop'); if(p) p.classList.remove('show'); document.querySelectorAll('#sh-corpo .cp-dot').forEach(d=>d.classList.remove('on')); return; }
    const zc = e.target.closest('#sh-corpo .cp-dot, #sh-corpo .cp-chip, #sh-corpo .cp-leg-i');
    if(zc && Q('#cp-pop')){ dgPop(zc.dataset.zona); return; }
    const z = e.target.closest('#sh-corpo .cp-dot'); if(z){ foco(z.dataset.zona); const r=Q('#sh-corpo .cp-row[data-zona="'+z.dataset.zona+'"]'); if(r){ r.classList.add('open'); } }
  });
  window.exaCorpo = render;
})();
