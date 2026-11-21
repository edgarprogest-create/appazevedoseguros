const CACHE = 'exa-seguros-v13';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // dados da Supabase e fontes externas: sempre da rede
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

// Tocar numa notificação abre a app (ou traz para a frente a que já está aberta)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  // link externo (ex.: WhatsApp do gestor): abre diretamente
  if (!alvo.startsWith(self.registration.scope)) {
    e.waitUntil(self.clients.openWindow ? self.clients.openWindow(alvo) : Promise.resolve());
    return;
  }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus(); }
      return self.clients.openWindow ? self.clients.openWindow(alvo) : null;
    })
  );
});

// Notificações enviadas pelo servidor (Supabase → enviar-avisos), mesmo com a app fechada
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'EXA Seguros', {
    body: d.body || '',
    tag: d.tag || undefined,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: d.url || './' }
  }));
});
