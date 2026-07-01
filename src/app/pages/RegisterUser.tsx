import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, UserPlus, Trash2, Eye, EyeOff,
  AlertCircle, Search, RefreshCw, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { callManageUsers, Profile } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const ROLES = ['Professor', 'Técnico', 'Coordenador'];

const ROLE_COLORS: Record<string, string> = {
  Coordenador: 'bg-[#7C3AED]/10 text-[#7C3AED]',
  Professor:   'bg-[#2563EB]/10 text-[#2563EB]',
  Técnico:     'bg-[#EAB308]/10 text-[#92400E]',
};

const ROLE_DESC: Record<string, string> = {
  Coordenador: '⚠ Acesso total, incluindo cadastro de usuários.',
  Professor:   'Pode agendar equipamentos, reservar labs e abrir chamados.',
  Técnico:     'Pode gerenciar chamados e visualizar agendamentos.',
};

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

function validateForm(fullName: string, email: string, password: string): FormErrors {
  const errs: FormErrors = {};
  if (!fullName.trim())             errs.fullName = 'Informe o nome completo';
  else if (fullName.trim().length < 3) errs.fullName = 'Nome muito curto (mínimo 3 caracteres)';
  if (!email.trim())                errs.email = 'Informe o e-mail';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
  if (!password)                    errs.password = 'Informe a senha';
  else if (password.length < 6)    errs.password = 'Mínimo 6 caracteres';
  else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    errs.password = 'Use letras e números';
  return errs;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    /[A-Za-z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 10,
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['bg-[#DC2626]', 'bg-[#EAB308]', 'bg-[#EAB308]', 'bg-[#16A34A]'];
  return (
    <div className="mt-2 flex gap-1 items-center">
      {checks.map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-muted'}`} />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1">
        {score <= 1 ? 'Fraca' : score <= 2 ? 'Média' : score <= 3 ? 'Boa' : 'Forte'}
      </span>
    </div>
  );
}

export default function RegisterUser() {
  const navigate = useNavigate();
  const { profile: myProfile } = useAuth();

  const [tab, setTab] = useState<'create' | 'list'>('create');

  // Form
  const [fullName, setFullName]     = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [role, setRole]             = useState('Professor');
  const [department, setDepartment] = useState('');
  const [phone, setPhone]           = useState('');
  const [errors, setErrors]         = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // List
  const [users, setUsers]         = useState<Profile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('Todos');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);

  // Guard: apenas coordenador
  useEffect(() => {
    if (myProfile && myProfile.role !== 'Coordenador') navigate('/dashboard');
  }, [myProfile]);

  async function loadUsers() {
    setLoadingList(true);
    try {
      const { users: data } = await callManageUsers('GET');
      setUsers(data ?? []);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao carregar usuários');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { if (tab === 'list') loadUsers(); }, [tab]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(fullName, email, password);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});
    try {
      await callManageUsers('POST', {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success(`Usuário "${fullName}" criado com sucesso!`);
      setFullName(''); setEmail(''); setPassword('');
      setRole('Professor'); setDepartment(''); setPhone('');
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.toLowerCase().includes('e-mail já')) {
        setErrors({ email: 'Este e-mail já está cadastrado' });
      } else {
        toast.error(msg || 'Erro ao criar usuário');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(target: Profile) {
    setConfirmDelete(null);
    setDeletingId(target.id);
    try {
      await callManageUsers('DELETE', undefined, { user_id: target.id });
      toast.success(`"${target.full_name}" removido`);
      setUsers((p) => p.filter((u) => u.id !== target.id));
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao remover usuário');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterRole === 'Todos' || u.role === filterRole);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-5">
            <h2 className="text-[17px] font-semibold text-foreground">Remover usuário?</h2>
            <p className="text-[14px] text-muted-foreground mt-2">
              Tem certeza que deseja remover <span className="text-foreground font-medium">{confirmDelete.full_name}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-accent hover:bg-accent/80 text-foreground rounded-xl font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-medium transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-[20px] font-semibold text-foreground">Gestão de Usuários</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] rounded-full">
                Exclusivo · Coordenador
              </span>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {(['create', 'list'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-[14px] font-medium transition-all ${
                  tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                }`}>
                {t === 'create' ? 'Novo Usuário' : 'Cadastrados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB: CRIAR ── */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} noValidate
          className="max-w-md mx-auto px-6 py-6 space-y-5">

          {/* Nome */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">
              Nome Completo <span className="text-[#DC2626]">*</span>
            </label>
            <input type="text" value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
              placeholder="Ex: João da Silva"
              className={`w-full px-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all ${errors.fullName ? 'border-[#DC2626]' : 'border-border'}`}
            />
            {errors.fullName && (
              <p className="text-[12px] text-[#DC2626] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.fullName}
              </p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">
              E-mail <span className="text-[#DC2626]">*</span>
            </label>
            <input type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              placeholder="usuario@unifacear.edu.br"
              className={`w-full px-4 py-3 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all ${errors.email ? 'border-[#DC2626]' : 'border-border'}`}
            />
            {errors.email && (
              <p className="text-[12px] text-[#DC2626] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.email}
              </p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">
              Senha <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                placeholder="Mín. 6 caracteres com letras e números"
                className={`w-full px-4 py-3 pr-12 bg-card border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all ${errors.password ? 'border-[#DC2626]' : 'border-border'}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <PasswordStrength password={password} />
            {errors.password && (
              <p className="text-[12px] text-[#DC2626] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.password}
              </p>
            )}
          </div>

          {/* Perfil */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">
              Perfil / Permissão <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`p-3 rounded-xl text-[14px] font-medium transition-all border ${
                    role === r
                      ? r === 'Coordenador'
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                        : 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-card border-border text-foreground hover:bg-accent'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2 px-1">{ROLE_DESC[role]}</p>
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">Departamento</label>
            <input type="text" value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: Departamento de TI"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-[14px] font-medium text-foreground mb-2">Telefone</label>
            <input type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(41) 99999-9999"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all"
            />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#7C3AED]/60 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><UserPlus className="w-5 h-5" /> Criar Usuário</>}
          </button>
        </form>
      )}

      {/* ── TAB: LISTA ── */}
      {tab === 'list' && (
        <div className="max-w-md mx-auto px-6 py-6 space-y-4">
          {/* Search + refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Buscar por nome ou e-mail..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-all"
              />
            </div>
            <button onClick={loadUsers} disabled={loadingList}
              className="p-2.5 bg-card border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingList ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Role filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6">
            {['Todos', ...ROLES].map((r) => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
                  filterRole === r ? 'bg-[#7C3AED] text-white' : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}>
                {r}
              </button>
            ))}
          </div>

          {loadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-[16px] font-medium text-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground">
                {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[16px] font-semibold text-[#7C3AED]">
                          {u.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-medium text-foreground truncate">{u.full_name}</h3>
                            <p className="text-[13px] text-muted-foreground truncate">{u.email}</p>
                            {u.department && (
                              <p className="text-[12px] text-muted-foreground mt-0.5">{u.department}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-muted text-muted-foreground'}`}>
                              {u.role}
                            </span>
                            {u.id !== myProfile?.id && (
                              <button
                                onClick={() => setConfirmDelete(u)}
                                disabled={deletingId === u.id}
                                className="p-1.5 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition-colors disabled:opacity-50">
                                {deletingId === u.id
                                  ? <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                                  : <Trash2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
