// Design tokens extracted from the reference mockup
// "OZAMAPAY Team Hub (standalone).html" via rendered DOM inspection.
export const COLORS = {
  bg: '#0F121E',
  sidebar: '#080B14',
  accent: '#FF7A00',
  accentHover: 'rgb(255,149,0)',
  accentMuted: 'rgba(255,122,0,0.15)',
  card: 'rgba(255,255,255,0.05)',
  cardShadow: '0 4px 24px rgba(0,0,0,0.3)',
  border: 'rgba(255,255,255,0.08)',
  innerCard: 'rgba(255,255,255,0.03)',
  innerBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.35)',
  success: '#22C55E',
  error: '#EF4444',
  info: '#3B82F6',
  warning: '#EAB308',
};

// Cycling avatar palette — the reference assigns colors per-person, not per-role.
const AVATAR_PALETTE = [COLORS.accent, COLORS.info, COLORS.success, COLORS.warning, COLORS.error];
export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export type TeamRole =
  | 'SUPER_ADMIN'
  | 'COO'
  | 'AGENT_MANAGER'
  | 'GRAPHISTE'
  | 'SUPPORT'
  | 'CAMERAMAN'
  | 'MODEL';

export const ALL_TEAM_ROLES: TeamRole[] = [
  'SUPER_ADMIN', 'COO', 'AGENT_MANAGER', 'GRAPHISTE', 'SUPPORT', 'CAMERAMAN', 'MODEL',
];

export const ROLE_LABELS: Record<TeamRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  COO: 'COO',
  AGENT_MANAGER: 'Gestionnaire Agents',
  GRAPHISTE: 'Graphiste',
  SUPPORT: 'Support',
  CAMERAMAN: 'Caméraman',
  MODEL: 'Modèle',
};

export const PRIVILEGED_ROLES: TeamRole[] = ['SUPER_ADMIN', 'COO'];

export const TASK_STATUSES = ['TODO', 'EN_COURS', 'REVIZYON', 'FINI'] as const;
export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'TODO',
  EN_COURS: 'EN COURS',
  REVIZYON: 'RÉVISION',
  FINI: 'TERMINÉ',
};
export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'rgba(255,255,255,0.35)',
  EN_COURS: COLORS.info,
  REVIZYON: COLORS.warning,
  FINI: COLORS.success,
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  BAS: 'Bas',
};
export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: COLORS.error,
  NORMAL: COLORS.info,
  BAS: 'rgba(255,255,255,0.35)',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'BROUILLON',
  SUBMITTED: 'EN RÉVISION',
  REVIEWED: 'RÉVISÉ',
  APPROVED: 'PUBLIÉ',
  REJECTED: 'REJETÉ',
};
export const REPORT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'rgba(255,255,255,0.6)',
  SUBMITTED: COLORS.warning,
  REVIEWED: COLORS.info,
  APPROVED: COLORS.success,
  REJECTED: COLORS.error,
};

export const ANNOUNCEMENT_PRIORITY_COLORS: Record<string, string> = {
  NORMAL: 'rgba(255,255,255,0.6)',
  IMPORTANT: COLORS.accent,
  URGENT: COLORS.error,
};

export const CALENDAR_TYPE_COLORS: Record<string, string> = {
  MEETING: COLORS.info,
  DEADLINE: COLORS.error,
  LAUNCH: COLORS.success,
  OTHER: COLORS.warning,
};

export const FILE_CATEGORY_LABELS: Record<string, string> = {
  DESIGN: 'Design',
  VIDEO: 'Vidéo',
  PHOTO: 'Photo',
  DOCUMENT: 'Document',
  OTHER: 'Autre',
};
