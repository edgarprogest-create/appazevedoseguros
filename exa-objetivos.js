/* EXA Invest — percurso por situação (objetivos → perguntas → produto + simulação) */
(function(){
  const Q = s => document.querySelector(s);
  const eur = n => (isFinite(n)?n:0).toLocaleString('pt-PT',{minimumFractionDigits:0,maximumFractionDigits:0})+'€';
  const num = id => { const v = parseFloat(String((Q('#'+id)||{}).value||'').replace(/\s/g,'').replace(',','.')); return isFinite(v)?v:0; };
  const TX_GAR = 0.02, TX_RISCO = 0.05, TX_DEP = 0.015;
  const irsCap = anos => anos>=8 ? 0.112 : anos>=5 ? 0.224 : 0.28;
  const field = (id,lbl,ph,extra) => '<div class="input-wrap"><span class="lbl">'+lbl+'</span><input class="input" id="'+id+'" inputmode="decimal" placeholder="'+ph+'"'+(extra||'')+'></div>';
  const seg = (name,opts) => '<div class="obj-seg" data-seg="'+name+'">'+opts.map((o,i)=>'<button type="button" data-obj-seg="'+name+'" data-v="'+o[0]+'" class="'+(i===0?'on':'')+'">'+o[1]+'</button>').join('')+'</div>';
  const segVal = name => { const b = Q('[data-seg="'+name+'"] .on'); return b ? b.dataset.v : null; };

  const OBJ = {
    imovel: {
      titulo:'Vendi um <em>imóvel.</em>',
      intro:'Se vendeu a sua habitação própria e permanente, pode ficar isento de mais-valias ao reinvestir o valor num seguro de capitalização ou PPR, desde que tenha 65 anos ou mais (ou seja reformado) e reinvista nos 6 meses seguintes.',
      form:()=> field('o-venda','Valor de venda','ex. 250000')+field('o-compra','Valor de compra (com obras e despesas)','ex. 120000')
        +'<div class="input-wrap"><span class="lbl">Taxa de IRS aproximada</span>'+seg('irs',[['0.25','até 25%'],['0.35','35%'],['0.45','45%+']])+'</div>'
        +'<div class="input-wrap"><span class="lbl">Tem 65 anos ou mais, ou é reformado?</span>'+seg('elig',[['1','Sim'],['0','Não']])+'</div>',
      calc:()=>{
        const venda=num('o-venda'), compra=num('o-compra');
        if(!venda||!compra) return { erro:'Indique o valor de venda e de compra.' };
        const mv = Math.max(0, venda-compra), taxa=parseFloat(segVal('irs')), elig=segVal('elig')==='1';
        const imposto = mv*0.5*taxa, capital8 = venda*Math.pow(1+TX_GAR,8);
        return { produto:'Maximus Poupança', porque:'Seguro de capitalização com capital garantido, elegível para o reinvestimento.',
          destaque:{ lbl: elig?'Imposto que pode evitar':'Imposto estimado sobre a venda', val: eur(imposto) },
          linhas:[['Mais-valia',eur(mv)],['Parte tributável (50%)',eur(mv*0.5)],['Reinvestido no Maximus',eur(venda)],['Valor estimado ao fim de 8 anos',eur(capital8)]],
          nota: elig ? 'Reinvista nos 6 meses após a venda. O seu gestor confirma as condições antes de avançar.' : 'Sem 65 anos ou reforma, a isenção por esta via não se aplica. Fale com o gestor sobre alternativas (ex. reinvestimento noutra habitação própria).',
          resumo:'Venda '+eur(venda)+' · compra '+eur(compra)+' · mais-valia '+eur(mv)+' · IRS ~'+Math.round(taxa*100)+'% · elegível: '+(elig?'sim':'não') };
      }
    },
    parado: {
      titulo:'Tenho dinheiro <em>parado.</em>',
      intro:'Compare o que o seu dinheiro rende num depósito com um seguro de capitalização, onde o IRS desce quanto mais tempo mantiver o investimento.',
      form:()=> field('o-valor','Valor disponível','ex. 20000')+field('o-anos','Durante quantos anos','ex. 8')
        +'<div class="input-wrap"><span class="lbl">Perfil</span>'+seg('perfil',[['gar','Capital garantido'],['risco','Aceito algum risco']])+'</div>',
      calc:()=>{
        const v=num('o-valor'), anos=Math.round(num('o-anos'));
        if(!v||!anos) return { erro:'Indique o valor e o prazo.' };
        const risco = segVal('perfil')==='risco', tx = risco?TX_RISCO:TX_GAR;
        const bruto = v*Math.pow(1+tx,anos), liq = v+(bruto-v)*(1-irsCap(anos));
        const dep = v+(v*Math.pow(1+TX_DEP,anos)-v)*(1-0.28);
        return { produto: risco?'Ageas Flex+':'Maximus Poupança', porque: risco?'Potencial de rentabilidade superior, com valor que pode oscilar.':'Capital garantido, sem exposição ao mercado.',
          destaque:{ lbl:'A mais que num depósito', val:'+'+eur(liq-dep) },
          linhas:[['Valor líquido em '+anos+' anos',eur(liq)],['Num depósito a prazo',eur(dep)],['IRS sobre o rendimento',(irsCap(anos)*100).toFixed(1).replace('.',',')+'% vs 28%']],
          nota:'Cenário ilustrativo: '+(tx*100).toFixed(0)+'%/ano no produto e '+(TX_DEP*100).toFixed(1).replace('.',',')+'%/ano no depósito. Rentabilidades passadas não garantem rentabilidades futuras.',
          resumo:eur(v)+' durante '+anos+' anos · perfil '+(risco?'com risco':'garantido') };
      }
    },
    reforma: {
      titulo:'Poupar para a <em>reforma.</em>',
      intro:'Com um PPR, 20% do que entrega por ano é deduzido ao seu IRS, até ao limite da sua idade.',
      form:()=> field('o-idade','A sua idade','ex. 40')+field('o-mensal','Entrega mensal','ex. 150')+field('o-ref','Idade de reforma','ex. 66'),
      calc:()=>{
        const idade=Math.round(num('o-idade')), m=num('o-mensal'), ref=Math.round(num('o-ref'));
        if(!idade||!m||!ref||ref<=idade) return { erro:'Indique idade, entrega mensal e idade de reforma (maior que a actual).' };
        const anos=ref-idade, lim = idade<35?400:idade<=50?350:300;
        const ded = Math.min(m*12*0.2, lim), n=anos*12, i=TX_GAR/12;
        const cap = m*((Math.pow(1+i,n)-1)/i);
        return { produto:'PPR+ tradicional', porque:'Poupança para a reforma com dedução no IRS todos os anos.',
          destaque:{ lbl:'Dedução no IRS por ano', val:eur(ded) },
          linhas:[['Capital estimado aos '+ref+' anos',eur(cap)],['Total entregue',eur(m*n)],['Dedução acumulada',eur(ded*anos)],['Limite de dedução na sua idade',eur(lim)]],
          nota:'Cenário ilustrativo a '+(TX_GAR*100)+'%/ano. A dedução depende do seu IRS e dos limites legais em vigor.',
          resumo:'Idade '+idade+' · '+eur(m)+'/mês · reforma aos '+ref };
      }
    },
    objetivo: {
      titulo:'Poupar para um <em>objetivo.</em>',
      intro:'Filhos, casa, uma viagem. Diga-nos quanto quer juntar e em quanto tempo.',
      form:()=> field('o-alvo','Quanto quer juntar','ex. 15000')+field('o-anos2','Em quantos anos','ex. 10')+field('o-ini','Valor inicial (opcional)','ex. 0'),
      calc:()=>{
        const alvo=num('o-alvo'), anos=Math.round(num('o-anos2')), ini=num('o-ini');
        if(!alvo||!anos) return { erro:'Indique o objetivo e o prazo.' };
        const n=anos*12, i=TX_GAR/12, fvIni=ini*Math.pow(1+i,n), f=(Math.pow(1+i,n)-1)/i;
        const mensal=Math.max(0,(alvo-fvIni)/f);
        return { produto:'Maximus Poupança', porque:'Entrega inicial e reforços mensais livres, com capital garantido.',
          destaque:{ lbl:'Entrega mensal necessária', val:eur(Math.ceil(mensal)) },
          linhas:[['Objetivo',eur(alvo)],['Prazo',anos+' anos'],['Total que entrega',eur(ini+mensal*n)]],
          nota:'Cenário ilustrativo a '+(TX_GAR*100)+'%/ano, antes de impostos.',
          resumo:'Objetivo '+eur(alvo)+' em '+anos+' anos · inicial '+eur(ini) };
      }
    }
  };
  let atual = null, ultimo = null;

  function abrir(k){
    atual = k; ultimo = null;
    const o = OBJ[k];
    Q('#obj-ttl').innerHTML = o.titulo;
    Q('#obj-body').innerHTML = '<p class="obj-intro">'+o.intro+'</p>'+o.form()
      +'<div class="err-msg" id="obj-err"></div><button type="button" class="btn obj-go" data-obj-calc>Ver a minha simulação</button><div id="obj-res"></div>';
    if(window.exaOpenSheet) window.exaOpenSheet('sh-obj'); else { Q('#sh-obj').classList.add('open'); document.body.classList.add('sheet-open'); }
  }
  function calcular(){
    const r = OBJ[atual].calc();
    Q('#obj-err').textContent = r.erro || '';
    if(r.erro){ Q('#obj-res').innerHTML=''; return; }
    ultimo = r;
    Q('#obj-res').innerHTML = '<div class="obj-res">'
      +'<div class="obj-big-l">'+r.destaque.lbl+'</div><div class="obj-big">'+r.destaque.val+'</div>'
      +'<div class="obj-rows">'+r.linhas.map(l=>'<div><span>'+l[0]+'</span><b>'+l[1]+'</b></div>').join('')+'</div>'
      +'<div class="obj-prod"><span>Sugerimos</span><b>'+r.produto+'</b><p>'+r.porque+'</p></div>'
      +'<p class="obj-nota">'+r.nota+'</p>'
      +'<button type="button" class="btn obj-go" data-obj-send>Pedir proposta ao gestor</button></div>';
    const sc = Q('#sh-obj .sheet'); if(sc) setTimeout(()=>sc.scrollTo({top:sc.scrollHeight,behavior:'smooth'}),60);
  }
  function enviar(){
    if(!ultimo) return;
    const who = window.exaRequester ? window.exaRequester() : { nome:'Cliente' };
    const sit = Q('#obj-ttl').textContent;
    const subject = encodeURIComponent('Pedido de proposta — '+sit+' — '+(who.nome||'Cliente'));
    const body = encodeURIComponent('Situação: '+sit+'\nDados: '+ultimo.resumo+'\nProduto sugerido: '+ultimo.produto+'\n'+ultimo.destaque.lbl+': '+ultimo.destaque.val+'\n'+ultimo.linhas.map(l=>l[0]+': '+l[1]).join('\n'));
    window.location.href = 'mailto:edgar.azevedo@private.ageas.pt?subject='+subject+'&body='+body;
    if(window.exaCloseSheet) window.exaCloseSheet('sh-obj'); else Q('#sh-obj').classList.remove('open');
    if(window.exaToast) window.exaToast('Pedido enviado ao seu gestor');
  }
  document.addEventListener('click', e=>{
    const o = e.target.closest('[data-obj]'); if(o){ abrir(o.dataset.obj); return; }
    const s = e.target.closest('[data-obj-seg]');
    if(s){ s.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b===s)); return; }
    if(e.target.closest('[data-obj-calc]')) calcular();
    else if(e.target.closest('[data-obj-send]')) enviar();
  });
})();
