import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, FlaskConical, DoorOpen, Theater, Users, Monitor, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, Lab, Classroom, Auditorium } from '../../lib/supabase';
import { toast } from 'sonner';

type SpaceKind = 'lab' | 'classroom' | 'auditorium';
type AnySpace = (Lab | Classroom | Auditorium) & { kind: SpaceKind };

const KIND_CONFIG: Record<SpaceKind, { table: string; label: string; icon: React.ElementType; accent: string }> = {
  lab:        { table: 'labs',        label: 'Laboratórios',  icon: FlaskConical, accent: '#16A34A' },
  classroom:  { table: 'classrooms',  label: 'Salas de Aula', icon: DoorOpen,     accent: '#EA580C' },
  auditorium: { table: 'auditoriums', label: 'Auditórios',    icon: Theater,      accent: '#7C3AED' },
};

const FILTERS: { id: 'all' | SpaceKind; label: string }[] = [
  { id: 'all',        label: 'Todos' },
  { id: 'lab',        label: 'Laboratórios' },
  { id: 'classroom',  label: 'Salas de Aula' },
  { id: 'auditorium', label: 'Auditórios' },
];

export default function Spaces() {
  const navigate = useNavigate();
  const [spaces, setSpaces]   = useState<AnySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | SpaceKind>('all');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [labs, classrooms, auditoriums] = await Promise.all([
        supabase.from('labs').select('*'),
        supabase.from('classrooms').select('*'),
        supabase.from('auditoriums').select('*'),
      ]);
      if (labs.error || classrooms.error || auditoriums.error) {
        toast.error('Erro ao carregar espaços disponíveis');
      }
      const merged: AnySpace[] = [
        ...(labs.data ?? []).map(s => ({ ...s, kind: 'lab' as const })),
        ...(classrooms.data ?? []).map(s => ({ ...s, kind: 'classroom' as const })),
        ...(auditoriums.data ?? []).map(s => ({ ...s, kind: 'auditorium' as const })),
      ].sort((a, b) => a.name.localeCompare(b.name));
      setSpaces(merged);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const filtered = spaces.filter((s) => {
    const matchKind = filter === 'all' || s.kind === filter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.building.toLowerCase().includes(search.toLowerCase());
    return matchKind && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-[20px] font-semibold text-foreground">Reservar Espaço</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou prédio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-[#16A34A] text-white' : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-[16px] font-medium text-foreground">Nenhum espaço encontrado</p>
            <p className="text-[14px] text-muted-foreground mt-1">Tente ajustar sua busca ou filtro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((space) => {
              const cfg = KIND_CONFIG[space.kind];
              const Icon = cfg.icon;
              return (
                <button
                  key={`${space.kind}-${space.id}`}
                  onClick={() => space.is_available && navigate(`/spaces/${space.kind}/${space.id}/schedule`)}
                  disabled={!space.is_available}
                  className={`w-full p-4 bg-card border rounded-xl text-left transition-all ${
                    space.is_available ? 'border-border hover:shadow-md' : 'border-border opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.accent}1A` }}>
                      <Icon className="w-6 h-6" style={{ color: cfg.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[16px] font-medium text-foreground">{space.name}</h3>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.accent}1A`, color: cfg.accent }}>
                              {cfg.label.replace(/s$/, '')}
                            </span>
                          </div>
                          <p className="text-[14px] text-muted-foreground mt-0.5">{space.building}</p>
                        </div>
                        {space.is_available && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[14px] text-foreground font-medium">{space.capacity}</span>
                        </div>
                        {space.equipment_list?.[0] && (
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[14px] text-muted-foreground">{space.equipment_list[0]}</span>
                          </div>
                        )}
                      </div>
                      {!space.is_available && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <span className="text-[12px] text-[#DC2626] font-medium">Indisponível no momento</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
