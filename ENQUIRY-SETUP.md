# Arts and event enquiries

## Formspree delivery — 13 October 2026

The owner chose Formspree on 12 October 2026. The seven-field form in enquire.html now uses enquiry-config.js and enquiry.js for direct submission, without opening an email app.

- Endpoint: https://formspree.io/f/xrpeavko
- Dashboard: https://formspree.io/forms/xrpeavko/submissions
- Recipient: bm.cityaparts@gmail.com, verified in Formspree.
- Reply-To: the submitter's `email` field.
- Spam protection: Formshield enabled and the `_gotcha` honeypot retained. CAPTCHA is disabled in the provider's default settings.
- Free allowance observed: 50 submissions per month.
- Privacy: the form explains the recipient/purpose and links to Formspree's privacy policy. Do not collect payment details or sensitive information.
- Verification: one clearly labelled launch test returned `ok: true`, appeared in the Formspree inbox, and the owner confirmed notification receipt on 13 October 2026.
- Published: https://grand-central-hotel.shiping106106.chatgpt.site/enquire.html (13 October 2026, Sites version 8).
- Hosted form test: empty required fields rejected; the live form showed “Enquiry received” and the record appeared in Formspree with source `venue-grand-hall` and venue `grand-hall`. The 390px mobile layout had no horizontal overflow. The initial delivery test was confirmed in the business inbox by the owner; notification receipt for the additional hosted test was not separately confirmed.

Manage enquiries in Formspree's Submissions dashboard and the business inbox. The form preserves entered details on failure and does not confirm bookings. Hotel reservations and Cloudbeds remain separate. No provider credentials are included in browser code.

## Previous Wix setup — rollback reference

The details below record the former published setup. Both paid Wix subscriptions have auto-renew off. The Wix form/account is retained; no Wix records or automations were deleted during this migration.

Activated with Wix on 12 October 2026.

- Public form: https://gccityaparts.wixforms.com/f/7515236832171263168
- Wix site: 71fced9f-c17b-4879-a32e-af86ea62a5cd
- Form: 140d5db9-cc88-4c04-8241-19a50b9159e1
- Notification automation: 119bf8c0-16c9-48cd-acec-181b69e1f637
- Recipient: Auckland Heritage Art Centre business contact, bm.cityaparts@gmail.com.
- Dynamic Reply-To: contact email from the submitted form.
- Spam protection: Advanced and reCAPTCHA remains enabled.

The website enquiry page opens the Wix-hosted form. Existing arts, venue and wedding enquiry links continue through this page. Guests choose their enquiry category and enter required name, email and message; phone, preferred dates and approximate guest count are optional. Ask guests to include the venue in their message. No payment, booking confirmation or marketing subscription is created.

Hotel reservations remain separate: reservation@grandcentralhotel.co.nz and Info@grandcentralhotel.co.nz. Cloudbeds booking links remain unchanged.

Verification: the public form rejected empty required fields, accepted the clearly labelled WEBSITE LAUNCH TEST, displayed its receipt message, and retained the record in Wix Forms & Submissions. The owner confirmed notification receipt at bm.cityaparts@gmail.com. Desktop/mobile enquiry links were checked on the deployed website.

Operation: manage enquiries in the existing Wix site's Forms & Submissions dashboard. Keep the Wix site/account and notification automation active after changing website hosting. The old enquiry-config.js and enquiry.js are unused and excluded from the publication package. No provider credentials are included in browser code.
