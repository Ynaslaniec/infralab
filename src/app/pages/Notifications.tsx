import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import type { Notification } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? 's' : ''} atrás`;
}

const typeStyles: Record<string, { bg: string; icon: string }> = {
  success: { bg: 'bg-[#16A34A]/10', icon: 'text-[#16A34A]' },
  warning: { bg: 'bg-[#EAB308]/10', icon: 'text-[#EAB308]' },
  error: { bg: 'bg-[#DC2626]/10', icon: 'text-[#DC2626]' },
  info: { bg: 'bg-[#0284C7]/10', icon: 'text-[#0284C7]' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) toast.error('Erro ao carregar notificações');
      else setNotifications(data ?? []);
      setLoading(false);
    }
    fetchAll();

    // Realtime: adiciona novas notificações no topo da lista
    const channel = supabase
      .channel('notifications_page_' + user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllAsRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-[20px] font-semibold text-foreground">Notificações</h1>
                {unreadCount > 0 && (
                  <p className="text-[14px] text-muted-foreground">{unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-[#2563EB] font-medium">
                <CheckCheck className="w-4 h-4" />
                Marcar todas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhuma notificação</p>
            <p className="text-[14px] text-muted-foreground mt-1">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const style = typeStyles[n.type] ?? typeStyles.info;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  className={`w-full p-4 rounded-xl text-left transition-all hover:shadow-sm ${
                    n.read ? 'bg-card border border-border' : `border ${style.bg} border-current/20`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <Bell className={`w-5 h-5 ${style.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-[16px] font-medium ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {n.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {n.link && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                          {!n.read && <span className="w-2 h-2 bg-[#2563EB] rounded-full" />}
                        </div>
                      </div>
                      <p className={`text-[14px] ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.message}</p>
                      <p className="text-[12px] text-muted-foreground mt-2">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
