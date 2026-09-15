'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { requireAgency, requireUser } from '@/lib/auth';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { canAcceptHandover, isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formObject } from '@/lib/validation/common';
import {
  acceptanceSchema,
  handoverDocumentSchema,
  handoverItemSchema,
  handoverSchema,
} from '@/lib/validation/handover';
import type { Enums } from '@/lib/supabase/database.types';
import { errorState, successState, zodErrors, type ActionState } from './types';

/**
 * Creates the handover record and instantiates the checklist from the agency
 * template, so a new handover starts with the standard 16 items rather than
 * an empty list someone has to remember to fill in.
 */
export async function createHandoverAction(projectId: string): Promise<void> {
  const session = await requireAgency();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('handovers')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) return;

  const { data: handover, error } = await supabase
    .from('handovers')
    .insert({ project_id: projectId, status: 'draft', prepared_by: session.userId })
    .select('id')
    .single();

  if (error || !handover) throw new Error(error?.message ?? 'Could not create the handover.');

  const { data: checklist } = await supabase
    .from('handover_checklists')
    .insert({
      handover_id: handover.id,
      project_id: projectId,
      name: 'Launch checklist',
      created_by: session.userId,
    })
    .select('id')
    .single();

  const { data: template } = await supabase
    .from('handover_template_items')
    .select('title, description, position')
    .eq('is_active', true)
    .order('position');

  if (checklist && template?.length) {
    await supabase.from('handover_items').insert(
      template.map((item) => ({
        checklist_id: checklist.id,
        project_id: projectId,
        title: item.title,
        description: item.description,
        position: item.position,
      })),
    );
  }

  revalidatePath(`/projects/${projectId}/handover`);
}

export async function saveHandoverAction(
  handoverId: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAgency();

  const parsed = handoverSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from('handovers')
    .update({
      website_url: input.websiteUrl ?? null,
      admin_url: input.adminUrl ?? null,
      cms_platform: input.cmsPlatform ?? null,
      hosting_provider: input.hostingProvider ?? null,
      hosting_notes: input.hostingNotes ?? null,
      domain_registrar: input.domainRegistrar ?? null,
      domain_expiry: input.domainExpiry ?? null,
      dns_provider: input.dnsProvider ?? null,
      ssl_provider: input.sslProvider ?? null,
      ssl_expiry: input.sslExpiry ?? null,
      analytics_notes: input.analyticsNotes ?? null,
      search_console_notes: input.searchConsoleNotes ?? null,
      backup_notes: input.backupNotes ?? null,
      security_notes: input.securityNotes ?? null,
      licence_notes: input.licenceNotes ?? null,
      documentation_notes: input.documentationNotes ?? null,
      training_notes: input.trainingNotes ?? null,
      maintenance_notes: input.maintenanceNotes ?? null,
    })
    .eq('id', handoverId);

  if (error) return errorState(`Could not save the handover: ${error.message}`);

  revalidatePath(`/projects/${projectId}/handover`);
  return successState('Handover details saved.');
}

export async function setHandoverItemStatusAction(
  itemId: string,
  status: Enums<'handover_item_status'>,
): Promise<void> {
  const session = await requireAgency();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('handover_items')
    .select('project_id')
    .eq('id', itemId)
    .maybeSingle();

  const { error } = await supabase
    .from('handover_items')
    .update({
      status,
      completed_at: status === 'complete' ? new Date().toISOString() : null,
      completed_by: status === 'complete' ? session.userId : null,
    })
    .eq('id', itemId);

  if (error) throw new Error(error.message);

  if (item) revalidatePath(`/projects/${item.project_id}/handover`);
}

export async function addHandoverItemAction(
  checklistId: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAgency();

  const parsed = handoverItemSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from('handover_items')
    .select('id', { count: 'exact', head: true })
    .eq('checklist_id', checklistId);

  const { error } = await supabase.from('handover_items').insert({
    checklist_id: checklistId,
    project_id: projectId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    position: (count ?? 0) + 1,
  });

  if (error) return errorState(`Could not add the item: ${error.message}`);

  revalidatePath(`/projects/${projectId}/handover`);
  return successState('Item added.');
}

export async function deleteHandoverItemAction(itemId: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('handover_items')
    .select('project_id')
    .eq('id', itemId)
    .maybeSingle();

  await supabase.from('handover_items').delete().eq('id', itemId);

  if (item) revalidatePath(`/projects/${item.project_id}/handover`);
}

export async function addHandoverDocumentAction(
  handoverId: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = handoverDocumentSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const file = formData.get('file');
  let fileId: string | null = null;

  if (file instanceof File && file.size > 0) {
    const { data: project } = await supabase
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project) {
      const uploadData = new FormData();
      uploadData.set('projectId', projectId);
      uploadData.set('clientId', project.client_id);
      uploadData.set('category', 'document');
      uploadData.set('description', input.title);
      uploadData.append('files', file);

      const { uploadFilesAction } = await import('./files');
      const result = await uploadFilesAction({ status: 'idle' }, uploadData);

      if (result.status === 'error') return result;

      const { data: uploaded } = await supabase
        .from('files')
        .select('id')
        .eq('project_id', projectId)
        .eq('uploaded_by', session.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      fileId = uploaded?.id ?? null;
    }
  }

  if (!fileId && !input.externalUrl) {
    return errorState('Attach a file or provide a link.', {
      externalUrl: 'Either upload a file or paste a link.',
    });
  }

  const { count } = await supabase
    .from('handover_documents')
    .select('id', { count: 'exact', head: true })
    .eq('handover_id', handoverId);

  const { error } = await supabase.from('handover_documents').insert({
    handover_id: handoverId,
    project_id: projectId,
    file_id: fileId,
    title: input.title,
    doc_type: input.docType,
    description: input.description ?? null,
    external_url: input.externalUrl ?? null,
    visible_to_client: input.visibleToClient,
    position: (count ?? 0) + 1,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not add the document: ${error.message}`);

  revalidatePath(`/projects/${projectId}/handover`);
  return successState('Document added.');
}

export async function deleteHandoverDocumentAction(documentId: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('handover_documents')
    .select('project_id')
    .eq('id', documentId)
    .maybeSingle();

  await supabase.from('handover_documents').delete().eq('id', documentId);

  if (doc) revalidatePath(`/projects/${doc.project_id}/handover`);
}

/** Marks the pack ready, or delivers it to the client. */
export async function setHandoverStatusAction(
  handoverId: string,
  status: Enums<'handover_status'>,
): Promise<void> {
  const session = await requireAgency();
  const supabase = await createClient();

  const { data: handover } = await supabase
    .from('handovers')
    .select('project_id, status, projects ( name, client_id )')
    .eq('id', handoverId)
    .maybeSingle();

  if (!handover) throw new Error('Handover not found.');

  // Nothing reaches the client until every applicable item is done.
  if (status === 'ready' || status === 'delivered') {
    const { data: items } = await supabase
      .from('handover_items')
      .select('status')
      .eq('project_id', handover.project_id);

    const outstanding = (items ?? []).filter(
      (i) => i.status !== 'complete' && i.status !== 'not_applicable',
    ).length;

    if (outstanding > 0) {
      throw new Error(
        `${outstanding} checklist item${outstanding === 1 ? '' : 's'} still outstanding. ` +
          'Complete them, or mark them not applicable.',
      );
    }
  }

  const { error } = await supabase
    .from('handovers')
    .update({
      status,
      ...(status === 'delivered'
        ? { delivered_at: new Date().toISOString(), delivered_by: session.userId }
        : {}),
    })
    .eq('id', handoverId);

  if (error) throw new Error(error.message);

  const project = handover.projects as unknown as { name: string; client_id: string } | null;

  if (status === 'delivered' && project) {
    await Promise.all([
      recordAudit({
        action: AuditAction.HandoverDelivered,
        entityType: 'handover',
        entityId: handoverId,
        previousValue: { status: handover.status },
        newValue: { status: 'delivered' },
      }),
      recordActivity({
        projectId: handover.project_id,
        clientId: project.client_id,
        action: AuditAction.HandoverDelivered,
        summary: 'The handover pack was delivered to the client',
        entityType: 'handover',
        entityId: handoverId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await clientNotificationTargets(project.client_id),
        type: 'project_ready_for_handover',
        title: `${project.name} is ready for handover`,
        body: 'Your documentation is ready. Please review and confirm acceptance.',
        projectId: handover.project_id,
        clientId: project.client_id,
        entityType: 'handover',
        entityId: handoverId,
        url: `/portal/projects/${handover.project_id}/handover`,
      }),
    ]);
  }

  revalidatePath(`/projects/${handover.project_id}/handover`);
  revalidatePath('/portal', 'layout');
}

/**
 * Formal client acceptance. Append-only and part of the audit history: the
 * table has no update or delete policy, so this can never be revised later.
 */
export async function acceptHandoverAction(
  projectId: string,
  handoverId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  if (!canAcceptHandover(session.profile.role)) {
    return errorState(
      'Only a client administrator can sign off the handover. Ask your colleague with that role, or contact us.',
    );
  }

  const parsed = acceptanceSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Please confirm each point below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('name, reference, client_id, completion_percentage')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return errorState('That project could not be found.');

  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');

  const statement =
    'I confirm that I have reviewed the website, that the changes we requested have been ' +
    'completed, that the website is approved for launch, that I have received the handover ' +
    'materials, and that I understand the ongoing maintenance arrangement.';

  const { data: acceptance, error } = await supabase
    .from('client_acceptances')
    .insert({
      project_id: projectId,
      handover_id: handoverId,
      approved_by: session.userId,
      approved_by_name: session.profile.full_name || session.email,
      project_version: project.reference,
      statement,
      website_reviewed: input.websiteReviewed,
      requested_changes_completed: input.requestedChangesCompleted,
      approved_for_launch: input.approvedForLaunch,
      handover_materials_received: input.handoverMaterialsReceived,
      training_received: input.trainingReceived,
      training_not_applicable: input.trainingNotApplicable,
      maintenance_understood: input.maintenanceUnderstood,
      signature_name: input.signatureName,
      ip_address: forwardedFor?.split(',')[0]?.trim() ?? null,
      user_agent: headerList.get('user-agent'),
    })
    .select('id')
    .single();

  if (error || !acceptance) {
    return errorState(`Could not record your acceptance: ${error?.message ?? 'unknown error'}`);
  }

  await supabase.from('handovers').update({ status: 'accepted' }).eq('id', handoverId);

  await Promise.all([
    recordAudit({
      action: AuditAction.HandoverAccepted,
      entityType: 'client_acceptance',
      entityId: acceptance.id,
      newValue: {
        project_id: projectId,
        signature_name: input.signatureName,
        project_version: project.reference,
      },
    }),
    recordActivity({
      projectId,
      clientId: project.client_id,
      action: AuditAction.HandoverAccepted,
      summary: `${input.signatureName} accepted the handover`,
      entityType: 'handover',
      entityId: handoverId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    notify({
      userIds: await projectNotificationTargets(projectId),
      type: 'handover_accepted',
      title: `${project.name}: handover accepted`,
      body: `Signed off by ${input.signatureName}.`,
      projectId,
      clientId: project.client_id,
      entityType: 'handover',
      entityId: handoverId,
      url: `/projects/${projectId}/handover`,
    }),
  ]);

  revalidatePath('/', 'layout');
  return successState('Thank you — your acceptance has been recorded.');
}
