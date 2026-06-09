import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Laptop, FlaskConical, DoorOpen, Theater, Users, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, Equipment, Lab, Classroom, Auditorium } from '../../lib/supabase';
import { useRole } from '../hooks/useRole';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { toast } from 'sonner';

type EntityKind = 'equipment' | 'lab' | 'classroom' | 'auditorium';
type AnyEntity = Equipment | Lab | Classroom | Auditorium;

const TABS: { id: EntityKind; label: string; table: string; icon: React.ElementType; accent: string }[] = [
  { id: 'equipment',  label: 'Equipamentos',  table: 'equipment',  icon: Laptop,       accent: '#2563EB' },
  { id: 'lab',        label: 'Laboratórios',  table: 'labs',       icon: FlaskConical, accent: '#16A34A' },
  { id: 'classroom',  label: 'Salas de Aula', table: 'classrooms', icon: DoorOpen,     accent: '#EA580C' },
  { id: 'auditorium', label: 'Auditórios',    table: 'auditoriums',icon: Theater,      accent: '#7C3AED' },
];

function isEquipment(e: AnyEntity): e is Equipment {
  return 'total_quantity' in e;
}

export default function Infrastructure() {
  const navigate = useNavigate();
  const { isCoordenador } = useRole();

  const [activeTab, setActiveTab] = useState<EntityKind>('equipment');
  const [items, setItems]         = useState<AnyEntity[]>([]);
  const [loading, setLoading]     = useState(true);

  const [formTarget, setFormTarget]       = useState<'new' | AnyEntity | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AnyEntity | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const tab = TABS.find(t => t.id === activeTab)!;

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase.from(tab.table).select('*').order('name');
    if (error) toast.error(`Erro ao carregar ${tab.label.toLowerCase()}`);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, [activeTab]);

  if (!isCoordenador) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-[#EAB308]/10 rounded-2xl flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-[#EAB308]" />
        </div>
        <h2 className="text-[20px] font-semibold text-foreground">Acesso Restrito</h2>
        <p className="text-[14px] text-muted-foreground mt-2 max-w-xs">
          Esta área é exclusiva para coordenadores.
        </p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-6 py-3 bg-[#2563EB] text-white rounded-xl font-medium hover:bg-[#3B82F6] transition-colors">
          Voltar ao Início
        </button>
      </div>
    );
  }

  // ── Criar / Editar ───────────────────────────────────────────
  async function handleSubmitForm(values: any) {
    const payload = activeTab === 'equipment'
      ? {
          name: values.name,
          category: values.category,
          specifications: values.specifications,
          total_quantity: values.total_quantity,
          available_quantity: formTarget === 'new'
            ? values.total_quantity
            : Math.max(0, Math.min(values.total_quantity,
                (formTarget as Equipment).available_quantity + (values.total_quantity - (formTarget as Equipment).total_quantity))),
        }
      : {
          name: values.name,
          capacity: values.capacity,
          building: values.building,
          equipment_list: values.equipment_list,
          is_available: values.is_available,
        };

    if (formTarget === 'new') {
      const { error } = await supabase.from(tab.table).insert(payload);
      if (error) throw new Error(`Não foi possível criar: ${tab.label.slice(0, -1).toLowerCase()}.`);
      toast.success(`${tab.label.slice(0, -1)} criado(a) com sucesso!`);
    } else if (formTarget) {
      const { error } = await supabase.from(tab.table).update(payload).eq('id', (formTarget as any).id);
      if (error) throw new Error('Não foi possível salvar as alterações.');
      toast.success(`${tab.label.slice(0, -1)} atualizado(a) com sucesso!`);
    }
    setFormTarget(null);
    fetchItems();
  }

  // ── Excluir ──────────────────────────────────────────────────
  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from(tab.table).delete().eq('id', (pendingDelete as any).id);
    if (error) {
      toast.error(error.message.includes('foreign key')
        ? 'Não é possível excluir: existem agendamentos vinculados a este item.'
        : 'Não foi possível excluir o item.');
    } else {
      toast.success('Item excluído.');
      setPendingDelete(null);
      fetchItems();
    }
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {formTarget && (
        <ResourceFormModal
          kind={activeTab}
          initial={formTarget === 'new' ? null : (formTarget as any)}
          onSubmit={handleSubmitForm}
          onClose={() => setFormTarget(null)}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-5">
            <h2 className="text-[17px] font-semibold text-foreground">Excluir item?</h2>
            <p className="text-[14px] text-muted-foreground mt-2">
              Tem certeza que deseja excluir <span className="text-foreground font-medium">{(pendingDelete as any).name}</span>? Esta ação não pode ser desfeita.
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
            <h1 className="text-[20px] font-semibold text-foreground flex-1">Infraestrutura</h1>
            <button
              onClick={() => setFormTarget('new')}
              className="flex items-center gap-1.5 px-3 py-2 text-white rounded-xl text-[13px] font-medium transition-colors"
              style={{ backgroundColor: tab.accent }}
            >
              <Plus className="w-4 h-4" /> Novo
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                    active ? 'text-white' : 'bg-card border border-border text-foreground hover:bg-accent'
                  }`}
                  style={active ? { backgroundColor: t.accent } : undefined}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <tab.icon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhum item cadastrado</p>
            <p className="text-[14px] text-muted-foreground mt-1">Toque em "Novo" para adicionar.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={(item as any).id} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tab.accent}1A` }}>
                  <tab.icon className="w-5 h-5" style={{ color: tab.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[16px] font-medium text-foreground">{(item as any).name}</h3>
                      {isEquipment(item) ? (
                        <p className="text-[13px] text-muted-foreground mt-0.5">{item.specifications} · {item.category}</p>
                      ) : (
                        <p className="text-[13px] text-muted-foreground mt-0.5">{(item as any).building}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setFormTarget(item)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Editar">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => setPendingDelete(item)} className="p-1.5 rounded-lg hover:bg-[#DC2626]/10 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4 text-[#DC2626]" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-[13px] text-muted-foreground">
                    {isEquipment(item) ? (
                      <span>Quantidade: <span className="text-foreground font-medium">{item.total_quantity}</span></span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {(item as any).capacity}</span>
                        <span className={(item as any).is_available ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                          {(item as any).is_available ? 'Disponível' : 'Indisponível'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
