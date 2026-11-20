/* Protocolos Ageas — cada código altera o layout da app.
   Para acrescentar um protocolo sem mexer no código, crie uma linha na tabela "protocolos" do Supabase
   (codigo, nome, logo_url, cor, acento, etiqueta, produto, corpo). Os valores da tabela substituem estes. */
window.EXA_PROTOCOLOS = {
  medicos:   { nome:'Ordem dos Médicos',          logo:'ordem-medicos.png',   cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais de saúde', produto:'Ritmo Vida Profissional', corpo:'pro' },
  dentistas: { nome:'Ordem dos Médicos Dentistas', logo:'ordem-dentistas.png', cor:'#151515', acento:'#E0B43C', etiqueta:'Exclusivo profissionais de saúde', produto:'Ritmo Vida Profissional', corpo:'pro' },
  farmaceuticos:{ nome:'Ordem dos Farmacêuticos',  logo:'ordem-farmaceuticos.png', cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais de saúde', produto:'Ritmo Vida Profissional', corpo:'pro' },
  enfermeiros:  { nome:'Ordem dos Enfermeiros',    logo:'ordem-enfermeiros.png',   cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais de saúde', produto:'Ritmo Vida Profissional', corpo:'pro' },
  veterinarios: { nome:'Ordem dos Médicos Veterinários', logo:'ordem-veterinarios.jpg', cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais de saúde', produto:'Ritmo Vida Profissional', corpo:'pro' },
  engenheiros:  { nome:'Ordem dos Engenheiros',    logo:'ordem-engenheiros.jpg',   cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais', produto:'Ritmo Vida Profissional', corpo:'vida' },
  arquitetos:   { nome:'Ordem dos Arquitectos',    logo:'ordem-arquitetos.png',    cor:'#151515', acento:'#C9A85C', etiqueta:'Exclusivo profissionais', produto:'Ritmo Vida Profissional', corpo:'vida' }
};
window.exaProtocolo = function(codigo, db){
  var k = String(codigo||'').toLowerCase().trim(); if(!k) return null;
  if(/dent/.test(k)) k='dentistas'; else if(/vet/.test(k)) k='veterinarios'; else if(/farm/.test(k)) k='farmaceuticos'; else if(/enfer/.test(k)) k='enfermeiros'; else if(/engen/.test(k)) k='engenheiros'; else if(/arq/.test(k)) k='arquitetos'; else if(/m[eé]dic/.test(k)) k='medicos';
  var base = window.EXA_PROTOCOLOS[k] || { nome: (db&&db.nome)||codigo, logo:'', cor:'#151515', acento:'#C9A85C', etiqueta:'Cliente protocolo', produto:'', corpo:'vida' };
  var o = Object.assign({ codigo:k }, base);
  if(db){ ['nome','cor','acento','etiqueta','produto','corpo','titulo'].forEach(function(f){ if(db[f]) o[f]=db[f]; }); if(db.logo_url) o.logo=db.logo_url; }
  return o;
};
window.EXA_PROT_VANTAGENS = [
  ['Responsabilidade Civil Profissional','Proteção contra erros e falhas no exercício da sua atividade.'],
  ['Vida e Saúde','Seguro de Vida Ritmo e planos de saúde com condições de protocolo.'],
  ['Carro e Casa','Poupança direta nos seguros Automóvel e Habitação.'],
  ['Cartão Mundo Ageas Seguros','Descontos em parceiros Ageas.'],
  ['E outros seguros','Fale com o seu gestor sobre todas as condições do protocolo.']
];
