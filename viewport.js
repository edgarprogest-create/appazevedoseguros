/* EXA Seguros — corre antes de tudo (carregado no <head>)
   1) Proteção: a app não pode ser mostrada dentro de outra página (evita sites falsos/clickjacking)
   2) Telemóveis estreitos: desenhar a 440px e encolher, como no Claude Design */
(function(){
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); }
    catch (e) { document.documentElement.style.display = 'none'; }
  }
})();
/* Telemóveis estreitos (ou com zoom/letra aumentados): desenhar a app com 480px de largura
   e encolher para caber no ecrã, como no Claude Design. Ecrãs largos ficam iguais. */
(function(){
  var m=document.querySelector('meta[name="viewport"]'); if(!m) return;
  var NORMAL='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  var ALVO=440;
  function ajustar(){
    m.setAttribute('content', NORMAL);
    var w=document.documentElement.clientWidth || window.innerWidth || 0;
    if(w && w < ALVO) m.setAttribute('content', 'width='+ALVO+', user-scalable=no, viewport-fit=cover');
  }
  ajustar();
  window.addEventListener('orientationchange', function(){ setTimeout(ajustar, 350); });
})();
