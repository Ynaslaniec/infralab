import React, { useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { useNotifications } from './hooks/useNotifications';
import type { Notification as AppNotification } from '../lib/supabase';
import { toast } from 'sonner';

// ─── Componente interno: ativa notificações globais ──────────
function NotificationListener() {
  const handleNew = useCallback((n: AppNotification) => {
    const toastFn =
      n.type === 'success' ? toast.success
      : n.type === 'error'  ? toast.error
      : n.type === 'warning'? toast.warning
      : toast.info;

    toastFn(n.title, {
      description: n.message,
      duration: 6000,
      action: n.link
        ? { label: 'Ver', onClick: () => { window.location.href = n.link!; } }
        : undefined,
    });
  }, []);

  useNotifications(handleNew);
  return null;
}

export default function Layout() {
  const location = useLocation();

  const showBottomNav = [
    '/dashboard', '/appointments', '/tickets', '/profile', '/users', '/infrastructure',
  ].includes(location.pathname);

  return (
    <>
      <NotificationListener />
      <Outlet />
      {showBottomNav && <BottomNav />}
    </>
  );
}
