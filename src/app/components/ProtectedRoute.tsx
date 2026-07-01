import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import type { AppRole } from '../hooks/useRole';

// Rota home padrão por role
export const HOME_BY_ROLE: Record<AppRole, string> = {
  Coordenador: '/dashboard',
  Professor:   '/dashboard',
  Técnico:     '/tickets',
};

// Rotas permitidas por role (undefined = todos os roles autenticados)
const ALLOWED_ROLES: Record<string, AppRole[] | undefined> = {
  '/dashboard':              ['Coordenador', 'Professor'],
  '/equipment':              ['Coordenador', 'Professor'],
  '/labs':                   ['Coordenador', 'Professor'],
  '/report':                 ['Coordenador', 'Professor'],
  '/appointments':           ['Coordenador', 'Professor'],
  '/notifications':          ['Coordenador', 'Professor'],
  '/users':                  ['Coordenador'],
  '/infrastructure':         ['Coordenador'],
  '/spaces':                 ['Coordenador', 'Professor'],
  '/tickets':                undefined,   // todos
  '/profile':                undefined,   // todos
};

function matchAllowed(pathname: string): AppRole[] | undefined {
  // exact match first
  if (ALLOWED_ROLES[pathname] !== undefined || pathname in ALLOWED_ROLES) {
    return ALLOWED_ROLES[pathname];
  }
  // prefix match para rotas dinâmicas (/equipment/:id/schedule etc.)
  for (const [key, roles] of Object.entries(ALLOWED_ROLES)) {
    if (key !== '/' && pathname.startsWith(key)) return roles;
  }
  return undefined; // sem restrição
}

// ─── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── ProtectedRoute: exige autenticação ─────────────────────────────────────
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ─── RoleRoute: exige autenticação + role permitido para a rota ─────────────
export function RoleRoute({
  children,
  path,
}: {
  children: React.ReactNode;
  path: string;
}) {
  const { user, loading } = useAuth();
  const { role } = useRole();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;

  const allowed = matchAllowed(path);
  if (allowed && !allowed.includes(role as AppRole)) {
    return <Navigate to={HOME_BY_ROLE[role as AppRole] ?? '/tickets'} replace />;
  }

  return <>{children}</>;
}
