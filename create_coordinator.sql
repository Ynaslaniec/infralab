-- ============================================================
-- InfraLab - Criar usuário coordenador
-- Execute no painel: Supabase > SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Inserir usuário coordenador em auth.users (somente se não existir)
do $$
begin
  if not exists (
    select 1 from auth.users where email = 'coordenador@unifacear.edu.br'
  ) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      banned_until, reauthentication_token, reauthentication_sent_at,
      is_sso_user, deleted_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'coordenador@unifacear.edu.br',
      crypt('123456', gen_salt('bf')),
      now(),
      null, '', null, '', null, '', '', null, now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Coordenador InfraLab"}',
      false, now(), now(),
      null, null, '', '', null, '', 0, null, '', null, false, null
    );
  end if;
end $$;

-- 2. Garantir profile com role = Coordenador
update public.profiles
set
  full_name  = 'Coordenador InfraLab',
  role       = 'Coordenador',
  department = 'Coordenação Acadêmica'
where email = 'coordenador@unifacear.edu.br';

-- ============================================================
-- 3. Recriar todas as políticas da tabela profiles
-- ============================================================
drop policy if exists "Usuário vê seu próprio perfil"        on public.profiles;
drop policy if exists "Usuário atualiza seu próprio perfil"  on public.profiles;
drop policy if exists "Coordenador vê todos os perfis"       on public.profiles;
drop policy if exists "Coordenador atualiza qualquer perfil" on public.profiles;

create policy "Usuário vê seu próprio perfil" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

create policy "Usuário atualiza seu próprio perfil" on public.profiles
  for update using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

-- ============================================================
-- 4. Recriar políticas da tabela tickets
-- ============================================================
drop policy if exists "Usuário vê seus chamados"        on public.tickets;
drop policy if exists "Usuário cria chamados"           on public.tickets;
drop policy if exists "Coordenador vê todos os chamados" on public.tickets;
drop policy if exists "Coordenador atualiza chamados"   on public.tickets;

create policy "Usuário vê seus chamados" on public.tickets
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

create policy "Usuário cria chamados" on public.tickets
  for insert with check (auth.uid() = user_id);

create policy "Coordenador atualiza chamados" on public.tickets
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

-- ============================================================
-- 5. Recriar políticas da tabela appointments
-- ============================================================
drop policy if exists "Usuário vê seus agendamentos"          on public.appointments;
drop policy if exists "Usuário cria agendamentos"             on public.appointments;
drop policy if exists "Usuário cancela seus agendamentos"     on public.appointments;
drop policy if exists "Coordenador vê todos os agendamentos"  on public.appointments;

create policy "Usuário vê seus agendamentos" on public.appointments
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

create policy "Usuário cria agendamentos" on public.appointments
  for insert with check (auth.uid() = user_id);

create policy "Usuário cancela seus agendamentos" on public.appointments
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Coordenador'
    )
  );

-- ============================================================
-- Verificação
-- ============================================================
select
  u.email,
  p.full_name,
  p.role,
  p.department,
  u.email_confirmed_at is not null as email_confirmado
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'coordenador@unifacear.edu.br';
