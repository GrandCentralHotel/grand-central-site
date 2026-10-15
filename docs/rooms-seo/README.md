# Rooms SEO review

Branch: `feature/rooms-seo-optimisation`

Base: `19cf8c5` (merged technical SEO and Spark Arena work).

## Metadata before and after

### Homepage

- Previous title: Grand Central Hotel Auckland
- New title: Heritage Hotel in Auckland CBD | Grand Central Hotel
- Previous description: A hotel inside one of Auckland's original railway buildings. Private double, king and twin rooms, within walking distance of Spark Arena. Book direct.
- New description: Stay at Grand Central Hotel in Auckland CBD's historic former railway station. Private rooms with kitchenettes and bathrooms, near Spark Arena. Book direct.
- Open Graph title and description match the new homepage metadata. The existing heritage H1, photography and layout remain unchanged.


### /rooms

- Previous title: Rooms in Auckland CBD | Grand Central Hotel
- New title: Auckland CBD Hotel Rooms | Grand Central Hotel
- Previous description: Compare rooms at Grand Central Hotel in Auckland CBD, inside the former Auckland Railway Station and within walking distance of Spark Arena.
- New description: Compare Auckland CBD hotel rooms in the former railway station. Choose a Standard Double, spacious Deluxe King or Deluxe Twin, each with a private kitchenette.

### /room-standard-double

- Previous title: Standard Double Room | Grand Central Hotel Auckland
- New title: Standard Double Room in Auckland CBD | Grand Central
- Previous description: A Standard Double room at Grand Central Hotel in Auckland CBD, within walking distance of Spark Arena.
- New description: A practical private room for two in Auckland CBD, with a king bed, kitchenette, private bathroom, air conditioning and free Wi-Fi. Book direct at Grand Central.

### /room-deluxe-king

- Previous title: Deluxe King Room | Grand Central Hotel Auckland
- New title: Deluxe King Room in Auckland CBD | Grand Central
- Previous description: A more spacious Deluxe King room with a sofa at Grand Central Hotel in Auckland CBD, near Spark Arena and the waterfront.
- New description: Enjoy extra space for two in Auckland CBD: a king bed, sofa in every room, kitchenette and private bathroom at Grand Central Hotel in the former railway station.

### /room-deluxe-twin

- Previous title: Deluxe Twin Room | Grand Central Hotel Auckland
- New title: Deluxe Twin Room in Auckland CBD | Grand Central
- Previous description: A flexible Deluxe Twin room for up to three guests at Grand Central Hotel in Auckland CBD.
- New description: Stay together in Auckland CBD with one king bed and one king-single bed for up to three guests. Enjoy a kitchenette and private bathroom at Grand Central Hotel.

## Heritage opening copy and legacy URLs

Homepage introduction: “Heritage accommodation in Auckland CBD, inside the historic former Auckland Railway Station. Stay in a private double, king or twin room, within walking distance of Spark Arena.”

Rooms hero: “Stay inside Auckland’s historic former railway station. Choose a Standard Double, Deluxe King or Deluxe Twin room, each with a kitchenette and private bathroom, in Auckland CBD.”

The former About page redirects to `/station-story`; Contact redirects to `/guest-information` (hotel arrival information, address and footer contact details); FAQ redirects to `/guest-information#faq`. Each mapping covers the clean, trailing-slash and `.html` paths, with 301 status and query preservation. Historical page bodies are unavailable, so these mappings use current page intent rather than claiming exact content equivalence.

The existing 44 path rules remain unchanged; nine new aliases bring the total to 53. The Cloudflare handoff CSV has 212 entries (four origins per path), and its origin-rule exclusion list includes the nine new aliases. These are repository/handoff changes, not changes to the Cloudflare account. Since HTTPS redirects are being handled separately, the administrator should reconcile these additions with the active rules, rather than replacing their configuration. [Cloudflare Pages redirect documentation](https://developers.cloudflare.com/pages/configuration/redirects/) supports destination fragments; [Bulk Redirect target components](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/url-components/) also support fragments with preserved request queries.

## Content and linking

- Overview: a descriptive H1, clearer room comparisons, named room-detail links and a contextual Spark Arena link. Open Graph image now uses the existing approved overview hero.
- Standard Double: practical private accommodation for two, one king bed, kitchenette benefits and a useful equipment FAQ.
- Deluxe King: extra space for two and a sofa in every room; replaces a duplicate extra-bed FAQ with a room comparison.
- Deluxe Twin: explicitly one king bed plus one king-single bed for up to three, with practical benefits for friends and small families.
- Homepage: title, description and opening copy now explain heritage accommodation in Auckland CBD; the existing comparison link names Auckland CBD hotel rooms.
- Detail pages: a comparison link back to Rooms near the secondary booking CTA; relevant guest-information equipment/cot links.

## Protected content

Bed configurations, occupancy, variable-view wording, feature lists, approved hero/gallery pictures and order, navigation, footer, typography, colours, scripts, forms and all source Cloudbeds URLs remain unchanged. No prices, discounts, availability or extra-bed claims have been added. Existing primary, secondary and mobile room-specific booking paths already work, so CTA wording and placement remain unchanged.

## Card alignment follow-up

At the owner's request, `rooms.css` now shares content rows across adjacent room cards. Descriptions, bed/guest facts, amenities and action buttons align even when text wraps to different lengths. Single-column mobile cards retain their natural layout. No photography, content or booking destinations changed in this adjustment.

Verified at 1920, 1440, 1100, 820, 651, 650, 390 and 320px, with no horizontal overflow. The existing SEO suite also asserts row alignment.

## Structured data and assumptions

HotelRoom markup is optional for this task. Existing Hotel and Spark Arena WebPage JSON-LD remain unchanged; no room schema, offer, rating or availability claims have been added. The visible room information and metadata carry the verified distinctions without adding a parallel data model to maintain.

Facts use the current pages plus the task's owner-confirmed room specifications. Policies remain linked to the existing guest-information page. No outstanding factual question blocks these edits. Keyword targets are relevance hypotheses; no Search Console research or ranking gains are claimed.

Existing photographs retain their width/height attributes, responsive CSS and lazy loading after the lead image; no image files or delivery architecture were changed.

## Validation

Passed on 15 October 2026: the extended `node scripts/test-seo.mjs` checks all 18 public pages at 1440px and 390px, local HTTP responses, overflow, metadata/canonicals, internal routes/anchors, sitemap/redirects, mobile navigation, room facts, decoded images, protected markup, room booking clicks and date/occupancy handoff. External booking clicks use intercepted responses; no reservation is created and Cloudbeds inventory is not tested.

Local fixture tests do not prove deployed Cloudflare behaviour. No merge, deployment, DNS or provider configuration changes are part of this PR.

Additional homepage/Rooms hero checks passed at 320, 390, 820 and 1440px: no horizontal overflow and all copy stays inside its hero. The refreshed local preview also passes the FAQ query-plus-fragment redirect.

JavaScript syntax checks passed for `site.js`, `enquiry.js`, `enquiry-config.js` and `scripts/test-seo.mjs`; `git diff --check` passed. Playwright used isolated headless Chromium from the bundled runtime, with no new dependencies. All browser contexts and the local fixture server close on completion.

## Screenshots

Homepage hero: [Desktop](screenshots/homepage-1440.jpg) · [Mobile](screenshots/homepage-390.jpg)

Full-page mobile captures include the existing fixed booking button at the bottom of the captured viewport.

### rooms

[Desktop](screenshots/rooms-1440.jpg) · [Mobile](screenshots/rooms-390.jpg)

### room-standard-double

[Desktop](screenshots/room-standard-double-1440.jpg) · [Mobile](screenshots/room-standard-double-390.jpg)

### room-deluxe-king

[Desktop](screenshots/room-deluxe-king-1440.jpg) · [Mobile](screenshots/room-deluxe-king-390.jpg)

### room-deluxe-twin

[Desktop](screenshots/room-deluxe-twin-1440.jpg) · [Mobile](screenshots/room-deluxe-twin-390.jpg)

