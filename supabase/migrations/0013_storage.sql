-- ===========================================================================
-- 0013  Storage buckets and object policies
-- ===========================================================================
-- One private bucket. Object keys follow:
--     projects/<project_id>/<uuid>-<filename>
--     clients/<client_id>/<uuid>-<filename>     (files not tied to a project)
-- The same predicates that guard the `files` rows guard the bytes, so a leaked
-- object key is useless without an authorised session.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  104857600,  -- 100 MB
  array[
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','text/markdown',
    'application/zip','application/x-zip-compressed',
    'font/otf','font/ttf','font/woff','font/woff2',
    'application/postscript'  -- .ai / .eps brand assets
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = false;

-- Resolves the owning scope from the object key.
create or replace function public.storage_object_allowed(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_scope text;
  v_id    uuid;
begin
  v_parts := storage.foldername(p_name);

  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 2 then
    return false;
  end if;

  v_scope := v_parts[1];

  begin
    v_id := v_parts[2]::uuid;
  exception when others then
    return false;
  end;

  if v_scope = 'projects' then
    return case when p_write
                then public.can_access_project(v_id)  -- clients upload too
                else public.can_access_project(v_id)
           end;
  elsif v_scope = 'clients' then
    return public.can_access_client(v_id);
  end if;

  return false;
end;
$$;

drop policy if exists "project files are readable by authorised users" on storage.objects;
create policy "project files are readable by authorised users"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and public.storage_object_allowed(name, false));

drop policy if exists "project files are writable by authorised users" on storage.objects;
create policy "project files are writable by authorised users"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.storage_object_allowed(name, true));

-- Replacing an object requires edit rights on the owning project.
drop policy if exists "project files are updatable by their owner or the agency" on storage.objects;
create policy "project files are updatable by their owner or the agency"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and (owner = auth.uid() or public.is_agency()))
  with check (bucket_id = 'project-files' and public.storage_object_allowed(name, true));

drop policy if exists "project files are removable by the agency or uploader" on storage.objects;
create policy "project files are removable by the agency or uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (owner = auth.uid() or public.is_agency_manager())
  );
