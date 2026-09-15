import { z } from 'zod';

import {
  checkbox,
  optionalEmail,
  optionalText,
  optionalUrl,
  optionalUuid,
  requiredText,
} from './common';

export const clientSchema = z.object({
  companyName: requiredText('Company name', 200),
  tradingName: optionalText(200),
  registrationNumber: optionalText(60),
  primaryContactName: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  website: optionalUrl,
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postcode: optionalText(20),
  country: optionalText(100),
  industry: optionalText(120),
  description: optionalText(4000),
  isExistingClient: checkbox,
  accountManagerId: optionalUuid,
  internalNotes: optionalText(8000),
});

export type ClientInput = z.infer<typeof clientSchema>;
