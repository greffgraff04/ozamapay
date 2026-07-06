'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload, Download, Trash2, FileText, Film, Image as ImageIcon, File as FileIcon, X,
} from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch, uploadTeamFileWithProgress } from '../../lib/team-api';
import { COLORS, FILE_CATEGORY_LABELS, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface TeamFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  category: string;
  createdAt: string;
  uploadedBy: { id: string; displayName: string };
}

const TABS = ['ALL', 'DESIGN', 'VIDEO', 'PHOTO', 'DOCUMENT', 'OTHER'] as const;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return FileIcon;
}

export default function TeamFilesPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;

  const [files, setFiles] = useState<TeamFile[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<TeamFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const params = tab === 'ALL' ? '' : `?category=${tab}`;
    try {
      const list = await teamFetch<TeamFile[]>(`/team/files${params}`);
      setFiles(list);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [tab, showToast]);

  useEffect(() => { load(); }, [load]);

  const guessCategory = (file: File): string => {
    if (file.type.startsWith('image/')) return 'PHOTO';
    if (file.type.startsWith('video/')) return 'VIDEO';
    if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) return 'DOCUMENT';
    return 'OTHER';
  };

  const doUpload = async (file: File) => {
    setUploadProgress(0);
    try {
      await uploadTeamFileWithProgress(file, { category: guessCategory(file) }, setUploadProgress);
      showToast('Fichier téléversé.');
      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setUploadProgress(null);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await teamFetch(`/team/files/${id}`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-xl font-black italic mb-5" style={{ color: COLORS.textPrimary }}>Fichiers</h1>

      {/* Drag & drop upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) doUpload(file);
        }}
        onClick={() => inputRef.current?.click()}
        className="mb-5 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
        style={{
          background: dragOver ? COLORS.accentMuted : COLORS.card,
          border: `1.5px dashed ${dragOver ? COLORS.accent : COLORS.border}`,
        }}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])} />
        <Upload size={22} color={COLORS.accent} />
        <p className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>Glissez un fichier ici ou cliquez pour téléverser</p>
        <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Max 100 Mo</p>
        {uploadProgress !== null && (
          <div className="w-full max-w-xs h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: COLORS.accent }} />
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
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
            {t === 'ALL' ? 'Tout' : FILE_CATEGORY_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {files.map((f) => {
          const Icon = iconFor(f.mimeType);
          const isMedia = f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/');
          const canDelete = isPrivileged || f.uploadedBy.id === teamMember?.id;
          return (
            <div key={f.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div
                onClick={() => isMedia && setLightbox(f)}
                className="h-28 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', cursor: isMedia ? 'pointer' : 'default' }}
              >
                {f.mimeType.startsWith('image/') ? (
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                ) : f.mimeType.startsWith('video/') ? (
                  <video src={f.url} className="w-full h-full object-cover" />
                ) : (
                  <Icon size={28} color={COLORS.textSecondary} />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold truncate" style={{ color: COLORS.textPrimary }}>{f.name}</p>
                <p className="text-[9px] mt-0.5" style={{ color: COLORS.textMuted }}>
                  {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] truncate" style={{ color: COLORS.textSecondary }}>{f.uploadedBy.displayName}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={f.url} target="_blank" rel="noreferrer" className="p-1"><Download size={12} color={COLORS.info} /></a>
                    {canDelete && (
                      <button onClick={() => deleteFile(f.id)} className="p-1"><Trash2 size={12} color={COLORS.error} /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {files.length === 0 && (
          <p className="col-span-full text-center text-xs py-10" style={{ color: COLORS.textMuted }}>Aucun fichier</p>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-5 right-5 p-2" onClick={() => setLightbox(null)}>
            <X size={22} color="#fff" />
          </button>
          {lightbox.mimeType.startsWith('image/') ? (
            <img src={lightbox.url} alt={lightbox.name} className="max-w-full max-h-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            <video src={lightbox.url} controls autoPlay className="max-w-full max-h-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      <TeamToast toast={toast} />
    </div>
  );
}
