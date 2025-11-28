'use client';

import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

type ValidationSchema = Record<string, ValidationRule>;
type FormValues = Record<string, any>;
type FormErrors = Record<string, string>;

export const useFormValidation = (initialValues: FormValues, schema: ValidationSchema) => {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const validateField = useCallback((name: string, value: any): string => {
    const rule = schema?.[name];
    if (!rule) return '';
    
    if (rule?.required && (!value || (typeof value === 'string' && value?.trim() === ''))) {
      return rule?.message || `${name} is required`;
    }
    
    if (rule?.minLength && typeof value === 'string' && value?.length < rule?.minLength) {
      return rule?.message || `${name} must be at least ${rule?.minLength} characters`;
    }
    
    if (rule?.maxLength && typeof value === 'string' && value?.length > rule?.maxLength) {
      return rule?.message || `${name} must be at most ${rule?.maxLength} characters`;
    }
    
    if (rule?.pattern && typeof value === 'string' && !rule?.pattern?.test(value)) {
      return rule?.message || `${name} is invalid`;
    }
    
    if (rule?.custom && !rule?.custom(value)) {
      return rule?.message || `${name} is invalid`;
    }
    
    return '';
  }, [schema]);
  
  const handleChange = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate if field has been touched
    if (touched?.[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);
  
  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values?.[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);
  
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    
    Object.keys(schema)?.forEach(name => {
      const error = validateField(name, values?.[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched(
      Object.keys(schema)?.reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    
    return isValid;
  }, [schema, values, validateField]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
  };
};
