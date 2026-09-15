import { z } from 'zod';

import { optionalText, optionalUuid, requiredText } from './common';

export const pageSchema = z.object({
  title: requiredText('Page title', 200),
  slug: optionalText(120),
  parentId: optionalUuid,
  pageKind: z.enum(['standard', 'landing', 'footer', 'hidden']).default('standard'),
  inNavigation: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
  purpose: optionalText(2000),
});

export const pageContentSchema = z.object({
  title: requiredText('Page title', 200),
  purpose: optionalText(2000),
  mainHeading: optionalText(300),
  bodyCopy: optionalText(50000),
  callsToAction: optionalText(2000),
  // Search engines truncate beyond roughly these lengths, so the limits are
  // enforced rather than merely suggested.
  seoTitle: z
    .string()
    .trim()
    .max(70, 'Keep the SEO title to 70 characters or fewer')
    .optional()
    .transform((v) => (v ? v : undefined)),
  metaDescription: z
    .string()
    .trim()
    .max(320, 'Keep the meta description to 320 characters or fewer')
    .optional()
    .transform((v) => (v ? v : undefined)),
  notes: optionalText(4000),
});
