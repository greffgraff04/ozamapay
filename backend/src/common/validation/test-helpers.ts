import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Itilize menm chemen validasyon ak ValidationModePipe a : plainToInstance +
// validate({ whitelist: true }). Yon payload "valid" dwe pase nan DE mod yo
// (enforce ak log) — se egzakteman sa `expectValid` verifye.
export async function expectValid(dtoClass: any, payload: Record<string, any>) {
  const instance = plainToInstance(dtoClass, payload) as object;
  const errors = await validate(instance, { whitelist: true });
  expect(errors).toEqual([]);
}

// Yon payload "envalid" dwe pwodui omwen yon ValidationError — sa pwouve li
// ta rejte (400) an mod "enforce" epi jounalize (san rejte/sipriime) an mod
// "log", jan ValidationModePipe.spec.ts deja verifye pou konpòtman pipe a.
export async function expectInvalid(dtoClass: any, payload: Record<string, any>) {
  const instance = plainToInstance(dtoClass, payload) as object;
  const errors = await validate(instance, { whitelist: true });
  expect(errors.length).toBeGreaterThan(0);
}
