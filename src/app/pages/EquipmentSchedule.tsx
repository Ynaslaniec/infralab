import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Check, AlertCircle, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { supabase, Equipment } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  TIME_SLOTS, SlotAvailability,
  fetchSlotAvailability, fetchFullyBookedDates,
  buildDays, DayItem,
} from '../../lib/slots';

// Regra de negócio: agendamentos só podem ser feitos com até 7 dias de antecedência
const LOOKAHEAD_DAYS = 7;

function validate(date: string, slotLabel: string, purpose: string): string | null {
  if (!date)            return 'Selecione uma data';
  if (!slotLabel)       return 'Selecione um horário';
  if (!purpose.trim())  return 'Informe a finalidade do uso';
  if (purpose.trim().length < 10) return 'Descreva a finalidade com pelo menos 10 caracteres';
  return null;
}

export default function EquipmentSchedule() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [equipment,       setEquipment]       = useState<Equipment | null>(null);
  const [selectedDate,    setSelectedDate]    = useState('');
  const [selectedSlot,    setSelectedSlot]    = useState<SlotAvailability | null>(null);
  const [purpose,         setPurpose]         = useState('');
  const [slots,           setSlots]           = useState<SlotAvailability[]>([]);
  const [fullyBooked,     setFullyBooked]     = useState<Set<string>>(new Set());
  const [days,            setDays]            = useState<DayItem[]>([]);
  const [loadingPage,     setLoadingPage]     = useState(true);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  // Carrega equipamento + datas esgotadas
  useEffect(() => {
    if (!id) return;
    async function init() {
      const [{ data: eq }, booked] = await Promise.all([
        supabase.from('equipment').select('*').eq('id', id!).single(),
        fetchFullyBookedDates(id!, 'equipment', new Date().toISOString().split('T')[0], LOOKAHEAD_DAYS),
      ]);
      if (eq) setEquipment(eq);
      setFullyBooked(booked);
      setDays(buildDays(LOOKAHEAD_DAYS, booked));
      setLoadingPage(false);
    }
    init();
  }, [id]);

  // Carrega disponibilidade por slot quando data muda
  useEffect(() => {
    if (!selectedDate || !id) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetchSlotAvailability(id, 'equipment', selectedDate)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, id]);

  // Recarrega disponibilidade do dia atual + datas esgotadas, garantindo que
  // contagens (X/Y) e badges (Disponível/Esgotado) reflitam o estado real do
  // backend após qualquer ação (sucesso, conflito ou erro).
  async function refreshAvailability() {
    if (!id || !selectedDate) return;
    const [freshSlots, freshBooked] = await Promise.all([
      fetchSlotAvailability(id, 'equipment', selectedDate),
      fetchFullyBookedDates(id, 'equipment', new Date().toISOString().split('T')[0], LOOKAHEAD_DAYS),
    ]);
    setSlots(freshSlots);
    setFullyBooked(freshBooked);
    setDays(buildDays(LOOKAHEAD_DAYS, freshBooked));
  }

  async function handleConfirm() {
    const err = validate(selectedDate, selectedSlot?.label ?? '', purpose);
    if (err) { setError(err); return; }
    if (!user || !equipment || !selectedSlot) return;

    setSubmitting(true);
    setError('');

    const { error: dbErr } = await supabase.from('appointments').insert({
      user_id:       user.id,
      type:          'equipment',
      resource_id:   id,
      resource_name: equipment.name,
      location:      'Retirar na Central de TI',
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
        : 'Não foi possível criar o agendamento. Tente novamente.';
      toast.error(msg);

      if (isConflict) {
        // Não duplica a mensagem em banner — apenas sincroniza a UI com o
        // estado real do backend e limpa a seleção inválida.
        setSelectedSlot(null);
        await refreshAvailability();
      } else {
        setError(msg);
      }
    } else {
      toast.success('Agendamento confirmado!');
      await refreshAvailability();
      navigate('/appointments');
    }
    setSubmitting(false);
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSlots   = TIME_SLOTS.length;
  const bookedOnDay  = slots.filter(s => !s.isAvailable).length;
  const allDayFull   = bookedOnDay === totalSlots;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/equipment')}
              className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">Agendar Equipamento</h1>
              <p className="text-[14px] text-muted-foreground">{equipment?.name}</p>
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
            <CalendarIcon className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[18px] font-semibold text-foreground">Selecione a Data</h2>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">
            Dias com <span className="text-[#DC2626] font-medium">●</span> todos os slots esgotados são indisponíveis.
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
            {days.map((d) => {
              const disabled = d.weekend || d.fullyBooked;
              return (
                <button
                  key={d.dateStr}
                  disabled={disabled}
                  onClick={() => { setSelectedDate(d.dateStr); setError(''); }}
                  className={`relative flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                    disabled
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      : selectedDate === d.dateStr
                      ? 'bg-[#2563EB] text-white shadow-lg'
                      : 'bg-card border border-border text-foreground hover:bg-accent'
                  }`}
                >
                  <div className="text-[12px] font-medium mb-1">{d.day}</div>
                  <div className="text-[18px] font-semibold">{d.date}</div>
                  {d.today && <div className="text-[10px] mt-1 opacity-75">Hoje</div>}
                  {d.fullyBooked && !d.weekend && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Seleção de horário ──────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[18px] font-semibold text-foreground">Selecione o Horário</h2>
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
              {slots.map((slot) => (
                <button
                  key={`${slot.start}-${slot.end}`}
                  disabled={!slot.isAvailable}
                  onClick={() => { setSelectedSlot(slot); setError(''); }}
                  className={`w-full p-4 rounded-xl transition-all text-left flex items-center justify-between border ${
                    !slot.isAvailable
                      ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed'
                      : selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
                      ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-lg'
                      : 'bg-card border-border text-foreground hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 ${!slot.isAvailable ? 'text-muted-foreground' : selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'text-white' : 'text-[#2563EB]'}`} />
                    <span className="text-[15px] font-medium">{slot.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Vagas disponíveis para equipamentos com múltiplas unidades */}
                    {slot.capacity > 1 && (
                      <div className={`flex items-center gap-1 text-[12px] ${!slot.isAvailable ? 'text-muted-foreground' : selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'text-white/80' : 'text-muted-foreground'}`}>
                        <Users className="w-3.5 h-3.5" />
                        <span>{Math.max(0, slot.capacity - Number(slot.bookedCount))}/{slot.capacity} disponíveis</span>
                      </div>
                    )}
                    {!slot.isAvailable
                      ? <span className="text-[12px] font-medium text-[#DC2626]">Esgotado</span>
                      : <span className={`text-[12px] font-medium ${selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'text-white/80' : 'text-[#16A34A]'}`}>Disponível</span>
                    }
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Finalidade ─────────────────────────────────────── */}
        <div>
          <label htmlFor="purpose" className="block text-[14px] font-medium text-foreground mb-2">
            Finalidade do uso <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => { setPurpose(e.target.value.slice(0, 200)); setError(''); }}
            placeholder="Descreva brevemente para que você precisa do equipamento..."
            rows={4}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none"
          />
          <p className="text-[12px] text-muted-foreground mt-1">{purpose.length}/200</p>
        </div>

        {/* ── Resumo ─────────────────────────────────────────── */}
        {selectedDate && selectedSlot && (
          <div className="p-4 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl">
            <h3 className="text-[14px] font-semibold text-foreground mb-2">Resumo do Agendamento</h3>
            <div className="space-y-1 text-[14px] text-muted-foreground">
              <p>• Equipamento: <span className="text-foreground">{equipment?.name}</span></p>
              <p>• Data: <span className="text-foreground">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
              <p>• Horário: <span className="text-foreground">{selectedSlot.label}</span></p>
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
            className="w-full py-3 bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#2563EB]/40 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Check className="w-5 h-5" /> Confirmar Agendamento</>}
          </button>
        </div>
      </div>
    </div>
  );
}
