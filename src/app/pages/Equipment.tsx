import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, Laptop, Monitor, Tablet, Camera, Mic, ChevronRight, Package, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, Equipment as EquipmentType } from '../../lib/supabase';
import { useRole } from '../hooks/useRole';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  Notebook: Laptop,
  Projetor: Monitor,
  Tablet: Tablet,
  Câmera: Camera,
  Áudio: Mic,
};

const categories = ['Todos', 'Notebook', 'Projetor', 'Tablet', 'Câmera', 'Áudio'];

export default function Equipment() {
  const navigate = useNavigate();
  const { isCoordenador } = useRole();
  const [equipmentList, setEquipmentList] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // ── CRUD (Coordenador) ───────────────────────────────────────
  const [formTarget, setFormTarget]   = useState<'new' | EquipmentType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EquipmentType | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchEquipment() {
    setLoading(true);
    const { data, error } = await supabase.from('equipment').select('*').order('name');
    if (error) toast.error('Erro ao carregar equipamentos');
    else setEquipmentList(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchEquipment(); }, []);

  const filtered = equipmentList.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Todos' || e.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // ── Criar / Editar ───────────────────────────────────────────
  async function handleSubmitForm(values: { name: string; category: string; specifications: string; total_quantity: number; }) {
    if (formTarget === 'new') {
      const { error } = await supabase.from('equipment').insert({
        name: values.name,
        category: values.category,
        specifications: values.specifications,
        total_quantity: values.total_quantity,
        available_quantity: values.total_quantity,
      });
      if (error) throw new Error('Não foi possível criar o equipamento.');
      toast.success('Equipamento criado com sucesso!');
    } else if (formTarget) {
      const target = formTarget;
      // Mantém a proporção de disponibilidade ao alterar a quantidade total
      const diff = values.total_quantity - target.total_quantity;
      const newAvailable = Math.max(0, Math.min(values.total_quantity, target.available_quantity + diff));
      const { error } = await supabase.from('equipment').update({
        name: values.name,
        category: values.category,
        specifications: values.specifications,
        total_quantity: values.total_quantity,
        available_quantity: newAvailable,
      }).eq('id', target.id);
      if (error) throw new Error('Não foi possível salvar as alterações.');
      toast.success('Equipamento atualizado com sucesso!');
    }
    setFormTarget(null);
    fetchEquipment();
  }

  // ── Excluir ──────────────────────────────────────────────────
  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('equipment').delete().eq('id', pendingDelete.id);
    if (error) {
      toast.error(error.message.includes('foreign key')
        ? 'Não é possível excluir: existem agendamentos vinculados a este equipamento.'
        : 'Não foi possível excluir o equipamento.');
    } else {
      toast.success('Equipamento excluído.');
      setPendingDelete(null);
      fetchEquipment();
    }
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Modal de criação/edição ──────────────────────────── */}
      {formTarget && (
        <ResourceFormModal
          kind="equipment"
          initial={formTarget === 'new' ? null : formTarget}
          onSubmit={handleSubmitForm}
          onClose={() => setFormTarget(null)}
        />
      )}

      {/* ── Modal de confirmação de exclusão ─────────────────── */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-5">
            <h2 className="text-[17px] font-semibold text-foreground">Excluir equipamento?</h2>
            <p className="text-[14px] text-muted-foreground mt-2">
              Tem certeza que deseja excluir <span className="text-foreground font-medium">{pendingDelete.name}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPendingDelete(null)} disabled={deleting}
                className="flex-1 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-medium transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-[20px] font-semibold text-foreground flex-1">Equipamentos</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar equipamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-[#2563EB] text-white' : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhum equipamento encontrado</p>
            <p className="text-[14px] text-muted-foreground mt-1">Tente ajustar sua busca ou filtro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((eq) => {
              const Icon = iconMap[eq.category] ?? Package;
              return (
                <div
                  key={eq.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/equipment/${eq.id}/schedule`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/equipment/${eq.id}/schedule`); }}
                  className="w-full p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-[16px] font-medium text-foreground">{eq.name}</h3>
                          <p className="text-[14px] text-muted-foreground mt-0.5">{eq.specifications}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isCoordenador && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFormTarget(eq); }}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPendingDelete(eq); }}
                                className="p-1.5 rounded-lg hover:bg-[#DC2626]/10 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                              </button>
                            </>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Toque para ver os horários e vagas disponíveis em cada dia
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button — Novo Equipamento (somente Coordenador) */}
      {isCoordenador && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto relative h-0">
            <button
              onClick={() => setFormTarget('new')}
              aria-label="Novo Equipamento"
              className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-[#2563EB] hover:bg-[#3B82F6] text-white shadow-lg flex items-center justify-center transition-colors pointer-events-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
