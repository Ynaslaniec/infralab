import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Equipment, Lab, Classroom, Auditorium } from '../../lib/supabase';

type Mode = 'create' | 'edit';
type RoomLike = Lab | Classroom | Auditorium;
type RoomKind = 'lab' | 'classroom' | 'auditorium';

interface EquipmentFormProps {
  kind: 'equipment';
  initial?: Equipment | null;
  onSubmit: (values: {
    name: string; category: string; specifications: string; total_quantity: number;
  }) => Promise<void>;
  onClose: () => void;
}

interface RoomFormProps {
  kind: RoomKind;
  initial?: RoomLike | null;
  onSubmit: (values: {
    name: string; capacity: number; building: string; equipment_list: string[]; is_available: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

type Props = EquipmentFormProps | RoomFormProps;

const KIND_LABELS: Record<RoomKind, string> = {
  lab: 'Laboratório',
  classroom: 'Sala de Aula',
  auditorium: 'Auditório',
};

const EQUIPMENT_CATEGORIES = ['Notebook', 'Projetor', 'Tablet', 'Câmera', 'Áudio'];

export function ResourceFormModal(props: Props) {
  const { kind, onClose } = props;
  const mode: Mode = props.initial ? 'edit' : 'create';
  const overlayRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── campos comuns ────────────────────────────────────────────
  const [name, setName] = useState(props.initial?.name ?? '');

  // ── campos de equipamento ────────────────────────────────────
  const eqInitial = kind === 'equipment' ? (props.initial as Equipment | null) : null;
  const [category, setCategory]   = useState(eqInitial?.category ?? EQUIPMENT_CATEGORIES[0]);
  const [specs, setSpecs]         = useState(eqInitial?.specifications ?? '');
  const [totalQty, setTotalQty]   = useState(String(eqInitial?.total_quantity ?? '1'));

  // ── campos de ambiente (laboratório / sala / auditório) ──────
  const roomInitial = kind !== 'equipment' ? (props.initial as RoomLike | null) : null;
  const [capacity, setCapacity]   = useState(String(roomInitial?.capacity ?? ''));
  const [building, setBuilding]   = useState(roomInitial?.building ?? '');
  const [equipList, setEquipList] = useState((roomInitial?.equipment_list ?? []).join(', '));
  const [isAvailable, setIsAvailable] = useState(roomInitial?.is_available ?? true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !submitting) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting, onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !submitting) onClose();
  }

  function validate(): string | null {
    if (!name.trim() || name.trim().length < 3) return 'Informe um nome válido (mínimo 3 caracteres).';
    if (kind === 'equipment') {
      if (!specs.trim()) return 'Informe as especificações.';
      const n = parseInt(totalQty);
      if (isNaN(n) || n < 1) return 'Quantidade total inválida.';
    } else {
      const c = parseInt(capacity);
      if (isNaN(c) || c < 1) return 'Capacidade inválida.';
      if (!building.trim()) return 'Informe o prédio/bloco.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    setError('');
    try {
      if (kind === 'equipment') {
        await (props as EquipmentFormProps).onSubmit({
          name: name.trim(),
          category,
          specifications: specs.trim(),
          total_quantity: parseInt(totalQty),
        });
      } else {
        await (props as RoomFormProps).onSubmit({
          name: name.trim(),
          capacity: parseInt(capacity),
          building: building.trim(),
          equipment_list: equipList.split(',').map(s => s.trim()).filter(Boolean),
          is_available: isAvailable,
        });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const accent = kind === 'equipment' ? '#2563EB'
    : kind === 'auditorium' ? '#7C3AED'
    : kind === 'classroom' ? '#EA580C'
    : '#16A34A';
  const entityLabel = kind === 'equipment' ? 'Equipamento' : KIND_LABELS[kind];
  const title = `${mode === 'create' ? 'Novo' : 'Editar'} ${entityLabel}`;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
    >
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} disabled={submitting} className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl">
              <p className="text-[13px] text-[#DC2626]">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Nome <span className="text-[#DC2626]">*</span></label>
            <input
              value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder={
                kind === 'equipment'  ? 'Ex: Notebook Dell Inspiron'
                : kind === 'auditorium' ? 'Ex: Auditório Central'
                : kind === 'classroom'  ? 'Ex: Sala 204'
                : 'Ex: Laboratório de Informática 1'
              }
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': `${accent}4D` } as React.CSSProperties}
            />
          </div>

          {kind === 'equipment' ? (
            <>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Categoria</label>
                <select
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                >
                  {EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Especificações <span className="text-[#DC2626]">*</span></label>
                <input
                  value={specs} onChange={(e) => { setSpecs(e.target.value); setError(''); }}
                  placeholder="Ex: 16GB RAM, 512GB SSD"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Quantidade total <span className="text-[#DC2626]">*</span></label>
                <input
                  type="number" min="1" value={totalQty}
                  onChange={(e) => { setTotalQty(e.target.value); setError(''); }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                />
                <p className="text-[12px] text-muted-foreground mt-1">A disponibilidade é recalculada automaticamente conforme as reservas.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Capacidade (alunos) <span className="text-[#DC2626]">*</span></label>
                <input
                  type="number" min="1" value={capacity}
                  onChange={(e) => { setCapacity(e.target.value); setError(''); }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Prédio/Bloco <span className="text-[#DC2626]">*</span></label>
                <input
                  value={building} onChange={(e) => { setBuilding(e.target.value); setError(''); }}
                  placeholder="Ex: Bloco B - Sala 12"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Equipamentos do laboratório</label>
                <input
                  value={equipList} onChange={(e) => setEquipList(e.target.value)}
                  placeholder="Ex: Projetor, 30 computadores (separe por vírgula)"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 transition-all"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-[14px] text-foreground">Disponível para reservas</span>
              </label>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="flex-1 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (mode === 'create' ? 'Criar' : 'Salvar Alterações')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
