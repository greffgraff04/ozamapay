import { UserLookupThrottlerGuard } from './user-lookup-throttler.guard';

describe('UserLookupThrottlerGuard — tracker (limite pa itilizatè, pa pa IP)', () => {
  it('trase pa req.user.id kan itilizatè konekte (apre JwtAuthGuard)', async () => {
    const guard = new UserLookupThrottlerGuard({} as any, {} as any, {} as any);
    const tracker = await (guard as any).getTracker({ user: { id: 'user-42' }, ip: '1.2.3.4' });
    expect(tracker).toBe('userlookup_user-42');
  });

  it('tonbe sou IP si req.user pa prezan (pa ta rive si JwtAuthGuard ap egzekite anvan)', async () => {
    const guard = new UserLookupThrottlerGuard({} as any, {} as any, {} as any);
    const tracker = await (guard as any).getTracker({ ip: '1.2.3.4' });
    expect(tracker).toBe('1.2.3.4');
  });

  it('de itilizatè diferan pataje menm IP jwenn 2 konpt separe', async () => {
    const guard = new UserLookupThrottlerGuard({} as any, {} as any, {} as any);
    const t1 = await (guard as any).getTracker({ user: { id: 'user-1' }, ip: '9.9.9.9' });
    const t2 = await (guard as any).getTracker({ user: { id: 'user-2' }, ip: '9.9.9.9' });
    expect(t1).not.toBe(t2);
  });
});
