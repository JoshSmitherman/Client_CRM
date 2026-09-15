import { z } from 'zod';

import { optionalText, optionalUrl, optionalUuid, requiredText } from './common';

export const SUPPORT_CATEGORIES = [
  'website_down',
  'broken_functionality',
  'email_issue',
  'domain_issue',
  'hosting_issue',
  'security_concern',
  'performance_problem',
  'general_support',
  'other',
] as const;

export const supportRequestSchema = z.object({
  clientId: optionalUuid,
  projectId: optionalUuid,
  subject: requiredText('Subject', 300),
  category: z.enum(SUPPORT_CATEGORIES, { message: 'Choose a category' }),
  description: requiredText('Description', 8000),
  affectedUrl: optionalUrl,
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
});

export const supportTriageSchema = z.object({
  status: z.enum(['open', 'triaged', 'awaiting_client', 'in_progress', 'resolved', 'closed']),
  urgency: z.enum(['low', 'normal', 'high', 'critical']),
  assignedTo: optionalUuid,
  coveredByPlan: z.enum(['', 'yes', 'no']).optional(),
  coverageNote: optionalText(1000),
  resolutionSummary: optionalText(4000),
  internalNotes: optionalText(8000),
  timeSpentMinutes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, 'Enter whole minutes'),
});
