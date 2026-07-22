// Orè travay OZAMAPAY (America/Port-au-Prince):
//   Lendi–Vandredi: 8h–18h
//   Samdi: 8h–15h
//   Dimanch: Mesaj sèlman (pa gen tretman)

export type BusinessHoursStatus = 'OPEN' | 'MESSAGE_ONLY' | 'CLOSED';

const TIMEZONE = 'America/Port-au-Prince';

export const BUSINESS_HOURS_LABEL = {
  weekday: 'Lendi–Vandredi: 8h–18h',
  saturday: 'Samdi: 8h–15h',
  sunday: 'Dimanch: Mesaj sèlman',
};

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
