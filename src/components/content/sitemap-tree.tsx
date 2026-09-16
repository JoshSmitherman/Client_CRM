import { ChevronDown, ChevronUp, FileText, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { createPageAction, deletePageAction, movePageAction } from '@/lib/actions/content';
import { PAGE_KIND_LABELS, PAGE_STATUS_LABELS, PAGE_STATUS_TONES, toOptions } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export interface PageNode {
  id: string;
  title: string;
  slug: string | null;
  parent_id: string | null;
  page_kind: Enums<'page_kind'>;
  in_navigation: boolean;
  position: number;
  status: Enums<'page_status'>;
  children: PageNode[];
}

/** Builds the tree from the flat list, ordered by position at each level. */
export function buildPageTree(
  rows: Omit<PageNode, 'children'>[],
): PageNode[] {
  const byId = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const row of rows) byId.set(row.id, { ...row, children: [] });

  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (nodes: PageNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) sort(node.children);
  };
  sort(roots);

  return roots;
}

export function SitemapTree({
  projectId,
  pages,
  basePath,
  canEdit,
}: {
  projectId: string;
  pages: PageNode[];
  basePath: string;
  canEdit: boolean;
}) {
  const action = createPageAction.bind(null, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);

  const flat: PageNode[] = [];
  const collect = (nodes: PageNode[]) => {
    for (const node of nodes) {
      flat.push(node);
      collect(node.children);
    }
  };
  collect(pages);

  return (
    <Card>
      <CardHeader
        title="Sitemap"
        description="Pages, their order and where they sit in the navigation."
        action={
          canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add page
            </Button>
          ) : null
        }
      />

      {adding ? (
        <form action={formAction} className="border-b border-[var(--border-subtle)] p-5" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Page title" error={state.errors?.title} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="title" required aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="URL path" hint="Left blank, we derive it from the title.">
              {({ id, describedBy }) => (
                <Input id={id} name="slug" placeholder="about-us" aria-describedby={describedBy} />
              )}
            </Field>
            <Field label="Parent page">
              {({ id }) => (
                <Select
                  id={id}
                  name="parentId"
                  placeholder="Top level"
                  options={flat.map((p) => ({ value: p.id, label: p.title }))}
                />
              )}
            </Field>
            <Field label="Page type">
              {({ id }) => (
                <Select id={id} name="pageKind" defaultValue="standard" options={toOptions(PAGE_KIND_LABELS)} />
              )}
            </Field>
            <div className="sm:col-span-2">
              <Checkbox name="inNavigation" defaultChecked label="Show in the main navigation" />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add page
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No pages yet"
          description={
            canEdit
              ? 'Add the pages this website needs, then collect the content for each.'
              : 'Your agency has not set up the sitemap yet.'
          }
        />
      ) : (
        <ul>
          {pages.map((page, index) => (
            <PageRow
              key={page.id}
              page={page}
              depth={0}
              basePath={basePath}
              canEdit={canEdit}
              isFirst={index === 0}
              isLast={index === pages.length - 1}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function PageRow({
  page,
  depth,
  basePath,
  canEdit,
  isFirst,
  isLast,
}: {
  page: PageNode;
  depth: number;
  basePath: string;
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <li
        className={cn(
          'flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-2.5',
          isPending && 'opacity-60',
        )}
        style={{ paddingLeft: `${20 + depth * 20}px` }}
      >
        <div className="min-w-0 flex-1">
          <Link
            to={`${basePath}/${page.id}`}
            className="text-[14px] font-medium hover:text-[var(--accent-text)] hover:underline"
          >
            {page.title}
          </Link>
          <p className="text-[12px] text-[var(--text-muted)]">
            /{page.slug ?? ''}
            {page.page_kind !== 'standard' ? ` · ${PAGE_KIND_LABELS[page.page_kind]}` : ''}
            {!page.in_navigation ? ' · not in navigation' : ''}
          </p>
        </div>

        <Badge tone={PAGE_STATUS_TONES[page.status]}>{PAGE_STATUS_LABELS[page.status]}</Badge>

        {canEdit ? (
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending || isFirst}
              onClick={() => startTransition(async () => { await movePageAction(page.id, 'up'); revalidate(); })}
              aria-label={`Move ${page.title} up`}
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending || isLast}
              onClick={() => startTransition(async () => { await movePageAction(page.id, 'down'); revalidate(); })}
              aria-label={`Move ${page.title} down`}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <form action={async () => { await deletePageAction(page.id); revalidate(); }}>
              <Button variant="ghost" size="icon" type="submit" aria-label={`Remove ${page.title}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </form>
          </div>
        ) : null}
      </li>

      {page.children.map((child, index) => (
        <PageRow
          key={child.id}
          page={child}
          depth={depth + 1}
          basePath={basePath}
          canEdit={canEdit}
          isFirst={index === 0}
          isLast={index === page.children.length - 1}
        />
      ))}
    </>
  );
}
