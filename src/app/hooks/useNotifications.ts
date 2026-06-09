import { useEffect, useRef } from 'react';
import type { Notification as AppNotification } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Ícones Unicode simples usados nas notificações nativas do browser
const TYPE_ICON: Record<string, string> = {
  success: '✅',
  error:   '❌',
  warning: '🔔',
  info:    '💬',
};

export function useNotifications(
  onNewNotification?: (n: AppNotification) => void,
) {
  const { user } = useAuth();
  const permissionRequested = useRef(false);

  // Pede permissão para Web Notifications uma única vez
  useEffect(() => {
    if (permissionRequested.current) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    permissionRequested.current = true;
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;

          // Callback para quem usa o hook (atualizar badge, lista, etc.)
          onNewNotification?.(n);

          // Web Notification (visível mesmo com app em background)
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            const icon = TYPE_ICON[n.type] ?? '🔔';
            const webNotif = new window.Notification(`${icon} ${n.title}`, {
              body:   n.message,
              icon:   '/pwa-192x192.png',
              badge:  '/pwa-192x192.png',
              tag:    n.id, // evita duplicatas
            });

            // Ao clicar na notificação do sistema → navega para o link
            if (n.link) {
              webNotif.onclick = () => {
                window.focus();
                window.location.href = n.link!;
              };
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onNewNotification]);
}
