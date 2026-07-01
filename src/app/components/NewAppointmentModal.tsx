import React, { useEffect, useState } from 'react';
import { X, Search, Laptop, FlaskConical, DoorOpen, Theater, Users, Monitor, Package, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, Equipment, Lab, Classroom, Auditorium } from '../../lib/supabase';

type ResourceKind = 'equipment' | 'lab' | 'classroom' | 'auditorium';
type FilterId = 'all' | ResourceKind;

interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  subtitle: string;
  available: boolean;
  slots?: number;
  capacity?: number;
  equipmentList?: string[];
}

const KIND_CONFIG: Record<ResourceKind, { label: string; icon: React.ElementType; accent: string }> = {
  equipment:  { label: 'Equipamento',  accent: '#2563EB', icon: Laptop     },
  lab:        { label: 'Laboratório',  accent: '#16A34A', icon: FlaskConical },
  classroom:  { label: 'Sala de Aula', accent: '#EA580C', icon: DoorOpen   },
  auditorium: { label: 'Auditório',    accent: '#7C3AED', icon: Theater    },
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',        label: 'Todos'         },
  { id: 'equipment',  label: 'Equipamentos'  },
  { id: 'lab',        label: 'Laboratórios'  },
  { id: 'classroom',  label: 'Salas'         },
  { id: 'auditorium', label: 'Auditórios'    },
];

interface Props {
  onClose: () => void;
}

export function NewAppointmentModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterId>('all');

  useEffect(() => {
    async function fetchAll() {
      const [eq, labs, cls, aud] = await Promise.all([
        supabase.from('equipment').select('*').order('name'),
        supabase.from('labs').select('*').order('name'),
        supabase.from('classrooms').select('*').order('name'),
        supabase.from('auditoriums').select('*').order('name'),
      ]);
      const merged: Resource[] = [
        ...(eq.data ?? []).map((e: Equipment) => ({
          id: e.id, name: e.name, kind: 'equipment' as const,
          subtitle: e.specifications,
          available: e.available_quantity > 0,
          slots: e.available_quantity,
        })),
        ...(labs.data ?? []).map((l: Lab) => ({
          id: l.id, name: l.name, kind: 'lab' as const,
          subtitle: l.building,
          available: l.is_available,
          capacity: l.capacity,
          equipmentList: l.equipment_list,
        })),
        ...(cls.data ?? []).map((c: Classroom) => ({
          id: c.id, name: c.name, kind: 'classroom' as const,
          subtitle: c.building,
          available: c.is_available,
          capacity: c.capacity,
          equipmentList: c.equipment_list,
        })),
        ...(aud.data ?? []).map((a: Auditorium) => ({
          id: a.id, name: a.name, kind: 'auditorium' as const,
          subtitle: a.building,
          available: a.is_available,
          capacity: a.capacity,
          equipmentList: a.equipment_list,
        })),
      ];
      setResources(merged);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const filtered = resources.filter((r) => {
    const matchKind   = filter === 'all' || r.kind === filter;
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                        r.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchKind && matchSearch;
  });

  function handleSelect(r: Resource) {
    if (!r.available) return;
    if (r.kind === 'equipment') {
      navigate(`/equipment/${r.id}/schedule`);
    } else {
      navigate(`/spaces/${r.kind}/${r.id}/schedule`);
    }
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-[17px] font-semibold text-foreground">Novo Agendamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-all"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto px-5 py-2 flex-shrink-0 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 pb-8 pt-2 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-[15px] font-medium text-foreground">Nenhum recurso encontrado</p>
              <p className="text-[13px] text-muted-foreground mt-1">Tente ajustar a busca ou o filtro</p>
            </div>
          ) : (
            filtered.map((r) => {
              const cfg  = KIND_CONFIG[r.kind];
              const Icon = cfg.icon;
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  disabled={!r.available}
                  className={`w-full p-4 bg-background border rounded-xl text-left transition-all ${
                    r.available
                      ? 'border-border hover:shadow-sm active:scale-[0.99]'
                      : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.accent}18` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cfg.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-[15px] font-medium text-foreground truncate">{r.name}</h3>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${cfg.accent}18`, color: cfg.accent }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground truncate">{r.subtitle}</p>
                      {r.kind === 'equipment' ? (
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Toque para ver os horários e vagas disponiveis em cada dia
                        </p>
                      ) : (
                        <div className="flex items-center gap-3 mt-0.5">
                          {r.capacity && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[12px] text-muted-foreground">{r.capacity}</span>
                            </div>
                          )}
                          {r.equipmentList?.[0] && (
                            <div className="flex items-center gap-1">
                              <Monitor className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[12px] text-muted-foreground truncate">{r.equipmentList[0]}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!r.available && (
                      <span className="text-[11px] text-[#DC2626] font-medium flex-shrink-0">Indisponível</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
