import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Appointment } from '../../lib/supabase';

interface Props {
  appointment: Appointment;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 300;

const QUICK_REASONS = [
  'Aula cancelada pelo professor',
  'Conflito de horário',
  'Equipamento não é mais necessário',
  'Remarcação para outra data',
  'Problema de saúde',
];

export function CancelModal({ appointment, onConfirm, onClose }: Props) {
  const [reason, setReason]       = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);

  // Foca o textarea ao abrir
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Fecha ao pressionar Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting, onClose]);

  function handleQuickReason(text: string) {
    setReason(text);
    setError('');
    textareaRef.current?.focus();
  }

  function validate(): boolean {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Informe o motivo do cancelamento.');
      return false;
    }
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(`O motivo deve ter pelo menos ${MIN_REASON_LENGTH} caracteres.`);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  }

  // Fecha ao clicar fora do card
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !submitting) onClose();
  }

  const date = new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
  const charCount = reason.trim().length;
  const isValid   = charCount >= MIN_REASON_LENGTH;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
    >
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#DC2626]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">Cancelar Agendamento</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Resumo do agendamento */}
        <div className="mx-5 mt-4 p-3 bg-muted rounded-xl">
          <p className="text-[13px] font-medium text-foreground">{appointment.resource_name}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {date} · {appointment.start_time} – {appointment.end_time}
          </p>
          {appointment.location && (
            <p className="text-[12px] text-muted-foreground">{appointment.location}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Motivos rápidos */}
          <div>
            <p className="text-[13px] font-medium text-foreground mb-2">Sugestões de motivo</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickReason(r)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                    reason === r
                      ? 'bg-[#DC2626] text-white border-[#DC2626]'
                      : 'bg-card border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">
              Motivo do cancelamento <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value.slice(0, MAX_REASON_LENGTH));
                setError('');
              }}
              placeholder="Descreva o motivo do cancelamento..."
              rows={3}
              disabled={submitting}
              className={`w-full px-4 py-3 bg-background border rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                error
                  ? 'border-[#DC2626] focus:ring-[#DC2626]/30'
                  : 'border-border focus:ring-[#DC2626]/30 focus:border-[#DC2626]'
              }`}
            />

            {/* Contador + erro */}
            <div className="flex items-center justify-between mt-1">
              {error ? (
                <p className="text-[12px] text-[#DC2626]">{error}</p>
              ) : (
                <p className={`text-[12px] ${isValid ? 'text-[#16A34A]' : 'text-muted-foreground'}`}>
                  {isValid ? '✓ Motivo válido' : `Mínimo ${MIN_REASON_LENGTH} caracteres`}
                </p>
              )}
              <span className={`text-[11px] ${charCount >= MAX_REASON_LENGTH * 0.9 ? 'text-[#EAB308]' : 'text-muted-foreground'}`}>
                {charCount}/{MAX_REASON_LENGTH}
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="flex-1 py-3 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/40 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
              ) : (
                'Confirmar Cancelamento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
