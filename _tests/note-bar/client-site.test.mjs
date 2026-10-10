// A client site's own test (Oct 10 2026, no login): copy this file into each client repo as _tests/site.test.mjs,
// next to the note bar loader in every page's <head>. Run: node _tests/site.test.mjs [repo folder]
//
// The loader puts the owner's private key on their device, and anything that runs on their page can read it there.
// So a page with the loader runs only its own scripts. Fails (exit 1) if any page:
//   - has a <script src> that isn't on the site itself (the loader adds webfaery.love/mark.js; it isn't a tag)
//   - loads a script any other way outside the loader block (createElement('script'), import(), importScripts)
//   - names an analytics, RUM, error-tracking or tag-manager tool
//   - has the loader somewhere other than first in <head>, or a loader that isn't the one documented block
// ALLOW: an outside booking or shop embed Pollen has said yes to, by its exact address.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ALLOW = []; // e.g. 'https://embed.example-booking.com/widget.js' (only with Pollen's yes)
const LOADER_SHA = 'b08672416b47c3e76b32e76fac25f0f84d6793ddc2d7ed98d4ba1a723c06b890';
const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const TOOLS = /google-?analytics|googletagmanager|gtag\(|\bgtm\.js|plausible|fathom|umami|matomo|piwik|hotjar|clarity\.ms|segment\.(?:com|io)|mixpanel|amplitude|heap(?:analytics)?|fullstory|logrocket|mouseflow|sentry|bugsnag|rollbar|datadog|newrelic|nr-data|posthog|smartlook|facebook\.net\/.*fbevents|connect\.facebook\.net|tiktok\.com\/i18n\/pixel|snap\.licdn|linkedin\.com\/insight/i;
const failures = [];
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || f.name.startsWith('_') || f.name === 'node_modules') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.html?$/i.test(f.name)) pages.push(p);
  }
})(root);
for (const p of pages) {
  const rel = path.relative(root, p);
  const html = fs.readFileSync(p, 'utf8');
  const block = (html.match(/<script>\/\* Web Faery: the owner's note bar[\s\S]*?<\/script>/) || [])[0] || '';
  const rest = block ? html.replace(block, '') : html;
  if (block) {
    if (crypto.createHash('sha256').update(block).digest('hex') !== LOADER_SHA) failures.push(`${rel}: the loader isn't the documented block`);
    const head = (html.match(/<head[^>]*>([\s\S]*)/i) || [])[1] || html;
    const before = head.slice(0, head.indexOf(block)).replace(/<!--[\s\S]*?-->/g, '').replace(/<meta charset="[^"]*">/i, '').trim();
    if (before) failures.push(`${rel}: the loader isn't first in <head> (right after <meta charset>)`);
  }
  for (const m of rest.matchAll(/<script\b[^>]*\ssrc=["']?([^"' >]+)/gi)) {
    const src = m[1];
    if (/^(https?:)?\/\//i.test(src) && !ALLOW.includes(src)) failures.push(`${rel}: an outside script ${src}`);
  }
  if (/createElement\(\s*["']script["']\s*\)|\bimport\s*\(|importScripts\(/.test(rest)) failures.push(`${rel}: loads a script outside the loader block`);
  const t = rest.match(TOOLS);
  if (t) failures.push(`${rel}: names a tracking or reporting tool (${t[0]})`);
}
if (failures.length) { console.error('site test: ' + failures.length + ' problem(s)\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('site test: all good (' + pages.length + ' pages, only the site’s own scripts beside the note bar)');
