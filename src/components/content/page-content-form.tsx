'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { savePageContentAction } from '@/lib/actions/content';
import { idleState } from '@/lib/actions/types';
import { PAGE_STATUS_LABELS } from '@/lib/constants';
import type { Tables } from '@/lib/supabase/database.types';

export function PageContentForm({ page }: { page: Tables<'website_pages'> }) {
  const action = savePageContentAction.bind(null, page.id);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  const existingCtas = Array.isArray(page.calls_to_action)
    ? (page.calls_to_action as unknown[]).map(String).join('\n')
    : '';

  // Live counters, because these limits are enforced on save and finding out
  // after you have written 400 characters is annoying.
  const [seoTitle, setSeoTitle] = useState(page.seo_title ?? '');
  const [metaDescription, setMetaDescription] = useState(page.meta_description ?? '');

  const locked = page.status === 'submitted';

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Page content"
          description="What appears on this page when the website is built."
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          {page.status === 'needs_changes' && page.agency_feedback ? (
            <Alert variant="warning" title="We need a few changes">
              {page.agency_feedback}
            </Alert>
          ) : null}

          {locked ? (
            <Alert variant="info" title="Submitted for review">
              Thank you — we are reading through this. You will be able to edit it again if we need
              anything changed.
            </Alert>
          ) : null}

          {page.status === 'approved' ? (
            <Alert variant="success" title="Approved">
              This page is signed off and ready to build.
            </Alert>
          ) : null}

          <Field label="Page title" error={e.title} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="title"
                required
                defaultValue={page.title}
                disabled={locked}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="What is this page for?" error={e.purpose}>
            {({ id }) => (
              <Textarea id={id} name="purpose" rows={2} defaultValue={page.purpose ?? ''} disabled={locked} />
            )}
          </Field>

          <Field label="Main heading" error={e.mainHeading} hint="The first thing a visitor reads.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="mainHeading"
                defaultValue={page.main_heading ?? ''}
                disabled={locked}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field label="Body copy" error={e.bodyCopy}>
            {({ id }) => (
              <Textarea
                id={id}
                name="bodyCopy"
                rows={12}
                defaultValue={page.body_copy ?? ''}
                disabled={locked}
                placeholder="Write the words for this page. Plain text is fine — we will handle the formatting."
              />
            )}
          </Field>

          <Field
            label="Calls to action"
            error={e.callsToAction}
            hint="One per line, e.g. “Book a free survey” or “Call us on 0161 496 0142”."
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="callsToAction"
                rows={3}
                defaultValue={existingCtas}
                disabled={locked}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="SEO title"
              error={e.seoTitle}
              hint={`${seoTitle.length}/70 characters — what shows in Google results.`}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="seoTitle"
                  maxLength={70}
                  value={seoTitle}
                  onChange={(ev) => setSeoTitle(ev.target.value)}
                  disabled={locked}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>

            <Field
              label="Meta description"
              error={e.metaDescription}
              hint={`${metaDescription.length}/320 characters — the grey text under the title.`}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  name="metaDescription"
                  rows={3}
                  maxLength={320}
                  value={metaDescription}
                  onChange={(ev) => setMetaDescription(ev.target.value)}
                  disabled={locked}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          </div>

          <Field label="Additional notes" error={e.notes}>
            {({ id }) => (
              <Textarea id={id} name="notes" rows={2} defaultValue={page.notes ?? ''} disabled={locked} />
            )}
          </Field>
        </CardBody>

        {locked ? (
          <CardFooter>
            <span className="text-[13px] text-[var(--text-muted)]">
              {PAGE_STATUS_LABELS[page.status]} — read-only while we review it.
            </span>
          </CardFooter>
        ) : (
          <CardFooter>
            <Button type="submit" name="intent" value="save" variant="secondary">
              Save draft
            </Button>
            <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">
              Submit for review
            </SubmitButton>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
