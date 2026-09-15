import { z } from 'zod';

/** Trimmed, required text with a friendly message. */
export const requiredText = (label: string, max = 300) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

export const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const email = z
  .string()
  .trim()
  .min(1, 'Email address is required')
  .email('Enter a valid email address')
  .max(255)
  .toLowerCase();

export const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => (v ? v.toLowerCase() : undefined))
  .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email address');

/** Accepts "example.com" as well as a full URL, and normalises to https://. */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  })
  .refine((v) => {
    if (!v) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid web address');

export const uuid = z.string().uuid('Invalid identifier');

export const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || z.string().uuid().safeParse(v).success, 'Invalid identifier');

export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
    'Enter a valid date',
  );

export const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

/** HTML checkboxes submit "on" when ticked and nothing when not. */
export const checkbox = z
  .union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
  .optional()
  .transform((v) => v === 'on' || v === 'true');

export const nonNegativeNumber = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), `${label} must be zero or more`);

export const password = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Password is too long')
  .refine((v) => /[a-z]/.test(v), 'Include a lower-case letter')
  .refine((v) => /[A-Z]/.test(v), 'Include an upper-case letter')
  .refine((v) => /[0-9]/.test(v), 'Include a number');

/** Converts FormData into a plain object zod can parse. */
export function formObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      (out[k] ??= [] as string[]);
      (out[k] as string[]).push(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
