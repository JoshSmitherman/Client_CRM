import { z } from 'zod';

import { optionalText, optionalUrl, optionalUuid, requiredDate, requiredText, uuid } from './common';

const money = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), `${label} must be zero or more`);

const wholeMinutes = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, `${label} must be a whole number of minutes`);

export const planSchema = z.object({
  name: requiredText('Plan name', 120),
  description: optionalText(2000),
  monthlyPrice: money('Monthly price'),
  annualPrice: money('Annual price'),
  // Entered one per line in the form.
  includedServices: optionalText(4000),
  includedChangeMinutes: wholeMinutes('Included change time'),
  includedSupportMinutes: wholeMinutes('Included support time'),
  responseTimeHours: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), 'Enter whole hours'),
  priorityLevel: z
    .string()
    .trim()
    .transform((v) => Number(v || 3))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 5, 'Priority must be between 1 and 5'),
  billingFrequency: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  renewalPeriodMonths: z
    .string()
    .trim()
    .transform((v) => Number(v || 12))
    .refine((v) => Number.isInteger(v) && v > 0, 'Renewal period must be at least one month'),
  isActive: z.union([z.literal('on'), z.literal(''), z.undefined()]).transform((v) => v === 'on'),
  isPublic: z.union([z.literal('on'), z.literal(''), z.undefined()]).transform((v) => v === 'on'),
});

export const subscriptionSchema = z.object({
  clientId: uuid,
  projectId: optionalUuid,
  planId: uuid,
  status: z.enum(['trial', 'active', 'renewal_due', 'suspended', 'cancelled', 'expired']),
  websiteUrl: optionalUrl,
  startDate: requiredDate,
  renewalDate: requiredDate,
  billingCycle: z.enum(['monthly', 'quarterly', 'annual']),
  price: money('Price'),
  includedChangeMinutes: wholeMinutes('Included change time'),
  includedSupportMinutes: wholeMinutes('Included support time'),
  autoRenew: z.union([z.literal('on'), z.literal(''), z.undefined()]).transform((v) => v === 'on'),
  internalNotes: optionalText(4000),
});

export const usageSchema = z.object({
  usageType: z.enum(['change', 'support']),
  minutes: z
    .string()
    .trim()
    .min(1, 'Enter the number of minutes')
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v !== 0, 'Enter whole minutes — negative to correct an over-recording'),
  description: requiredText('Description', 500),
  occurredOn: requiredDate,
});

export const reminderSchema = z.object({
  clientId: uuid,
  subscriptionId: optionalUuid,
  projectId: optionalUuid,
  reminderType: z.enum([
    'subscription_renewal',
    'payment_due',
    'maintenance_review',
    'domain_renewal',
    'hosting_renewal',
    'ssl_expiry',
    'licence_renewal',
    'backup_check',
    'security_review',
    'monthly_report',
  ]),
  title: requiredText('Title', 200),
  dueDate: requiredDate,
  assignedTo: optionalUuid,
  notes: optionalText(2000),
});

export const planRequestSchema = z.object({
  subscriptionId: optionalUuid,
  requestedType: z.enum(['upgrade', 'downgrade', 'cancellation', 'renewal_discussion']),
  requestedPlanId: optionalUuid,
  message: optionalText(2000),
});
