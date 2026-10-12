import { TokenBlacklistService } from './token-blacklist.service';

// Même entête publique que l'ancienne version en mémoire (add/has) — seul
// le stockage change (Map -> Prisma). Prisma est simulé par un petit
// magasin en mémoire pour ce test (pas une vraie connexion DB).
function buildFakePrisma() {
  const rows = new Map<string, { jti: string; expiresAt: Date }>();
  return {
    rows,
    blacklistedAccessToken: {
      upsert: jest.fn(async ({ where, create }: any) => {
        rows.set(where.jti, { jti: where.jti, expiresAt: create.expiresAt });
      }),
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.jti) ?? null),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const [jti, row] of rows.entries()) {
          if (row.expiresAt < where.expiresAt.lt) {
            rows.delete(jti);
            count += 1;
          }
        }
        return { count };
      }),
    },
  };
}

describe('TokenBlacklistService (persistant — remplace la Map en mémoire)', () => {
  it('add() puis has() retourne true pour le même jti', async () => {
    const fakePrisma = buildFakePrisma();
    const service = new TokenBlacklistService(fakePrisma as any);
    const exp = Math.floor(Date.now() / 1000) + 3600;

    await service.add('jti-1', exp);

    expect(await service.has('jti-1')).toBe(true);
  });

  it('has() retourne false pour un jti jamais ajouté', async () => {
    const fakePrisma = buildFakePrisma();
    const service = new TokenBlacklistService(fakePrisma as any);

    expect(await service.has('jamais-vu')).toBe(false);
  });

  it('cleanup() retire seulement les entrées déjà expirées', async () => {
    const fakePrisma = buildFakePrisma();
    const service = new TokenBlacklistService(fakePrisma as any);
    const past = Math.floor(Date.now() / 1000) - 3600;
    const future = Math.floor(Date.now() / 1000) + 3600;
    await service.add('expire', past);
    await service.add('valide', future);

    await service.cleanup();

    expect(await service.has('expire')).toBe(false);
    expect(await service.has('valide')).toBe(true);
  });
});
