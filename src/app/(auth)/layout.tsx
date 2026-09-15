import { brand } from '@/config/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form column */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
              {brand.initials}
            </span>
            <span>
              <span className="block text-sm leading-tight font-semibold">{brand.name}</span>
              <span className="block text-[11px] leading-tight text-[var(--text-muted)]">
                {brand.productName}
              </span>
            </span>
          </div>
          <main id="main">{children}</main>
        </div>
      </div>

      {/* Brand column — decorative, hidden on small screens. */}
      <div
        className="relative hidden flex-col justify-end overflow-hidden p-10 lg:flex"
        style={{
          background:
            'linear-gradient(145deg, var(--color-brand-700), var(--color-brand-900) 55%, oklch(0.24 0.06 267))',
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, oklch(1 0 0 / 0.16), transparent 42%), radial-gradient(circle at 78% 72%, oklch(1 0 0 / 0.10), transparent 40%)',
          }}
        />
        <div className="relative max-w-md">
          <p className="text-2xl leading-snug font-semibold text-white">
            Everything about your project, in one place.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Onboarding, files, approvals, change requests, support and your maintenance plan —
            no more scattered emails and shared folders.
          </p>
        </div>
      </div>
    </div>
  );
}
