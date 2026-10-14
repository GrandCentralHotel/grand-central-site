import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://www.grandcentralhotel.co.nz';
const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(urls).size, 17);
const files = await fs.readdir(root);
const pages = files.filter(f => f.endsWith('.html'));
const rules = (await fs.readFile(path.join(root, '_redirects'), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/));
assert.equal(new Set(rules.map(r => r[0])).size, rules.length);
const redirects = new Map(rules.map(([source, target, status]) => {assert.equal(status, '301'); assert.notEqual(source, target); return [source, target];}));
const bulkRows = (await fs.readFile(path.join(root, 'docs/cloudflare-legacy-redirects.csv'), 'utf8')).trim().split('\n').map(l => l.split(','));
assert.equal(bulkRows.length, rules.length * 4);
assert.equal(new Set(bulkRows.map(r => r[0])).size, bulkRows.length);
const bulkSources = new Set(bulkRows.map(r => r[0]));
for (const [source, target, status, query, subdomains, subpaths, suffix] of bulkRows) {
  assert.equal(status, '301'); assert.deepEqual([query, subdomains, subpaths, suffix], ['TRUE','FALSE','FALSE','FALSE']);
  assert.equal(target, origin + redirects.get(new URL(source).pathname));
  assert.ok(!bulkSources.has(target), `bulk redirect chain: ${source}`);
}
const originRule = await fs.readFile(path.join(root, 'docs/cloudflare-origin-rule.txt'), 'utf8');
for (const [source] of rules) assert.ok(originRule.includes(`"${source}"`), `missing origin-rule exclusion: ${source}`);
const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
const blocked = [...robots.matchAll(/^Disallow: (.+)$/gm)].map(m => m[1].trim());
for (const file of pages) {
  const route = file === 'index.html' ? '/' : '/' + file.slice(0, -5);
  assert.equal(redirects.get('/' + file), route);
  assert.ok(!redirects.has(route), `redirect chain: ${route}`);
  if (route !== '/') assert.equal(redirects.get(route + '/'), route);
}
const base = 'origin/main';
function baseline(file) { return execFileSync('git', ['show', `${base}:${file}`], {cwd: root, encoding: 'utf8', maxBuffer: 8e6}); }
function bookingValues(html) { return [...html.matchAll(/(?:href|action)="(https:\/\/[^" ]*cloudbeds\.com[^" ]*)"/g)].map(m => m[1]); }
function preservedMarkup(html) {
  return html.replace(/\r\n/g, '\n').replace(/<link[^>]+rel="canonical"[^>]*>/g, '').replace(/<meta[^>]+property="og:url"[^>]*>/g, '').replace(/\n<meta name="robots" content="noindex, nofollow">/g, '').replace(/href="[^"]*"/g, 'href=""');
}
for (const file of pages) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.deepEqual(bookingValues(html), bookingValues(baseline(file)), `Cloudbeds changes: ${file}`);
  assert.equal(preservedMarkup(html), preservedMarkup(baseline(file)), `content or design changes: ${file}`);
}
for (const file of ['styles.css', 'rooms.css', 'typography.css', 'enquiry.js', 'enquiry-config.js']) {
  assert.equal((await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'), baseline(file).replace(/\r\n/g, '\n'), `${file} changed`);
}
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.xml':'application/xml', '.svg':'image/svg+xml', '.avif':'image/avif', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png'};
// Test fixture models explicit path rules and static extensionless serving.
// It does not prove Cloudflare has deployed or applied those rules.
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (redirects.has(url.pathname)) { res.writeHead(301, {Location: redirects.get(url.pathname) + url.search}); res.end(); return; }
  let name = decodeURIComponent(url.pathname).slice(1) || 'index.html';
  if (!path.extname(name)) name += '.html';
  const file = path.resolve(root, name);
  if (!file.startsWith(root)) {res.writeHead(403); res.end(); return;}
  try {const body = await fs.readFile(file); res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'}); res.end(body);}
  catch {res.writeHead(404); res.end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const local = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const context = await browser.newContext();
  await context.route('**/*', route => new URL(route.request().url()).origin === local ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(local + '/sitemap.xml');
  const xml = await page.evaluate(async () => {const text = await (await fetch('/sitemap.xml')).text(); const doc = new DOMParser().parseFromString(text, 'application/xml'); return {errors: doc.querySelectorAll('parsererror').length, namespace: doc.documentElement.namespaceURI, count: doc.querySelectorAll('loc').length};});
  assert.deepEqual(xml, {errors:0, namespace:'http://www.sitemaps.org/schemas/sitemap/0.9', count:17});
  const titles = new Set(); const descriptions = new Set();
  for (const url of urls) {
    const route = new URL(url).pathname;
    assert.equal(new URL(url).origin, origin); assert.ok(!route.endsWith('.html')); assert.ok(!blocked.some(p => route.startsWith(p)));
    const file = route === '/' ? 'index.html' : route.slice(1) + '.html';
    assert.ok(pages.includes(file));
    const source = await fs.readFile(path.join(root, file), 'utf8');
    assert.ok(source.includes(`rel="canonical" href="${url}"`), `server HTML canonical: ${file}`);
    assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(source));
    const legacy = await fetch(local + '/' + file + '?source=regression', {redirect:'manual'});
    assert.equal(legacy.status, 301); assert.equal(legacy.headers.get('location'), route + '?source=regression');
    assert.equal((await fetch(local + '/' + file)).status, 200);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:900});
      const response = await page.goto(local + route);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('link[rel=canonical]').count(), 1);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), url);
      const og = page.locator('meta[property="og:url"]');
      if (await og.count()) assert.equal(await og.getAttribute('content'), url);
      assert.equal(await page.locator('img:not([alt])').count(), 0, `missing image alt: ${route}`);
      assert.equal(await page.locator('img[alt=""]').evaluateAll(images => images.filter(img => img.getAttribute('src') && !img.closest('[aria-hidden="true"]') && !img.closest('.room-photo-thumbnails button[aria-label]')).length), 0, `unlabelled meaningful image: ${route}`);
      const links = await page.locator('a[href]').evaluateAll(elements => elements.map(e => e.getAttribute('href')));
      for (const href of links) {
        const target = new URL(href, url);
        if (target.hostname.endsWith('grandcentralhotel.co.nz')) {
          assert.equal(target.origin, origin);
          assert.ok(!target.pathname.endsWith('.html'), `${route} links to ${href}`);
          if (!path.extname(target.pathname)) assert.ok(urls.includes(target.origin + target.pathname), `unknown link: ${href}`);
        }
      }
      const expected = route.startsWith('/room') ? 'Rooms' : route.startsWith('/venue') ? 'Events & Venues' : route === '/weddings' ? 'Weddings' : ['/arts-events','/station-story'].includes(route) ? 'Arts & Culture' : null;
      if (expected) assert.equal((await page.locator('.wayfind a[aria-current=page]').first().textContent()).trim(), expected);
      if (width === 390) {
        const button = page.locator('.menu-toggle').first();
        await button.click(); assert.equal(await button.getAttribute('aria-expanded'), 'true');
        await page.locator('.wayfind a[href="/rooms"]').first().click(); assert.equal(new URL(page.url()).pathname, '/rooms');
        await page.goto(local + route);
        if (await page.locator('.masthead .btn[href^="/enquire"]').count()) assert.equal((await page.locator('.mobile-book').textContent()).trim(), 'Make an enquiry');
      }
    }
    const title = await page.title(); const description = await page.locator('meta[name=description]').getAttribute('content');
    assert.ok(title && description); assert.ok(!titles.has(title)); assert.ok(!descriptions.has(description)); titles.add(title); descriptions.add(description);
  }
  await page.goto(local + '/#location');
  assert.equal(await page.locator('.wayfind a[aria-current=page]').first().textContent(), 'Location');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.equal(schema['@context'], 'https://schema.org'); assert.equal(schema['@type'], 'Hotel'); assert.equal(schema.url, origin + '/'); assert.equal(schema.address['@type'], 'PostalAddress');
  assert.ok(schema.name && schema.address.streetAddress && schema.telephone); assert.ok(schema.amenityFeature.every(item => item['@type'] === 'LocationFeatureSpecification' && typeof item.value === 'boolean'));
  assert.deepEqual(schema, JSON.parse(baseline('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]));
  for (const file of pages.filter(f => !urls.includes(origin + '/' + f.slice(0, -5)) && f !== 'index.html')) {
    assert.ok(blocked.includes('/' + file)); assert.ok(blocked.includes('/' + file.slice(0, -5)));
    assert.ok((await fs.readFile(path.join(root,file),'utf8')).includes('content="noindex, nofollow"'));
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS: 17 public pages, 34 desktop/mobile visits, XML sitemap, 41 permanent path rules, active navigation, location anchor, image alt attributes, utility exclusions, Hotel JSON-LD shape and unchanged booking/design assets.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
