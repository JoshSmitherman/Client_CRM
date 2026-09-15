import { z } from 'zod';

import { checkbox, optionalDate, optionalText, optionalUrl, requiredText } from './common';

/**
 * Deliberately contains no credential fields. Passwords, API secrets and
 * card details are never collected or stored — the handover records where
 * things live and who provides them, not how to get in.
 */
export const handoverSchema = z.object({
  websiteUrl: optionalUrl,
  adminUrl: optionalUrl,
  cmsPlatform: optionalText(200),
  hostingProvider: optionalText(200),
  hostingNotes: optionalText(4000),
  domainRegistrar: optionalText(200),
  domainExpiry: optionalDate,
  dnsProvider: optionalText(200),
  sslProvider: optionalText(200),
  sslExpiry: optionalDate,
  analyticsNotes: optionalText(4000),
  searchConsoleNotes: optionalText(4000),
  backupNotes: optionalText(4000),
  securityNotes: optionalText(4000),
  licenceNotes: optionalText(4000),
  documentationNotes: optionalText(4000),
  trainingNotes: optionalText(4000),
  maintenanceNotes: optionalText(4000),
});

export const handoverItemSchema = z.object({
  title: requiredText('Item', 200),
  description: optionalText(1000),
});

export const handoverDocumentSchema = z.object({
  title: requiredText('Title', 200),
  docType: z.enum([
    'user_guide',
    'training_video',
    'documentation',
    'brand_guidelines',
    'technical',
    'maintenance',
    'backup_instructions',
    'cms_guide',
    'other',
  ]),
  description: optionalText(1000),
  externalUrl: optionalUrl,
  visibleToClient: checkbox,
});

/** Every confirmation must be affirmative — the table enforces this too. */
export const acceptanceSchema = z
  .object({
    websiteReviewed: checkbox,
    requestedChangesCompleted: checkbox,
    approvedForLaunch: checkbox,
    handoverMaterialsReceived: checkbox,
    trainingReceived: checkbox,
    trainingNotApplicable: checkbox,
    maintenanceUnderstood: checkbox,
    signatureName: requiredText('Your name', 120),
  })
  .refine((v) => v.websiteReviewed, {
    message: 'Please confirm you have reviewed the website',
    path: ['websiteReviewed'],
  })
  .refine((v) => v.requestedChangesCompleted, {
    message: 'Please confirm the requested changes are complete',
    path: ['requestedChangesCompleted'],
  })
  .refine((v) => v.approvedForLaunch, {
    message: 'Please confirm the website is approved for launch',
    path: ['approvedForLaunch'],
  })
  .refine((v) => v.handoverMaterialsReceived, {
    message: 'Please confirm you have received the handover materials',
    path: ['handoverMaterialsReceived'],
  })
  .refine((v) => v.maintenanceUnderstood, {
    message: 'Please confirm you understand the maintenance arrangement',
    path: ['maintenanceUnderstood'],
  })
  .refine((v) => v.trainingReceived || v.trainingNotApplicable, {
    message: 'Confirm training was received, or that it does not apply',
    path: ['trainingReceived'],
  });
