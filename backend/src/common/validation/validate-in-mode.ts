import { BadRequestException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

const logger = new Logger('ValidationMode');

function resolveMode(): 'enforce' | 'log' {
  return process.env.VALIDATION_MODE === 'enforce' ? 'enforce' : 'log';
}

function flattenErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ field: string; constraints: string[] }> {
  const out: Array<{ field: string; constraints: string[] }> = [];
  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) out.push({ field: path, constraints: Object.keys(err.constraints) });
    if (err.children?.length) out.push(...flattenErrors(err.children, path));
  }
  return out;
}

// Vèsyon "manyèl" ValidationModePipe pou wout ki pa ka itilize @Body() dto:X
// dirèkteman (egzanp: multipart/form-data ki melanje chan separe ak yon blob
// JSON + chan ki soti nan fichye telechaje, tankou POST /kyc/submit). Menm
// semantik VALIDATION_MODE : "enforce" whitelist + rejte 400 (BadRequestException,
// pa janm sipriime san di l), "log" (default) jounalize sèlman san janm rejte
// ni sipriime — retounen `data` orijinal tèl kal.
export async function validateInMode<T extends object>(
  dtoClass: new () => T,
  data: Record<string, any>,
  routeLabel: string,
): Promise<T | Record<string, any>> {
  if (resolveMode() === 'enforce') {
    const instance = plainToInstance(dtoClass, data) as T;
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length) {
      throw new BadRequestException(
        flattenErrors(errors).map((e) => `${e.field}: ${e.constraints.join(',')}`),
      );
    }
    return instance;
  }

  try {
    const errors = await validate(plainToInstance(dtoClass, data), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      const flattened = flattenErrors(errors);
      logger.warn(
        `[VALIDATION_MODE=log] ${routeLabel} DTO=${dtoClass.name} ` +
          flattened.map((f) => `${f.field}:[${f.constraints.join(',')}]`).join(' '),
      );
    }
  } catch (err: any) {
    logger.error(`[VALIDATION_MODE=log] erè pandan deteksyon — ${err.message}`);
  }

  return data;
}
