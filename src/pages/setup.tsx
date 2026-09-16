import { Navigate } from 'react-router-dom';
import { Database, KeyRound, Rocket, Terminal } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/card';
import { brand } from '@/config/brand';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

/**
 * Shown when the Supabase environment variables are missing — the most likely
 * state of a fresh clone, and far more useful than a blank screen.
 */
export function SetupPage() {
  useDocumentTitle('Set up');

  if (isSupabaseConfigured) return <Navigate to="/login" replace />;

  const steps = [
    {
      icon: Database,
      title: 'Create a Supabase project',
      body: 'Sign up at supabase.com and create a project. It takes about two minutes.',
    },
    {
      icon: Terminal,
      title: 'Create the database tables',
      body: 'Copy supabase/setup.sql and run it in the Supabase SQL Editor.',
    },
    {
      icon: KeyRound,
      title: 'Add your keys',
      body:
        'Locally: copy .env.example to .env.local and fill in the project URL and anon key. ' +
        'On GitHub Pages: add them as repository secrets so the deploy workflow can build with them.',
    },
    {
      icon: Rocket,
      title: 'Create the first account',
      body: 'Visit /signup. The first person to register becomes the agency administrator.',
    },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-12">
      <main id="main">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">
          {brand.initials}
        </span>

        <h1 className="mt-5 text-2xl font-semibold">Finish setting up {brand.productName}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This application needs a Supabase project before it can run. The full walkthrough is in{' '}
          <code className="rounded bg-[var(--surface-sunken)] px-1 py-0.5 text-[12px]">
            docs/GITHUB-SETUP.md
          </code>
          .
        </p>

        <ol className="mt-6 space-y-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card>
                <CardBody className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">
                      <span className="text-[var(--text-muted)]">{i + 1}. </span>
                      {step.title}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{step.body}</p>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
