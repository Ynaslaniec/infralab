import React, { useEffect, useState } from 'react';
import { Bell, Laptop, FlaskConical, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '../components/StatusBadge';
import { supabase, Appointment, Ticket } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const quickActions = [
  { id: 'equipment', title: 'Agendar\nEquipamento', icon: Laptop, color: '#2563EB', path: '/equipment' },
  { id: 'lab', title: 'Reservar\nEspaço', icon: FlaskConical, color: '#16A34A', path: '/spaces' },
  { id: 'report', title: 'Relatar\nProblema', icon: AlertCircle, color: '#DC2626', path: '/report' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const [apptRes, ticketRes, notifRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user!.id)
          .eq('status', 'upcoming')
          .order('date', { ascending: true })
          .limit(3),
        supabase
          .from('tickets')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('read', false),
      ]);

      if (apptRes.data) setAppointments(apptRes.data);
      if (ticketRes.data) setTickets(ticketRes.data);
      if (notifRes.count !== null) setUnreadCount(notifRes.count);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Usuário';

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">Olá, {firstName}!</h1>
              <p className="text-[14px] text-muted-foreground">{todayCapitalized}</p>
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-xl hover:bg-accent transition-colors"
            >
              <Bell className="w-6 h-6 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-[18px] font-semibold text-foreground mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:shadow-md transition-all active:scale-95"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: action.color }} />
                  </div>
                  <span className="text-[12px] font-medium text-foreground text-center leading-tight whitespace-pre-line">
                    {action.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-foreground">Próximos Agendamentos</h2>
            <button onClick={() => navigate('/appointments')} className="text-[14px] text-[#2563EB] font-medium">
              Ver todos
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="p-4 bg-card border border-border rounded-xl animate-pulse h-20" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-4 bg-card border border-border rounded-xl text-center">
              <p className="text-[14px] text-muted-foreground">Nenhum agendamento próximo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.type === 'equipment' ? 'bg-[#2563EB]/10' : 'bg-[#16A34A]/10'}`}>
                      {a.type === 'equipment'
                        ? <Laptop className="w-5 h-5 text-[#2563EB]" />
                        : <FlaskConical className="w-5 h-5 text-[#16A34A]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-medium text-foreground">{a.resource_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[14px] text-muted-foreground">
                          {new Date(a.date).toLocaleDateString('pt-BR')} • {a.start_time} - {a.end_time}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status="success">Confirmado</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold text-foreground">Chamados Recentes</h2>
            <button onClick={() => navigate('/tickets')} className="text-[14px] text-[#2563EB] font-medium">
              Ver todos
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="p-4 bg-card border border-border rounded-xl animate-pulse h-20" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-4 bg-card border border-border rounded-xl text-center">
              <p className="text-[14px] text-muted-foreground">Nenhum chamado recente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${t.status === 'resolved' ? 'bg-[#16A34A]/10' : 'bg-[#EAB308]/10'}`}>
                        {t.status === 'resolved'
                          ? <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                          : <Clock className="w-5 h-5 text-[#EAB308]" />}
                      </div>
                      <div>
                        <h3 className="text-[16px] font-medium text-foreground">{t.title}</h3>
                        <p className="text-[14px] text-muted-foreground mt-1">
                          {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={t.status === 'resolved' ? 'success' : 'warning'}>
                      {t.status === 'resolved' ? 'Resolvido' : t.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
