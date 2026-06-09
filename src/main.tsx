import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

// ── Service Worker (PWA + notificações em background) ─────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[SW] registrado, scope:', reg.scope))
      .catch((err) => console.warn('[SW] falha ao registrar:', err));
  });

  // Mensagem de navegação vinda do SW ao clicar numa notificação
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE' && event.data.link) {
      window.location.href = event.data.link;
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
