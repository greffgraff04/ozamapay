import { NotFoundException } from '@nestjs/common';
import { UserService } from './users.service';

// GET /users/lookup — scanner QR app mobil. Verifye : (1) sèlman
// name/email/photoUrl retounen, jamè balans/telefòn/KYC/id ; (2) 404
// idantik pou imel pa egziste, kont sispann, ak kont efase (pa gen fason
// pou distenge yo soti deyò).
function buildService(userRow: any | null) {
  const prisma = {
    user: {
      findUnique: jest.fn(async () => userRow),
    },
  };
  const service = new UserService(prisma as any, {} as any);
  return { service, prisma };
}

describe('UserService.lookupByEmail (/users/lookup)', () => {
  it('retounen SÈLMAN name/email/photoUrl pou yon kont valid', async () => {
    const { service, prisma } = buildService({
      name: 'Jean Client',
      email: 'jean@example.com',
      photoUrl: 'https://img/jean.jpg',
      isSuspended: false,
      deletionExecutedAt: null,
    });

    const result = await service.lookupByEmail('Jean@Example.com');

    expect(result).toEqual({
      name: 'Jean Client',
      email: 'jean@example.com',
      photoUrl: 'https://img/jean.jpg',
    });
    expect(Object.keys(result)).toEqual(['name', 'email', 'photoUrl']);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jean@example.com' },
      select: expect.objectContaining({
        name: true,
        email: true,
        photoUrl: true,
      }),
    });
    // select pa janm mande balans/telefòn/kyc/id
    const selectArg = (prisma.user.findUnique.mock.calls[0] as any)[0].select;
    expect(selectArg).not.toHaveProperty('phone');
    expect(selectArg).not.toHaveProperty('id');
    expect(selectArg).not.toHaveProperty('wallet');
    expect(selectArg).not.toHaveProperty('kyc');
  });

  it('nòmalize imel la (trim + minuscule) anvan rechèch', async () => {
    const { service, prisma } = buildService({
      name: 'Ok',
      email: 'ok@example.com',
      photoUrl: null,
      isSuspended: false,
      deletionExecutedAt: null,
    });

    await service.lookupByEmail('  OK@Example.COM  ');

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ok@example.com' } }),
    );
  });

  it('404 "Nou pa jwenn kont sa a." si imel pa egziste', async () => {
    const { service } = buildService(null);
    await expect(service.lookupByEmail('pa-egziste@example.com')).rejects.toThrow(
      new NotFoundException('Nou pa jwenn kont sa a.'),
    );
  });

  it('404 idantik si kont la sispann (isSuspended)', async () => {
    const { service } = buildService({
      name: 'Sispann',
      email: 'sispann@example.com',
      photoUrl: null,
      isSuspended: true,
      deletionExecutedAt: null,
    });
    await expect(service.lookupByEmail('sispann@example.com')).rejects.toThrow(
      new NotFoundException('Nou pa jwenn kont sa a.'),
    );
  });

  it('404 idantik si kont la efase (deletionExecutedAt mete)', async () => {
    const { service } = buildService({
      name: 'Efase',
      email: 'efase@example.com',
      photoUrl: null,
      isSuspended: false,
      deletionExecutedAt: new Date(),
    });
    await expect(service.lookupByEmail('efase@example.com')).rejects.toThrow(
      new NotFoundException('Nou pa jwenn kont sa a.'),
    );
  });

  it.each(['pa-yon-imel', '', undefined, 'sanarobas.com', 'a@b'])(
    '404 pou yon fòma imel envalid (%p) — pa rele DB a',
    async (badEmail) => {
      const { service, prisma } = buildService(null);
      await expect(service.lookupByEmail(badEmail as any)).rejects.toThrow(NotFoundException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );
});
