import Ajv, { ValidateFunction } from 'ajv';
import grantSchema from './grant.schema.json';

const ajv = new Ajv({ allErrors: true });
const validate: ValidateFunction = ajv.compile(grantSchema);

/**
 * Validates a Grant object against the grant schema.
 * @param grant The normalized grant object to validate.
 * @returns true if valid, false otherwise (logs errors)
 */
export function validateGrant(grant: any): boolean {
  const valid = validate(grant);
  if (!valid) {
    console.warn('Grant validation failed:', validate.errors, grant);
    return false;
  }
  return true;
} 