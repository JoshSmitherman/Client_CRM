import { z } from 'zod';

import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from './common';

export const PROJECT_TYPES = [
  'new_website',
  'website_redesign',
  'ecommerce',
  'landing_page',
  'website_maintenance',
  'branding',
  'social_media_rebrand',
  'seo',
  'it_consultancy',
  'custom_development',
] as const;

export const projectSchema = z.object({
  clientId: uuid,
  name: requiredText('Project name', 200),
  projectType: z.enum(PROJECT_TYPES, { message: 'Choose a project type' }),
  description: optionalText(4000),
  stageId: optionalUuid,
  targetStartDate: optionalDate,
  targetLaunchDate: optionalDate,
  internalNotes: optionalText(8000),
  /** Seeds the 12-section onboarding questionnaire on creation. */
  createOnboarding: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
});

export const projectSettingsSchema = z.object({
  name: requiredText('Project name', 200),
  projectType: z.enum(PROJECT_TYPES),
  description: optionalText(4000),
  stageId: optionalUuid,
  health: z.enum(['on_track', 'at_risk', 'off_track', 'on_hold']),
  targetStartDate: optionalDate,
  targetLaunchDate: optionalDate,
  actualLaunchDate: optionalDate,
  internalNotes: optionalText(8000),
});

export const planSchema = z.object({
  scope: optionalText(8000),
  objectives: optionalText(8000),
  clientResponsibilities: optionalText(8000),
  agencyResponsibilities: optionalText(8000),
  notes: optionalText(8000),
});

export const milestoneSchema = z.object({
  title: requiredText('Milestone title', 200),
  description: optionalText(2000),
  targetDate: optionalDate,
  ownerSide: z.enum(['agency', 'client']).default('agency'),
  dependsOnId: optionalUuid,
});

export const deliverableSchema = z.object({
  title: requiredText('Deliverable', 200),
  description: optionalText(2000),
  ownerSide: z.enum(['agency', 'client']).default('agency'),
  dueDate: optionalDate,
});

export const riskSchema = z.object({
  title: requiredText('Risk', 200),
  description: optionalText(2000),
  likelihood: z.enum(['low', 'medium', 'high']).default('medium'),
  impact: z.enum(['low', 'medium', 'high']).default('medium'),
  mitigation: optionalText(2000),
  ownerId: optionalUuid,
});
