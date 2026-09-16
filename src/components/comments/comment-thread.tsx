import { Lock, Reply, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Textarea } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { addCommentAction, deleteCommentAction } from '@/lib/actions/comments';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { CommentNode } from '@/lib/queries/comments';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

export interface CommentThreadProps {
  comments: CommentNode[];
  entityType: string;
  entityId: string;
  projectId?: string | null;
  clientId?: string | null;
  currentUserId: string;
  /** Agency users can post internal notes and delete anyone's comment. */
  canWriteInternal: boolean;
  isAdmin?: boolean;
  placeholder?: string;
}

export function CommentThread({
  comments,
  entityType,
  entityId,
  projectId,
  clientId,
  currentUserId,
  canWriteInternal,
  isAdmin = false,
  placeholder = 'Write a comment…',
}: CommentThreadProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <CommentForm
        entityType={entityType}
        entityId={entityId}
        projectId={projectId}
        clientId={clientId}
        canWriteInternal={canWriteInternal}
        placeholder={placeholder}
      />

      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Be the first to say something."
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              entityType={entityType}
              entityId={entityId}
              projectId={projectId}
              clientId={clientId}
              currentUserId={currentUserId}
              canWriteInternal={canWriteInternal}
              isAdmin={isAdmin}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  depth,
  entityType,
  entityId,
  projectId,
  clientId,
  currentUserId,
  canWriteInternal,
  isAdmin,
  replyTo,
  setReplyTo,
}: {
  comment: CommentNode;
  depth: number;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  clientId?: string | null;
  currentUserId: string;
  canWriteInternal: boolean;
  isAdmin: boolean;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
}) {
  const author = comment.author;
  const canDelete = comment.author_id === currentUserId || isAdmin;
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <li>
      <article
        className={cn(
          'rounded-lg border p-3.5',
          comment.is_internal
            ? 'border-[var(--warning)]/30 bg-[var(--warning-soft)]/40'
            : 'border-[var(--border-subtle)] bg-[var(--surface-card)]',
        )}
      >
        <header className="flex items-start gap-2.5">
          <Avatar name={author?.full_name ?? 'Unknown'} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium">{author?.full_name ?? 'Unknown user'}</span>
              <time
                dateTime={comment.created_at}
                title={formatDateTime(comment.created_at)}
                className="text-[12px] text-[var(--text-muted)]"
              >
                {formatRelative(comment.created_at)}
              </time>
              {comment.is_internal ? (
                <Badge tone="warning">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Internal
                </Badge>
              ) : null}
            </p>
          </div>
        </header>

        <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
          {comment.body}
        </p>

        <footer className="mt-2 flex items-center gap-1">
          {depth < 3 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              aria-expanded={replyTo === comment.id}
            >
              <Reply className="h-3.5 w-3.5" aria-hidden="true" />
              Reply
            </Button>
          ) : null}

          {canDelete ? (
            <form
              action={async () => {
                setIsDeleting(true);
                await deleteCommentAction(comment.id);
                revalidate();
              }}
            >
              <Button variant="ghost" size="sm" type="submit" disabled={isDeleting}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </form>
          ) : null}
        </footer>

        {replyTo === comment.id ? (
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <CommentForm
              entityType={entityType}
              entityId={entityId}
              projectId={projectId}
              clientId={clientId}
              parentId={comment.id}
              canWriteInternal={canWriteInternal}
              placeholder={`Reply to ${author?.full_name ?? 'this comment'}…`}
              compact
              onPosted={() => setReplyTo(null)}
            />
          </div>
        ) : null}
      </article>

      {comment.replies.length > 0 ? (
        <ul className="mt-3 space-y-3 border-l-2 border-[var(--border-subtle)] pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              entityType={entityType}
              entityId={entityId}
              projectId={projectId}
              clientId={clientId}
              currentUserId={currentUserId}
              canWriteInternal={canWriteInternal}
              isAdmin={isAdmin}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CommentForm({
  entityType,
  entityId,
  projectId,
  clientId,
  parentId,
  canWriteInternal,
  placeholder,
  compact = false,
  onPosted,
}: {
  entityType: string;
  entityId: string;
  projectId?: string | null;
  clientId?: string | null;
  parentId?: string;
  canWriteInternal: boolean;
  placeholder: string;
  compact?: boolean;
  onPosted?: () => void;
}) {
  const [state, action] = useFormAction(addCommentAction);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box on success so the next comment starts from empty.
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      onPosted?.();
    }
  }, [state.status, onPosted]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
      {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}

      {state.status === 'error' ? <FormMessage state={state} /> : null}

      <label htmlFor={`comment-${parentId ?? entityId}`} className="sr-only">
        {placeholder}
      </label>
      <Textarea
        id={`comment-${parentId ?? entityId}`}
        name="body"
        rows={compact ? 2 : 3}
        required
        placeholder={placeholder}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canWriteInternal ? (
          <Checkbox
            name="isInternal"
            label="Internal note"
            description="Only agency users will ever see this."
          />
        ) : (
          <span />
        )}
        <SubmitButton size="sm" pendingLabel="Posting…">
          {parentId ? 'Post reply' : 'Post comment'}
        </SubmitButton>
      </div>
    </form>
  );
}
