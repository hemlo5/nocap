# NoCapBLR SEO and Public Presence Plan

## Audit snapshot

- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, MapLibre GL, Supabase auth/data clients.
- **Current product:** a Bengaluru place-discovery map with place, area, category, account/profile, review, and moderation-adjacent flows. The jobs product remains a separate feature.
- **Public routes found:** `/`, `/map`, `/places/[slug]`, `/areas/[area]`, `/categories/[category]`, `/about`, `/what-is-nocap`, `/guidelines`, `/privacy`, `/terms`, plus product and internal routes.
- **Assets found:** `public/nocap-logo.png`, cream and icon variants. No campaign photography or verified press assets were present.
- **Instructions found:** `AGENTS.md` (requires reading the installed Next.js documentation); `CLAUDE.md` delegates to it. No `awesomedesign.md` was found.
- **Design references applied:** the installed `design-taste-frontend` skill (audit-first, brand-led, accessible, avoid generic card grids/gradients, respect motion and responsive behavior) and Vercel Web Interface Guidelines (semantic structure, keyboard and focus behavior, resilient responsive layouts, accessible state changes).

## Functionality to preserve

- MapLibre map, markers, place selection, location-aware review writing, local evidence archive, Google/Supabase profile flow, and existing jobs/opportunities routes.
- Existing place, area, and category data and their direct URLs.
- Existing payment endpoints without introducing any public pricing or monetisation pages.

## Existing SEO issues

1. The homepage redirects to `/map`, leaving no crawlable brand and product introduction.
2. Global canonical and structured-data URLs use `www.nocapblr.com`, while the supplied production URL is `https://nocapblr.com`.
3. The sitemap uses the current time as `lastModified` for every URL.
4. Metadata contains broken character encoding and unsubstantiated marketing claims.
5. The root structured data includes unverified social URLs and a search action that does not map reliably to live product search.
6. The place detail route still showed source-platform attribution, contrary to the product direction for the early evidence archive.
7. Desktop-only navigation makes several public pages hard to discover on mobile.

## Route architecture

Canonical public routes to publish:

- Brand and product: `/`, `/map`, `/about`, `/how-it-works`, `/why-nocapblr`, `/anonymous-reviews`.
- Trust and governance: `/community-guidelines`, `/moderation-policy`, `/report-content`, `/contact`, `/privacy`, `/terms`.
- Proof and story: `/campaigns`, `/campaigns/bengaluru-street-campaign`, `/campaigns/behind-the-campaign`, `/newsroom`, `/newsroom/nocapblr-reaches-10000-active-users-on-day-one`, `/founder/aniket-vaishu`.
- Discovery: existing `/places/[slug]`, `/areas/[area]`, `/categories/[category]`, and a data-backed `/bengaluru` hub.
- Editorial: `/guides` and four practical guides backed by product behavior, not invented local claims.

Legacy routes remain available and are linked or redirected only when a stable replacement exists.

## Brand keyword map

- **Official primary:** `NoCapBLR`, `NoCapBLR Bengaluru`, `NoCapBLR Bangalore`.
- **Natural variants:** `No Cap BLR`, `NoCap Bengaluru`, `NoCap Bangalore`, `Bengaluru No Cap`, `Bangalore No Cap`.
- **Product intent:** honest Bengaluru place reviews, local opinions, location-aware reviews, places in Bengaluru.

Variants are used only in natural explanatory context, metadata, and entity copy. No near-duplicate keyword pages will be created for `nocap` or `no cap`.

## Content boundaries

Supported now: Bengaluru places, areas, the map, location-aware review submission, community standards, moderation/reporting process, founder-confirmed first-day milestone, and founder information supplied for this implementation.

Remain unpublished: venue rankings, unsupported locality/category pages, press coverage, partnerships, financial claims, user/review totals beyond the supplied 10,000 first-day active-user milestone, and any claims of anonymous account creation that the current Google-only sign-in flow cannot support.

## Metadata and crawl plan

- Set `https://nocapblr.com` as one canonical domain.
- Use route-specific `generateMetadata` or static metadata, descriptive titles, canonical URLs, Open Graph metadata, and accurate JSON-LD (`Organization`, `WebSite`, `Article`, `Person`, `BreadcrumbList`, and place entities where relevant).
- Remove unverified social profile and unsupported search-action schema.
- Include only meaningful canonical public URLs in sitemap. Omit guessed modification dates; use the actual supplied milestone date for the announcement and campaign content.
- Keep internal APIs, auth, admin, jobs and opportunity operational routes out of crawling.

## Validation

1. Run TypeScript and ESLint.
2. Build or run the production route checks where the environment permits.
3. Manually inspect desktop and mobile public pages, keyboard focus, nav wrapping, links, and map/product hand-offs.
4. Verify sitemap/robots response and structured-data JSON syntax.
5. Record Search Console query groups and measurement notes without claiming access to unavailable analytics.
