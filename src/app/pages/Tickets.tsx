import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Wrench, ChevronRight, Users, User, Plus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '../components/StatusBadge';
import { supabase, Ticket } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────
type FilterStatus = 'all' | 'pending' | 'in_progress' | 'resolved' | 'cancelled';

const PRIORITY_LABEL: Record<string, string> = { high: '● Alta', medium: '● Média', low: '● Baixa' };
const PRIORITY_COLOR: Record<string, string> = {
  high:   'text-[#DC2626]',
  medium: 'text-[#EAB308]',
  low:    'text-[#0284C7]',
};

const STATUS_ICON = {
  resolved:   { bg: 'bg-[#16A34A]/10', el: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" /> },
  in_progress:{ bg: 'bg-[#EAB308]/10', el: <Wrench       className="w-5 h-5 text-[#EAB308]" /> },
  pending:    { bg: 'bg-muted',         el: <Clock        className="w-5 h-5 text-muted-foreground" /> },
  cancelled:  { bg: 'bg-muted',         el: <Clock        className="w-5 h-5 text-muted-foreground" /> },
} as const;

// ─── Filtros por role ─────────────────────────────────────────
// Coordenador: todos os status
// Professor  : todos os status (só os seus)
// Técnico    : apenas abertos (pending + in_progress)
const FILTER_OPTIONS: Record<string, { value: FilterStatus; label: string }[]> = {
  Coordenador: [
    { value: 'all',        label: 'Todos' },
    { value: 'pending',    label: 'Pendentes' },
    { value: 'in_progress',label: 'Em Andamento' },
    { value: 'resolved',   label: 'Resolvidos' },
    { value: 'cancelled',  label: 'Cancelados' },
  ],
  Professor: [
    { value: 'all',        label: 'Todos' },
    { value: 'pending',    label: 'Pendentes' },
    { value: 'in_progress',label: 'Em Andamento' },
    { value: 'resolved',   label: 'Resolvidos' },
  ],
  Técnico: [
    { value: 'all',        label: 'Abertos' },      // "all" = pending+in_progress para Técnico
    { value: 'pending',    label: 'Pendentes' },
    { value: 'in_progress',label: 'Em Andamento' },
    { value: 'resolved',   label: 'Solucionados' },
  ],
};

// ─── Badge de autor ───────────────────────────────────────────
function AuthorBadge({ name, role }: { name?: string; role?: string }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <User className="w-3 h-3 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{name}</span>
      {role && (
        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{role}</span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────
export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, canSeeAllTickets, isTecnico, isCoordenador } = useRole();

  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const filterOptions = FILTER_OPTIONS[role] ?? FILTER_OPTIONS['Professor'];

  useEffect(() => {
    if (!user) return;

    async function fetchTickets() {
      setLoading(true);

      // Técnico e Coordenador usam a view com nome do autor
      const table = canSeeAllTickets ? 'tickets_with_author' : 'tickets';
      let query = (supabase as any).from(table).select('*');

      // Professor vê apenas os seus
      if (!canSeeAllTickets) {
        query = query.eq('user_id', user!.id);
      }

      // Técnico: "all" = apenas abertos; filtros específicos aplicam status exato
      if (isTecnico) {
        if (filterStatus === 'all') {
          query = query.in('status', ['pending', 'in_progress']);
        } else {
          query = query.eq('status', filterStatus);
        }
      } else if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        toast.error('Erro ao carregar chamados');
        console.error(error);
      } else {
        setTickets(data ?? []);
      }
      setLoading(false);
    }

    fetchTickets();
  }, [user, role, filterStatus]);

  // Cabeçalho varia por role
  const headerTitle = isTecnico ? 'Chamados do Sistema' : 'Chamados';
  const headerSub = canSeeAllTickets
    ? isTecnico
      ? 'Visualizando chamados abertos de todos os usuários'
      : 'Visualizando todos os chamados do sistema'
    : undefined;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">{headerTitle}</h1>
              {headerSub && (
                <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" />{headerSub}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isTecnico && (
                <button
                  onClick={() => navigate('/report')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white rounded-xl text-[13px] font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Relatar Problema
                </button>
              )}
              {/* Badge de role */}
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                role === 'Coordenador' ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
                : role === 'Técnico'  ? 'bg-[#EAB308]/10 text-[#92400E]'
                : 'bg-[#2563EB]/10 text-[#2563EB]'
              }`}>
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-4">
        {/* Filtros de status */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                filterStatus === f.value
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Contador */}
        {!loading && tickets.length > 0 && (
          <p className="text-[12px] text-muted-foreground">
            {tickets.length} chamado{tickets.length !== 1 ? 's' : ''} encontrado{tickets.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhum chamado encontrado</p>
            <p className="text-[14px] text-muted-foreground mt-1">
              {isTecnico
                ? 'Não há chamados abertos no momento'
                : 'Tente outro filtro'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const icon = STATUS_ICON[ticket.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending;
              return (
                <div
                  key={ticket.id}
                  className="p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${icon.bg}`}>
                      {icon.el}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-medium text-muted-foreground">
                              #{ticket.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                              {PRIORITY_LABEL[ticket.priority]}
                            </span>
                          </div>
                          <h3 className="text-[16px] font-medium text-foreground leading-tight">
                            {ticket.title}
                          </h3>
                          <p className="text-[13px] text-muted-foreground mt-0.5">{ticket.location}</p>

                          {/* Autor — visível para Coordenador e Técnico */}
                          {canSeeAllTickets && (
                            <AuthorBadge name={ticket.author_name} role={ticket.author_role} />
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {ticket.status === 'pending'     && <StatusBadge status="pending">Pendente</StatusBadge>}
                          {ticket.status === 'in_progress' && <StatusBadge status="warning">Em andamento</StatusBadge>}
                          {ticket.status === 'resolved'    && <StatusBadge status="success">Resolvido</StatusBadge>}
                          {ticket.status === 'cancelled'   && <StatusBadge status="error">Cancelado</StatusBadge>}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Miniaturas das imagens anexadas */}
                      {ticket.image_urls && ticket.image_urls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {ticket.image_urls.slice(0, 3).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img
                                src={url}
                                alt={`Imagem ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-[12px] text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                          {' às '}
                          {new Date(ticket.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[12px] text-muted-foreground">{ticket.category}</span>
                      </div>

                      {/* Chat — autor, técnico e coordenador */}
                      {(ticket.user_id === user?.id || isTecnico || isCoordenador) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${ticket.id}/chat`); }}
                          className="flex items-center justify-center gap-1.5 w-full mt-2 py-2 px-3 bg-accent text-foreground rounded-lg text-[13px] font-medium hover:bg-accent/80 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" /> Abrir Chat
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
