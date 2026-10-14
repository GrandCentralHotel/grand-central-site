# Technical SEO and indexing audit — 15 October 2026

## Scope and confirmed findings

Repository: `GrandCentralHotel/grand-central-site` only. Branch: `fix/seo-canonical-indexing`, based on fetched `main` at `bbe529682e1d8ba6f32cc7969d1bf4dff6e157ae`. The separate `feature/spark-arena-seo` branch was observed at `2f558b06f8f3f2aa56e1263aae390041afa217ea` and was not modified. No merge, production deployment, Cloudflare configuration change, or Search Console submission was performed.

The read-only HTTP audit recorded 48 requested URL variants in [seo-live-before.json](seo-live-before.json). Its UTC timestamp falls on 15 October in Australia/Sydney.

- All 17 public pages return HTTP 200 at their preferred clean HTTPS www routes. Their SEO metadata is present in static HTML, without requiring JavaScript.
- All 16 non-homepage pages declare `.html` canonicals and Open Graph URLs where present, while their `.html` routes redirect to clean URLs using **307**, not a permanent status. `/index.html` and the tested `/rooms/` alias also use 307. This disagreement is confirmed; its effect on Google's indexing decisions is unknown.
- HTTP www, HTTP non-www and HTTPS non-www homepage/Rooms variants serve HTTP 200 instead of redirecting to HTTPS www. HTTPS requests passed certificate validation in the HTTP client.
- No `X-Robots-Tag` or meta robots restriction was found on the 17 public pages. The four pre-existing robots exclusions cover `.html` utility URLs but omit their extensionless variants.
- The live sitemap returns 200 with `application/xml`, contains 17 URLs, and includes 16 redirected `.html` URLs. Robots.txt returns 200 and points to the correct HTTPS www sitemap.
- The tested unknown URL returns 404. No new fallback page or routing rewrite is needed.
- There is no separate Location HTML page on this `main`: navigation targets the existing homepage `#location` section. Guest information is an additional public location/arrival resource.

Search Console findings supplied with the task are context, not independently refreshed here. Its sitemap count of zero indexed pages does not override the already confirmed indexed homepage and does not prove canonical mismatches caused non-indexing.

## Repository changes

| Before canonical | After canonical |
|---|---|
| `https://www.grandcentralhotel.co.nz/rooms.html` | `https://www.grandcentralhotel.co.nz/rooms` |
| `https://www.grandcentralhotel.co.nz/weddings.html` | `https://www.grandcentralhotel.co.nz/weddings` |
| `https://www.grandcentralhotel.co.nz/venues.html` | `https://www.grandcentralhotel.co.nz/venues` |

- The 17 public HTML files now use self-referencing clean canonicals and matching Open Graph URLs where present. Internal links use root-relative preferred routes and preserve query parameters and fragments. Homepage canonical remains `/`.
- `site.js` uses the same links, recognises clean and legacy page names for active navigation, and recognises the updated enquiry links for the mobile action.
- `_redirects` contains 41 explicit permanent 301 path rules: 21 existing `.html` URLs and 20 trailing-slash aliases. Targets do not redirect again. No wildcard rewrite is introduced.
- `sitemap.xml` retains all 17 valid pages, replacing only the 16 `.html` paths. The enquiry page remains a public indexable page with a canonical independent of its source query parameter.
- `robots.txt` retains the four original restrictions and adds clean utility-route exclusions. The four utility HTML files receive `noindex, nofollow`; they remain outside the sitemap. Robots disallow can prevent crawlers seeing noindex, so this is not a guaranteed removal mechanism for previously indexed utility URLs, nor access control.
- Titles and descriptions are present and unique. Meaningful public images already have descriptive alt attributes; empty alt is used for hidden decorative logos, duplicate gallery thumbnails whose buttons have descriptive accessible labels, and the unloaded lightbox placeholder. No speculative text or hotel facts were added.
- Existing Hotel JSON-LD parses successfully and has the expected Hotel, PostalAddress and LocationFeatureSpecification types and value shapes described by [Schema.org](https://schema.org/Hotel). It remains unchanged. These checks do not claim a Google rich-result eligibility test or verify every existing business fact.
- Content markup, CSS, room pricing, Cloudbeds URLs/room IDs and enquiry configuration remain unchanged.

Modified existing files: `arts-events.html`, `bedroom-product-review.html`, `enquire.html`, `guest-information.html`, `index.html`, `ivy-photos-review.html`, `logo.html`, `owner-information-questionnaire.html`, `robots.txt`, `room-deluxe-king.html`, `room-deluxe-twin.html`, `room-standard-double.html`, `rooms.html`, `site.js`, `sitemap.xml`, `station-story.html`, `venue-art-share-space.html`, `venue-grand-foyer.html`, `venue-grand-hall.html`, `venue-meeting-room.html`, `venue-photography-studio.html`, `venue-waiting-room.html`, `venues.html`, `weddings.html`. Added: `_redirects`, the audit/regression scripts, and the files in `docs/`.

## Cloudflare administrator handoff — not applied

[Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) serves static HTML at extensionless routes. Its [_redirects file](https://developers.cloudflare.com/pages/configuration/redirects/) supports permanent path redirects but does not support domain-level redirects. The exact zone settings and production build configuration are not stored in this repository.

The administrator should confirm that both site hostnames are proxied in the existing zone, that TLS is valid for both, and that the production asset output includes `_redirects`. If Pages Functions or Workers intercept these paths, apply equivalent redirects in the existing serving configuration: Pages `_redirects` does not apply to Function responses. Do not change mail DNS records or unrelated infrastructure.

To combine host, protocol and legacy-path redirects into a single hop without paid regular-expression support:

1. Review and import [cloudflare-legacy-redirects.csv](cloudflare-legacy-redirects.csv) into a new Bulk Redirect List, then enable its Bulk Redirect Rule. This is **164 exact source URLs**: every path alias in `_redirects` across HTTP/HTTPS and www/non-www, each targeting its final HTTPS www clean URL. Status is 301, query preservation is TRUE, and subdomain/subpath/suffix matching are FALSE. No header row is included, matching [Cloudflare's CSV format](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/csv-file-format/).
2. Create one Single Redirect named `Grand Central preferred HTTPS www origin`. Use the exact custom filter in [cloudflare-origin-rule.txt](cloudflare-origin-rule.txt), dynamic destination expression `concat("https://www.grandcentralhotel.co.nz", http.request.uri.path)`, status **301**, and **Preserve query string** enabled. It covers either site hostname when the host is non-www or the request is HTTP, excluding aliases handled by the Bulk list. It leaves HTTPS www clean URLs untouched.
3. The exclusion list matters because [Single Redirects run before Bulk Redirects](https://developers.cloudflare.com/rules/url-forwarding/). A generic host-only rule ahead of the alias list would create two hops for non-www legacy URLs. Review overlapping existing redirect/HTTPS/cache rules and retain their recovery configuration before enabling the reviewed rules together.
4. Verify with GET requests: `http://grandcentralhotel.co.nz/rooms.html?source=test` should return one 301 directly to `https://www.grandcentralhotel.co.nz/rooms?source=test`, followed by 200. Repeat with `/`, `/index.html`, `/rooms/`, `/weddings.html`, `/venues.html`, www HTTP and non-www HTTPS. Confirm no redirect for clean HTTPS www pages and no loops, query loss or altered booking destinations.

These handoff files are reviewable proposed settings, not remotely validated or applied infrastructure. The administrator must validate them against the existing zone and serving stack after deployment. The repository path rules alone do not resolve duplicate hostnames or HTTP serving.

## Verification and limits

Run `node scripts/test-seo.mjs` with Playwright available to Node (`NODE_PATH` can point to an existing installation). Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an installed isolated Playwright Chromium binary. Do not select a Chrome channel or a personal browser profile. No new project dependency is installed.

- Headless isolated Chromium: all 17 public pages at desktop 1440px and mobile 390px; 34 viewport/page checks.
- Static and rendered canonical tags, matching Open Graph URLs, public indexability, valid XML parsed by DOMParser, 17 distinct sitemap entries and correct robots sitemap reference.
- Local fixture tests 41 permanent path rules, one-hop legacy URLs, query preservation and final HTTP 200. CSV regression checks cover 164 direct targets with no chains and complete origin-rule alias exclusions.
- Desktop/mobile navigation, active page labels, menu opening and following the Rooms link, homepage location anchor and mobile enquiry actions.
- Public image alt attributes, unique nonempty titles/descriptions, Hotel JSON-LD shape, unchanged Cloudbeds link values, unchanged page content/design markup and CSS/enquiry assets compared with base main.
- JavaScript syntax checks and `git diff --check`. This static repository has no package manifest, build, lint, typecheck, CI workflow or pre-existing automated test command.
- Read-only GET checks of the main Cloudbeds booking URL and all three room-ID links returned HTTP 200 with HTML; evidence is in [seo-booking-check.json](seo-booking-check.json). No availability search, reservation or payment was submitted; this does not verify a completed transaction.

The temporary HTTP fixture models the committed path rules and static file serving; it is not Cloudflare. Passing it does not prove deployed redirects or production hostname consolidation. The browser and fixture server close in a finally block. No production changes were made, and no indexing improvement is claimed.

The live audit can be repeated with `node scripts/audit-live-seo.mjs`; copy/rename the baseline evidence first because its default output is `docs/seo-live-before.json`.

## After separately approved deployment

1. Administrator verifies the deployed assets and zone redirect rules, public HTTPS www routes, permanent legacy redirects, sitemap HTTP 200, robots.txt and absence of production noindex headers. Leave preview-host noindex protections intact.
2. Run live URL Inspection for `/`, `/rooms`, `/weddings`, `/venues` and relevant room/location pages. Confirm user-declared canonical, crawl eligibility and Google's selected canonical after recrawling.
3. Resubmit the same HTTPS www sitemap and request indexing for priority canonical URLs. Monitor Page Indexing and Performance after Google processes the changes; indexing is Google's decision and is not guaranteed.
