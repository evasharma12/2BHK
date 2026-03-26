# Trust, Verification, and Safety UX Roadmap (1-2 months)

## Goals

- Increase user confidence that listings and owners are authentic.
- Reduce spam, abuse, and unsafe interactions across listing and chat touchpoints.
- Improve speed and quality of trust/safety issue handling from report to resolution.

## Phase 1: Baseline Trust Signals and Reporting (Weeks 1-2)

- Add visible verification and profile trust cues:
  - Show verified contact/owner status in profile header and key property touchpoints.
  - Add listing-level trust indicators for completeness and recent activity.
- Add simple, consistent abuse-reporting entry points:
  - Add report actions on property detail and profile surfaces with clear issue categories.
  - Capture report metadata (reporter, target listing/user, reason, notes, timestamp).
- Improve immediate guardrails for suspicious interactions:
  - Add anti-spam rate limiting for high-frequency contact attempts.
  - Add client-side warning copy before submitting risky or repeated messages.

### Phase 1 Sub-todos

- `phase1-verified-badge-surface`: Add verified status indicator in profile header, property card, and property detail owner sections.
- `phase1-listing-trust-signals`: Add listing trust chips (profile completeness and last-active freshness) in listing and detail UI.
- `phase1-report-flow-ui`: Implement report modal with reason taxonomy and optional notes on property detail and profile pages.
- `phase1-report-api-storage`: Add backend report endpoint and persistence model for trust/safety reports with audit-ready fields.
- `phase1-contact-rate-limits`: Add server-side throttling for repeated contact/report submissions and return actionable error states.

## Phase 2: Verification Workflow and Moderation Operations (Weeks 3-5)

- Introduce owner verification workflow:
  - Add verification request submission and review statuses (pending/approved/rejected).
  - Surface verification progress and outcome in profile edit flows.
- Build internal moderation handling basics:
  - Add queue views and status transitions for support/admin handling.
  - Add SLA labels and escalation flags for high-severity reports.
- Improve support communication loop:
  - Send acknowledgment updates when reports are submitted and when status changes.
  - Add structured support notes to maintain context across handoffs.

### Phase 2 Sub-todos

- `phase2-verification-request-endpoint`: Add API for verification request create/list with status and reviewer metadata.
- `phase2-verification-profile-workflow`: Add frontend verification request/status components inside profile edit and account areas.
- `phase2-moderation-queue-model`: Add moderation queue fields and status transition methods for trust/safety cases.
- `phase2-support-admin-views`: Add basic admin/support queue views with filters by severity, age, and report type.
- `phase2-case-update-notifications`: Add report status update notifications (in-app first, optional email fallback) for reporters.
- `phase2-sla-escalation-rules`: Add SLA timers and escalation triggers for unresolved high-risk reports.

## Phase 3: Proactive Safety and Quality Optimization (Weeks 6-8)

- Add proactive abuse detection and prevention:
  - Detect repeat offenders and repeated report patterns for prioritized moderation.
  - Add soft blocks and additional review checks for risky listing behavior.
- Strengthen trust transparency for users:
  - Show lightweight case outcomes and safety guidance where appropriate.
  - Add contextual safety tips in contact/chat flows.
- Optimize safety funnel outcomes:
  - Measure report validity, resolution speed, and false-positive rates.
  - Tune thresholds and UX copy based on observed behavior.

### Phase 3 Sub-todos

- `phase3-repeat-offender-detection`: Add heuristics to identify repeated abuse patterns at listing/user level and prioritize queues.
- `phase3-risk-scoring-controls`: Add risk scoring hooks and soft-block controls for suspicious listing/contact behavior.
- `phase3-chat-safety-guidance`: Add contextual safety reminders and caution prompts in contact and chat initiation paths.
- `phase3-resolution-transparency`: Add reporter-facing resolution summaries with safe, non-sensitive outcome messaging.
- `phase3-safety-funnel-analytics`: Add analytics for report-to-resolution funnel, true-positive rate, and median resolution time.
- `phase3-threshold-tuning`: Run monthly threshold and copy tuning iterations using moderation outcomes and user feedback.

## Recommended Implementation Areas

- Frontend trust and reporting UX:
  - `react-frontend/src/pages/PropertyDetailPage.jsx`
  - `react-frontend/src/components/ContactOwner.jsx`
  - `react-frontend/src/components/Profile/ProfileHeader.jsx`
  - `react-frontend/src/components/Profile/EditProfileModal.jsx`
  - `react-frontend/src/pages/ProfilePage.jsx`
  - `react-frontend/src/utils/api.js`
- Backend auth, trust, and moderation flows:
  - `node-backend/controllers/auth.controller.js`
  - `node-backend/controllers/user.controller.js`
  - `node-backend/controllers/property.controller.js`
  - `node-backend/controllers/support.controller.js`
  - `node-backend/models/user.model.js`
  - `node-backend/models/property.model.js`
  - `node-backend/models/supportQuery.model.js`
  - `node-backend/routes/auth.routes.js`
  - `node-backend/routes/user.routes.js`
  - `node-backend/routes/property.routes.js`
  - `node-backend/routes/support.routes.js`
  - `node-backend/middleware/auth.middleware.js`
  - `node-backend/storage/createTables.js`

## Success Metrics

- Share of active listings with verified owner status.
- Report submission rate and valid-report ratio.
- Median time from report submission to first action.
- Median time from report submission to resolution.
- Repeat abuse rate per 1,000 active users/listings.
- Contact-to-chat conversion change for verified vs non-verified owners.

## Suggested Delivery Order

- Deliver all Phase 1 trust-signal and reporting entry points first to establish immediate user confidence gains.
- Ship verification workflow + moderation queue operations from Phase 2 next to support sustainable handling capacity.
- Finish with Phase 3 proactive detection and tuning once baseline moderation metrics are stable.
