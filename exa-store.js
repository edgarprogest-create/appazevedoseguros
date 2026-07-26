/* ===== EXA — SHARED REFERRAL STORE (simulated backend) =====
   Both the client app (EXA App.html) and the agent panel (EXA Agente.html)
   read/write this single localStorage key. Confirming an adesão in the agent
   panel credits the client's points, which the client app reads on next open. */
window.EXAStore = (function(){
  'use strict';
  const K = 'exa_referrals_v1';
  function rid(){ return 'r'+Math.random().toString(36).slice(2,9); }

  const seed = {
    referrals: [
      { id:rid(), referrer:'José Costa', friend:'Maria Antunes', phone:'912 345 678', product:'Seguro de Vida',  ramo:'Vida',  points:30, status:'confirmed', date:'14 Mai' },
      { id:rid(), referrer:'José Costa', friend:'Carlos Silva',  phone:'914 555 333', product:null,              ramo:null,    points:0,  status:'pending',   date:'22 Mai' },
      { id:rid(), referrer:'José Costa', friend:'Ana Ferreira',  phone:'913 888 222', product:null,              ramo:null,    points:0,  status:'pending',   date:'28 Mai' },
      { id:rid(), referrer:'Ana Dias',   friend:'Pedro Lima',    phone:'913 222 111', product:'Seguro de Saúde', ramo:'Saúde', points:20, status:'confirmed', date:'19 Mai' },
      { id:rid(), referrer:'Rui Tavares',friend:'Sofia Brito',   phone:'910 444 777', product:null,              ramo:null,    points:0,  status:'pending',   date:'30 Mai' },
    ],
    redemptions: [
      { id:rid(), client:'Sofia Marques', nif:'241 558 990', store:'Pingo Doce', value:50, address:'Av. Central, 8, Porto', status:'enviado',  date:'12 Mai', notifiedTo:'edgar.azevedo@private.ageas.pt' },
      { id:rid(), client:'Rui Tavares',   nif:'198 442 071', store:'Lidl',       value:50, address:'R. Nova, 30, Braga',    status:'preparar', date:'25 Mai', notifiedTo:'edgar.azevedo@private.ageas.pt' },
    ],
  };

  function load(){
    try { const r = localStorage.getItem(K); if(r) return JSON.parse(r); } catch(e){}
    const s = JSON.parse(JSON.stringify(seed));
    save(s); return s;
  }
  function save(d){ try{ localStorage.setItem(K, JSON.stringify(d)); }catch(e){} }
  function reset(){ try{ localStorage.removeItem(K); }catch(e){} return load(); }

  return { load, save, reset, rid, KEY:K };
})();
