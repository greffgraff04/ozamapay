import { BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { validateInMode } from './validate-in-mode';

class SampleDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

describe('validateInMode (POST /kyc/submit — multipart, pa ka itilize @Body() dto:X dirèkteman)', () => {
  const originalMode = process.env.VALIDATION_MODE;
  afterEach(() => {
    process.env.VALIDATION_MODE = originalMode;
  });

  describe('mode "enforce"', () => {
    beforeEach(() => {
      process.env.VALIDATION_MODE = 'enforce';
    });

    it('aksepte yon payload valid', async () => {
      const result = await validateInMode(SampleDto, { name: 'ok' }, 'POST /test');
      expect((result as SampleDto).name).toBe('ok');
    });

    it('rejte (400) yon payload envalid', async () => {
      await expect(validateInMode(SampleDto, { name: '' }, 'POST /test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('mode "log" (default)', () => {
    beforeEach(() => {
      delete process.env.VALIDATION_MODE;
    });

    it('aksepte yon payload valid san chanjman', async () => {
      const payload = { name: 'ok' };
      const result = await validateInMode(SampleDto, payload, 'POST /test');
      expect(result).toBe(payload);
    });

    it('pa rejte yon payload envalid e pa sipriime okenn chan', async () => {
      const payload = { name: '', extraField: 'rete la' };
      const result = await validateInMode(SampleDto, payload, 'POST /test');
      expect(result).toBe(payload);
      expect((result as any).extraField).toBe('rete la');
      expect((result as any).name).toBe('');
    });

    it('pa tranfòme TYP okenn chan — retounen `data` orijinal la, pa `instance` la (ki pase nan plainToInstance)', async () => {
      const payload = { name: 'ok', age: '30' as any };
      const result = await validateInMode(SampleDto, payload, 'POST /test');
      expect(result).toBe(payload);
      expect(typeof (result as any).age).toBe('string');
      expect((result as any).age).toBe('30');
    });
  });
});
