import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, FlaskConical, Users, Monitor, ChevronRight, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, Lab } from '../../lib/supabase';
import { useRole } from '../hooks/useRole';
import { ResourceFormModal } from '../components/ResourceFormModal';
import { toast } from 'sonner';

export default function Labs() {
  const navigate = useNavigate();
  const { isCoordenador } = useRole();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── CRUD (Coordenador) ───────────────────────────────────────
  const [formTarget, setFormTarget]       = useState<'new' | Lab | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lab | null>(null);
  const [deleting, setDeleting]           = useState(false);

  async function fetchLabs() {
    setLoading(true);
    const { data, error } = await supabase.from('labs').select('*').order('name');
    if (error) toast.error('Erro ao carregar laboratórios');
    else setLabs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchLabs(); }, []);

  const filtered = labs.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSubmitForm(values: { name: string; capacity: number; building: string; equipment_list: string[]; is_available: boolean; }) {
    if (formTarget === 'new') {
      const { error } = await supabase.from('labs').insert(values);
      if (error) throw new Error('Não foi possível criar o laboratório.');
      toast.success('Laboratório criado com sucesso!');
    } else if (formTarget) {
      const { error } = await supabase.from('labs').update(values).eq('id', formTarget.id);
      if (error) throw new Error('Não foi possível salvar as alterações.');
      toast.success('Laboratório atualizado com sucesso!');
    }
    setFormTarget(null);
    fetchLabs();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('labs').delete().eq('id', pendingDelete.id);
    if (error) {
      toast.error(error.message.includes('foreign key')
        ? 'Não é possível excluir: existem agendamentos vinculados a este laboratório.'
        : 'Não foi possível excluir o laboratório.');
    } else {
      toast.success('Laboratório excluído.');
      setPendingDelete(null);
      fetchLabs();
    }
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {formTarget && (
        <ResourceFormModal
          kind="lab"
          initial={formTarget === 'new' ? null : formTarget}
          onSubmit={handleSubmitForm}
          onClose={() => setFormTarget(null)}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-5">
            <h2 className="text-[17px] font-semibold text-foreground">Excluir laboratório?</h2>
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
            <h1 className="text-[20px] font-semibold text-foreground flex-1">Laboratórios</h1>
            {isCoordenador && (
              <button
                onClick={() => setFormTarget('new')}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-[13px] font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar laboratório..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhum laboratório encontrado</p>
          </div>
        ) : (
          filtered.map((lab) => (
            <div
              key={lab.id}
              role="button"
              tabIndex={0}
              onClick={() => lab.is_available && navigate(`/labs/${lab.id}/schedule`)}
              onKeyDown={(e) => { if (e.key === 'Enter' && lab.is_available) navigate(`/labs/${lab.id}/schedule`); }}
              className={`w-full p-4 bg-card border rounded-xl text-left transition-all ${
                lab.is_available ? 'border-border hover:shadow-md cursor-pointer' : 'border-border opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${lab.is_available ? 'bg-[#16A34A]/10' : 'bg-muted'}`}>
                  <FlaskConical className={`w-6 h-6 ${lab.is_available ? 'text-[#16A34A]' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-[16px] font-medium text-foreground">{lab.name}</h3>
                      <p className="text-[14px] text-muted-foreground mt-0.5">{lab.building}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isCoordenador && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFormTarget(lab); }}
                            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete(lab); }}
                            className="p-1.5 rounded-lg hover:bg-[#DC2626]/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-[#DC2626]" />
                          </button>
                        </>
                      )}
                      {lab.is_available && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[14px] text-foreground font-medium">{lab.capacity}</span>
                    </div>
                    {lab.equipment_list?.[0] && (
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[14px] text-muted-foreground">{lab.equipment_list[0]}</span>
                      </div>
                    )}
                  </div>
                  {!lab.is_available && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-[12px] text-[#DC2626] font-medium">Indisponível no momento</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
