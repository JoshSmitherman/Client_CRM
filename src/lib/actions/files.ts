
import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { categoryForMime, safeFileName, storageKey, validateFile } from '@/lib/files';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { currentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/client';
import type { Enums } from '@/lib/supabase/database.types';
import { errorState, successState, type ActionState } from './types';

/**
 * Uploads one or more files.
 *
 * Storage is written with the user's own session, so the object policies (which
 * call the same can_access_project predicate as the rows) decide whether the
 * bytes may be written at all. The database row is inserted afterwards; if that
 * fails the object is removed again so no orphan is left behind.
 */
export async function uploadFilesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();

  const projectId = String(formData.get('projectId') ?? '') || null;
  const clientId = String(formData.get('clientId') ?? '') || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const categoryOverride = String(formData.get('category') ?? '') || null;
  const sectionId = String(formData.get('onboardingSectionId') ?? '') || null;
  const pageId = String(formData.get('websitePageId') ?? '') || null;

  if (!clientId) return errorState('Missing client reference for this upload.');

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return errorState('Choose at least one file to upload.');
  const uploaded: string[] = [];
  const failures: string[] = [];

  for (const file of files) {
    const check = validateFile({ name: file.name, size: file.size, type: file.type });
    if (!check.ok) {
      failures.push(check.error ?? `${file.name} could not be uploaded.`);
      continue;
    }

    const key = projectId
      ? storageKey('projects', projectId, file.name)
      : storageKey('clients', clientId, file.name);

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(key, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      failures.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    const { data: row, error: rowError } = await supabase
      .from('files')
      .insert({
        project_id: projectId,
        client_id: clientId,
        onboarding_section_id: sectionId,
        website_page_id: pageId,
        bucket: 'project-files',
        storage_path: key,
        file_name: safeFileName(file.name),
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        category: (categoryOverride as Enums<'file_category'>) ?? categoryForMime(file.type, file.name),
        description,
        uploaded_by: session.userId,
        // A client's upload always starts as pending; the guard trigger stops
        // them changing it afterwards.
        approval_status: 'pending',
        is_client_visible: true,
      })
      .select('id, file_name')
      .single();

    if (rowError || !row) {
      // Remove the object so storage and the database cannot drift apart.
      await supabase.storage.from('project-files').remove([key]);
      failures.push(`${file.name}: ${rowError?.message ?? 'could not be recorded'}`);
      continue;
    }

    uploaded.push(row.file_name);

    await recordAudit({
      action: AuditAction.FileUploaded,
      entityType: 'file',
      entityId: row.id,
      newValue: { file_name: row.file_name, size_bytes: file.size, project_id: projectId },
    });
  }

  if (uploaded.length > 0) {
    await recordActivity({
      projectId,
      clientId,
      action: AuditAction.FileUploaded,
      summary:
        uploaded.length === 1
          ? `${session.profile.full_name || 'Someone'} uploaded ${uploaded[0]}`
          : `${session.profile.full_name || 'Someone'} uploaded ${uploaded.length} files`,
      entityType: 'file',
      visibility: 'client',
      actorName: session.profile.full_name,
    });

    const targets = projectId
      ? await projectNotificationTargets(projectId)
      : await clientNotificationTargets(clientId);

    await notify({
      userIds: targets,
      type: 'file_uploaded',
      title: `${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded`,
      body: uploaded.join(', ').slice(0, 160),
      projectId,
      clientId,
      url: projectId ? `/projects/${projectId}/files` : '/files',
    });
  }

  if (failures.length > 0 && uploaded.length === 0) {
    return errorState(failures.join(' '));
  }
  if (failures.length > 0) {
    return errorState(
      `Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'}. ${failures.join(' ')}`,
    );
  }

  return successState(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'}.`);
}

/** Agency-only approval decision on an uploaded file. */
export async function setFileApprovalAction(
  fileId: string,
  status: Enums<'file_approval_status'>,
  notes?: string,
): Promise<void> {
  const session = await currentUser();
  if (!isAgency(session.profile.role)) {
    throw new Error('Only agency users can approve files.');
  }

  if (status !== 'approved' && !notes?.trim()) {
    throw new Error('Explain what needs to change when rejecting a file.');
  }

  const { data: before } = await supabase
    .from('files')
    .select('file_name, approval_status, project_id, client_id')
    .eq('id', fileId)
    .maybeSingle();

  if (!before) throw new Error('File not found.');

  const { error } = await supabase
    .from('files')
    .update({
      approval_status: status,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes?.trim() || null,
    })
    .eq('id', fileId);

  if (error) throw new Error(error.message);

  await Promise.all([
    recordAudit({
      action: AuditAction.FileApprovalChanged,
      entityType: 'file',
      entityId: fileId,
      previousValue: { approval_status: before.approval_status },
      newValue: { approval_status: status, notes: notes ?? null },
    }),
    supabase.from('approvals').insert({
      project_id: before.project_id,
      client_id: before.client_id,
      entity_type: 'file',
      entity_id: fileId,
      decision:
        status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'changes_requested',
      reason: notes?.trim() || null,
      previous_status: before.approval_status,
      new_status: status,
      decided_by: session.userId,
    }),
    recordActivity({
      projectId: before.project_id,
      clientId: before.client_id,
      action: AuditAction.FileApprovalChanged,
      summary: `${before.file_name} was marked ${status.replace('_', ' ')}`,
      entityType: 'file',
      entityId: fileId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
  ]);
}

/** Soft-deletes the row and removes the object. */
export async function deleteFileAction(fileId: string): Promise<void> {
  const session = await currentUser();

  const { data: file } = await supabase
    .from('files')
    .select('file_name, storage_path, project_id, client_id, uploaded_by')
    .eq('id', fileId)
    .maybeSingle();

  if (!file) return;

  const canDelete =
    session.profile.role === 'agency_admin' ||
    session.profile.role === 'project_manager' ||
    file.uploaded_by === session.userId;

  if (!canDelete) throw new Error('You can only delete files you uploaded.');

  await supabase
    .from('files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId);

  await supabase.storage.from('project-files').remove([file.storage_path]);

  await Promise.all([
    recordAudit({
      action: AuditAction.FileDeleted,
      entityType: 'file',
      entityId: fileId,
      previousValue: { file_name: file.file_name, storage_path: file.storage_path },
    }),
    recordActivity({
      projectId: file.project_id,
      clientId: file.client_id,
      action: AuditAction.FileDeleted,
      summary: `${file.file_name} was deleted`,
      entityType: 'file',
      entityId: fileId,
      actorName: session.profile.full_name,
    }),
  ]);
}
