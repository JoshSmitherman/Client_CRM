/**
 * Applies the stored theme before first paint, so a dark-mode user never sees
 * a white flash. Inline and synchronous by necessity.
 */
const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('crm-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored !== 'light' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    /* Private browsing or blocked storage: fall back to the light theme. */
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
