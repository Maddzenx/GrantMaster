import Ajv, { ValidateFunction } from 'ajv';
import activitySchema from './activity.schema.json';

const ajv = new Ajv({ allErrors: true });
const validate: ValidateFunction = ajv.compile(activitySchema);

/**
 * Validates an Activity object against the activity schema.
 * @param activity The normalized activity object to validate.
 * @returns true if valid, false otherwise (logs errors)
 */
export function validateActivity(activity: any): boolean {
  const valid = validate(activity);
  if (!valid) {
    console.warn('Activity validation failed:', validate.errors, activity);
    return false;
  }
  return true;
} 