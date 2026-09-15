import type { Metadata, Viewport } from 'next';

import { ThemeScript } from '@/components/layout/theme-script';
import { brand } from '@/config/brand';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.productName}`,
    template: `%s · ${brand.name}`,
  },
  description: `Secure client portal and project workspace for ${brand.name}.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute top-2 left-2 z-50 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
