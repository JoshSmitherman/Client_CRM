import { History } from 'lucide-react';

import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Timeline } from '@/components/ui/timeline';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const { data } = await supabase
    .from('activity_logs')
    .select('id, action, summary, created_at, actor_name, visibility, entity_type')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(200);

  return data ?? [];
}

export function ProjectActivityTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader
          title="Activity"
          description="Everything that has happened on this project, oldest at the bottom."
        />
        <CardBody>
          <QueryBoundary query={query}>
            {(entries) =>
              entries.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nothing recorded yet"
                  description="Activity appears here as work progresses."
                />
              ) : (
                <Timeline
                  entries={entries.map((entry) => ({
                    id: entry.id,
                    title: entry.summary,
                    meta: entry.actor_name ?? 'System',
                    timestamp: entry.created_at,
                    tone: entry.visibility === 'client' ? 'accent' : 'neutral',
                    body:
                      entry.visibility === 'internal' ? (
                        <Badge tone="neutral">Internal only</Badge>
                      ) : undefined,
                  }))}
                />
              )
            }
          </QueryBoundary>
        </CardBody>
      </Card>
    </div>
  );
}
