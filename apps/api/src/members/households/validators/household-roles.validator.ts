import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const VALID_ROLES = new Set(['HEAD', 'SPOUSE', 'CHILD', 'OTHER']);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

@ValidatorConstraint({ async: false })
export class IsHouseholdRoleMapConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return false;
    if (entries.length > 500) return false;
    for (const [key, val] of entries) {
      if (DANGEROUS_KEYS.has(key)) return false;
      if (typeof key !== 'string' || key.length === 0) return false;
      if (!VALID_ROLES.has(val as string)) return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'Jeder Rollenwert muss HEAD, SPOUSE, CHILD oder OTHER sein';
  }
}

export function IsHouseholdRoleMap(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsHouseholdRoleMapConstraint,
    });
  };
}
