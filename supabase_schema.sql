-- ============================================================
-- InfraLab - Schema Supabase
-- Execute este SQL no painel do Supabase > SQL Editor
-- ============================================================

-- PROFILES (criado automaticamente ao registrar)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  department text,
  role text not null default 'Professor',
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Usuário vê seu próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Usuário atualiza seu próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- Trigger para criar profile ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- EQUIPMENT
create table if not exists public.equipment (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  specifications text,
  total_quantity int not null default 1,
  available_quantity int not null default 1,
  created_at timestamptz default now()
);
alter table public.equipment enable row level security;
create policy "Todos podem ver equipamentos" on public.equipment
  for select using (true);

-- LABS
create table if not exists public.labs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  capacity int not null,
  building text not null,
  equipment_list text[] default '{}',
  is_available boolean not null default true,
  created_at timestamptz default now()
);
alter table public.labs enable row level security;
create policy "Todos podem ver laboratórios" on public.labs
  for select using (true);

-- APPOINTMENTS
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('equipment', 'lab')),
  resource_id uuid not null,
  resource_name text not null,
  location text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz default now()
);
alter table public.appointments enable row level security;
create policy "Usuário vê seus agendamentos" on public.appointments
  for select using (auth.uid() = user_id);
create policy "Usuário cria agendamentos" on public.appointments
  for insert with check (auth.uid() = user_id);
create policy "Usuário cancela seus agendamentos" on public.appointments
  for update using (auth.uid() = user_id);

-- TICKETS
create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'cancelled')),
  location text not null,
  image_urls text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tickets enable row level security;
create policy "Usuário vê seus chamados" on public.tickets
  for select using (auth.uid() = user_id);
create policy "Usuário cria chamados" on public.tickets
  for insert with check (auth.uid() = user_id);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('success', 'info', 'warning', 'error')),
  read boolean not null default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Usuário vê suas notificações" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Usuário atualiza suas notificações" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- DADOS INICIAIS (seed)
-- ============================================================
insert into public.equipment (name, category, specifications, total_quantity, available_quantity) values
  ('Notebook Dell Inspiron', 'Notebook', 'Intel i5, 8GB RAM, 256GB SSD', 8, 5),
  ('Projetor Epson', 'Projetor', '3500 lumens, Full HD', 5, 3),
  ('Tablet Samsung Galaxy', 'Tablet', '10.1", 64GB, Android', 15, 10),
  ('Câmera Canon EOS', 'Câmera', 'DSLR, 24MP, Kit com lente', 3, 2),
  ('Microfone Shure SM58', 'Áudio', 'Vocal, Com fio, XLR', 10, 8)
on conflict do nothing;

insert into public.labs (name, capacity, building, equipment_list, is_available) values
  ('Laboratório de Informática 1', 30, 'Bloco A - 2º Andar', ARRAY['30 Computadores', 'Projetor', 'Ar Condicionado'], true),
  ('Laboratório de Informática 2', 40, 'Bloco A - 3º Andar', ARRAY['40 Computadores', '2 Projetores', 'Ar Condicionado'], true),
  ('Laboratório de Física', 25, 'Bloco B - 1º Andar', ARRAY['Bancadas Experimentais', 'Equipamentos de Física'], false),
  ('Laboratório de Química', 20, 'Bloco B - 2º Andar', ARRAY['Bancadas', 'Capela', 'Equipamentos'], true),
  ('Laboratório Multimídia', 35, 'Bloco C - 1º Andar', ARRAY['Computadores', 'Tablets', 'Lousa Digital'], true)
on conflict do nothing;

-- Storage bucket para imagens de chamados
insert into storage.buckets (id, name, public) values ('ticket-images', 'ticket-images', true)
on conflict do nothing;
create policy "Usuário faz upload de imagens" on storage.objects
  for insert with check (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);
create policy "Imagens são públicas" on storage.objects
  for select using (bucket_id = 'ticket-images');
