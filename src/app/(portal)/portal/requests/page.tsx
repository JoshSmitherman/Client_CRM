import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { RequestTable, type ChangeRequestListRow } from '@/components/change-requests/request-table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient } from '@/lib/auth';
import { getChangeRequests } from '@/lib/queries/change-requests';

export const metadata: Metadata = { title: 'Change requests' };

export default async function PortalRequestsPage() {
  await requireClient();
  const requests = await getChangeRequests({}, 200);

  const open = requests.filter(
    (r) => !['completed', 'rejected', 'cancelled'].includes(r.status),
  );
  const closed = requests.filter((r) =>
    ['completed', 'rejected', 'cancelled'].includes(r.status),
  );

  return (
    <>
      <PageHeader
        title="Change requests"
        description="Changes you have asked us to make to your website."
        actions={
          <Button asChild>
            <Link href="/portal/requests/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit a change request
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader title="In progress" description={`${open.length} open`} />
          <RequestTable
            requests={open as unknown as ChangeRequestListRow[]}
            basePath="/portal/requests"
            showClient={false}
            emptyMessage="Nothing in progress. Submit a request whenever you need something changed."
          />
        </Card>

        {closed.length > 0 ? (
          <Card>
            <CardHeader title="Finished" description={`${closed.length} completed or closed`} />
            <RequestTable
              requests={closed as unknown as ChangeRequestListRow[]}
              basePath="/portal/requests"
              showClient={false}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
