import React from 'react';
import { Home, Calendar, AlertCircle, User, Users, Building2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useRole } from '../hooks/useRole';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCoordenador, isTecnico } = useRole();

  // Técnico não vê Agendamentos; Coordenador vê aba Usuários extra
  const tabs = [
    { id: 'home',         label: 'Home',        icon: Home,        path: '/dashboard',    show: true },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar,    path: '/appointments', show: !isTecnico },
    { id: 'tickets',      label: 'Chamados',     icon: AlertCircle, path: '/tickets',      show: true },
    { id: 'infrastructure', label: 'Infraestrutura', icon: Building2, path: '/infrastructure', show: isCoordenador },
    { id: 'users',        label: 'Usuários',     icon: Users,       path: '/users',        show: isCoordenador },
    { id: 'profile',      label: 'Perfil',       icon: User,        path: '/profile',      show: true },
  ].filter((t) => t.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px] ${
                isActive
                  ? tab.id === 'users' || tab.id === 'infrastructure' ? 'text-[#7C3AED]' : 'text-[#2563EB]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
