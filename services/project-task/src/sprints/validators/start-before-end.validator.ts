import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsStartBeforeEnd(
  startProperty: string,
  endProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStartBeforeEnd',
      target: object.constructor,
      propertyName,
      constraints: [startProperty, endProperty],
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const [startProp, endProp] = args.constraints;
          const start = args.object[startProp as keyof typeof args.object];
          const end = args.object[endProp as keyof typeof args.object];
          if (start == null || end == null) return true;
          return new Date(start as string) < new Date(end as string);
        },
        defaultMessage(args: ValidationArguments) {
          const [startProp, endProp] = args.constraints;
          return `${startProp} must be before ${endProp}`;
        },
      },
    });
  };
}
