import {
  ArgumentMetadata,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  PipeTransform,
  Scope,
  ValidationPipe,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

type ValidationMode = 'enforce' | 'log';

// Mesaj kreyòl pou kliyan an, pa DTO + chan. Detay teknik (non DTO, non chan,
// kontrent ki vyole) rete nan log sèvè a sèlman — jamè nan repons lan, pou
// pa expoze estrikti validasyon an bay yon moun k ap sonde API a.
const CLIENT_MESSAGES: Record<string, Record<string, string>> = {
  RegisterDto: { password: 'Modpas la dwe gen omwen 6 karaktè.' },
  LoginDto: { email: 'Adrès imel la pa bon.' },
  WithdrawRequestDto: { amount: 'Montan retrè a dwe ant 50 ak 10 000 HTG.' },
  FinanceRequestDto: { serviceType: 'Sèvis sa a pa disponib.' },
  TransferDto: {
    recipientEmail: 'Adrès imel moun w ap voye kòb la pa bon.',
    pin: 'Kòd PIN lan dwe gen 4 a 6 chif.',
  },
  CreateCardDto: { amount_usd: 'Montan an dwe ant $3 ak $500.' },
  FundCardDto: { amount_usd: 'Montan an dwe ant $3 ak $500.' },
};

const DEFAULT_CLIENT_MESSAGE =
  'Enfòmasyon ou mete yo pa kòrèk. Verifye yo epi eseye ankò.';

function resolveClientMessage(errors: ValidationError[]): string {
  const first = errors[0];
  const dtoName = (first?.target as any)?.constructor?.name;
  const field = first?.property;
  return (dtoName && field && CLIENT_MESSAGES[dtoName]?.[field]) || DEFAULT_CLIENT_MESSAGE;
}

// VALIDATION_MODE absan oswa nenpòt lòt valè pase "enforce" => "log" (sekou
// pa default). Sa garanti pwodiksyon pa chanje konpòtman jiskaske yon moun
// deside aktive "enforce" expreseman (egzanp: sou staging).
function resolveMode(): ValidationMode {
  return process.env.VALIDATION_MODE === 'enforce' ? 'enforce' : 'log';
}

const SKIP_TYPES = [String, Boolean, Number, Array, Object, Buffer];

function shouldValidate(metatype: any): boolean {
  return !!metatype && !SKIP_TYPES.includes(metatype);
}

function flattenErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ field: string; constraints: string[] }> {
  const out: Array<{ field: string; constraints: string[] }> = [];
  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      out.push({ field: path, constraints: Object.keys(err.constraints) });
    }
    if (err.children?.length) {
      out.push(...flattenErrors(err.children, path));
    }
  }
  return out;
}

// Pipe global ki respekte VALIDATION_MODE :
//   - "enforce" : konpòtman estanda Nest ValidationPipe (whitelist,
//     transform, rejte 400 si yon kontrent vyole). Sa a pou staging.
//   - "log" (default) : fè EGZAKTEMAN menm validasyon an (ansanm deteksyon
//     chan ki pa "whitelisted") men pa janm rejte, pa janm sipriime oswa
//     tranfòme okenn chan — valè orijinal la retounen tèl kal. Sèlman nom
//     wout/metòd/DTO/chan ki echwe ak kontrent ki vyole yo jounalize, JAMÈ
//     okenn valè reyèl (pa gen mo de pas, nimewo kat, montan, imel nan log).
//   Request-scoped paske li bezwen `request.method`/`request.url` pou
//   jounalizasyon an — pa gen okenn eta pataje danjere, se jis lekti.
@Injectable({ scope: Scope.REQUEST })
export class ValidationModePipe implements PipeTransform {
  private readonly logger = new Logger('ValidationMode');
  private readonly enforcePipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    exceptionFactory: (errors: ValidationError[]) => {
      const method = this.request?.method ?? '?';
      const route = this.request?.route?.path ?? this.request?.url ?? '?';
      const flattened = flattenErrors(errors);
      this.logger.warn(
        `[VALIDATION_MODE=enforce] ${method} ${route} DTO=${
          (errors[0]?.target as any)?.constructor?.name ?? '?'
        } ` + flattened.map((f) => `${f.field}:[${f.constraints.join(',')}]`).join(' '),
      );
      return new BadRequestException(resolveClientMessage(errors));
    },
  });

  constructor(@Inject(REQUEST) private readonly request: any) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!shouldValidate(metatype)) {
      return value;
    }

    if (resolveMode() === 'enforce') {
      return this.enforcePipe.transform(value, metadata);
    }

    await this.logOnly(value, metatype, metadata);
    return value;
  }

  private async logOnly(value: any, metatype: any, metadata: ArgumentMetadata) {
    try {
      const instance = plainToInstance(metatype, value ?? {});
      // forbidNonWhitelisted:true isit la se SÈLMAN pou fè validate() rapòte
      // chan ki pa "whitelisted" kòm yon ValidationError (olye silanyezman
      // sipriime yo) — li pa afekte valè nou retounen pi ba a, ki rete
      // orijinal la san tranfòmasyon.
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
      });
      if (!errors.length) return;

      const flattened = flattenErrors(errors);
      const method = this.request?.method ?? '?';
      const route = this.request?.route?.path ?? this.request?.url ?? '?';
      this.logger.warn(
        `[VALIDATION_MODE=log] ${method} ${route} DTO=${metatype.name} ` +
          flattened
            .map((f) => `${f.field}:[${f.constraints.join(',')}]`)
            .join(' '),
      );
    } catch (err) {
      this.logger.error(
        `[VALIDATION_MODE=log] erè pandan deteksyon — ${(err as Error).message}`,
      );
    }
  }
}
