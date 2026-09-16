import {
  Briefcase,
  FileText,
  Globe,
  LifeBuoy,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  PortalAccessDialog,
  type PortalInvitation,
  type PortalUser,
} from '@/components/clients/portal-access-dialog';
import { QueryBoundary } from '@/components/routing/page-state';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { Timeline } from '@/components/ui/timeline';
import {
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  PROJECT_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  URGENCY_LABELS,
} from '@/lib/constants';
import { deleteClientPermanentlyAction, getClientDeletionImpact, type DeletionImpact } from '@/lib/actions/destroy';
import { useProfile } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { formatCurrency, formatDate } from '@/lib/format';
import { getInternalNote } from '@/lib/internal-notes';
import { ROLE_LABELS, canDeleteRecords } from '@/lib/permissions';
import { getClient, getClientOverview, getClients } from '@/lib/queries/clients';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const client = await getClient(id);
  if (!client) return null;

  const [overview, internalNote, allClients] = await Promise.all([
    getClientOverview(id),
    getInternalNote('client', id),
    getClients(),
  ]);

  return { client, overview, internalNote, allClients };
}

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const [accessOpen, setAccessOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);

  const canDelete = canDeleteRecords(profile.role);
  const query = useQuery(() => load(id), [id]);

  // Counted when the dialog opens rather than on every page load, so the
  // warning can say "3 projects, 48 files" instead of something vague.
  useEffect(() => {
    if (!deleteOpen) return;
    let cancelled = false;
    void getClientDeletionImpact(id).then((result) => {
      if (!cancelled) setImpact(result);
    });
    return () => {
      cancelled = true;
    };
  }, [deleteOpen, id]);
  useDocumentTitle(query.data?.client.company_name ?? 'Client');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data) return <NotFoundPage />;
        const { client, overview, internalNote, allClients } = data;

        const manager = client.account_manager as unknown as
          | { full_name: string; email: string }
          | null;

        const portalUsers = overview.contacts.users as unknown as PortalUser[];
        const pendingInvites = overview.contacts.invitations as unknown as PortalInvitation[];

        const addressParts = [
          client.address_line1,
          client.address_line2,
          client.city,
          client.region,
          client.postcode,
          client.country,
        ].filter(Boolean);

        return (
          <>
            <PageHeader
              title={client.company_name}
              description={
                client.trading_name ? `Trading as ${client.trading_name}` : undefined
              }
              breadcrumbs={[
                { label: 'Clients', href: '/clients' },
                { label: client.company_name },
              ]}
              meta={
                <>
                  {client.is_existing_client ? (
                    <Badge tone="neutral">Existing client</Badge>
                  ) : (
                    <Badge tone="accent">New client</Badge>
                  )}
                  {client.industry ? <Badge tone="neutral">{client.industry}</Badge> : null}
                  <span className="text-[12px] text-[var(--text-muted)]">
                    Client since {formatDate(client.created_at)}
                  </span>
                </>
              }
              actions={
                <>
                  <Button variant="secondary" asChild>
                    <Link to={`/clients/${id}/edit`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/projects/new?client=${id}`}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New project
                    </Link>
                  </Button>
                </>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              {/* ---------------- Left column ---------------- */}
              <div className="space-y-4 lg:col-span-2">
                {/* Projects */}
                <Card>
                  <CardHeader
                    title="Projects"
                    description={`${overview.projects.length} in total`}
                  />
                  {overview.projects.length === 0 ? (
                    <EmptyState
                      icon={Briefcase}
                      title="No projects yet"
                      description="Create the first project for this client."
                      action={
                        <Button asChild>
                          <Link to={`/projects/new?client=${id}`}>New project</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {overview.projects.map((project) => {
                        const stage = project.lifecycle_stages as unknown as
                          | { label: string; colour: string }
                          | null;
                        return (
                          <li key={project.id}>
                            <Link
                              to={`/projects/${project.id}`}
                              className="block px-5 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-[14px] font-medium">{project.name}</span>
                                {stage ? (
                                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: stage.colour }}
                                      aria-hidden="true"
                                    />
                                    {stage.label}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                                {project.reference} ·{' '}
                                {PROJECT_TYPE_LABELS[project.project_type] ??
                                  project.project_type}
                                {project.target_launch_date
                                  ? ` · launch ${formatDate(project.target_launch_date)}`
                                  : ''}
                              </p>
                              <ProgressBar
                                className="mt-2"
                                value={project.completion_percentage}
                                size="sm"
                                showValue={false}
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                {/* Open requests */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader title="Open change requests" />
                    {overview.changeRequests.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="None open"
                        description="Nothing outstanding."
                      />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {overview.changeRequests.map((cr) => (
                          <li key={cr.id}>
                            <Link
                              to={`/change-requests/${cr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {cr.title}
                              </span>
                              <span className="mt-1 flex items-center gap-2">
                                <Badge tone={CHANGE_STATUS_TONES[cr.status]}>
                                  {CHANGE_STATUS_LABELS[cr.status]}
                                </Badge>
                                <span className="text-[12px] text-[var(--text-muted)]">
                                  {cr.reference}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card>
                    <CardHeader title="Open support requests" />
                    {overview.supportRequests.length === 0 ? (
                      <EmptyState
                        icon={LifeBuoy}
                        title="None open"
                        description="No active tickets."
                      />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {overview.supportRequests.map((sr) => (
                          <li key={sr.id}>
                            <Link
                              to={`/support/${sr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {sr.subject}
                              </span>
                              <span className="mt-1 flex items-center gap-2">
                                <Badge tone={SUPPORT_STATUS_TONES[sr.status]}>
                                  {SUPPORT_STATUS_LABELS[sr.status]}
                                </Badge>
                                <span className="text-[12px] text-[var(--text-muted)]">
                                  {URGENCY_LABELS[sr.urgency]}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>

                {/* Activity */}
                <Card>
                  <CardHeader title="Recent activity" />
                  <CardBody>
                    {overview.activity.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
                    ) : (
                      <Timeline
                        entries={overview.activity.map((entry) => ({
                          id: entry.id,
                          title: entry.summary,
                          meta: entry.actor_name ?? undefined,
                          timestamp: entry.created_at,
                          tone: entry.visibility === 'client' ? 'accent' : 'neutral',
                        }))}
                      />
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* ---------------- Right column ---------------- */}
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Contact details" />
                  <CardBody className="space-y-3 text-[13px]">
                    {client.primary_contact_name ? (
                      <p className="font-medium">{client.primary_contact_name}</p>
                    ) : null}

                    {client.email ? (
                      <p className="flex items-start gap-2">
                        <Mail
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                        <a href={`mailto:${client.email}`} className="break-all hover:underline">
                          {client.email}
                        </a>
                      </p>
                    ) : null}

                    {client.phone ? (
                      <p className="flex items-start gap-2">
                        <Phone
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                        <a href={`tel:${client.phone}`} className="hover:underline">
                          {client.phone}
                        </a>
                      </p>
                    ) : null}

                    {client.website ? (
                      <p className="flex items-start gap-2">
                        <Globe
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all hover:underline"
                        >
                          {client.website.replace(/^https?:\/\//, '')}
                        </a>
                      </p>
                    ) : null}

                    {addressParts.length > 0 ? (
                      <p className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                        <span>{addressParts.join(', ')}</span>
                      </p>
                    ) : null}

                    {client.registration_number ? (
                      <p className="text-[var(--text-muted)]">
                        Company no. {client.registration_number}
                      </p>
                    ) : null}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Account manager" />
                  <CardBody>
                    {manager ? (
                      <div className="flex items-center gap-3">
                        <Avatar name={manager.full_name} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{manager.full_name}</p>
                          <p className="truncate text-[12px] text-[var(--text-muted)]">
                            {manager.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--text-muted)]">
                        No account manager assigned.
                      </p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Maintenance"
                    action={
                      <Link
                        to="/maintenance?tab=subscriptions"
                        className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                      >
                        Manage
                      </Link>
                    }
                  />
                  {overview.subscriptions.length === 0 ? (
                    <EmptyState
                      icon={ShieldCheck}
                      title="No subscription"
                      description="This client has no maintenance plan."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {overview.subscriptions.map((sub) => {
                        const plan = sub.maintenance_plans as unknown as { name: string } | null;
                        return (
                          <li key={sub.id} className="px-5 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium">
                                {plan?.name ?? 'Plan'}
                              </span>
                              <Badge tone={SUBSCRIPTION_STATUS_TONES[sub.status]} dot>
                                {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                              {formatCurrency(sub.price, sub.currency)} · renews{' '}
                              {formatDate(sub.renewal_date)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    title="Portal access"
                    description="People at this client who can sign in and see their projects"
                    action={
                      <Button variant="secondary" size="sm" onClick={() => setAccessOpen(true)}>
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        Manage
                      </Button>
                    }
                  />
                  {portalUsers.length === 0 && pendingInvites.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Nobody here can sign in yet"
                      description="Invite someone and they will get an email to set their own password. They will only ever see this client's work."
                      action={
                        <Button onClick={() => setAccessOpen(true)}>
                          <UserPlus className="h-4 w-4" aria-hidden="true" />
                          Invite someone
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {portalUsers.map((user) => (
                        <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar name={user.full_name || user.email} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {user.full_name || user.email}
                            </p>
                            <p className="truncate text-[12px] text-[var(--text-muted)]">
                              {ROLE_LABELS[user.role]}
                            </p>
                          </div>
                          {!user.is_active ? <Badge tone="warning">No access</Badge> : null}
                        </li>
                      ))}
                      {pendingInvites.map((invite) => (
                        <li key={invite.id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar name={invite.full_name || invite.email} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {invite.full_name || invite.email}
                            </p>
                            <p className="truncate text-[12px] text-[var(--text-muted)]">
                              Invited · expires {formatDate(invite.expires_at)}
                            </p>
                          </div>
                          <Badge tone="info">Pending</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <PortalAccessDialog
                  open={accessOpen}
                  onClose={() => setAccessOpen(false)}
                  clientId={id}
                  clientName={client.company_name}
                  users={portalUsers}
                  invitations={pendingInvites}
                  allClients={allClients.map((c) => ({
                    id: c.id,
                    company_name: c.company_name,
                  }))}
                />

                {canDelete ? (
                  <Card>
                    <CardHeader
                      title="Danger zone"
                      description="Archiving hides a client and keeps everything. Deleting does not."
                    />
                    <CardBody>
                      <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete this client
                      </Button>
                    </CardBody>
                  </Card>
                ) : null}

                {internalNote ? (
                  <Card>
                    <CardHeader title="Internal notes" description="Never visible to the client" />
                    <CardBody>
                      <p className="text-[13px] whitespace-pre-wrap text-[var(--text-secondary)]">
                        {internalNote}
                      </p>
                    </CardBody>
                  </Card>
                ) : null}
              </div>
            </div>

            <ConfirmDelete
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              title={`Delete ${client.company_name}`}
              confirmationText={client.company_name}
              confirmLabel="Delete this client"
              consequences={deletionConsequences(impact)}
              onConfirm={async () => {
                await deleteClientPermanentlyAction(id);
                navigate('/clients');
              }}
            />
          </>
        );
      }}
    </QueryBoundary>
  );
}

/** Turns the counts into something specific enough to be read properly. */
function deletionConsequences(impact: DeletionImpact | null): string[] {
  if (!impact) return ['Working out what this would remove…'];

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return [
    `${plural(impact.projects, 'project', 'projects')}, with their tasks, content, comments and handover.`,
    `${plural(impact.files, 'file', 'files')}, deleted from storage as well as from the record.`,
    `${plural(impact.changeRequests, 'change request', 'change requests')} and ${plural(impact.supportRequests, 'support ticket', 'support tickets')}, including their quotations and history.`,
    `${plural(impact.subscriptions, 'maintenance subscription', 'maintenance subscriptions')}, with the usage recorded against them.`,
    'Portal logins for this client stop working.',
    'The audit log keeps a record that this happened, and who did it.',
  ];
}
