import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsMoneyAmount } from './money-amount.decorator';
import { ValidationModePipe } from './validation-mode.pipe';

class SampleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsMoneyAmount(1_000)
  amount: number;
}

const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: SampleDto,
  data: undefined,
};

function buildPipe() {
  return new ValidationModePipe({ method: 'POST', url: '/sample', route: { path: '/sample' } });
}

describe('ValidationModePipe — VALIDATION_MODE (hotfix ValidationPipe étape 2)', () => {
  const originalMode = process.env.VALIDATION_MODE;

  afterEach(() => {
    process.env.VALIDATION_MODE = originalMode;
  });

  describe('mode "enforce"', () => {
    beforeEach(() => {
      process.env.VALIDATION_MODE = 'enforce';
    });

    it('aksepte yon payload valid e sipriime chan ki pa whitelisted', async () => {
      const pipe = buildPipe();
      const result = await pipe.transform(
        { name: 'ok', amount: 50, extra: 'pa dwe rete' },
        metadata,
      );
      expect(result.name).toBe('ok');
      expect(result.amount).toBe(50);
      expect((result as any).extra).toBeUndefined();
    });

    it('rejte (400) yon payload envalid', async () => {
      const pipe = buildPipe();
      await expect(
        pipe.transform({ name: 'ok', amount: -10 }, metadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('mode "log" (default)', () => {
    beforeEach(() => {
      delete process.env.VALIDATION_MODE;
    });

    it('aksepte yon payload valid san okenn chanjman', async () => {
      const pipe = buildPipe();
      const payload = { name: 'ok', amount: 50 };
      const result = await pipe.transform(payload, metadata);
      expect(result).toEqual(payload);
    });

    it('pa rejte yon payload envalid, e pa sipriime/tranfòme OKENN chan', async () => {
      const pipe = buildPipe();
      const payload = { name: '', amount: -10, extra: 'yon chan ki pa whitelisted' };
      const result = await pipe.transform(payload, metadata);

      // Retounen EGZAKTEMAN menm objè a — menm referans, pa yon kopi filtre.
      expect(result).toBe(payload);
      expect(result.extra).toBe('yon chan ki pa whitelisted');
      expect(result.amount).toBe(-10);
      expect(result.name).toBe('');
    });

    it("pa sipriime yon chan ki pa deklare nan DTO a (ta sipriime nan mod enforce)", async () => {
      const pipe = buildPipe();
      const payload = { name: 'ok', amount: 50, champNonDeklare: 'rete la' };
      const result = await pipe.transform(payload, metadata);
      expect(result.champNonDeklare).toBe('rete la');
    });

    it('pa tranfòme TYP okenn chan — "amount" rete yon string si li rive kon string (mod "log" pa janm itilize enforcePipe/transform:true, li retounen `value` orijinal la san pase nan class-transformer)', async () => {
      const pipe = buildPipe();
      const payload = { name: 'ok', amount: '50' as any };
      const result = await pipe.transform(payload, metadata);
      expect(result).toBe(payload);
      expect(typeof result.amount).toBe('string');
      expect(result.amount).toBe('50');
    });
  });

  it('VALIDATION_MODE absan oswa valè envalid tonbe sou "log" pa default', async () => {
    process.env.VALIDATION_MODE = 'nenpòt-bagay-ki-pa-enforce';
    const pipe = buildPipe();
    const payload = { name: '', amount: -1 };
    const result = await pipe.transform(payload, metadata);
    expect(result).toBe(payload); // pa rejte, pa tranfòme → se mod "log"
  });
});
