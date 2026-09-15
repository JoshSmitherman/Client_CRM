import { z } from 'zod';

import { email, password, requiredText } from './common';

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const acceptInviteSchema = z
  .object({
    fullName: requiredText('Full name', 120),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
