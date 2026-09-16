import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { PROJECT_HEALTH_LABELS, PROJECT_HEALTH_TONES, PROJECT_TYPE_LABELS } from '@/lib/constants';
import { formatDate, formatRelative, isOverdue } from '@/lib/format';
import type { ProjectRow } from '@/lib/queries/dashboard';
import { Briefcase } from 'lucide-react';

export function ProjectTable({
  projects,
  emptyMessage = 'No projects match these filters.',
}: {
  projects: ProjectRow[];
  emptyMessage?: string;
}) {
  if (projects.length === 0) {
    return <EmptyState icon={Briefcase} title="No projects" description={emptyMessage} />;
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Project</Th>
            <Th>Client</Th>
            <Th>Stage</Th>
            <Th className="w-40">Progress</Th>
            <Th>Launch</Th>
            <Th>Health</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const health = project.health as keyof typeof PROJECT_HEALTH_LABELS;
            const launchLate = isOverdue(project.target_launch_date);

            return (
              <Tr key={project.id}>
                <Td>
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-medium hover:text-[var(--accent-text)] hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="block text-[12px] text-[var(--text-muted)]">
                    {project.reference} ·{' '}
                    {PROJECT_TYPE_LABELS[project.project_type] ?? project.project_type}
                  </span>
                </Td>
                <Td>
                  {project.clients ? (
                    <Link
                      to={`/clients/${project.clients.id}`}
                      className="text-[13px] hover:text-[var(--accent-text)] hover:underline"
                    >
                      {project.clients.company_name}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </Td>
                <Td>
                  {project.lifecycle_stages ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project.lifecycle_stages.colour }}
                        aria-hidden="true"
                      />
                      {project.lifecycle_stages.label}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </Td>
                <Td>
                  <ProgressBar value={project.completion_percentage} size="sm" showValue={false} />
                  <span className="mt-1 block text-[12px] tabular-nums text-[var(--text-muted)]">
                    {project.completion_percentage}%
                  </span>
                </Td>
                <Td className="text-[13px] whitespace-nowrap">
                  {project.target_launch_date ? (
                    <span className={launchLate ? 'font-medium text-[var(--danger-text)]' : ''}>
                      {formatDate(project.target_launch_date)}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Not set</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={PROJECT_HEALTH_TONES[health] ?? 'neutral'} dot>
                    {PROJECT_HEALTH_LABELS[health] ?? project.health}
                  </Badge>
                </Td>
                <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                  {formatRelative(project.updated_at)}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}
