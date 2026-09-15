import type { Metadata } from 'next';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Inbox,
  LifeBuoy,
  Rocket,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { AttentionList } from '@/components/dashboard/attention-list';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { ProjectTable } from '@/components/projects/project-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { REMINDER_TYPE_LABELS, URGENCY_LABELS, URGENCY_TONES } from '@/lib/constants';
import { formatDate, formatRelative } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import {
  getAttentionLists,
  getDashboardStats,
  getFilterOptions,
  getProjects,
  type DashboardFilters,
} from '@/lib/queries/dashboard';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata: Metadata = { title: 'Dashboard' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Turns the URL query string into typed filters. */
function parseFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const completion = one('completion');
  let minCompletion: number | undefined;
  let maxCompletion: number | undefined;

  if (completion) {
    const [min, max] = completion.split('-').map(Number);
    if (!Number.isNaN(min)) minCompletion = min;
    if (!Number.isNaN(max)) maxCompletion = max;
  }

  return {
    clientId: one('client'),
    staffId: one('staff'),
    stageKey: one('stage'),
    projectType: one('type') as Enums<'project_type'> | undefined,
    planId: one('plan'),
    search: one('q'),
    minCompletion,
    maxCompletion,
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAgency();
  const params = await searchParams;
  const filters = parseFilters(params);

  const [stats, options, projects, attention] = await Promise.all([
    getDashboardStats(),
    getFilterOptions(),
    getProjects(filters, 25),
    getAttentionLists(),
  ]);

  const firstName = session.profile.full_name?.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Good ${timeOfDay()}, ${firstName}`}
        description="Everything that needs your attention across the agency."
      />

      {/* KPI tiles ------------------------------------------------------- */}
      <section aria-label="Key figures" className="mb-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <StatTile label="Active clients" value={stats.activeClients} icon={Users} tone="accent" href="/clients" />
          <StatTile label="Active projects" value={stats.activeProjects} icon={Briefcase} tone="info" href="/projects" />
          <StatTile label="Onboarding" value={stats.onboarding} icon={ClipboardList} tone="accent" href="/projects?stage=onboarding" />
          <StatTile label="In development" value={stats.inDevelopment} icon={Clock} tone="info" href="/projects?stage=development" />
          <StatTile label="Awaiting approval" value={stats.awaitingApproval} icon={CheckCircle2} tone="warning" href="/projects?stage=client_review" />
          <StatTile label="Awaiting content" value={stats.awaitingContent} icon={Inbox} tone="warning" href="/projects?stage=awaiting_content" />
          <StatTile label="Nearing handover" value={stats.nearingHandover} icon={Rocket} tone="success" href="/projects?stage=launch_prep" />
          <StatTile label="Open change requests" value={stats.openChangeRequests} icon={FileText} tone="info" href="/change-requests" />
          <StatTile label="Open support requests" value={stats.openSupportRequests} icon={LifeBuoy} tone="warning" href="/support" />
          <StatTile label="Active subscriptions" value={stats.activeSubscriptions} icon={ShieldCheck} tone="success" href="/maintenance?tab=subscriptions" />
          <StatTile
            label="Renewals due"
            value={stats.renewalsDueSoon}
            hint="Within 30 days"
            icon={CalendarClock}
            tone={stats.renewalsDueSoon > 0 ? 'warning' : 'neutral'}
            href="/maintenance?tab=reminders"
          />
          <StatTile
            label="Overdue client actions"
            value={stats.overdueClientActions}
            icon={AlertTriangle}
            tone={stats.overdueClientActions > 0 ? 'danger' : 'neutral'}
            href="/tasks?responsibility=client&overdue=1"
          />
        </div>
      </section>

      {/* Needs attention -------------------------------------------------- */}
      <section aria-label="Needs attention" className="mb-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <AttentionList
          title="Onboarding to review"
          description="Client submissions waiting on the agency"
          icon={ClipboardList}
          emptyMessage="No onboarding sections are waiting for review."
          items={attention.submissions.map((row) => {
            const project = row.projects as unknown as
              | { name: string; clients: { company_name: string } | null }
              | null;
            return {
              id: row.id,
              href: `/projects/${row.project_id}/onboarding`,
              title: row.title,
              meta: `${project?.clients?.company_name ?? 'Unknown client'} · ${project?.name ?? ''} · submitted ${formatRelative(row.submitted_at)}`,
            };
          })}
        />

        <AttentionList
          title="Change requests to triage"
          description="Awaiting review or a quotation"
          icon={FileText}
          viewAllHref="/change-requests"
          emptyMessage="Every change request has been triaged."
          items={attention.quotes.map((row) => {
            const client = row.clients as unknown as { company_name: string } | null;
            return {
              id: row.id,
              href: `/change-requests/${row.id}`,
              title: row.title,
              meta: `${row.reference} · ${client?.company_name ?? ''} · raised ${formatRelative(row.submitted_at)}`,
            };
          })}
        />

        <AttentionList
          title="Urgent support"
          description="High and critical tickets still open"
          icon={LifeBuoy}
          viewAllHref="/support"
          emptyMessage="No urgent support tickets are open."
          items={attention.criticalTickets.map((row) => {
            const client = row.clients as unknown as { company_name: string } | null;
            return {
              id: row.id,
              href: `/support/${row.id}`,
              title: row.subject,
              meta: `${row.reference} · ${client?.company_name ?? ''} · ${formatRelative(row.submitted_at)}`,
              trailing: (
                <Badge tone={URGENCY_TONES[row.urgency]} dot>
                  {URGENCY_LABELS[row.urgency]}
                </Badge>
              ),
            };
          })}
        />

        <AttentionList
          title="Overdue tasks"
          description="Past their due date and not complete"
          icon={AlertTriangle}
          viewAllHref="/tasks"
          emptyMessage="Nothing is overdue."
          items={attention.overdueTasks.map((row) => {
            const project = row.projects as unknown as { name: string } | null;
            return {
              id: row.id,
              href: `/projects/${row.project_id}/tasks`,
              title: row.title,
              meta: `${project?.name ?? ''} · due ${formatDate(row.due_date)}`,
              trailing: (
                <Badge tone={row.responsibility === 'client' ? 'warning' : 'neutral'}>
                  {row.responsibility === 'client' ? 'Client' : 'Agency'}
                </Badge>
              ),
            };
          })}
        />

        <AttentionList
          title="Upcoming renewals"
          description="Subscriptions, domains, hosting and certificates"
          icon={CalendarClock}
          viewAllHref="/maintenance?tab=reminders"
          emptyMessage="No renewals are due in the next 60 days."
          items={attention.renewals.map((row) => {
            const client = row.clients as unknown as { id: string; company_name: string } | null;
            return {
              id: row.id,
              href: `/maintenance?tab=reminders`,
              title: row.title,
              meta: `${client?.company_name ?? ''} · ${REMINDER_TYPE_LABELS[row.reminder_type]} · due ${formatDate(row.due_date)}`,
            };
          })}
        />
      </section>

      {/* Recently updated projects --------------------------------------- */}
      <section aria-label="Projects">
        <Card>
          <CardHeader
            title="Recently updated projects"
            description="Filter the whole agency book of work"
          />
          <div className="p-5 pb-0">
            <FilterBar options={options} />
          </div>
          <ProjectTable projects={projects} />
        </Card>
      </section>
    </>
  );
}

function timeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
