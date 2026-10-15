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
assert.equal(urls.length, 18);
assert.equal(new Set(urls).size, 18);
const files = await fs.readdir(root);
const pages = files.filter(f => f.endsWith('.html'));
const rules = (await fs.readFile(path.join(root, '_redirects'), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/));
assert.equal(new Set(rules.map(r => r[0])).size, rules.length);
const redirects = new Map(rules.map(([source, target, status]) => {assert.equal(status, '301'); assert.notEqual(source, target); return [source, target];}));
const bulkRows = (await fs.readFile(path.join(root, 'docs/cloudflare-legacy-redirects.csv'), 'utf8')).trim().split(/\r?\n/).map(l => l.split(','));
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
// Pin the merged technical SEO and Spark Arena baseline; do not depend on a moving main.
const base = '19cf8c5';
const roomPages = ['rooms.html', 'room-standard-double.html', 'room-deluxe-king.html', 'room-deluxe-twin.html'];
function baseline(file) { return execFileSync('git', ['show', `${base}:${file}`], {cwd: root, encoding: 'utf8', maxBuffer: 8e6}); }
function bookingValues(html) { return [...html.matchAll(/(?:href|action)="(https:\/\/[^" ]*cloudbeds\.com[^" ]*)"/g)].map(m => m[1]); }
function preservedMarkup(html) {
  return html.replace(/\r\n/g, '\n').replaceAll('/accommodation-near-spark-arena/', '/accommodation-near-spark-arena').replace(/<link[^>]+rel="canonical"[^>]*>/g, '').replace(/<meta[^>]+property="og:url"[^>]*>/g, '').replace(/\n<meta name="robots" content="noindex, nofollow">/g, '').replace(/href="[^"]*"/g, 'href=""');
}
for (const file of pages) {
  const html = (await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
  assert.deepEqual(bookingValues(html), bookingValues(baseline(file)), `Cloudbeds changes: ${file}`);
  const before = baseline(file);
  if (roomPages.includes(file)) {
    // Copy may change; approved photography/order, navigation, facts and forms may not.
    for (const pattern of [/<picture\b[\s\S]*?<\/picture>/g, /<nav\b[\s\S]*?<\/nav>/g, /<footer\b[\s\S]*?<\/footer>/g, /<form\b[\s\S]*?<\/form>/g, /<dl\b[\s\S]*?<\/dl>/g, /<ul class="feature-list"[\s\S]*?<\/ul>/g]) {
      assert.deepEqual(html.match(pattern), before.match(pattern), `protected room markup: ${file} ${pattern}`);
    }
    assert.equal(html.match(/<dd>Varies by room<\/dd>/)?.[0], before.match(/<dd>Varies by room<\/dd>/)?.[0]);
  } else if (file === 'index.html') {
    assert.equal(html.replace('Compare Auckland CBD hotel rooms', 'Compare all rooms'), before);
  } else {
    assert.equal(preservedMarkup(html), preservedMarkup(before), `content or design changes: ${file}`);
  }
}
for (const file of ['styles.css', 'rooms.css', 'typography.css', 'site.js', 'enquiry.js', 'enquiry-config.js', '_redirects', 'sitemap.xml', 'robots.txt', 'docs/cloudflare-legacy-redirects.csv', 'docs/cloudflare-origin-rule.txt']) {
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
  const checkedLinks = new Set();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(local + '/sitemap.xml');
  const xml = await page.evaluate(async () => {const text = await (await fetch('/sitemap.xml')).text(); const doc = new DOMParser().parseFromString(text, 'application/xml'); return {errors: doc.querySelectorAll('parsererror').length, namespace: doc.documentElement.namespaceURI, count: doc.querySelectorAll('loc').length};});
  assert.deepEqual(xml, {errors:0, namespace:'http://www.sitemaps.org/schemas/sitemap/0.9', count:18});
  for (const [source, target] of redirects) {
    const response = await fetch(local + source + '?source=regression', {redirect:'manual'});
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), target + '?source=regression');
    assert.equal((await fetch(local + target, {redirect:'manual'})).status, 200);
  }
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
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow: ${route} at ${width}`);
      assert.equal(await page.locator('link[rel=canonical]').count(), 1);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), url);
      const og = page.locator('meta[property="og:url"]');
      if (await og.count()) assert.equal(await og.getAttribute('content'), url);
      if (roomPages.includes(file)) {
        assert.equal(await page.locator('h1').count(), 1);
        assert.match(await page.locator('h1').textContent(), /Hotel rooms in Auckland CBD|Standard Double|Deluxe King|Deluxe Twin/);
        assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title());
        assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), await page.locator('meta[name=description]').getAttribute('content'));
        assert.ok(await page.locator('meta[name=viewport]').getAttribute('content'));
        // Scroll lazy images into view and check actual decoding, including gallery thumbnails.
        for (const image of await page.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(img => img.decode());
        }
        assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => img.src)), []);
        if (file !== 'rooms.html') {
          const facts = await page.locator('.detail-facts').innerText();
          assert.match(facts, file === 'room-deluxe-twin.html' ? /King \+ king single/ : /1 king bed/);
          assert.match(facts, file === 'room-deluxe-twin.html' ? /3/ : /2/);
          const intro = await page.locator('.detail-lead p').innerText();
          for (const term of ['Auckland CBD', 'kitchenette', 'fridge', 'private bathroom', 'air conditioning', 'free Wi-Fi']) assert.ok(intro.includes(term), `${file}: ${term}`);
          if (file === 'room-deluxe-king.html') { assert.match(intro, /sofa in every/); assert.doesNotMatch(intro, /sofa bed/); }
          assert.equal(await page.locator('.direct-booking a[href="/rooms"]').count(), 1);
          const expectedRid = {'room-standard-double.html':'242941065347200', 'room-deluxe-king.html':'242525756014784', 'room-deluxe-twin.html':'242936895193217'}[file];
          // Observe real CTA navigation with a local stub; never create a reservation.
          await page.route('https://us2.cloudbeds.com/**', route => route.fulfill({status:200, contentType:'text/html', body:'<title>Room booking destination verified</title>'}));
          const bookingSelectors = width === 390 ? ['.mobile-book', '.direct-booking .btn'] : ['.hero-actions .btn', '.room-detail-book', '.direct-booking .btn'];
          for (const selector of bookingSelectors) {
            await page.goto(local + route);
            await page.locator(selector).click();
            assert.equal(page.url(), `https://us2.cloudbeds.com/en/reservation/1hynWi?rid=${expectedRid}&currency=nzd`);
          }
          await page.goto(local + route);
        } else {
          assert.equal(await page.locator('.rooms-intro a[href="/accommodation-near-spark-arena"]').count(), 1);
          // Existing overview booking links must carry dates, occupancy and the original room ID.
          await page.locator('#in').fill('2027-02-10');
          await page.locator('#out').fill('2027-02-12');
          await page.locator('#guests').selectOption('3');
          for (const link of await page.locator('[data-room-booking-form]').all()) {
            const destination = new URL(await link.getAttribute('href'));
            assert.equal(destination.searchParams.get('checkin'), '2027-02-10');
            assert.equal(destination.searchParams.get('checkout'), '2027-02-12');
            assert.equal(destination.searchParams.get('adults'), '3');
            assert.equal(destination.searchParams.get('currency'), 'nzd');
            assert.ok(destination.searchParams.get('rid'));
          }
        }
        if (process.env.ROOMS_SCREENSHOT_DIR) {
          await fs.mkdir(process.env.ROOMS_SCREENSHOT_DIR, {recursive:true});
          await page.screenshot({path:path.join(process.env.ROOMS_SCREENSHOT_DIR, `${file.slice(0,-5)}-${width}.jpg`), type:'jpeg', quality:65, fullPage:true});
        }
      }
      assert.equal(await page.locator('img:not([alt])').count(), 0, `missing image alt: ${route}`);
      assert.equal(await page.locator('img[alt=""]').evaluateAll(images => images.filter(img => img.getAttribute('src') && !img.closest('[aria-hidden="true"]') && !img.closest('.room-photo-thumbnails button[aria-label]')).length), 0, `unlabelled meaningful image: ${route}`);
      if (route === '/accommodation-near-spark-arena') {
        await page.locator('footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        assert.deepEqual(await page.locator('img').evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => img.src)), []);
        if (process.env.SEO_SCREENSHOT_DIR) {
          await fs.mkdir(process.env.SEO_SCREENSHOT_DIR, {recursive:true});
          await page.screenshot({path:path.join(process.env.SEO_SCREENSHOT_DIR, `merged-spark-arena-${width}.png`), fullPage:true});
        }
      }
      const links = await page.locator('a[href]').evaluateAll(elements => elements.map(e => e.getAttribute('href')));
      for (const href of links) {
        const target = new URL(href, url);
        if (target.hostname.endsWith('grandcentralhotel.co.nz')) {
          assert.equal(target.origin, origin);
          assert.ok(!target.pathname.endsWith('.html'), `${route} links to ${href}`);
          if (!path.extname(target.pathname)) assert.ok(urls.includes(target.origin + target.pathname), `unknown link: ${href}`);
          if (!checkedLinks.has(target.href) && !path.extname(target.pathname)) {
            const response = await fetch(local + target.pathname);
            assert.equal(response.status, 200, `broken internal link: ${href}`);
            if (target.hash) {
              const linkedSource = await response.text();
              assert.ok(linkedSource.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `missing anchor: ${href}`);
            }
            checkedLinks.add(target.href);
          }
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
  await page.locator('#location .spark-location-link').click();
  assert.equal(new URL(page.url()).pathname, '/accommodation-near-spark-arena');
  assert.equal(await page.locator('h1').count(), 1);
  const arenaSchema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.equal(arenaSchema['@graph'][0].url, origin + '/accommodation-near-spark-arena');
  await page.locator('.faq-list summary').first().click();
  assert.equal(await page.locator('.faq-list details[open]').count(), 1);
  await page.route('https://us2.cloudbeds.com/**', route => route.fulfill({status:200, contentType:'text/html', body:'<title>Booking navigation verified</title>'}));
  await page.locator('.rooms-hero-copy .btn').click();
  assert.equal(page.url(), 'https://us2.cloudbeds.com/en/reservation/1hynWi?currency=nzd');
  for (const file of pages.filter(f => !urls.includes(origin + '/' + f.slice(0, -5)) && f !== 'index.html')) {
    assert.ok(blocked.includes('/' + file)); assert.ok(blocked.includes('/' + file.slice(0, -5)));
    assert.ok((await fs.readFile(path.join(root,file),'utf8')).includes('content="noindex, nofollow"'));
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS: 18 public pages, 36 desktop/mobile visits without overflow, sitemap/redirects, internal links/anchors, navigation, Spark Arena, room facts/OG/decoded images, room CTA clicks, booking date/occupancy handoff, utility exclusions, existing structured data and preserved galleries/booking/design assets.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
