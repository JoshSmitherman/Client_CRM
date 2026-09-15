import { z } from 'zod';

import { SECTION_BY_KEY, type OnboardingField } from '@/lib/onboarding-template';

/**
 * Builds a zod schema for a section from its field definitions, so the server
 * validates exactly what the form renders and the two cannot drift.
 *
 * Draft saves use a permissive schema (everything optional) because a client
 * must be able to save half-finished work; submission uses the strict one.
 */
function fieldSchema(field: OnboardingField, strict: boolean) {
  const max = field.maxLength ?? (field.type === 'textarea' ? 8000 : 500);

  let base: z.ZodTypeAny;

  switch (field.type) {
    case 'checkbox':
      base = z
        .union([z.literal('on'), z.literal('true'), z.literal(''), z.undefined()])
        .transform((v) => v === 'on' || v === 'true');
      break;

    case 'email':
      base = z.string().trim().max(max);
      if (strict && field.required) {
        base = (base as z.ZodString).min(1, `${field.label} is required`).email('Enter a valid email address');
      } else {
        base = (base as z.ZodString).refine(
          (v) => !v || z.string().email().safeParse(v).success,
          'Enter a valid email address',
        );
      }
      break;

    case 'url':
      base = z
        .string()
        .trim()
        .max(max)
        .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
        .refine((v) => {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        }, 'Enter a valid web address');
      break;

    case 'colour':
      base = z
        .string()
        .trim()
        .max(32)
        .refine(
          (v) => !v || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v),
          'Use a HEX colour such as #1E3A8A',
        );
      break;

    case 'date':
      base = z
        .string()
        .trim()
        .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date');
      break;

    case 'select':
      base = z.string().trim().max(max);
      if (field.options && field.options.length > 0) {
        const allowed = new Set(field.options.map((o) => o.value));
        base = (base as z.ZodString).refine(
          (v) => !v || allowed.has(v),
          'Choose one of the listed options',
        );
      }
      break;

    default:
      base = z.string().trim().max(max, `${field.label} must be ${max} characters or fewer`);
      if (strict && field.required) {
        base = (base as z.ZodString).min(1, `${field.label} is required`);
      }
  }

  return field.type === 'checkbox' ? base : base.optional().default('');
}

export function sectionSchema(sectionKey: string, strict: boolean) {
  const section = SECTION_BY_KEY.get(sectionKey);
  if (!section) return z.object({}).passthrough();

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of section.fields) {
    shape[field.key] = fieldSchema(field, strict);
  }

  return z.object(shape);
}

/** Which required fields are still blank — drives the section progress figure. */
export function missingRequiredFields(
  sectionKey: string,
  responses: Record<string, unknown>,
): string[] {
  const section = SECTION_BY_KEY.get(sectionKey);
  if (!section) return [];

  return section.fields
    .filter((f) => f.required)
    .filter((f) => {
      const value = responses[f.key];
      if (f.type === 'checkbox') return value !== true;
      return value === undefined || value === null || String(value).trim() === '';
    })
    .map((f) => f.label);
}
