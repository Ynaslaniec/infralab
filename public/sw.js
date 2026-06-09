/**
 * Service Worker — notificações push em background para o PWA.
 * Registrado em main.tsx via navigator.serviceWorker.register('/sw.js').
 *
 * Funcionalidades:
 *  - Recebe eventos `push` do servidor (Web Push API) e exibe notificação nativa.
 *  - Ao clicar na notificação, abre/foca a janela e navega para o link.
 *  - Cache mínimo para funcionar offline (shell da SPA).
 */

const CACHE_NAME = 'pwa-shell-v1';
const SHELL_URLS = ['/', '/index.html'];

// ── Instalação: pré-cachear o shell da SPA ────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Ativação: limpar caches antigos ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fallback para cache (SPA) ──────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Ignorar requisições de API/Supabase
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r || caches.match('/index.html'))
    )
  );
});

// ── Push: exibir notificação nativa ──────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Nova notificação', body: '', link: '/', icon: '/pwa-192x192.png' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon,
      badge: data.icon,
      data:  { link: data.link },
      tag:   data.link, // agrupa notificações do mesmo destino
    })
  );
});

// ── Clique na notificação: abre o app no link correto ─────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Reutiliza janela já aberta
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', link });
          return client.focus();
        }
      }
      // Abre nova janela
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
