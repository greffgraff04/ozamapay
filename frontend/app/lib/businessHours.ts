// Orè travay OZAMAPAY (America/Port-au-Prince):
//   Lendi–Vandredi: 8h–18h  — tout sèvis
//   Samdi: 8h–15h           — sèvis kliyan sèlman
//   Dimanch: Mesaj sèlman + Maintenance (pa gen tretman)

export type BusinessHoursStatus = 'OPEN' | 'MESSAGE_ONLY' | 'CLOSED';

const TIMEZONE = 'America/Port-au-Prince';

export const BUSINESS_HOURS_LABEL = {
  weekday: 'Lendi–Vandredi: 8h–18h',
  saturday: 'Samdi: 8h–15h',
  sunday: 'Dimanch: Mesaj sèlman + Maintenance',
};

export const BUSINESS_HOURS_SCHEDULE = [
  { jou: 'Lendi–Ven', le: '8h–18h', emoji: '✅', sevis: 'Tout sèvis' },
  { jou: 'Samdi', le: '8h–15h', emoji: '💬', sevis: 'Sèvis kliyan sèlman' },
  { jou: 'Dimanch', le: '---', emoji: '🔧', sevis: 'Mesaj + Maintenance' },
];

export const AFTER_HOURS_NOTE =
  'Tout tranzaksyon deyò lè travay yo ap trete premye lè pwochen jou ouvrab.';

// Uses Intl with an explicit timeZone so the result is correct regardless
// of the visitor's own device timezone (no manual UTC-offset math, which
// would break across DST boundaries).
export function isBusinessHours(date: Date = new Date()): BusinessHoursStatus {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);

  if (weekday === 'Sun') return 'MESSAGE_ONLY';

  const closeHour = weekday === 'Sat' ? 15 : 18;
  if (hour >= 8 && hour < closeHour) return 'OPEN';
  return 'CLOSED';
}
