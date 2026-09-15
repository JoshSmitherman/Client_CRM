import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient } from '@/lib/auth';
import { getSupportRequests } from '@/lib/queries/support';

export const metadata: Metadata = { title: 'Support' };

export default async function PortalSupportPage() {
  await requireClient();
  const tickets = await getSupportRequests({}, 200);

  const open = tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
  const closed = tickets.filter((t) => ['resolved', 'closed'].includes(t.status));

  return (
    <>
      <PageHeader
        title="Support"
        description="Faults and urgent problems with your website."
        actions={
          <Button asChild>
            <Link href="/portal/support/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Raise a support request
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Open tickets" description={`${open.length} being worked on`} />
          <TicketTable
            tickets={open as unknown as SupportListRow[]}
            basePath="/portal/support"
            showClient={false}
            emptyMessage="No open tickets. Raise one if something is not working."
          />
        </Card>

        {closed.length > 0 ? (
          <Card>
            <CardHeader title="Resolved" description={`${closed.length} closed`} />
            <TicketTable
              tickets={closed as unknown as SupportListRow[]}
              basePath="/portal/support"
              showClient={false}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
