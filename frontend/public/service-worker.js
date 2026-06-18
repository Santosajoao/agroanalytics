// AgroAnalytics Service Worker
// Implementa estratégia offline-first conforme RNF004 do TCC
const CACHE_NAME = 'agroanalytics-v1';
const URLS_PARA_CACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_PARA_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// Estratégia: network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // API: tenta rede, sem cache de dados sensíveis a mudanças
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ erro: 'Sem conexão. Dados serão sincronizados quando a rede voltar.' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        })
      )
    );
    return;
  }

  // Assets estáticos: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
