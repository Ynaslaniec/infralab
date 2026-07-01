import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Building2, ChevronRight, Moon, Sun, LogOut, Bell, HelpCircle, Shield, FileText, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

function validatePhone(phone: string): boolean {
  return /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/.test(phone.replace(/\s/g, ''));
}

type InfoKey = 'privacy' | 'help' | 'terms';

const INFO_CONTENT: Record<InfoKey, { title: string; icon: React.ElementType; body: string[] }> = {
  privacy: {
    title: 'Privacidade',
    icon: Shield,
    body: [
      'O InfraLab coleta apenas os dados necessários para o funcionamento do sistema: nome, e-mail institucional, telefone, departamento e histórico de uso (agendamentos e chamados).',
      'Seus dados são armazenados de forma segura e o acesso é restrito de acordo com o seu perfil (Professor, Técnico ou Coordenador).',
      'Você pode solicitar a atualização ou remoção dos seus dados a qualquer momento entrando em contato com a coordenação.',
    ],
  },
  help: {
    title: 'Central de Ajuda',
    icon: HelpCircle,
    body: [
      'Precisa de ajuda para usar o InfraLab? Aqui estão algumas dicas rápidas:',
      '• Para reservar um equipamento, laboratório, sala ou auditório, acesse "Agendamentos" e toque no botão "+".',
      '• Para relatar um problema técnico, acesse "Chamados" e toque no botão "+".',
      '• Acompanhe o status do seu chamado e converse com o técnico responsável diretamente pelo chat.',
      'Caso o problema persista, entre em contato com a equipe de suporte pelo e-mail suporte@infralab.edu.br.',
    ],
  },
  terms: {
    title: 'Termos de Uso',
    icon: FileText,
    body: [
      'Ao utilizar o InfraLab, você concorda em fornecer informações verídicas e utilizar os recursos institucionais de forma responsável.',
      'É proibido o uso indevido de equipamentos, espaços e funcionalidades do sistema, bem como o compartilhamento de credenciais de acesso.',
      'A instituição reserva-se o direito de suspender o acesso de usuários que descumprirem estes termos.',
      'Estes termos podem ser atualizados periodicamente; recomendamos a revisão ocasional desta página.',
    ],
  },
};

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, user, signOut, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({ appointments: 0, tickets: 0, labs: 0 });
  const [infoModal, setInfoModal] = useState<InfoKey | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setDepartment(profile.department ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    async function fetchStats() {
      const [appt, tick, labRes] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('type', 'lab'),
      ]);
      setStats({
        appointments: appt.count ?? 0,
        tickets: tick.count ?? 0,
        labs: labRes.count ?? 0,
      });
    }
    fetchStats();
  }, [user]);

  async function handleSave() {
    if (!fullName.trim()) { toast.error('Informe seu nome completo'); return; }
    if (phone && !validatePhone(phone)) { toast.error('Telefone inválido. Ex: (11) 98765-4321'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, department: department.trim() || null })
      .eq('id', user!.id);

    if (error) {
      toast.error('Erro ao salvar perfil');
    } else {
      await refreshProfile();
      toast.success('Perfil atualizado!');
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-foreground">Perfil</h1>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-[14px] text-[#2563EB] font-medium">
                Editar
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-accent transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* User Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
              <User className="w-8 h-8 text-[#2563EB]" />
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              ) : (
                <>
                  <h2 className="text-[18px] font-semibold text-foreground">{profile?.full_name ?? '—'}</h2>
                  <p className="text-[14px] text-muted-foreground">{profile?.role ?? 'Usuário'}</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-[14px] text-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              {editing ? (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              ) : (
                <span className="text-[14px] text-foreground">{profile?.phone ?? 'Não informado'}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              {editing ? (
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Departamento de TI"
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              ) : (
                <span className="text-[14px] text-foreground">{profile?.department ?? 'Não informado'}</span>
              )}
            </div>
          </div>

          {editing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full py-2.5 bg-[#2563EB] hover:bg-[#3B82F6] disabled:bg-[#2563EB]/60 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Save className="w-4 h-4" /> Salvar alterações</>}
            </button>
          )}
        </div>

        {/* Settings */}
        <div>
          <h3 className="text-[16px] font-semibold text-foreground mb-3 px-1">Configurações</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => navigate('/notifications')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-foreground" />
                <span className="text-[14px] text-foreground font-medium">Notificações</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={toggleTheme}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                {theme === 'light' ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
                <span className="text-[14px] text-foreground font-medium">
                  {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => setInfoModal('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-foreground" />
                <span className="text-[14px] text-foreground font-medium">Privacidade</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-[16px] font-semibold text-foreground mb-3 px-1">Suporte</h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setInfoModal('help')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-foreground" />
                <span className="text-[14px] text-foreground font-medium">Central de Ajuda</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setInfoModal('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-foreground" />
                <span className="text-[14px] text-foreground font-medium">Termos de Uso</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-[16px] font-semibold text-foreground mb-4">Estatísticas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-[24px] font-semibold text-[#2563EB]">{stats.appointments}</div>
              <div className="text-[12px] text-muted-foreground mt-1">Agendamentos</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-semibold text-[#16A34A]">{stats.tickets}</div>
              <div className="text-[12px] text-muted-foreground mt-1">Chamados</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-semibold text-[#EAB308]">{stats.labs}</div>
              <div className="text-[12px] text-muted-foreground mt-1">Reservas</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full p-4 bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>

        <p className="text-center text-[12px] text-muted-foreground">InfraLab v1.0.0 • © 2026</p>
      </div>

      {/* Modal genérico — Privacidade / Central de Ajuda / Termos de Uso */}
      {infoModal && (
        <div
          onClick={() => setInfoModal(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <div className="flex items-center gap-3">
                {(() => { const Icon = INFO_CONTENT[infoModal].icon; return <Icon className="w-5 h-5 text-foreground" />; })()}
                <h2 className="text-[17px] font-semibold text-foreground">{INFO_CONTENT[infoModal].title}</h2>
              </div>
              <button onClick={() => setInfoModal(null)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {INFO_CONTENT[infoModal].body.map((line, i) => (
                <p key={i} className="text-[14px] text-foreground leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
