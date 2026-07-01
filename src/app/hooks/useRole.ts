import { useAuth } from '../contexts/AuthContext';

export type AppRole = 'Coordenador' | 'Professor' | 'Técnico';

export function useRole() {
  const { profile } = useAuth();
  const role = (profile?.role ?? 'Professor') as AppRole;

  return {
    role,
    isCoordenador: role === 'Coordenador',
    isProfessor:   role === 'Professor',
    isTecnico:     role === 'Técnico',
    canSeeAllTickets:       role === 'Coordenador' || role === 'Técnico',
    canSeeAllAppointments:  role === 'Coordenador',
    canCancelAppointments:  role === 'Coordenador' || role === 'Professor',
    canAccessAppointments:  role !== 'Técnico',
  };
}
