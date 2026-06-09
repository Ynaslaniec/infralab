import { supabase } from './supabase';

// ── Definição canônica dos slots permitidos ─────────────────────
export const TIME_SLOTS = [
  { start: '19:10', end: '20:45', label: '19:10 – 20:45' },
  { start: '19:10', end: '21:45', label: '19:10 – 21:45' },
  { start: '20:50', end: '21:45', label: '20:50 – 21:45' },
] as const;

export type SlotKey = `${string}-${string}`;  // e.g. '19:10-20:45'

export function slotKey(start: string, end: string): SlotKey {
  return `${start}-${end}` as SlotKey;
}

// ── Disponibilidade por slot para uma data ─────────────────────
export type SlotAvailability = {
  start: string;
  end: string;
  label: string;
  bookedCount: number;
  capacity: number;
  isAvailable: boolean;
};

export async function fetchSlotAvailability(
  resourceId: string,
  resourceType: 'equipment' | 'lab' | 'classroom' | 'auditorium',
  date: string,
): Promise<SlotAvailability[]> {
  const { data, error } = await supabase.rpc('get_slot_availability', {
    p_resource_id:   resourceId,
    p_resource_type: resourceType,
    p_date:          date,
  });

  if (error || !data) return TIME_SLOTS.map((s) => ({ ...s, bookedCount: 0, capacity: 1, isAvailable: true }));

  return TIME_SLOTS.map((slot) => {
    const row = (data as any[]).find(
      (r) => r.start_t.startsWith(slot.start) && r.end_t.startsWith(slot.end),
    );
    return {
      ...slot,
      bookedCount:  row?.booked_count  ?? 0,
      capacity:     row?.capacity      ?? 1,
      isAvailable:  row?.is_available  ?? true,
    };
  });
}

// ── Datas completamente esgotadas ─────────────────────────────
export async function fetchFullyBookedDates(
  resourceId: string,
  resourceType: 'equipment' | 'lab' | 'classroom' | 'auditorium',
  fromDate: string,
  days = 30,
): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_fully_booked_dates', {
    p_resource_id:   resourceId,
    p_resource_type: resourceType,
    p_from:          fromDate,
    p_days:          days,
  });

  if (error || !data) return new Set();
  return new Set((data as any[]).map((r) => r.full_date as string));
}

// ── Gerar próximos N dias úteis (sem fins de semana) ──────────
export type DayItem = {
  dateStr: string;
  date: string;   // DD
  day: string;    // SEG, TER…
  today: boolean;
  weekend: boolean;
  fullyBooked: boolean;
};

const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function buildDays(count: number, fullyBookedSet: Set<string>): DayItem[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return {
      dateStr,
      date: String(d.getDate()).padStart(2, '0'),
      day: DAY_NAMES[d.getDay()],
      today: i === 0,
      weekend: d.getDay() === 0 || d.getDay() === 6,
      fullyBooked: fullyBookedSet.has(dateStr),
    };
  });
}
