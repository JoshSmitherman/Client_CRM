import { useParams } from 'react-router-dom';

import { SitemapTree, buildPageTree } from '@/components/content/sitemap-tree';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { useQuery } from '@/lib/data/use-query';
import { getProject } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const project = await getProject(id);
  if (!project) return null;

  const { data: pages } = await supabase
    .from('website_pages')
    .select('id, title, slug, parent_id, page_kind, in_navigation, position, status')
    .eq('project_id', id)
    .is('deleted_at', null)
    .order('position');

  return { project, pages: pages ?? [] };
}

export function PortalContentPage() {
  useDocumentTitle('Website content');
  const { id = '' } = useParams();
  const query = useQuery(() => load(id), [id]);

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data) return <NotFoundPage />;
        const { project, pages } = data;
        const approved = pages.filter((p) => p.status === 'approved').length;

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

            {pages.length > 0 ? (
              <Card className="mb-4">
                <CardBody>
                  <ProgressBar
                    value={Math.round((approved / pages.length) * 100)}
                    label={`${approved} of ${pages.length} pages approved`}
                    size="lg"
                  />
                </CardBody>
              </Card>
            ) : null}

            <SitemapTree
              projectId={id}
              pages={buildPageTree(pages)}
              basePath={`/portal/projects/${id}/content`}
              canEdit={false}
            />
          </>
        );
      }}
    </QueryBoundary>
  );
}
