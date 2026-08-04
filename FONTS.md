# Fonts

The design uses four voices, each traceable to something physical in the building.

| Role | Face | Where it comes from | Used for |
|---|---|---|---|
| Carved | **Cinzel** | The `RAILWAY STATION` lettering carved across the facade | Wordmark only. Never body copy. |
| Read | **EB Garamond** | A classical book serif that sits naturally with the period | Headings and body text |
| Sign | Bahnschrift / Roboto Condensed | The `TO PLATFORMS 3.4.5.6.7.` concourse signage | Labels, buttons, wayfinding |
| Data | System monospace | The departures board's time and destination columns | Prices, times, walking distances |

## Before launch: self-host Cinzel and EB Garamond

Right now the CSS *asks* for Cinzel and EB Garamond and falls back to Georgia if
they are absent. Georgia is a decent stand-in but it is not the carved lettering,
and shipping a fallback as your identity face is a compromise, not a choice.

Both faces are open licence (SIL Open Font License) and free to self-host.

1. Download from Google Fonts: `Cinzel` (weights 400, 500) and `EB Garamond`
   (400, 400 italic, 600).
2. Convert to `.woff2` and place them in `fonts/`.
3. Add `@font-face` blocks at the top of the stylesheet, for example:

```css
@font-face {
  font-family: "Cinzel";
  src: url("fonts/cinzel-500.woff2") format("woff2");
  font-weight: 500;
  font-display: swap;
}
```

Self-host rather than linking Google's CDN: it is faster, avoids a third-party
request, and keeps the site working if the CDN is blocked.

## Why not copy the reference site's greys

The AHRSAC site (same building, different organisation) sets body text in grey
`#5F5F5F` on white. The typography there is worth borrowing; the colour is not.
Neutral grey on a warm ground reads as unconsidered, and it discards the brick,
brass and amber that make the building recognisable. Secondary text here is
tinted from the palette's own hue instead.
