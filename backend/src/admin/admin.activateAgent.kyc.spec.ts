import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

// Swit backend pou sekirite agents : AdminService.activateAgent() dwe bloke
// si itilizatè a pa gen yon KYC APPROVED, menm si yon admin eseye aktive l
// manyèlman — san sa a yon ajan san KYC ta ka jwenn aksè nan topup/withdraw.
function buildService(kycResult: 'approved' | 'rejected') {
  const agentUpdate = jest.fn().mockResolvedValue({});
  const userUpdate = jest.fn().mockResolvedValue({});

  const prisma: any = {
    agent: {
      findUnique: jest.fn().mockResolvedValue({ id: 'agent-1', userId: 'user-1', status: 'PENDING' }),
      update: agentUpdate,
    },
    user: { update: userUpdate },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };

  const mailService: any = {};
  const kycService: any = {
    assertApproved:
      kycResult === 'approved'
        ? jest.fn().mockResolvedValue(undefined)
        : jest.fn().mockRejectedValue(new ForbiddenException('KYC ou an PENDING')),
  };

  const service = new AdminService(prisma, mailService, kycService);
  return { service, prisma, agentUpdate, userUpdate, kycService };
}

describe('AdminService.activateAgent — KYC gating', () => {
  it('rejte aktivasyon si itilizatè a pa gen KYC APPROVED', async () => {
    const { service, agentUpdate, userUpdate, kycService } = buildService('rejected');

    await expect(service.activateAgent('agent-1')).rejects.toThrow(BadRequestException);
    expect(kycService.assertApproved).toHaveBeenCalledWith('user-1');
    expect(agentUpdate).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('aktive ajan an si KYC li APPROVED', async () => {
    const { service, agentUpdate, userUpdate } = buildService('approved');

    const result = await service.activateAgent('agent-1');

    expect(result).toEqual({ message: 'Ajan aktive avèk siksè' });
    expect(agentUpdate).toHaveBeenCalledWith({ where: { id: 'agent-1' }, data: { status: 'ACTIVE' } });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { role: 'AGENT' } });
  });

  it('voye NotFoundException si ajan an pa egziste', async () => {
    const { service, prisma } = buildService('approved');
    prisma.agent.findUnique.mockResolvedValue(null);

    await expect(service.activateAgent('agent-inconnu')).rejects.toThrow(NotFoundException);
  });
});
