import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { HOME_BY_ROLE } from '../components/ProtectedRoute';
import { AppRole } from '../hooks/useRole';

function validate(email: string, password: string): string | null {
  if (!email.trim()) return 'Informe seu e-mail';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido';
  if (!password) return 'Informe sua senha';
  if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres';
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      if (authError.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos');
      } else if (authError.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
      return;
    }

    // Buscar role para decidir a rota de destino
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = (profile?.role ?? 'Professor') as AppRole;
      navigate(HOME_BY_ROLE[role] ?? '/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#2563EB] rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-[24px] font-semibold text-foreground">InfraLab</h1>
          <p className="text-[14px] text-muted-foreground">Sistema de Gestão Educacional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
              <p className="text-[14px] text-[#DC2626]">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-[14px] font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="seu.email@instituicao.edu.br"
              autoComplete="email"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-[14px] font-medium text-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="text-[14px] text-[#2563EB] hover:text-[#3B82F6] font-medium transition-colors"
          >
            Esqueceu sua senha?
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2563EB] hover:bg-[#3B82F6] active:bg-[#1E40AF] disabled:bg-[#2563EB]/60 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[12px] text-muted-foreground">
          © 2026 InfraLab - Sistema Educacional
        </p>
      </div>
    </div>
  );
}
