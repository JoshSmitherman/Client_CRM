import { Building2, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { useProfile } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { formatDate } from '@/lib/format';
import { isAgencyManager } from '@/lib/permissions';
import { getClients } from '@/lib/queries/clients';
import { useDocumentTitle } from '@/lib/use-document-title';

export function ClientsPage() {
  useDocumentTitle('Clients');
  const profile = useProfile();
  const [params] = useSearchParams();
  const q = params.get('q') ?? undefined;

  const query = useQuery(() => getClients(q), [q]);
  const canManage = isAgencyManager(profile.role);

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every organisation you work with."
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/clients/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New client
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 max-w-md">
        <SearchField placeholder="Search clients…" label="Search clients" />
      </div>

      <Card>
        <QueryBoundary query={query}>
          {(clients) =>
            clients.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={q ? 'No matching clients' : 'No clients yet'}
                description={
                  q
                    ? 'Try a different name or email address.'
                    : 'Add your first client to start tracking their projects.'
                }
                action={
                  !q && canManage ? (
                    <Button asChild>
                      <Link to="/clients/new">Add a client</Link>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Client</Th>
                      <Th>Industry</Th>
                      <Th>Contact</Th>
                      <Th>Account manager</Th>
                      <Th className="text-right">Projects</Th>
                      <Th>Added</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => {
                      const manager = client.account_manager as unknown as
                        | { id: string; full_name: string }
                        | null;

                      return (
                        <Tr key={client.id}>
                          <Td>
                            <Link
                              to={`/clients/${client.id}`}
                              className="font-medium hover:text-[var(--accent-text)] hover:underline"
                            >
                              {client.company_name}
                            </Link>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {client.trading_name ? (
                                <span className="text-[12px] text-[var(--text-muted)]">
                                  t/a {client.trading_name}
                                </span>
                              ) : null}
                              {client.is_existing_client ? (
                                <Badge tone="neutral">Existing</Badge>
                              ) : (
                                <Badge tone="accent">New</Badge>
                              )}
                              {!client.is_active ? <Badge tone="warning">Inactive</Badge> : null}
                            </span>
                          </Td>
                          <Td className="text-[13px]">
                            {client.industry ?? (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </Td>
                          <Td className="text-[13px]">
                            {client.email ? (
                              <a href={`mailto:${client.email}`} className="hover:underline">
                                {client.email}
                              </a>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                            {client.phone ? (
                              <span className="block text-[12px] text-[var(--text-muted)]">
                                {client.phone}
                              </span>
                            ) : null}
                          </Td>
                          <Td>
                            {manager ? (
                              <span className="flex items-center gap-2">
                                <Avatar name={manager.full_name} size="xs" />
                                <span className="text-[13px]">{manager.full_name}</span>
                              </span>
                            ) : (
                              <span className="text-[13px] text-[var(--text-muted)]">
                                Unassigned
                              </span>
                            )}
                          </Td>
                          <Td className="text-right text-[13px] tabular-nums">
                            {client.projectCount}
                          </Td>
                          <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                            {formatDate(client.created_at)}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>
            )
          }
        </QueryBoundary>
      </Card>
    </>
  );
}
