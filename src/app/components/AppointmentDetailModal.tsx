import React from 'react';
import { X, Calendar, Clock, MapPin, User, Laptop, FlaskConical, BookOpen, Mic2, CalendarPlus, MessageSquare } from 'lucide-react';
import { Appointment } from '../../lib/supabase';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  equipment:  { label: 'Equipamento',  color: '#2563EB', icon: Laptop },
  lab:        { label: 'Laboratório',  color: '#16A34A', icon: FlaskConical },
  classroom:  { label: 'Sala de Aula', color: '#EA580C', icon: BookOpen },
  auditorium: { label: 'Auditório',    color: '#7C3AED', icon: Mic2 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  upcoming:  { label: 'Confirmado', color: '#2563EB', bg: '#2563EB1A' },
  completed: { label: 'Concluído',  color: '#16A34A', bg: '#16A34A1A' },
  cancelled: { label: 'Cancelado',  color: '#DC2626', bg: '#DC26261A' },
};

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[14px] text-foreground font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function AppointmentDetailModal({ appointment: a, onClose }: Props) {
  const typeConf   = TYPE_CONFIG[a.type]   ?? TYPE_CONFIG.equipment;
  const statusConf = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.upcoming;
  const TypeIcon   = typeConf.icon;

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatCreated(d: string) {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-[17px] font-semibold text-foreground">Detalhes do Agendamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Recurso + status */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border border-border"
            style={{ background: `${typeConf.color}08` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${typeConf.color}18` }}
            >
              <TypeIcon className="w-6 h-6" style={{ color: typeConf.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-foreground truncate">{a.resource_name}</h3>
              <span className="text-[12px] font-medium" style={{ color: typeConf.color }}>{typeConf.label}</span>
            </div>
            <span
              className="text-[12px] font-semibold px-3 py-1 rounded-full flex-shrink-0"
              style={{ color: statusConf.color, background: statusConf.bg }}
            >
              {statusConf.label}
            </span>
          </div>

          {/* Campos */}
          <div className="space-y-3">
            {a.location && <Row icon={MapPin}       label="Local"      value={a.location} />}
            <Row icon={Calendar}    label="Data"       value={formatDate(a.date)} />
            <Row icon={Clock}       label="Horário"    value={`${a.start_time} – ${a.end_time}`} />
            {a.author_name && (
              <Row
                icon={User}
                label="Solicitante"
                value={a.author_role ? `${a.author_name} · ${a.author_role}` : a.author_name}
              />
            )}
            <Row icon={CalendarPlus} label="Criado em" value={formatCreated(a.created_at)} />
          </div>

          {/* Motivo do cancelamento */}
          {a.status === 'cancelled' && a.cancellation_reason && (
            <div className="p-3 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-[#DC2626] mb-0.5">Motivo do Cancelamento</p>
                <p className="text-[13px] text-foreground italic">"{a.cancellation_reason}"</p>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
