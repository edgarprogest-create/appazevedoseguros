/* Condições Saúde Sénior (Ageas/Medis) — fonte: simulação 1-3700UB6H, 15-09-2026.
   Opções: op1, op1-amb1000, op1-amb200, op2, op2-esto, op3, op3-esto, vintage, vintageplus */
(function(){
  const NOMES = {
    'op1':'Opção 1 · Base', 'op1-amb1000':'Opção 1 · Base + Ambulatório 1.000€', 'op1-amb200':'Opção 1 · Base + Ambulatório 200€',
    'op2':'Opção 2 · Base', 'op2-esto':'Opção 2 · Base + Estomatologia',
    'op3':'Opção 3 · Base', 'op3-esto':'Opção 3 · Base + Estomatologia',
    'vintage':'Vintage', 'vintageplus':'Vintage Plus'
  };
  // v(o1,o2,o3,vin,vplus) → valor por opção base
  const v = (a,b,c,d,e) => ({ op1:a, op2:b, op3:c, vintage:d, vintageplus:e });
  const R = '€19 (rede Medis) · €21 (CUF e Luz)';
  const ZONAS = {
    todo: [
      ['Hospitalização (capital)', v('15.000€','50.000€','1.000.000€','2.500€','5.000€')],
      ['Ambulatório (capital)', v('amb','2.500€','5.000€','150€','250€')],
      ['Comparticipação', v('100% na rede · 35% fora','100% na rede · 35% fora','100% na rede · 35% fora','50% na rede','50% na rede')],
      ['Internacional', v(null,null,'75.000€ · Navarra ilimitado',null,null)],
      ['Doenças graves', v(null,null,'1.000.000€',null,'1.000.000€')],
      ['Segunda opinião médica', v('Incluída','Incluída','Incluída','Incluída','Incluída')]
    ],
    cabeca: [
      ['Consulta de especialidade', v(R,R,R,'Comparticipação 50%','Comparticipação 50%')],
      ['Médico online (clínica geral)', v('€0','€0','€0',null,null)],
      ['Médico online (especialidades)', v('Até €20','Até €20','Até €20',null,null)],
      ['Psicologia e psicoterapia', v('20 sessões · '+R,'20 sessões · '+R,'20 sessões · '+R,null,null)],
      ['Consulta de psiquiatria', v(R,R,R,null,null)],
      ['Internamento psiquiátrico', v('20 dias (1 dia de franquia)','20 dias (1 dia de franquia)','20 dias (1 dia de franquia)',null,null)],
      ['Domicílio médico', v('€25','€25','€25',null,null)],
      ['Período de carência', v('60 dias','60 dias','60 dias','60 dias','60 dias')]
    ],
    olhos: [
      ['Consulta de oftalmologia', v(R,R,R,'Comparticipação 50%','Comparticipação 50%')],
      ['Exames complementares', v('20%','20%','20%',null,null)],
      ['Período de carência', v('60 dias','60 dias','60 dias','60 dias','60 dias')]
    ],
    dentes: [
      ['Capital de estomatologia', v(null,'esto250','esto1000',null,null)],
      ['Comparticipação', v(null,'esto:100% na rede · 35% fora','esto:100% na rede · 35% fora',null,null)],
      ['Actos médicos', v(null,'esto:€15 por acto (€10 em Clínica Medis)','esto:€15 por acto (€10 em Clínica Medis)',null,null)],
      ['Aparelhos e próteses', v(null,'esto:50%','esto:50%',null,null)],
      ['Período de carência', v(null,'esto:60 dias','esto:60 dias',null,null)]
    ],
    coracao: [
      ['Análises clínicas', v('€2 por análise','€2 por análise','€2 por análise',null,null)],
      ['Raio X', v('€10','€10','€10',null,null)],
      ['Ecografia', v('€15','€15','€15',null,null)],
      ['TAC', v('€30 (rede) · €55 (CUF e Luz)','€30 (rede) · €55 (CUF e Luz)','€30 (rede) · €55 (CUF e Luz)',null,null)],
      ['Ressonância magnética', v('€70 (rede) · €100 (CUF e Luz)','€70 (rede) · €100 (CUF e Luz)','€70 (rede) · €100 (CUF e Luz)',null,null)],
      ['Urgências', v('€50 (rede) · €55 (CUF e Luz)','€50 (rede) · €55 (CUF e Luz)','€50 (rede) · €55 (CUF e Luz)',null,null)],
      ['Check-up anual', v(null,null,null,'1 por ano · €40','1 por ano · €40')]
    ],
    tronco: [
      ['Capital de hospitalização', v('15.000€','50.000€','1.000.000€','2.500€','5.000€')],
      ['Copagamento (rede Medis)', v('10% · mín. €250 · máx. €500','10% · mín. €250 · máx. €500','10% · mín. €250 · máx. €500','50%','50%')],
      ['Copagamento (CUF e Luz)', v('10% · mín. €400 · máx. €600','10% · mín. €400 · máx. €600','10% · mín. €400 · máx. €600',null,null)],
      ['Cirurgia de ambulatório', v('20%','20%','20%',null,null)],
      ['Quimioterapia', v('10% · máx. €500','10% · máx. €500','10% · máx. €500',null,null)],
      ['Parto', v(null,'€250 normal · €600 cesariana','€250 normal · €600 cesariana',null,null)],
      ['Período de carência', v('90 dias','90 dias','90 dias','90 dias','90 dias')]
    ],
    ossos: [
      ['Fisioterapia (capital)', v('500€','500€','500€',null,null)],
      ['Fisioterapia (por sessão)', v('€7,50','€7,50','€7,50',null,null)],
      ['Fisioterapia ao domicílio', v(null,null,null,'5 sessões por ano','10 sessões por ano')],
      ['Enfermagem ao domicílio', v(null,'10 por ano · €10','10 por ano · €10','5 por ano','10 por ano')],
      ['Período de carência', v('60 dias','60 dias','60 dias','60 dias','60 dias')]
    ]
  };
  function condicoes(opcao, zona){
    if(!NOMES[opcao] || !ZONAS[zona]) return null;
    const base = opcao.split('-')[0], esto = /esto/.test(opcao);
    return ZONAS[zona].map(([lbl,vals])=>{
      let x = vals[base];
      if(x==='amb') x = opcao==='op1-amb1000' ? '1.000€ (franquia €50/ano)' : opcao==='op1-amb200' ? '200€' : null;
      if(x==='esto250') x = esto ? '250€' : null;
      if(x==='esto1000') x = esto ? '1.000€' : null;
      if(typeof x==='string' && x.indexOf('esto:')===0) x = esto ? x.slice(5) : null;
      return x ? [lbl,x] : null;
    }).filter(Boolean);
  }
  window.EXA_SAUDE = { NOMES, condicoes, fonte:'Simulação Saúde Sénior 1-3700UB6H' };
})();
