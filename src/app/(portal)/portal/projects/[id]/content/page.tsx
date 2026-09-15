import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SitemapTree, buildPageTree } from '@/components/content/sitemap-tree';
import { Card, CardBody } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { requireClient } from '@/lib/auth';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Website content' };

export default async function PortalContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClient();
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

  return (
    <>
      <PageHeader
        title="Website content"
        description="Write the words for each page. Save a draft as you go and submit when you are happy."
        breadcrumbs={[
          { label: 'Projects', href: '/portal/projects' },
          { label: project.name, href: `/portal/projects/${id}` },
          { label: 'Content' },
        ]}
      />

      {rows.length > 0 ? (
        <Card className="mb-4">
          <CardBody>
            <ProgressBar
              value={Math.round((approved / rows.length) * 100)}
              label={`${approved} of ${rows.length} pages approved`}
              size="lg"
            />
          </CardBody>
        </Card>
      ) : null}

      <SitemapTree
        projectId={id}
        pages={buildPageTree(rows)}
        basePath={`/portal/projects/${id}/content`}
        canEdit={false}
      />
    </>
  );
}
