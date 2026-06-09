import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Check, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { supabase, Lab, Classroom, Auditorium } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  TIME_SLOTS, SlotAvailability,
  fetchSlotAvailability, fetchFullyBookedDates,
  buildDays, DayItem,
} from '../../lib/slots';

// Regra de negócio: agendamentos só podem ser feitos com até 7 dias de antecedência
const LOOKAHEAD_DAYS = 7;

type SpaceKind = 'lab' | 'classroom' | 'auditorium';
type Space = Lab | Classroom | Auditorium;

const KIND_CONFIG: Record<SpaceKind, { table: string; label: string; backTo: string; accent: string; subjectLabel: string }> = {
  lab:        { table: 'labs',        label: 'Laboratório',  backTo: '/labs',           accent: '#16A34A', subjectLabel: 'Disciplina/Atividade' },
  classroom:  { table: 'classrooms',  label: 'Sala de Aula', backTo: '/infrastructure', accent: '#EA580C', subjectLabel: 'Disciplina/Atividade' },
  auditorium: { table: 'auditoriums', label: 'Auditório',    backTo: '/infrastructure', accent: '#7C3AED', subjectLabel: 'Evento/Atividade' },
};

function validate(
  date: string, slotLabel: string,
  subject: string, attendeesCount: string, capacity: number,
): string | null {
  if (!date)            return 'Selecione uma data';
  if (!slotLabel)       return 'Selecione um horário';
  if (!subject.trim())  return 'Informe a finalidade do uso';
  if (subject.trim().length < 3) return 'Descrição muito curta';
  if (!attendeesCount)  return 'Informe o número de participantes';
  const n = parseInt(attendeesCount);
  if (isNaN(n) || n < 1)  return 'Número de participantes inválido';
  if (n > capacity)        return `Excede a capacidade do espaço (${capacity})`;
  return null;
}

export default function SpaceSchedule() {
  const navigate = useNavigate();
  const { kind, id } = useParams<{ kind: SpaceKind; id: string }>();
  const { user } = useAuth();

  const cfg = KIND_CONFIG[(kind as SpaceKind) ?? 'lab'];

  const [space,         setSpace]         = useState<Space | null>(null);
  const [selectedDate,  setSelectedDate]  = useState('');
  const [selectedSlot,  setSelectedSlot]  = useState<SlotAvailability | null>(null);
  const [subject,       setSubject]       = useState('');
  const [attendees,     setAttendees]     = useState('');
  const [slots,         setSlots]         = useState<SlotAvailability[]>([]);
  const [fullyBooked,   setFullyBooked]   = useState<Set<string>>(new Set());
  const [days,          setDays]          = useState<DayItem[]>([]);
  const [loadingPage,   setLoadingPage]   = useState(true);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (!id || !kind) return;
    async function init() {
      const [{ data: spaceData }, booked] = await Promise.all([
        supabase.from(cfg.table).select('*').eq('id', id!).single(),
        fetchFullyBookedDates(id!, kind as SpaceKind, new Date().toISOString().split('T')[0], LOOKAHEAD_DAYS),
      ]);
      if (spaceData) setSpace(spaceData);
      setFullyBooked(booked);
      setDays(buildDays(LOOKAHEAD_DAYS, booked));
      setLoadingPage(false);
    }
    init();
  }, [id, kind]);

  useEffect(() => {
    if (!selectedDate || !id || !kind) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetchSlotAvailability(id, kind as SpaceKind, selectedDate)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, id, kind]);

  async function refreshAvailability() {
    if (!id || !kind || !selectedDate) return;
    const [freshSlots, freshBooked] = await Promise.all([
      fetchSlotAvailability(id, kind as SpaceKind, selectedDate),
      fetchFullyBookedDates(id, kind as SpaceKind, new Date().toISOString().split('T')[0], LOOKAHEAD_DAYS),
    ]);
    setSlots(freshSlots);
    setFullyBooked(freshBooked);
    setDays(buildDays(LOOKAHEAD_DAYS, freshBooked));
  }

  async function handleConfirm() {
    const err = validate(selectedDate, selectedSlot?.label ?? '', subject, attendees, (space as any)?.capacity ?? 0);
    if (err) { setError(err); return; }
    if (!user || !space || !selectedSlot || !kind) return;

    setSubmitting(true);
    setError('');

    const { error: dbErr } = await supabase.from('appointments').insert({
      user_id:       user.id,
      type:          kind,
      resource_id:   id,
      resource_name: (space as any).name,
      location:      (space as any).building,
      date:          selectedDate,
      start_time:    selectedSlot.start,
      end_time:      selectedSlot.end,
      status:        'upcoming',
    });

    if (dbErr) {
      const isConflict = dbErr.message.includes('Conflito de horário');
      const msg = dbErr.message.includes('chk_valid_time_slot')
        ? 'Horário inválido. Selecione um dos slots permitidos.'
        : dbErr.message.includes('7 dias de antecedência')
        ? 'Agendamentos só podem ser feitos com até 7 dias de antecedência.'
        : dbErr.message.includes('data passada')
        ? 'Não é possível agendar em uma data passada.'
        : isConflict
        ? 'Esse horário acabou de ficar indisponível (conflito com outra reserva sobreposta). Escolha outro slot.'
        : 'Não foi possível criar a reserva. Tente novamente.';
      toast.error(msg);

      if (isConflict) {
        setSelectedSlot(null);
        await refreshAvailability();
      } else {
        setError(msg);
      }
    } else {
      toast.success('Reserva confirmada!');
      await refreshAvailability();
      navigate('/appointments');
    }
    setSubmitting(false);
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: cfg.accent, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const allDayFull = slots.length > 0 && slots.every(s => !s.isAvailable);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(cfg.backTo)}
              className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">Reservar {cfg.label}</h1>
              <p className="text-[14px] text-muted-foreground">{(space as any)?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <p className="text-[14px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* ── Seleção de data ─────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-5 h-5" style={{ color: cfg.accent }} />
            <h2 className="text-[18px] font-semibold text-foreground">Selecione o Dia</h2>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">
            Agendamentos com até 7 dias de antecedência. Dias com <span className="text-[#DC2626] font-medium">●</span> estão totalmente reservados.
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const disabled = d.weekend || d.fullyBooked;
              return (
                <button
                  key={d.dateStr}
                  disabled={disabled}
                  onClick={() => { setSelectedDate(d.dateStr); setError(''); }}
                  className={`relative py-3 rounded-xl text-center transition-all ${
                    disabled
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      : selectedDate === d.dateStr
                      ? 'text-white shadow-lg'
                      : 'bg-card border border-border text-foreground hover:bg-accent'
                  }`}
                  style={selectedDate === d.dateStr && !disabled ? { backgroundColor: cfg.accent } : undefined}
                >
                  <div className="text-[10px] font-medium mb-0.5">{d.day}</div>
                  <div className="text-[15px] font-semibold">{d.date}</div>
                  {d.today && <div className="text-[9px] opacity-75">Hoje</div>}
                  {d.fullyBooked && !d.weekend && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Seleção de horário ──────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5" style={{ color: cfg.accent }} />
            <h2 className="text-[18px] font-semibold text-foreground">Horários Disponíveis</h2>
          </div>

          {!selectedDate ? (
            <p className="text-[14px] text-muted-foreground italic">Selecione uma data primeiro.</p>
          ) : loadingSlots ? (
            <div className="space-y-2">
              {TIME_SLOTS.map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allDayFull ? (
            <div className="p-4 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl text-center">
              <p className="text-[14px] text-[#DC2626] font-medium">Todos os horários deste dia estão ocupados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                const selected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                return (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    disabled={!slot.isAvailable}
                    onClick={() => { setSelectedSlot(slot); setError(''); }}
                    className={`w-full p-4 rounded-xl transition-all text-left flex items-center justify-between border ${
                      !slot.isAvailable
                        ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed'
                        : selected
                        ? 'text-white shadow-lg border-transparent'
                        : 'bg-card border-border text-foreground hover:bg-accent'
                    }`}
                    style={selected && slot.isAvailable ? { backgroundColor: cfg.accent } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4" style={{ color: !slot.isAvailable ? undefined : selected ? '#fff' : cfg.accent }} />
                      <span className="text-[15px] font-medium">{slot.label}</span>
                    </div>
                    {!slot.isAvailable
                      ? <span className="text-[12px] font-medium text-[#DC2626]">Ocupado</span>
                      : <span className={`text-[12px] font-medium ${selected ? 'text-white/80' : 'text-[#16A34A]'}`}>Disponível</span>
                    }
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detalhes ────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-[14px] font-medium text-foreground mb-2">
              {cfg.subjectLabel} <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="subject" type="text" value={subject}
              onChange={(e) => { setSubject(e.target.value); setError(''); }}
              placeholder="Ex: Aula de Introdução à Programação"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label htmlFor="attendees" className="block text-[14px] font-medium text-foreground mb-2">
              Número de Participantes <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="attendees" type="number" value={attendees}
              onChange={(e) => { setAttendees(e.target.value); setError(''); }}
              placeholder="Ex: 25" min="1" max={(space as any)?.capacity}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">Capacidade máxima: {(space as any)?.capacity}</p>
          </div>
        </div>

        {/* ── Resumo ─────────────────────────────────────────── */}
        {selectedDate && selectedSlot && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: `${cfg.accent}0D`, borderColor: `${cfg.accent}33` }}>
            <h3 className="text-[14px] font-semibold text-foreground mb-2">Resumo da Reserva</h3>
            <div className="space-y-1 text-[14px] text-muted-foreground">
              <p>• {cfg.label}: <span className="text-foreground">{(space as any)?.name}</span></p>
              <p>• Data: <span className="text-foreground">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
              <p>• Horário: <span className="text-foreground">{selectedSlot.label}</span></p>
              {subject   && <p>• Finalidade: <span className="text-foreground">{subject}</span></p>}
              {attendees && <p>• Participantes: <span className="text-foreground">{attendees}</span></p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Botão fixo ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedDate || !selectedSlot}
            className="w-full py-3 text-white rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: cfg.accent }}
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Check className="w-5 h-5" /> Confirmar Reserva</>}
          </button>
        </div>
      </div>
    </div>
  );
}
