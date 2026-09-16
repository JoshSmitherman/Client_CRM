#!/usr/bin/env node
/**
 * Loads the built application in a real browser and checks that it works.
 *
 * Typechecking proves the code compiles; it cannot prove the deployment works.
 * The thing this guards is the part with no types at all: the base path and the
 * single-page fallback that GitHub Pages needs. A deep link there is answered
 * with 404.html, which has to hand the address back to the router — and that
 * plumbing broke silently the first time it was written.
 *
 * Runs the whole thing twice: once served from the domain root, and once from
 * a /<repo>/ sub-path the way a GitHub project site is.
 *
 *   node scripts/smoke-test.mjs
 *
 * Needs a Chromium for Playwright. In CI:  npx playwright install chromium
 * Set CHROMIUM_PATH to use one that is already on the machine.
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const PORT = 4179;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

/**
 * Serves dist/ the way GitHub Pages does — which is the point of the exercise.
 * Anything it has no file for gets 404.html, at status 404.
 */
function serve(prefix) {
  return createServer(async (req, res) => {
    let path = new URL(req.url, 'http://localhost').pathname;

    if (!path.startsWith(prefix)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('outside the deployment');
    }

    path = path.slice(prefix.length - 1) || '/';
    if (path.endsWith('/')) path += 'index.html';

    try {
      const body = await readFile(join(DIST, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      const body = await readFile(join(DIST, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(body);
    }
  });
}

/**
 * Built deliberately without Supabase credentials, so the state is the same on
 * every machine: guarded routes land on the setup screen, and nothing makes a
 * network call. These assert routing and rendering, which is what this test is
 * for — the data layer is covered by the Row Level Security assertions.
 */
const CASES = [
  { path: '/', expect: 'Finish setting up', lands: '/setup' },
  { path: '/login', expect: 'Sign in', lands: '/login' },
  { path: '/signup', expect: 'staff account', lands: '/signup' },
  { path: '/reset-password', expect: 'Reset your password', lands: '/reset-password' },
  { path: '/update-password', expect: 'Set a new password', lands: '/update-password' },
  // Signed out, so the guard sends these to /setup — but only after the
  // fallback has restored the address the visitor actually asked for.
  { path: '/projects/abc', expect: 'Finish setting up', lands: '/setup' },
  { path: '/portal/requests/new', expect: 'Finish setting up', lands: '/setup' },
  { path: '/nope/nope', expect: 'could not find', lands: '/nope/nope' },
];

async function run(prefix) {
  const label = prefix === '/' ? 'served from the domain root' : `served from ${prefix}`;
  console.log(`\n--- ${label} ---`);

  const server = serve(prefix);
  await new Promise((r) => server.listen(PORT, r));

  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage();

  const problems = [];

  page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`));

  page.on('console', (m) => {
    // The fallback document is *meant* to arrive with a 404 — that is how Pages
    // serves it — and Chromium logs a console error for it either way. Anything
    // else an error says is worth hearing.
    if (m.type() !== 'error') return;
    if (m.text().includes('the server responded with a status of 404')) return;
    problems.push(m.text());
  });

  page.on('response', (r) => {
    if (r.request().resourceType() === 'document') return;
    if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
  });

  page.on('requestfailed', (r) =>
    problems.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`),
  );

  let failures = 0;

  for (const { path, expect, lands } of CASES) {
    problems.length = 0;
    await page.goto(`http://localhost:${PORT}${prefix.slice(0, -1)}${path}`, {
      waitUntil: 'networkidle',
    });
    // The fallback restores the address with history.replaceState, so give the
    // router a moment to render what it then matched.
    await page.waitForTimeout(250);

    const body = (await page.textContent('body')) ?? '';
    const landed = new URL(page.url()).pathname;
    const wanted = `${prefix.slice(0, -1)}${lands}`;

    const ok = body.includes(expect) && landed === wanted && problems.length === 0;
    console.log(`${ok ? '  pass' : '  FAIL'}  ${path.padEnd(24)} -> ${landed}`);

    if (!ok) {
      failures++;
      if (!body.includes(expect)) {
        console.log(`        expected "${expect}" in: ${body.replace(/\s+/g, ' ').slice(0, 160)}`);
      }
      if (landed !== wanted) console.log(`        expected to land on ${wanted}`);
      for (const problem of problems.slice(0, 3)) console.log(`        console: ${problem}`);
    }
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  return failures;
}

let failures = 0;

for (const prefix of ['/', '/Client_CRM/']) {
  console.log(`\nBuilding with base ${prefix}…`);
  execFileSync('npm', ['run', 'build'], {
    stdio: 'ignore',
    env: {
      ...process.env,
      BASE_PATH: prefix,
      // Blanked rather than merely absent: Vite would otherwise pick them up
      // from a local .env.local, and the run would behave differently on a
      // developer's machine than in CI.
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  });
  failures += await run(prefix);
}

if (failures > 0) {
  console.error(`\n${failures} check${failures === 1 ? '' : 's'} failed.`);
  process.exit(1);
}

console.log('\nAll smoke checks passed.');
