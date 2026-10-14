import fs from 'node:fs/promises';

const origin = 'https://www.grandcentralhotel.co.nz';
const sitemap = await fs.readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
const urls = new Set(paths.flatMap(p => [origin + p.replace(/\.html$/, ''), origin + (p === '/' ? '/index.html' : p.replace(/\.html$/, '') + '.html')]));
for (const host of ['grandcentralhotel.co.nz', 'www.grandcentralhotel.co.nz']) {
  for (const protocol of ['http', 'https']) for (const path of ['/', '/rooms', '/rooms.html?seo-audit=1']) urls.add(`${protocol}://${host}${path}`);
}
for (const path of ['/robots.txt', '/sitemap.xml', '/seo-audit-missing-page', '/rooms/']) urls.add(origin + path);
const results = [];
for (const url of urls) {
  const hops = []; let current = url;
  try {
    for (let i = 0; i < 8; i++) {
      const response = await fetch(current, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
      const location = response.headers.get('location');
      hops.push({url: current, status: response.status, location, xRobotsTag: response.headers.get('x-robots-tag'), contentType: response.headers.get('content-type')});
      if (location && response.status >= 300 && response.status < 400) { await response.body?.cancel(); current = new URL(location, current).href; continue; }
      const body = await response.text();
      results.push({url, hops, canonical: body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? null, robots: body.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i)?.[1] ?? null, ...(current.endsWith('/robots.txt') || current.endsWith('/sitemap.xml') ? {body} : {})});
      break;
    }
  } catch (error) { results.push({url, hops, error: error.message}); }
  console.log(url, JSON.stringify(results.at(-1)?.hops));
}
await fs.mkdir(new URL('../docs/', import.meta.url), {recursive: true});
await fs.writeFile(new URL('../docs/seo-live-before.json', import.meta.url), JSON.stringify({checkedAt: new Date().toISOString(), results}, null, 2) + '\n');
