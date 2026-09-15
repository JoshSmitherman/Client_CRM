import { notFound } from 'next/navigation';

import { SitemapTree, buildPageTree } from '@/components/content/sitemap-tree';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { requireAgency } from '@/lib/auth';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();

  const { data: pages } = await supabase
    .from('website_pages')
    .select('id, title, slug, parent_id, page_kind, in_navigation, position, status')
    .eq('project_id', id)
    .is('deleted_at', null)
    .order('position');

  const rows = pages ?? [];
  const approved = rows.filter((p) => p.status === 'approved').length;
  const submitted = rows.filter((p) => p.status === 'submitted').length;

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <Card>
          <CardHeader
            title="Content progress"
            description={`${approved} of ${rows.length} pages approved${
              submitted > 0 ? ` · ${submitted} awaiting review` : ''
            }`}
          />
          <CardBody>
            <ProgressBar
              value={rows.length === 0 ? 0 : Math.round((approved / rows.length) * 100)}
              label="Pages approved"
              size="lg"
            />
          </CardBody>
        </Card>
      ) : null}

      <SitemapTree
        projectId={id}
        pages={buildPageTree(rows)}
        basePath={`/projects/${id}/content`}
        canEdit
      />
    </div>
  );
}
