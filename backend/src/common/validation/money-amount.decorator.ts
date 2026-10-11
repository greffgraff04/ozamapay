import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Validateur rezoble pou tout montan lajan nan platfòm lan : fini, pozitif,
// maksimòm 2 chif apre pwen, e anba yon plafon. Sa evite chak DTO reenvante
// menm lojik la (e k ap rete konsistan si yon plafon chanje pita).
export function IsMoneyAmount(
  maxValue: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMoneyAmount',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxValue],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [max] = args.constraints as [number];
          const n = Number(value);
          if (!Number.isFinite(n) || n <= 0) return false;
          const cents = Math.round(n * 100);
          if (Math.abs(n * 100 - cents) > 1e-6) return false;
          return n <= max;
        },
        defaultMessage(args: ValidationArguments) {
          const [max] = args.constraints as [number];
          return `${args.property} dwe yon montan pozitif, maksimòm 2 chif apre pwen, pa depase ${max}`;
        },
      },
    });
  };
}
