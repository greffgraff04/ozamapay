import { BadRequestException } from '@nestjs/common';
import { RatesService } from './rates.service';

// Hotfix/agents-amount : POST /rates/update pa t gen okenn bòn sou "value" —
// yon valè negatif, zewo, NaN, oswa absurdman gwo/piti t ap korupye tout
// konvèsyon HTG/devise nan platfòm lan san deklanche okenn erè.
describe('RatesService.updateRate — validation valè (hotfix/agents-amount)', () => {
  let service: RatesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      rate: { upsert: jest.fn().mockResolvedValue({ key: 'USD_HTG', value: 138.5 }) },
      exchangeRateHistory: { create: jest.fn().mockResolvedValue({}) },
      adminActionLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    const mailService: any = {};
    const alertCooldown: any = {};
    service = new RatesService(prisma, mailService, alertCooldown);
  });

  const INVALID_VALUES: Array<[string, any]> = [
    ['negatif', -10],
    ['zewo', 0],
    ['NaN', NaN],
    ['anba fouchèt reyalis la', 0.5],
    ['pi wo pase fouchèt reyalis la', 1_500],
  ];

  for (const [label, value] of INVALID_VALUES) {
    it(`rejte yon valè ${label} anvan okenn ekriti BD`, async () => {
      await expect(service.updateRate('USD_HTG', value, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  }

  it("rejte yon kle vid", async () => {
    await expect(service.updateRate('', 140, 'admin-1')).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aksepte yon valè valid nan fouchèt reyalis la', async () => {
    const rate: any = await service.updateRate('USD_HTG', 138.5, 'admin-1');
    expect(rate).toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
