export const COLORS = {
  bg: '#0F121E',
  sidebar: '#0A0D16',
  accent: '#FF7A00',
  accentMuted: 'rgba(255,122,0,0.15)',
  card: 'rgba(255,255,255,0.05)',
  cardHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  success: '#22C55E',
  error: '#EF4444',
  info: '#3B82F6',
  warning: '#F59E0B',
};

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
  TODO: 'À faire',
  EN_COURS: 'En cours',
  REVIZYON: 'Révision',
  FINI: 'Terminé',
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  BAS: 'Bas',
};
export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  NORMAL: '#3B82F6',
  BAS: 'rgba(255,255,255,0.35)',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  REVIEWED: 'Révisé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
};
export const REPORT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'rgba(255,255,255,0.35)',
  SUBMITTED: '#3B82F6',
  REVIEWED: '#F59E0B',
  APPROVED: '#22C55E',
  REJECTED: '#EF4444',
};

export const ANNOUNCEMENT_PRIORITY_COLORS: Record<string, string> = {
  NORMAL: 'rgba(255,255,255,0.35)',
  IMPORTANT: '#F59E0B',
  URGENT: '#EF4444',
};

export const CALENDAR_TYPE_COLORS: Record<string, string> = {
  MEETING: '#3B82F6',
  DEADLINE: '#EF4444',
  LAUNCH: '#22C55E',
  OTHER: 'rgba(255,255,255,0.35)',
};

export const FILE_CATEGORY_LABELS: Record<string, string> = {
  DESIGN: 'Design',
  VIDEO: 'Vidéo',
  PHOTO: 'Photo',
  DOCUMENT: 'Document',
  OTHER: 'Autre',
};
