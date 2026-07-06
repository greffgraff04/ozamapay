'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { teamFetch, getToken } from './team-api';
import { TeamRole } from './theme';

export interface TeamMemberMe {
  id: string;
  userId: string;
  role: TeamRole;
  displayName: string;
  avatar?: string | null;
  isActive: boolean;
  createdAt: string;
  user?: { email: string; name?: string | null; photoUrl?: string | null };
}

export function useTeamSession() {
  const router = useRouter();
  const [teamMember, setTeamMember] = useState<TeamMemberMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    teamFetch<TeamMemberMe>('/team/members/me')
      .then((me) => {
        if (!cancelled) setTeamMember(me);
      })
      .catch(() => {
        if (!cancelled) router.replace('/dashboard?notice=team-access');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { teamMember, loading };
}
