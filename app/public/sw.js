/* Service worker do Wine Circle — JavaScript puro (A-05).
 *
 * A versão anterior era TypeScript: tinha `declare const self:
 * ServiceWorkerGlobalScope`, anotações de tipo e `export {}`. Arquivos em
 * public/ são copiados verbatim pelo Vite, sem transpilação, então o browser
 * levantava SyntaxError no parse e o registro falhava em toda visita — push
 * mortas e PWA sem cache. O DEPLOY-NOTES registrava isso como problema de
 * cache do Cloudflare; era sintaxe.
 */

const CACHE = 'winecircle-v3';

/* O index.html NÃO entra aqui de propósito.
 *
 * Ele aponta para o bundle com hash no nome; guardar uma cópia significa
 * poder servir um HTML que pede um JS de duas versões atrás. Foi o que
 * aconteceu: depois de um deploy, o app continuou mostrando a interface
 * antiga para quem já tinha o service worker instalado.
 *
 * Só recursos que não mudam de conteúdo ficam pré-cacheados. */
const SHELL = ['/manifest.json', '/icon-192.v2.png', '/icon-512.v2.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Rede primeiro para navegação, com o shell em cache como rede de segurança.
 * A API nunca é cacheada: dados de degustação e pagamento precisam ser frescos. */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/pb/') || url.pathname.startsWith('/api/')) return;

  /* Navegação sempre pela rede, com a última resposta boa guardada só para
   * quando não houver rede. Assim um deploy vale na próxima abertura, em vez
   * de ficar preso a um HTML antigo. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Wine Circle', body: 'Você tem uma novidade' };
  if (event.data) {
    try { data = event.data.json(); }
    catch (e) { data.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(target);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
