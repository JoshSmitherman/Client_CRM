import { z } from 'zod';

import { optionalDate, optionalText, optionalUrl, optionalUuid, requiredText, uuid } from './common';

export const CHANGE_CATEGORIES = [
  'content_change',
  'image_change',
  'new_page',
  'existing_page_update',
  'design_change',
  'bug',
  'new_feature',
  'integration_change',
  'seo_change',
  'technical_request',
  'other',
] as const;

/** What a client submits. Deliberately contains no commercial fields. */
export const changeRequestSchema = z.object({
  projectId: uuid,
  title: requiredText('Request title', 300),
  category: z.enum(CHANGE_CATEGORIES, { message: 'Choose a request type' }),
  description: requiredText('Description', 8000),
  affectedUrl: optionalUrl,
  desiredOutcome: optionalText(4000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

/** What the agency sets during triage. */
export const changeRequestTriageSchema = z.object({
  status: z.enum([
    'submitted',
    'awaiting_review',
    'more_information_required',
    'quotation_required',
    'awaiting_client_approval',
    'approved',
    'scheduled',
    'in_progress',
    'internal_qa',
    'client_review',
    'completed',
    'rejected',
    'cancelled',
  ]),
  billingTreatment: z
    .enum(['included_in_plan', 'additional_charge', 'requires_quotation', 'out_of_scope'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  assignedTo: optionalUuid,
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedCompletionDate: optionalDate,
  internalNotes: optionalText(8000),
  clientNotes: optionalText(8000),
  rejectedReason: optionalText(2000),
});

export const quoteSchema = z.object({
  quotedHours: z
    .string()
    .trim()
    .min(1, 'Enter the estimated hours')
    .transform(Number)
    .refine((v) => !Number.isNaN(v) && v >= 0, 'Estimated hours must be zero or more'),
  quotedCost: z
    .string()
    .trim()
    .min(1, 'Enter the estimated cost')
    .transform(Number)
    .refine((v) => !Number.isNaN(v) && v >= 0, 'Estimated cost must be zero or more'),
  quoteNotes: optionalText(4000),
  proposedCompletionDate: optionalDate,
  billingTreatment: z.enum([
    'included_in_plan',
    'additional_charge',
    'requires_quotation',
    'out_of_scope',
  ]),
});

export const quoteDecisionSchema = z.object({
  approvalId: uuid,
  decision: z.enum(['approved', 'rejected', 'clarification_requested']),
  decisionNotes: optionalText(4000),
});

/** Agency logs effort against the maintenance allowance when completing work. */
export const logEffortSchema = z.object({
  minutes: z
    .string()
    .trim()
    .min(1, 'Enter the time spent')
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v > 0, 'Enter whole minutes greater than zero'),
  description: requiredText('Description', 500),
});
