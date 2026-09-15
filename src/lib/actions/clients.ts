'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { requireAgency } from '@/lib/auth';
import { isAgencyManager } from '@/lib/permissions';
import { setInternalNote } from '@/lib/internal-notes';
import { createClient } from '@/lib/supabase/server';
import { clientSchema } from '@/lib/validation/clients';
import { formObject } from '@/lib/validation/common';
import { slugify } from '@/lib/utils';
import { errorState, zodErrors, type ActionState } from './types';

/**
 * Creates the client's organisation and CRM record together.
 *
 * The organisation is the tenancy root — portal users are attached to it, and
 * every RLS predicate for a client user resolves through it — so a client
 * record without one would be unreachable from the portal.
 */
export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  if (!isAgencyManager(session.profile.role)) {
    return errorState('Only project managers and administrators can create clients.');
  }

  const parsed = clientSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  // Slugs must be unique; suffix until one is free.
  const baseSlug = slugify(input.companyName) || 'client';
  let slug = baseSlug;
  for (let attempt = 1; attempt < 20; attempt += 1) {
    const { data: clash } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  const { data: organisation, error: orgError } = await supabase
    .from('organisations')
    .insert({ kind: 'client', name: input.companyName, slug })
    .select('id')
    .single();

  if (orgError || !organisation) {
    return errorState(`Could not create the client organisation: ${orgError?.message ?? 'unknown error'}`);
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      organisation_id: organisation.id,
      company_name: input.companyName,
      trading_name: input.tradingName ?? null,
      registration_number: input.registrationNumber ?? null,
      primary_contact_name: input.primaryContactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? null,
      industry: input.industry ?? null,
      description: input.description ?? null,
      is_existing_client: input.isExistingClient,
      account_manager_id: input.accountManagerId ?? null,
      created_by: session.userId,
    })
    .select('id, company_name')
    .single();

  if (clientError || !client) {
    // Roll back the orphaned organisation so a retry is not blocked by the slug.
    await supabase.from('organisations').delete().eq('id', organisation.id);
    return errorState(`Could not create the client: ${clientError?.message ?? 'unknown error'}`);
  }

  // Agency-only text lives in its own table, which clients cannot read at all.
  await setInternalNote({
    entityType: 'client',
    entityId: client.id,
    clientId: client.id,
    body: input.internalNotes,
    userId: session.userId,
  });

  await Promise.all([
    recordAudit({
      action: AuditAction.ClientCreated,
      entityType: 'client',
      entityId: client.id,
      newValue: { company_name: client.company_name },
    }),
    recordActivity({
      clientId: client.id,
      action: AuditAction.ClientCreated,
      summary: `${client.company_name} was added as a client`,
      entityType: 'client',
      entityId: client.id,
      actorName: session.profile.full_name,
    }),
  ]);

  revalidatePath('/clients');
  revalidatePath('/dashboard');
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = clientSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (!before) return errorState('That client could not be found.');

  const { error } = await supabase
    .from('clients')
    .update({
      company_name: input.companyName,
      trading_name: input.tradingName ?? null,
      registration_number: input.registrationNumber ?? null,
      primary_contact_name: input.primaryContactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? null,
      industry: input.industry ?? null,
      description: input.description ?? null,
      is_existing_client: input.isExistingClient,
      account_manager_id: input.accountManagerId ?? null,
    })
    .eq('id', clientId);

  if (error) return errorState(`Could not save the client: ${error.message}`);

  await setInternalNote({
    entityType: 'client',
    entityId: clientId,
    clientId,
    body: input.internalNotes,
    userId: session.userId,
  });

  // Keep the organisation name aligned so the portal header matches.
  if (before.company_name !== input.companyName) {
    await supabase
      .from('organisations')
      .update({ name: input.companyName })
      .eq('id', before.organisation_id);
  }

  await recordAudit({
    action: AuditAction.ClientUpdated,
    entityType: 'client',
    entityId: clientId,
    previousValue: {
      company_name: before.company_name,
      account_manager_id: before.account_manager_id,
      email: before.email,
    },
    newValue: {
      company_name: input.companyName,
      account_manager_id: input.accountManagerId ?? null,
      email: input.email ?? null,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/clients');
  redirect(`/clients/${clientId}`);
}

/** Soft-deletes a client. History, audit rows and invoicing evidence survive. */
export async function archiveClientAction(clientId: string): Promise<void> {
  const session = await requireAgency();
  if (session.profile.role !== 'agency_admin') {
    throw new Error('Only an administrator can archive a client.');
  }

  const supabase = await createClient();

  const { data: before } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .maybeSingle();

  await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', clientId);

  await recordAudit({
    action: AuditAction.ClientDeleted,
    entityType: 'client',
    entityId: clientId,
    previousValue: { company_name: before?.company_name ?? null },
  });

  revalidatePath('/clients');
  redirect('/clients');
}
