# Search & Discovery UX Roadmap (1-2 months)

## Goals

- Help users find relevant properties faster with fewer dead-ends.
- Improve confidence in listing quality before opening detail pages.
- Increase conversion from listing views to chats/saves.

## Phase 1: Quick Wins (Weeks 1-2)

- Improve search feedback and empty states on listing pages:
  - Show active filters as removable chips.
  - Add clear no-results suggestions (widen price range, nearby locality, remove strict filters).
  - Keep recent search state when navigating back from detail page.
- Add listing card quality signals:
  - Show days on market.
- Improve map/list toggle UX:
  - Persist map/list mode per user session.
  - Keep selected property highlighted between map marker and card.

### Phase 1 Sub-todos

- `phase1-filter-chips`: Add active-filter chips with per-chip remove and clear-all on property listing page.
- `phase1-no-results-recovery`: Add no-results recovery panel with smart suggestions and one-click relax actions.
- `phase1-search-state-persistence`: Preserve filters, scroll position, and map/list mode when navigating back from detail page.
- `phase1-listing-quality-signals`: Add listing-card quality signal (days on market) with consistent formatting.
- `phase1-map-list-linking`: Keep selected property synchronized between map marker and list card highlight.

## Phase 2: Relevance & Convenience (Weeks 3-5)

- Build personalized recommendations block:
  - "Because you viewed/saved" section on home and properties pages.
  - Use city/locality + budget + BHK heuristics first (no ML dependency initially).
- Add commute and neighborhood context:
  - Show nearby landmarks/transit and approximate commute bands for selected city hubs.
  - Surface this in listing cards and detail page snippets.
- Add richer filter presets:
  - Family-friendly, budget rental, ready-to-move, furnished-only, etc.

### Phase 2 Sub-todos

- `phase2-reco-data-model`: Define backend heuristic inputs for recommendations (city, locality, budget, BHK, recent interactions).
- `phase2-reco-api`: Build recommendation endpoint for Because You Viewed/Saved sections.
- `phase2-reco-ui-home-list`: Render recommendation rails on Home and Properties pages with fallback states.
- `phase2-saved-search-schema`: Add saved-search persistence model and API for create/list/delete operations.
- `phase2-saved-search-alerts`: Implement notification workflow for new matches (in-app first, optional email).
- `phase2-neighborhood-context`: Add nearby landmark/transit context snippets to list cards and property detail.
- `phase2-filter-presets`: Add curated discovery presets (family-friendly, budget rental, ready-to-move, furnished-only).

## Phase 3: Trust & Conversion Boosters (Weeks 6-8)

- Add listing completeness score for owners:
  - Encourage filling photos, amenities, exact location, and description quality.
  - Better completed listings get ranking boost.
- Introduce similar properties and new-in-this-area modules on property detail.
- Add soft anti-spam and stale listing detection:
  - Auto-prompt owner to refresh old listings.
  - Down-rank inactive/stale listings in search results.
- Add A/B experiments for conversion:
  - Card CTA wording, placement of price and locality, and map-first vs list-first defaults.

### Phase 3 Sub-todos

- `phase3-completeness-scoring`: Define and compute listing completeness score and expose it in owner listing management UI.
- `phase3-similar-properties`: Add similar-properties and new-in-this-area modules on property detail.
- `phase3-stale-listing-detection`: Detect stale listings and add owner refresh prompts plus search down-ranking rules.
- `phase3-ab-experiment-framework`: Add lightweight experiment flags to test CTA copy and card information hierarchy.
- `phase3-experiment-analysis`: Instrument metrics and evaluate experiment impact on CTR and chat conversion.

## Recommended Implementation Areas

- Frontend listing/discovery:
  - `react-frontend/src/pages/PropertiesListPage.jsx`
  - `react-frontend/src/components/PropertyFilters.jsx`
  - `react-frontend/src/components/PropertySearchForm.jsx`
  - `react-frontend/src/components/PropertyCard.jsx`
- Detail and conversion touchpoints:
  - `react-frontend/src/pages/PropertyDetailPage.jsx`
  - `react-frontend/src/components/ContactOwner.jsx`
- Backend filtering/ranking:
  - `node-backend/controllers/property.controller.js`
  - `node-backend/models/property.model.js`

## Success Metrics

- Search-to-detail CTR.
- Detail-to-chat/start-contact conversion.
- Saved-search adoption and alert click-through.
- Median time-to-first-relevant-click.
- Bounce rate on no-results sessions.

## Suggested Delivery Order

- Start with Phase 1 fully (fastest UX lift with low risk).
- Ship one recommender + one alert feature from Phase 2 next.
- End with ranking/trust + A/B tuning in Phase 3.
