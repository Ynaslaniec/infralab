import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Chama a Edge Function manage-users (autenticado)
export async function callManageUsers(
  method: 'GET' | 'POST' | 'DELETE',
  body?: object,
  params?: Record<string, string>
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const url = new URL(`${supabaseUrl}/functions/v1/manage-users`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erro na requisição');
  return json;
}

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

export type Equipment = {
  id: string;
  name: string;
  category: string;
  specifications: string;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
};

export type Lab = {
  id: string;
  name: string;
  capacity: number;
  building: string;
  equipment_list: string[];
  is_available: boolean;
  created_at: string;
};

export type Classroom = {
  id: string;
  name: string;
  capacity: number;
  building: string;
  equipment_list: string[];
  is_available: boolean;
  created_at: string;
};

export type Auditorium = {
  id: string;
  name: string;
  capacity: number;
  building: string;
  equipment_list: string[];
  is_available: boolean;
  created_at: string;
};

export type Ticket = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  location: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  // present when queried from tickets_with_author view
  author_name?: string;
  author_role?: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  type: 'equipment' | 'lab';
  resource_id: string;
  resource_name: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  // present when queried from appointments_with_author view
  author_name?: string;
  author_role?: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  // joined from profiles when fetched
  sender_name?: string;
  sender_role?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  read: boolean;
  link: string | null;
  created_at: string;
};
