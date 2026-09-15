import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Timeline } from '@/components/ui/timeline';
import { requireAgency } from '@/lib/auth';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';
import { History } from 'lucide-react';

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();
  const { data: activity } = await supabase
    .from('activity_logs')
    .select('id, action, summary, created_at, actor_name, visibility, entity_type')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  const entries = activity ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader
          title="Activity"
          description="Everything that has happened on this project, oldest at the bottom."
        />
        <CardBody>
          {entries.length === 0 ? (
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
          )}
        </CardBody>
      </Card>
    </div>
  );
}
