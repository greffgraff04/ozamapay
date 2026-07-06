'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface Report {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  author: { id: string; displayName: string };
}

export default function TeamReportsPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;

  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'MINE' | 'ALL'>('MINE');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [form, setForm] = useState({ title: '', type: 'DAILY', content: '' });
  const [reviewTarget, setReviewTarget] = useState<Report | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await teamFetch<Report[]>('/team/reports');
      setReports(list);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const visible = tab === 'MINE' ? reports.filter((r) => r.author.id === teamMember?.id) : reports;

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', type: 'DAILY', content: '' });
    setCreateOpen(true);
  };

  const openEdit = (r: Report) => {
    setEditing(r);
    setForm({ title: r.title, type: r.type, content: r.content });
    setCreateOpen(true);
  };

  const save = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      if (editing) {
        await teamFetch(`/team/reports/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, status }) });
      } else {
        await teamFetch('/team/reports', { method: 'POST', body: JSON.stringify({ ...form, status }) });
      }
      setCreateOpen(false);
      showToast(status === 'SUBMITTED' ? 'Rapport soumis.' : 'Brouillon sauvegardé.');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const review = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewTarget) return;
    try {
      await teamFetch(`/team/reports/${reviewTarget.id}/review`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote }) });
      setReviewTarget(null);
      setReviewNote('');
      showToast('Rapport révisé.');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black italic" style={{ color: COLORS.textPrimary }}>Rapports</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
          <Plus size={14} /> Nouveau rapport
        </button>
      </div>

      {isPrivileged && (
        <div className="flex gap-2 mb-5">
          {(['MINE', 'ALL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase"
              style={{
                background: tab === t ? COLORS.accent : COLORS.card,
                color: tab === t ? '#fff' : COLORS.textSecondary,
                border: `1px solid ${tab === t ? COLORS.accent : COLORS.border}`,
              }}
            >
              {t === 'MINE' ? 'Mes rapports' : 'Tous'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {visible.map((r) => (
          <div key={r.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{r.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: COLORS.textSecondary }}>
                  {r.author.displayName} · {r.type} · {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span
                className="text-[10px] font-bold uppercase px-2 py-1 rounded shrink-0"
                style={{ background: `${REPORT_STATUS_COLORS[r.status]}22`, color: REPORT_STATUS_COLORS[r.status] }}
              >
                {REPORT_STATUS_LABELS[r.status]}
              </span>
            </div>
            <p className="text-xs mt-2 line-clamp-3" style={{ color: COLORS.textSecondary }}>{r.content}</p>
            {r.reviewNote && (
              <p className="text-[11px] mt-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: COLORS.textSecondary }}>
                Note: {r.reviewNote}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {r.status === 'DRAFT' && r.author.id === teamMember?.id && (
                <button onClick={() => openEdit(r)} className="text-[11px] font-bold" style={{ color: COLORS.accent }}>Modifier</button>
              )}
              {isPrivileged && (r.status === 'SUBMITTED' || r.status === 'REVIEWED') && (
                <button onClick={() => setReviewTarget(r)} className="text-[11px] font-bold" style={{ color: COLORS.info }}>Réviser</button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="text-center text-xs py-10" style={{ color: COLORS.textMuted }}>Aucun rapport</p>}
      </div>

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} title={editing ? 'Modifier le rapport' : 'Nouveau rapport'}>
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Titre"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="DAILY">Journalier</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="MONTHLY">Mensuel</option>
          </select>
          <textarea
            value={form.content}
            onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
            placeholder="Contenu du rapport..."
            rows={6}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <div className="flex gap-2">
            <button onClick={() => save('DRAFT')} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: 'rgba(255,255,255,0.08)', color: COLORS.textPrimary }}>
              Sauvegarder
            </button>
            <button onClick={() => save('SUBMITTED')} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
              Soumettre
            </button>
          </div>
        </div>
      </TeamModal>

      <TeamModal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Réviser le rapport">
        <div className="space-y-3">
          <p className="text-xs" style={{ color: COLORS.textSecondary }}>{reviewTarget?.title}</p>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Note de révision (optionnel)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <div className="flex gap-2">
            <button onClick={() => review('REJECTED')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: 'rgba(239,68,68,0.15)', color: COLORS.error }}>
              <XCircle size={14} /> Rejeter
            </button>
            <button onClick={() => review('APPROVED')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: COLORS.success }}>
              <CheckCircle2 size={14} /> Approuver
            </button>
          </div>
        </div>
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}
