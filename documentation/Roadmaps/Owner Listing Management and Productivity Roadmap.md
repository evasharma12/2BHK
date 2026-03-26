# Owner Listing Management and Productivity Roadmap (1-2 months)

## Goals

- Help owners publish and maintain high-quality listings with less manual effort.
- Reduce time spent on repetitive listing operations and status updates.
- Improve owner response speed and listing freshness to increase lead conversion.

## Phase 1: Listing Workflow Clarity and Speed (Weeks 1-2)

- Streamline core owner listing actions:
  - Make draft, publish, pause, and archive states easy to understand and switch.
  - Add clear validation feedback before publish so owners fix issues faster.
- Improve listing edit velocity:
  - Add structured section progress (photos, pricing, amenities, location, description).
  - Preserve in-progress form data during navigation and refresh.
- Increase dashboard usefulness:
  - Surface basic listing health indicators and last-updated timestamps.

### Phase 1 Sub-todos

- `phase1-listing-state-controls`: Add consistent owner controls for draft/publish/pause/archive with explicit confirmation states.
- `phase1-prepublish-validation`: Add pre-publish validation summary panel with deep links to missing/invalid sections.
- `phase1-edit-progress-tracker`: Add section-level completion tracker in post/edit listing flows.
- `phase1-form-state-persistence`: Persist partially completed listing forms and recover state on revisit.
- `phase1-listing-health-basics`: Show last updated, photo count, and mandatory-field completion on owner listing surfaces.

## Phase 2: Bulk Management and Productivity Automation (Weeks 3-5)

- Enable bulk operations for multi-listing owners:
  - Allow bulk pause/unpause and availability updates for selected listings.
  - Support bulk price adjustments with guardrails and preview.
- Add owner productivity shortcuts:
  - Provide reusable templates for recurring property details and amenities.
  - Add duplicate-listing flow to speed up similar inventory onboarding.
- Improve operational visibility:
  - Add lightweight activity timeline for listing edits and state changes.

### Phase 2 Sub-todos

- `phase2-bulk-status-updates`: Build multi-select listing table actions for bulk pause/unpause and availability updates.
- `phase2-bulk-price-tools`: Add bulk price update workflow with before/after preview and safe rollback window.
- `phase2-listing-templates`: Add owner-configurable listing templates for common property metadata and amenities.
- `phase2-duplicate-listing-flow`: Add duplicate existing listing action with selective field carry-forward.
- `phase2-owner-activity-log`: Add owner-facing listing activity feed for edits, status changes, and publish events.

## Phase 3: Quality Optimization and Performance Coaching (Weeks 6-8)

- Guide owners toward better listing outcomes:
  - Add listing quality score with actionable recommendations.
  - Highlight stale listings and suggest refresh actions.
- Improve lead handling productivity:
  - Prioritize listings with incoming demand and low response rates.
  - Add coaching nudges for response SLAs and content improvements.
- Close the measurement loop:
  - Add experiments and instrumentation for owner workflow conversion.

### Phase 3 Sub-todos

- `phase3-quality-scorecard`: Implement listing quality scorecard with prioritized fix recommendations per listing.
- `phase3-stale-refresh-nudges`: Detect stale listings and trigger owner nudges for content, pricing, and availability refresh.
- `phase3-demand-priority-queue`: Surface high-demand listings needing owner action in profile/dashboard views.
- `phase3-response-sla-coaching`: Add response-time coaching prompts tied to chat engagement and inquiry backlog.
- `phase3-owner-workflow-experiments`: Add experiment flags and analytics for publish completion, bulk-action adoption, and lead conversion impact.

## Recommended Implementation Areas

- Frontend owner listing and profile workflows:
  - `react-frontend/src/pages/ProfilePage.jsx`
  - `react-frontend/src/pages/EditPropertyPage.jsx`
  - `react-frontend/src/components/PostProperty/PostProperty.js`
  - `react-frontend/src/components/PostProperty/OwnerContact.js`
  - `react-frontend/src/components/Profile/ProfileHeader.jsx`
- Frontend conversion and owner response touchpoints:
  - `react-frontend/src/components/ContactOwner.jsx`
  - `react-frontend/src/components/Chat/ChatList.jsx`
- Backend property lifecycle and owner data orchestration:
  - `node-backend/controllers/property.controller.js`
  - `node-backend/models/property.model.js`
  - `node-backend/routes/property.routes.js`
  - `node-backend/controllers/user.controller.js`
  - `node-backend/routes/user.routes.js`
  - `node-backend/storage/createTables.js`

## Success Metrics

- Median time from listing draft creation to publish.
- Publish success rate on first attempt (without validation failures).
- Share of active owners using at least one bulk action weekly.
- Listing freshness rate (listings updated in last 14 days).
- Owner response SLA attainment rate for new inquiries.
- Lead-to-chat and chat-to-visit conversion rate for owner-managed listings.

## Suggested Delivery Order

- Deliver all Phase 1 workflow and validation improvements first to reduce owner friction quickly.
- Ship Phase 2 bulk actions and templates next for immediate productivity gains for multi-listing owners.
- Complete Phase 3 quality coaching and optimization after baseline workflow telemetry is stable.
