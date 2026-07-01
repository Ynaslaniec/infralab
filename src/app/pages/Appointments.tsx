import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Laptop, FlaskConical, ShieldOff, User, Users, MessageSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '../components/StatusBadge';
import { CancelModal } from '../components/CancelModal';
import { AppointmentDetailModal } from '../components/AppointmentDetailModal';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { supabase, Appointment } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { toast } from 'sonner';

type FilterStatus = 'upcoming' | 'completed' | 'cancelled';
type FilterType   = 'all' | 'equipment' | 'lab' | 'classroom' | 'auditorium';

// ─── Badge de autor ────────────────────────────────────────────
function AuthorBadge({ name, role }: { name?: string; role?: string }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <User className="w-3 h-3 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{name}</span>
      {role && (
        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{role}</span>
      )}
    </div>
  );
}

// ─── Tela bloqueada (Técnico) ──────────────────────────────────
function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-[#EAB308]/10 rounded-2xl flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-[#EAB308]" />
      </div>
      <h2 className="text-[20px] font-semibold text-foreground">Acesso Restrito</h2>
      <p className="text-[14px] text-muted-foreground mt-2 max-w-xs">
        Técnicos não possuem acesso à tela de agendamentos.
      </p>
      <button
        onClick={() => navigate('/tickets')}
        className="mt-6 px-6 py-3 bg-[#2563EB] text-white rounded-xl font-medium hover:bg-[#3B82F6] transition-colors"
      >
        Ir para Chamados
      </button>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────
export default function Appointments() {
  const { user } = useAuth();
  const { role, canSeeAllAppointments, canCancelAppointments, canAccessAppointments } = useRole();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('upcoming');
  const [filterType,   setFilterType]   = useState<FilterType>('all');

  // Modal state
  const [pendingCancel, setPendingCancel] = useState<Appointment | null>(null);
  const [detailAppt,      setDetailAppt]      = useState<Appointment | null>(null);
  const [showNewModal,    setShowNewModal]    = useState(false);

  if (!canAccessAppointments) return <AccessDenied />;

  // ── Fetch ────────────────────────────────────────────────────
  async function fetchAppointments() {
    if (!user) return;
    setLoading(true);

    const table = canSeeAllAppointments ? 'appointments_with_author' : 'appointments';
    let query = (supabase as any).from(table).select('*');

    if (!canSeeAllAppointments) query = query.eq('user_id', user.id);

    query = query
      .eq('status', filterStatus)
      .order('date', { ascending: filterStatus === 'upcoming' });

    if (filterType !== 'all') query = query.eq('type', filterType);

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar agendamentos');
      console.error(error);
    } else {
      setAppointments(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchAppointments(); }, [user, role, filterStatus, filterType]);

  // ── Cancelamento com motivo ──────────────────────────────────
  async function handleConfirmCancel(reason: string) {
    if (!pendingCancel || !canCancelAppointments) return;

    const id = pendingCancel.id;

    let query = supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
      })
      .eq('id', id);

    // Professor só pode cancelar os seus
    if (!canSeeAllAppointments) {
      query = query.eq('user_id', user!.id);
    }

    const { error } = await query;

    if (error) {
      // Trigger vai rejeitar se reason estiver vazio (segurança extra)
      toast.error(error.message.includes('cancellation_reason')
        ? 'O motivo do cancelamento é obrigatório.'
        : 'Erro ao cancelar agendamento.');
      throw error; // mantém o modal aberto
    }

    toast.success('Agendamento cancelado com sucesso.');
    setPendingCancel(null);
    fetchAppointments();
  }

  const headerSub = canSeeAllAppointments
    ? 'Visualizando agendamentos de todos os usuários'
    : undefined;

  return (
    <>
      {/* ── Modal de cancelamento ────────────────────────────── */}
      {pendingCancel && (
        <CancelModal
          appointment={pendingCancel}
          onConfirm={handleConfirmCancel}
          onClose={() => setPendingCancel(null)}
        />
      )}

      {/* ── Modal de detalhes ────────────────────────────────── */}
      {detailAppt && (
        <AppointmentDetailModal
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
        />
      )}

      {/* ── Modal de novo agendamento ─────────────────────────── */}
      {showNewModal && (
        <NewAppointmentModal onClose={() => setShowNewModal(false)} />
      )}

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-md mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-foreground">Agendamentos</h1>
                {headerSub && (
                  <p className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />{headerSub}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  role === 'Coordenador' ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                  : 'bg-[#2563EB]/10 text-[#2563EB]'
                }`}>
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-6 space-y-4">
          {/* Filtro de status */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
            {(['upcoming', 'completed', 'cancelled'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                  filterStatus === s
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}
              >
                {s === 'upcoming' ? 'Próximos' : s === 'completed' ? 'Concluídos' : 'Cancelados'}
              </button>
            ))}
          </div>

          {/* Filtro de tipo */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-hide">
            {(['all', 'equipment', 'lab', 'classroom', 'auditorium'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                  filterType === t
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'all' ? 'Todos'
                  : t === 'equipment' ? 'Equipamentos'
                  : t === 'lab' ? 'Laboratórios'
                  : t === 'classroom' ? 'Salas de Aula'
                  : 'Auditórios'}
              </button>
            ))}
          </div>

          {/* Contador */}
          {!loading && appointments.length > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-[16px] font-medium text-foreground">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 -mr-1 scrollbar-hide">
              {appointments.map((a) => (
                <div key={a.id} className="p-3 bg-card border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.type === 'equipment' ? 'bg-[#2563EB]/10' : 'bg-[#16A34A]/10'
                    }`}>
                      {a.type === 'equipment'
                        ? <Laptop       className="w-5 h-5 text-[#2563EB]" />
                        : <FlaskConical className="w-5 h-5 text-[#16A34A]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[16px] font-medium text-foreground">{a.resource_name}</h3>
                          <p className="text-[13px] text-muted-foreground mt-0.5">{a.location}</p>
                          {canSeeAllAppointments && (
                            <AuthorBadge name={a.author_name} role={a.author_role} />
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {a.status === 'upcoming'  && <StatusBadge status="info">Confirmado</StatusBadge>}
                          {a.status === 'completed' && <StatusBadge status="success">Concluído</StatusBadge>}
                          {a.status === 'cancelled' && <StatusBadge status="error">Cancelado</StatusBadge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[14px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(a.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{a.start_time} – {a.end_time}</span>
                        </div>
                      </div>

                      {/* Motivo do cancelamento (aba Cancelados) */}
                      {a.status === 'cancelled' && a.cancellation_reason && (
                        <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-[13px] text-muted-foreground italic">
                            "{a.cancellation_reason}"
                          </p>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => setDetailAppt(a)}
                          className="flex-1 py-2 px-3 bg-accent text-foreground rounded-lg text-[14px] font-medium hover:bg-accent/80 transition-colors"
                        >
                          Detalhes
                        </button>
                        {a.status === 'upcoming' && canCancelAppointments && (
                          <button
                            onClick={() => setPendingCancel(a)}
                            className="flex-1 py-2 px-3 bg-[#DC2626]/10 text-[#DC2626] rounded-lg text-[14px] font-medium hover:bg-[#DC2626]/20 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button — Novo Agendamento */}
      {canAccessAppointments && role !== 'Técnico' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto relative h-0">
            <button
              onClick={() => setShowNewModal(true)}
              aria-label="Novo Agendamento"
              className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-[#2563EB] hover:bg-[#3B82F6] text-white shadow-lg flex items-center justify-center transition-colors pointer-events-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
