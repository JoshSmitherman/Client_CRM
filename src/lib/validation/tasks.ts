import { z } from 'zod';

import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from './common';

export const taskSchema = z.object({
  projectId: uuid,
  title: requiredText('Task title', 300),
  description: optionalText(4000),
  assigneeId: optionalUuid,
  responsibility: z.enum(['agency', 'client']).default('agency'),
  dueDate: optionalDate,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['to_do', 'in_progress', 'waiting', 'complete']).default('to_do'),
  workStream: z
    .enum(['discovery', 'design', 'development', 'content', 'qa', 'launch', 'other'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  onboardingSectionId: optionalUuid,
  milestoneId: optionalUuid,
  isClientVisible: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
});
