/* Check-up de Proteção — áreas, perguntas e pontuação */
window.EXA_CHECKUP = {
  medos: [
    { id:'profi',  t:'Deixar de poder exercer a minha profissão', a:'prof' },
    { id:'incap',  t:'Ficar incapacitado para trabalhar', a:'vida' },
    { id:'acid',   t:'Ter um acidente fora do trabalho', a:'acidentes' },
    { id:'doenca', t:'Uma doença grave', a:'saude' },
    { id:'rend',   t:'Deixar a família sem rendimento', a:'vida' },
    { id:'casa',   t:'Perder a casa ou os bens', a:'casa' },
    { id:'ref',    t:'Não ter dinheiro suficiente na reforma', a:'reforma' },
    { id:'danos',  t:'Ter de pagar danos causados a outros', a:'rc' },
    { id:'filhos', t:'Os filhos ficarem desprotegidos', a:'filhos' },
    { id:'neg',    t:'O meu negócio parar', a:'empresa' }
  ],
  areas: [
    { id:'prof', nome:'A sua profissão', cor:'#8A6A2A', q:[
      { id:'prof', t:'Qual é a sua área profissional?', o:[
        { v:'saude', l:'Saúde (médico, dentista, enfermeiro, veterinário, farmacêutico)' },
        { v:'eng', l:'Engenharia ou arquitetura' },
        { v:'lei', l:'Direito, finanças ou consultoria' },
        { v:'ens', l:'Ensino ou formação' },
        { v:'com', l:'Comércio, restauração ou serviços ao público' },
        { v:'man', l:'Construção, oficina ou trabalho manual' },
        { v:'cond', l:'Transportes ou condução profissional' },
        { v:'esc', l:'Escritório ou trabalho ao computador' },
        { v:'art', l:'Artes, música ou desporto' },
        { v:'na', l:'Reformado(a) ou sem atividade', na:true } ] },
      { id:'maos', show:a=>a.prof==='saude', t:"O seu trabalho depende da precisão e sensibilidade das mãos (cirurgia, tratamentos, procedimentos)?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60, f:{ t:"Parte da sua atividade depende das mãos.", rec:"Ritmo Vida Profissional com cobertura das mãos", c:"Parte do rendimento até à reforma" } }, { v:'s', l:'Sim, muito', s:30, f:{ t:"O seu rendimento depende das mãos: um tremor, perda de sensibilidade ou lesão num dedo pode impedi-lo de exercer, mesmo sem estar doente para outras atividades.", rec:"Ritmo Vida Profissional com cobertura das mãos", c:"Rendimento até à reforma" } } ] },
      { id:'visao', show:a=>a.prof==='saude', t:"E da visão de perto (microscópio, procedimentos finos, leitura de exames)?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Uma perda de visão parcial pode impedir a prática clínica.", rec:"Ritmo Vida Profissional com cobertura da visão", c:"Rendimento até à reforma" } } ] },
      { id:'visao', show:a=>a.prof==='eng', t:"A sua atividade depende da visão e da concentração (desenho técnico, cálculo, horas de ecrã)?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Uma perda de visão ou um problema neurológico pode impedir o trabalho técnico.", rec:"Ritmo Vida com invalidez profissional", c:"Rendimento até à reforma" } } ] },
      { id:'obra', show:a=>a.prof==='eng', t:"Visita obras, estaleiros ou instalações industriais?", o:[ { v:'n', l:'Não', s:100 }, { v:'o', l:'Ocasionalmente', s:70, f:{ t:"As visitas a obra expõem-no a quedas e acidentes.", rec:"AP Individual", c:"20.000 – 80.000 € numa incapacidade parcial" } }, { v:'f', l:'Com frequência', s:40, f:{ t:"Exposição frequente a acidentes em obra.", rec:"AP Individual + RC Profissional", c:"20.000 – 80.000 € numa incapacidade parcial" } } ] },
      { id:'mente', show:a=>a.prof==='lei', t:"O seu rendimento depende da concentração, da memória e da comunicação?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Um esgotamento, uma depressão ou um AVC ligeiro pode afastá-lo do trabalho durante meses.", rec:"Ritmo Vida com subsídio diário por incapacidade temporária", c:"Meses de faturação perdida" } } ] },
      { id:'erro', show:a=>a.prof==='lei', t:"Um erro seu pode causar prejuízo financeiro a um cliente?", o:[ { v:'n', l:'Não', s:100 }, { v:'st', l:'Sim, e tenho RC Profissional', s:100 }, { v:'sn', l:'Sim, e não tenho RC Profissional', s:10, f:{ t:"Um erro num parecer, num prazo ou num cálculo pode dar origem a pedidos de indemnização.", rec:"Responsabilidade Civil Profissional", c:"10.000 – 250.000 €" } } ] },
      { id:'voz', show:a=>a.prof==='ens', t:"O seu trabalho depende da voz?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Problemas nas cordas vocais são uma causa frequente de baixa prolongada em professores e formadores.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } } ] },
      { id:'mente', show:a=>a.prof==='ens', t:"Sente desgaste emocional que já o afastou do trabalho, ou que receia que o afaste?", o:[ { v:'n', l:'Não', s:100 }, { v:'r', l:'Receio que aconteça', s:60, f:{ t:"O desgaste emocional pode levar a baixas longas.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } }, { v:'s', l:'Sim, já aconteceu', s:30, f:{ t:"Já teve um afastamento por desgaste: o risco de repetir é maior.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } } ] },
      { id:'corpo', show:a=>a.prof==='com', t:"Passa muitas horas de pé ou o seu trabalho depende das costas e das pernas?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Uma lesão nas costas ou nos joelhos pode impedi-lo de trabalhar ao balcão ou na cozinha.", rec:"Ritmo Vida com invalidez profissional", c:"Rendimento até à reforma" } } ] },
      { id:'neg', show:a=>a.prof==='com', t:"Se ficar doente, o negócio continua a funcionar sem si?", o:[ { v:'s', l:'Sim', s:100 }, { v:'p', l:'Em parte', s:50, f:{ t:"O negócio depende muito da sua presença.", rec:"Multirriscos Empresa com perdas de exploração", c:"Faturação perdida durante a ausência" } }, { v:'n', l:'Não, fecha', s:10, f:{ t:"Se ficar doente, o negócio fecha e o rendimento para.", rec:"Ritmo Vida com subsídio diário + perdas de exploração", c:"Faturação perdida durante a ausência" } } ] },
      { id:'risco', show:a=>a.prof==='man', t:"Trabalha em altura, com máquinas ou ferramentas de corte?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Trabalho com risco elevado de acidente grave nas mãos, costas ou quedas.", rec:"AP Individual + Acidentes de Trabalho", c:"20.000 – 80.000 € numa incapacidade parcial" } } ] },
      { id:'fora', show:a=>a.prof==='man', t:"Tem seguro que o proteja também em acidentes fora do trabalho?", o:[ { v:'s', l:'Sim', s:100 }, { v:'n', l:'Não', s:20, f:{ t:"Um acidente em casa ou no desporto também o impede de trabalhar, e aí o seguro de trabalho não paga.", rec:"AP Individual", c:"20.000 – 80.000 € numa incapacidade parcial" } } ] },
      { id:'carta', show:a=>a.prof==='cond', t:"O seu rendimento depende da carta de condução?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Uma perda de visão, uma epilepsia ou outro problema de saúde pode levar à perda da carta e do rendimento.", rec:"Ritmo Vida com invalidez profissional", c:"Rendimento até à reforma" } } ] },
      { id:'acid', show:a=>a.prof==='cond', t:"Passa muitas horas por dia na estrada?", o:[ { v:'n', l:'Não', s:100 }, { v:'s', l:'Sim', s:50, f:{ t:"Mais horas na estrada significam mais exposição a acidentes.", rec:"AP Individual", c:"20.000 – 80.000 € numa incapacidade parcial" } } ] },
      { id:'corpo', show:a=>a.prof==='esc', t:"Passa muitas horas ao computador (costas, pulsos, visão)?", o:[ { v:'n', l:'Não', s:100 }, { v:'s', l:'Sim', s:70, f:{ t:"Lesões nos pulsos, nas costas ou na visão podem levar a baixas repetidas.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } } ] },
      { id:'mente', show:a=>a.prof==='esc', t:"O seu trabalho exige muita pressão e concentração?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"O esgotamento é uma das principais causas de baixa prolongada.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } } ] },
      { id:'parte', show:a=>a.prof==='art', t:"O seu rendimento depende de uma parte específica do corpo (mãos, voz, pernas)?", o:[ { v:'n', l:'Não', s:100 }, { v:'p', l:'Em parte', s:60 }, { v:'s', l:'Sim, muito', s:30, f:{ t:"Uma lesão nessa parte do corpo pode acabar com a carreira, mesmo estando saudável para outras atividades.", rec:"Ritmo Vida Profissional com cobertura específica", c:"Rendimento até ao fim da carreira" } } ] },
      { id:'irreg', show:a=>a.prof==='art', t:"O seu rendimento é irregular ou depende de contratos e espetáculos?", o:[ { v:'n', l:'Não', s:100 }, { v:'s', l:'Sim', s:60, f:{ t:"Com rendimento irregular, uma paragem pesa mais e a baixa é mais difícil de calcular.", rec:"Ritmo Vida com subsídio diário", c:"Meses de rendimento perdido" } } ] },
      { id:'esp', show:a=>a.prof&&a.prof!=='na', t:'O seu seguro paga se ficar incapaz para a SUA profissão, mesmo podendo fazer outro trabalho?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'ns', l:'Não sei', s:40, f:{ t:"Muitos seguros só pagam se não puder fazer nenhum trabalho. Para si, o que conta é a incapacidade para a sua profissão.", rec:"Revisão da cobertura de invalidez com o seu gestor", c:"—" } },
        { v:'n', l:'Não, ou não tenho seguro', s:10, f:{ t:"Sem cobertura de incapacidade para a sua profissão: se deixar de poder exercer, o rendimento para.", rec:"Ritmo Vida com invalidez profissional", c:"Rendimento até à reforma" } } ] },
      { id:'seis', show:a=>a.prof&&a.prof!=='na', t:'Se não puder trabalhar durante 6 meses, continua a receber rendimento?', o:[
        { v:'s', l:'Sim, tenho seguro com subsídio diário', s:100 },
        { v:'ss', l:'Só a baixa da Segurança Social', s:40, f:{ t:"A baixa da Segurança Social paga só uma parte da remuneração e as despesas fixas continuam.", rec:"Ritmo Vida com subsídio diário", c:"Diferença para o seu rendimento, todos os meses" } },
        { v:'n', l:'Não', s:10, f:{ t:"Seis meses sem trabalhar significam seis meses sem rendimento.", rec:"Ritmo Vida com subsídio diário", c:"6 meses de rendimento" } } ] }
    ]},
    { id:'casa', nome:'Casa', cor:'#1DB954', q:[
      { id:'tipo', t:'Que tipo de habitação tem?', o:[
        { v:'sc', l:'Própria, sem crédito' }, { v:'cc', l:'Própria, com crédito ao banco' }, { v:'arr', l:'Arrendada' }, { v:'fam', l:'Vivo com familiares', na:true } ] },
      { id:'mr', show:a=>a.tipo==='sc'||a.tipo==='cc', t:'Tem um seguro Multirriscos ativo?', o:[
        { v:'ok', l:'Sim, com o capital atualizado', s:100 },
        { v:'cap', l:'Sim, mas não sei se o capital está atualizado', s:50, f:{ t:'Capital da casa possivelmente desatualizado. Em caso de sinistro, a indemnização pode ser reduzida na mesma proporção.', rec:'Revisão do Casa Segura', c:'Até 30% a menos na indemnização' } },
        { v:'banco', l:'Só o seguro exigido pelo banco', s:30, f:{ t:'O seguro exigido pelo banco cobre sobretudo incêndio. Danos por água e fenómenos naturais podem ficar de fora.', rec:'Casa Segura com danos por água e fenómenos da natureza', c:'5.000 – 25.000 € numa inundação' } },
        { v:'nao', l:'Não', s:0, f:{ t:'Casa sem seguro Multirriscos: todos os custos de reparação ou reconstrução ficam do seu lado.', rec:'Casa Segura', c:'15.000 – 40.000 € num incêndio de cozinha' } } ] },
      { id:'rech', show:a=>a.tipo==='arr', t:'O recheio da casa (móveis, eletrodomésticos, equipamentos) está seguro?', o:[
        { v:'s', l:'Sim', s:100 }, { v:'n', l:'Não', s:20, f:{ t:'O recheio não está seguro. O seguro do senhorio cobre o edifício, não os seus bens.', rec:'Casa Segura (recheio)', c:'5.000 – 20.000 € para repor o recheio' } } ] },
      { id:'aloj', show:a=>a.tipo&&a.tipo!=='fam', t:'Se a casa ficar inabitável durante um mês, tem onde ficar sem custos?', o:[
        { v:'s', l:'Sim', s:100 }, { v:'n', l:'Não', s:40, f:{ t:'Sem cobertura de alojamento temporário enquanto a casa é reparada.', rec:'Casa Segura com alojamento temporário', c:'1.500 – 3.000 € por mês' } } ] }
    ]},
    { id:'vida', nome:'Vida e invalidez', cor:'#7A2AA0', q:[
      { id:'dep', t:'Quantas pessoas dependem do seu rendimento?', o:[ { v:'0', l:'Nenhuma' }, { v:'1', l:'Uma' }, { v:'2', l:'Duas ou mais' } ] },
      { id:'aguenta', t:'Se ficasse incapacitado para trabalhar, quanto tempo aguentaria com as suas poupanças?', o:[
        { v:'5', l:'Mais de 5 anos', s:100 },
        { v:'1', l:'Entre 1 e 5 anos', s:50, f:{ t:'As poupanças cobrem alguns anos, mas não uma incapacidade permanente.', rec:'Ritmo Vida com invalidez', c:'60.000 – 150.000 € (5 anos de rendimento)' } },
        { v:'0', l:'Menos de 1 ano', s:10, f:{ t:'Uma incapacidade esgotaria as poupanças em menos de um ano, e os custos de vida aumentam (tratamentos, adaptações, cuidadores).', rec:'Ritmo Vida com invalidez', c:'60.000 – 150.000 € (5 anos de rendimento)' } } ] },
      { id:'seg', t:'Tem seguro de Vida para além do exigido pelo banco no crédito?', o:[
        { v:'sim', l:'Sim, com cobertura de invalidez', s:100 },
        { v:'banco', l:'Só o do crédito à habitação', s:40, f:{ t:'O seguro do crédito paga ao banco, não à sua família. Os restantes custos ficam por cobrir.', rec:'Ritmo Vida Família', c:'Despesas da família sem o seu rendimento' } },
        { v:'nao', l:'Não', s:0, f:{ t:'Sem seguro de Vida: em caso de morte ou invalidez, a família depende só das poupanças.', rec:'Ritmo Vida Família', c:'Rendimento de vários anos' } } ] },
      { id:'cap', show:a=>a.seg==='sim', t:'O capital cobre pelo menos 5 anos do seu rendimento?', o:[
        { v:'s', l:'Sim', s:100 }, { v:'ns', l:'Não sei', s:60, f:{ t:'Capital de Vida por confirmar face ao rendimento atual.', rec:'Revisão do capital de Vida', c:'—' } },
        { v:'n', l:'Não', s:30, f:{ t:'Capital de Vida abaixo do recomendado para o seu rendimento.', rec:'Reforço do capital Ritmo Vida', c:'Diferença até 5 anos de rendimento' } } ] }
    ]},
    { id:'saude', nome:'Saúde', cor:'#1E90FF', q:[
      { id:'seg', t:'Tem seguro de saúde?', o:[
        { v:'full', l:'Sim, com internamento e consultas', s:100 },
        { v:'amb', l:'Sim, mas só consultas ou cartão de rede', s:50, f:{ t:'Sem cobertura de internamento: uma cirurgia no privado fica do seu lado.', rec:'Médis com internamento', c:'5.000 – 20.000 € numa cirurgia' } },
        { v:'nao', l:'Não', s:10, f:{ t:'Sem seguro de saúde: depende dos tempos de espera do SNS ou paga o privado por inteiro.', rec:'Saúde Família (Médis)', c:'5.000 – 20.000 € numa cirurgia' } } ] },
      { id:'dg', t:'Tem cobertura para doenças graves (cancro, AVC, enfarte)?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'ns', l:'Não sei', s:50, f:{ t:'Cobertura de doenças graves por confirmar.', rec:'Revisão com o seu gestor', c:'—' } },
        { v:'n', l:'Não', s:20, f:{ t:'Sem capital para doenças graves: tratamentos e perda de rendimento acumulam-se.', rec:'Ritmo Vida com doenças graves', c:'30.000 – 100.000 €' } } ] },
      { id:'fam', t:'A sua família está incluída no seguro de saúde?', o:[
        { v:'s', l:'Sim', s:100 }, { v:'na', l:'Não tenho família a cargo', s:100 },
        { v:'n', l:'Não', s:40, f:{ t:'A família não está incluída no seguro de saúde.', rec:'Saúde Família (Médis)', c:'Consultas e urgências da família' } } ] }
    ]},
    { id:'auto', nome:'Automóvel', cor:'#E50914', q:[
      { id:'tem', t:'Tem viatura própria?', o:[ { v:'n', l:'Não', na:true }, { v:'s', l:'Sim' } ] },
      { id:'cob', show:a=>a.tem==='s', t:'Que cobertura tem?', o:[
        { v:'dp', l:'Danos próprios (choque, colisão)', s:100 },
        { v:'mid', l:'Responsabilidade civil com vidros, furto ou incêndio', s:60, f:{ t:'Num acidente com culpa sua, os danos no seu carro não estão cobertos.', rec:'Protec Ligeiros com danos próprios', c:'3.000 – 15.000 € de reparação' } },
        { v:'rc', l:'Só a responsabilidade civil obrigatória', s:30, f:{ t:'Só tem o seguro obrigatório: furto, vidros e danos no seu carro ficam do seu lado.', rec:'Protec Ligeiros', c:'3.000 – 15.000 € de reparação' } } ] },
      { id:'sub', show:a=>a.tem==='s', t:'Se o carro ficar parado, precisa de outro para trabalhar?', o:[
        { v:'n', l:'Não', s:100 }, { v:'st', l:'Sim, e tenho viatura de substituição', s:100 },
        { v:'sn', l:'Sim, e não tenho viatura de substituição', s:40, f:{ t:'Sem viatura de substituição, uma reparação longa afeta o seu trabalho.', rec:'Viatura de substituição no Protec Ligeiros', c:'30 – 60 € por dia de aluguer' } } ] }
    ]},
    { id:'reforma', nome:'Reforma e poupança', cor:'#C28B00', q:[
      { id:'anos', t:'Quantos anos faltam para a sua reforma?', o:[ { v:'20', l:'Mais de 20' }, { v:'10', l:'Entre 10 e 20' }, { v:'0', l:'Menos de 10' }, { v:'ref', l:'Já estou reformado(a)', na:true } ] },
      { id:'poupa', show:a=>a.anos&&a.anos!=='ref', t:'Poupa regularmente para a reforma?', o:[
        { v:'ppr', l:'Sim, num PPR ou seguro de capitalização', s:100 },
        { v:'dp', l:'Sim, numa conta a prazo', s:50, f:{ t:'A conta a prazo perde poder de compra e não tem o benefício fiscal do PPR.', rec:'PPR+ (dedução até 400 €/ano no IRS)', c:'Perda de poder de compra ao longo dos anos' } },
        { v:'n', l:'Não', s:10, f:{ t:'Sem poupança para a reforma: a pensão pública fica normalmente abaixo do último salário.', rec:'PPR+', c:'Diferença entre o salário e a pensão, todos os meses' } } ] },
      { id:'sabe', show:a=>a.anos&&a.anos!=='ref', t:'Sabe quanto vai receber de pensão?', o:[
        { v:'s', l:'Sim', s:100 }, { v:'n', l:'Não', s:60, f:{ t:'Valor da pensão por conhecer: difícil saber quanto poupar.', rec:'Simulação de reforma com o seu gestor', c:'—' } } ] }
    ]},
    { id:'acidentes', nome:'Acidentes pessoais', cor:'#0A0A0B', q:[
      { id:'risco', t:'Pratica desporto, anda de mota ou bicicleta, ou faz trabalhos com risco?', o:[ { v:'n', l:'Não' }, { v:'o', l:'Ocasionalmente' }, { v:'f', l:'Com frequência' } ] },
      { id:'seg', t:'Se tiver um acidente fora do trabalho, tem um seguro que pague despesas médicas e incapacidade?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'ns', l:'Não sei', s:40, f:{ t:'Cobertura de acidentes fora do trabalho por confirmar.', rec:'Revisão com o seu gestor', c:'—' } },
        { v:'n', l:'Não', s:10, f:{ t:'Fora do trabalho, o seguro de Acidentes de Trabalho não se aplica. Despesas e incapacidade ficam do seu lado.', rec:'AP Individual', c:'20.000 – 80.000 € numa incapacidade parcial' } } ] }
    ]},
    { id:'rc', nome:'Responsabilidade civil', cor:'#5E2A6E', q:[
      { id:'fam', t:'Se causar danos a terceiros (uma inundação na casa do vizinho, um filho que parte algo, o cão que morde alguém), quem paga?', o:[
        { v:'s', l:'Tenho seguro de Responsabilidade Civil Familiar', s:100 },
        { v:'ord', l:'Só tenho a RC Profissional (por exemplo, da minha Ordem)', s:30, f:{ t:'A RC Profissional, incluindo a das Ordens, cobre apenas os danos causados no exercício da sua profissão. Os danos na vida privada (em casa, com os filhos, com o animal, no desporto) ficam do seu lado.', rec:'RC Familiar', c:'Pode ultrapassar 50.000 €' } },
        { v:'ns', l:'Não sei', s:40, f:{ t:'Responsabilidade civil familiar por confirmar.', rec:'RC Familiar', c:'—' } },
        { v:'n', l:'Pago eu', s:10, f:{ t:'Danos causados a terceiros são pagos do seu bolso.', rec:'RC Familiar', c:'Pode ultrapassar 50.000 €' } } ] },
      { id:'eni', t:'Trabalha como empresário em nome individual ou tem empresa?', o:[ { v:'n', l:'Não, trabalho por conta de outrem' }, { v:'eni', l:'Sim, empresário em nome individual' }, { v:'emp', l:'Sim, tenho empresa' } ] },
      { id:'prof', show:a=>a.eni==='eni'||a.eni==='emp', t:'Na sua atividade, um erro pode causar prejuízo a clientes?', o:[
        { v:'n', l:'Não', s:100 }, { v:'st', l:'Sim, e tenho RC Profissional', s:100 },
        { v:'ord', l:'Sim, tenho só a RC da minha Ordem', s:70, f:{ t:'A RC da Ordem cobre apenas os atos da sua profissão e tem capitais definidos pela Ordem, que podem ficar abaixo do risco real da sua atividade.', rec:'Revisão dos capitais de RC Profissional', c:'Diferença entre o capital da Ordem e o pedido de indemnização' } },
        { v:'sn', l:'Sim, e não tenho RC Profissional', s:10, f:{ t:'Um erro profissional pode levar a pedidos de indemnização sem seguro que os pague.', rec:'Responsabilidade Civil Profissional', c:'10.000 – 250.000 €' } } ] }
    ]},
    { id:'filhos', nome:'Filhos e dependentes', cor:'#1E2752', q:[
      { id:'tem', t:'Tem filhos ou outros dependentes?', o:[ { v:'n', l:'Não', na:true }, { v:'s', l:'Sim' } ] },
      { id:'edu', show:a=>a.tem==='s', t:'Se lhe acontecer algo, a educação dos seus filhos está garantida?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'p', l:'Em parte', s:50, f:{ t:'A educação dos filhos está só parcialmente garantida.', rec:'Ritmo Vida + poupança para a educação', c:'50.000 – 100.000 € por filho' } },
        { v:'n', l:'Não', s:10, f:{ t:'Sem garantia para a educação dos filhos se faltar o seu rendimento.', rec:'Ritmo Vida + poupança para a educação', c:'50.000 – 100.000 € por filho' } } ] },
      { id:'ap', show:a=>a.tem==='s', t:'Os filhos têm seguro de acidentes para além do da escola?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'e', l:'Só o da escola', s:50, f:{ t:'O seguro escolar só cobre a escola e o caminho para lá; desporto e férias ficam de fora.', rec:'AP Individual para crianças', c:'Despesas médicas e incapacidade' } },
        { v:'n', l:'Não', s:30, f:{ t:'Filhos sem seguro de acidentes pessoais.', rec:'AP Individual para crianças', c:'Despesas médicas e incapacidade' } } ] }
    ]},
    { id:'empresa', nome:'Empresa ou negócio', cor:'#0D6E58', q:[
      { id:'tem', t:'Tem empresa ou atividade por conta própria?', o:[ { v:'n', l:'Não', na:true }, { v:'s', l:'Sim' } ] },
      { id:'para', show:a=>a.tem==='s', t:'Se a atividade parar 3 meses (incêndio, avaria, doença sua), a empresa aguenta?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'d', l:'Com dificuldade', s:50, f:{ t:'Uma paragem longa põe em risco a tesouraria da empresa.', rec:'Multirriscos Empresa com perdas de exploração', c:'3 meses de custos fixos sem faturação' } },
        { v:'n', l:'Não', s:10, f:{ t:'A empresa não aguenta uma paragem de 3 meses.', rec:'Multirriscos Empresa com perdas de exploração', c:'3 meses de custos fixos sem faturação' } } ] },
      { id:'at', show:a=>a.tem==='s', t:'Tem seguro de Acidentes de Trabalho para si e para os trabalhadores?', o:[
        { v:'s', l:'Sim, para todos', s:100 },
        { v:'t', l:'Só para os trabalhadores', s:50, f:{ t:'Como trabalhador independente, não está coberto em caso de acidente de trabalho.', rec:'AT Conta Própria', c:'Despesas e rendimento perdido' } },
        { v:'n', l:'Não', s:0, f:{ t:'O seguro de Acidentes de Trabalho é obrigatório. Sem ele, indemnizações e coimas ficam do seu lado.', rec:'Acidentes de Trabalho', c:'Indemnizações e coimas' } } ] }
    ]},
    { id:'animais', nome:'Animais de estimação', cor:'#E0A800', q:[
      { id:'tem', t:'Tem animais de estimação?', o:[ { v:'n', l:'Não', na:true }, { v:'s', l:'Sim' } ] },
      { id:'cir', show:a=>a.tem==='s', t:'Se o seu animal precisar de uma cirurgia, consegue pagar sem dificuldade?', o:[
        { v:'s', l:'Sim', s:90 },
        { v:'n', l:'Seria difícil', s:40, f:{ t:'Uma cirurgia veterinária inesperada pesa no orçamento.', rec:'Pétis', c:'800 – 3.000 € numa cirurgia' } } ] },
      { id:'rc', show:a=>a.tem==='s', t:'O seu animal tem seguro de responsabilidade civil?', o:[
        { v:'s', l:'Sim', s:100 },
        { v:'n', l:'Não', s:30, f:{ t:'Danos causados pelo animal a terceiros ficam do seu lado (obrigatório para algumas raças).', rec:'Pétis', c:'Danos a terceiros' } } ] }
    ]}
  ]
};
