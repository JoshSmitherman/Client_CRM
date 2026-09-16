import { SitemapTree, buildPageTree } from '@/components/content/sitemap-tree';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const { data } = await supabase
    .from('website_pages')
    .select('id, title, slug, parent_id, page_kind, in_navigation, position, status')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position');

  return data ?? [];
}

export function ProjectContentTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <QueryBoundary query={query}>
      {(rows) => {
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
              projectId={projectId}
              pages={buildPageTree(rows)}
              basePath={`/projects/${projectId}/content`}
              canEdit
            />
          </div>
        );
      }}
    </QueryBoundary>
  );
}
