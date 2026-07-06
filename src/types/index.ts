export type DayOfWeek = 'domingo' | 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado';

export interface HospitalEvent {
  id?: string;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM
  slot_number: number; // 1 to 4
  title: string;
  responsible: string;
  description: string;
  estimated_duration?: number; // in minutes
  created_at?: string;
  updated_at?: string;
}

export interface EventTemplate {
  id?: string;
  template_name: string;
  title: string;
  responsible: string;
  description: string;
  estimated_duration?: number; // in minutes
  created_at?: string;
}

export const DAY_ORDER: DayOfWeek[] = [
  'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'
];

export const DAY_COLORS: Record<DayOfWeek, string> = {
  domingo: '#50123A',
  segunda: '#8C031A',
  terça: '#144E57',
  quarta: '#F28E2B',
  quinta: '#709203',
  sexta: '#2E474D',
  sábado: '#22115B',
};

export const getWeekdayName = (date: Date): DayOfWeek => {
  const index = date.getDay();
  return DAY_ORDER[index];
};

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDayMonth = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}`;
};

export const isPastDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const parts = dateString.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const target = new Date(year, month, day);
  const today = new Date();
  today.setHours(0,0,0,0);
  return target.getTime() < today.getTime();
};

export const isEventPast = (dateStr: string, timeStr: string): boolean => {
  if (!dateStr) return false;
  const timeVal = timeStr || '00:00';
  
  const dateParts = dateStr.split('-');
  const timeParts = timeVal.split(':');
  if (dateParts.length !== 3) return false;
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const hours = timeParts.length >= 1 ? parseInt(timeParts[0], 10) : 0;
  const minutes = timeParts.length >= 2 ? parseInt(timeParts[1], 10) : 0;
  
  const eventDateTime = new Date(year, month, day, hours, minutes);
  const now = new Date();
  
  return eventDateTime.getTime() < now.getTime();
};

export const COLUMN_COLORS = [
  '#50123A', // Vinho (Index 0)
  '#8C031A', // Vermelho (Index 1)
  '#144E57', // Teal (Index 2)
  '#F28E2B', // Laranja (Index 3)
  '#709203', // Verde (Index 4)
  '#2E474D', // Slate (Index 5)
  '#22115B', // Roxo (Index 6)
];

export const checkScheduleCollision = (
  targetDate: string,
  targetTime: string,
  targetDuration: number,
  eventsList: HospitalEvent[],
  ignoreEventId?: string
): boolean => {
  if (!targetTime || !targetDuration) return false;

  const parseTimeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };

  const startA = parseTimeToMinutes(targetTime);
  const endA = startA + targetDuration;

  // Filter events of the same day
  const sameDayEvents = eventsList.filter(
    e => e.event_date === targetDate && e.id !== ignoreEventId
  );

  for (const event of sameDayEvents) {
    if (!event.event_time) continue;
    const startB = parseTimeToMinutes(event.event_time);
    const durationB = Number(event.estimated_duration) || 60; // fallback default
    const endB = startB + durationB;

    if (startA < endB && startB < endA) {
      return true; // Collision detected!
    }
  }

  return false;
};

