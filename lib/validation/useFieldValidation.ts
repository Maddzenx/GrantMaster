import { useState } from 'react';
import { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

export function useFieldValidation<T extends ZodRawShape>(schema: ZodObject<T>) {
  type Field = keyof T & string;
  type Values = { [K in Field]: any };
  type Errors = { [K in Field]?: string };

  const initialValues = Object.keys(schema.shape).reduce((acc, key) => {
    acc[key as Field] = '';
    return acc;
  }, {} as Values);

  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});

  function validateField(field: Field, value: any) {
    const fieldSchema = schema.shape[field] as ZodTypeAny;
    if (!fieldSchema) return;
    const result = fieldSchema.safeParse(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.errors[0].message,
    }));
  }

  function onChange(field: Field) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      validateField(field, value);
    };
  }

  function onBlur(field: Field) {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      validateField(field, value);
    };
  }

  function setValue(field: Field, value: any) {
    setValues((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  }

  function reset(newValues?: Partial<Values>) {
    setValues({ ...initialValues, ...newValues });
    setErrors({});
  }

  return {
    values,
    errors,
    onChange,
    onBlur,
    setValue,
    reset,
    setErrors,
    setValues,
  };
} 