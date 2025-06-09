import Ajv, { ValidateFunction } from 'ajv';
import applicationSchema from './application.schema.json';

const ajv = new Ajv({ allErrors: true });
const validate: ValidateFunction = ajv.compile(applicationSchema);

/**
 * Validates an Application object against the application schema.
 * @param application The normalized application object to validate.
 * @returns true if valid, false otherwise (logs errors)
 */
export function validateApplication(application: any): boolean {
  const valid = validate(application);
  if (!valid) {
    console.warn('Application validation failed:', validate.errors, application);
    return false;
  }
  return true;
} 