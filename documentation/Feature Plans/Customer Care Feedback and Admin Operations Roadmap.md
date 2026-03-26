# Customer Care, Feedback, and Admin Operations Roadmap (1-2 months)

## Goals

- Reduce time-to-resolution for customer-care and support requests.
- Turn user feedback into prioritized, trackable product improvements.
- Give admin/ops teams a reliable triage workflow with clear ownership and SLAs.

## Phase 1: Intake Quality and Triage Foundations (Weeks 1-2)

- Improve form-level intake quality for support and feedback:
  - Add issue category and priority selectors to reduce ambiguous submissions.
  - Capture context metadata (route, user role, browser, auth state) for faster triage.
- Standardize backend validation and payload shape:
  - Enforce consistent request limits, sanitization, and validation errors across support and feedback APIs.
  - Add shared status model (`new`, `triaged`, `in_progress`, `resolved`, `closed`) for both entities.
- Establish an admin queue baseline:
  - Add basic admin queue API endpoint with filter by status, category, and recency.

### Phase 1 Sub-todos

- `phase1-support-form-categorization`: Add category and priority fields to customer-care submission UI and request payload.
- `phase1-feedback-form-categorization`: Add feedback type and impact fields to feedback UI and request payload.
- `phase1-intake-context-capture`: Attach route, client metadata, and optional user/session context to support and feedback submissions.
- `phase1-shared-validation-contract`: Align backend validation behavior and response contract between support and feedback controllers.
- `phase1-status-lifecycle-schema`: Add status lifecycle columns and defaults for support and feedback records in storage setup.
- `phase1-admin-queue-read-api`: Implement admin-facing read API with filtering/sorting for incoming tickets.

## Phase 2: Workflow Execution and Communication Loops (Weeks 3-5)

- Add admin operations workflow actions:
  - Enable assignment, status transitions, and internal notes on support/feedback records.
  - Add SLA due-date calculation based on priority to surface at-risk items.
- Improve customer communication updates:
  - Add acknowledgement and status-update notifications for major lifecycle changes.
  - Introduce standardized response templates for common issue categories.
- Add ops visibility dashboards:
  - Track queue size, aging, and assignee load with simple operational metrics endpoints.

### Phase 2 Sub-todos

- `phase2-assignment-and-ownership`: Add assignee support and ownership transfer actions for support and feedback records.
- `phase2-status-transition-guardrails`: Add allowed transition rules and audit metadata for lifecycle updates.
- `phase2-internal-notes-thread`: Add admin-only notes timeline to capture investigation context and handoff details.
- `phase2-sla-deadline-calculation`: Compute SLA target times by priority and expose breach-risk flags in admin responses.
- `phase2-customer-status-notifications`: Send email updates for submission acknowledgement and key status changes.
- `phase2-response-template-library`: Create reusable response templates for top support and feedback categories.
- `phase2-ops-dashboard-metrics-api`: Add queue-health metrics API (open count, median age, breached SLA count, assignee workload).

## Phase 3: Optimization, Reliability, and Closed-Loop Improvement (Weeks 6-8)

- Close the feedback loop with product delivery:
  - Add tagging for product area and rollout linkage to map feedback into feature planning.
  - Track whether resolved items lead to follow-up satisfaction improvements.
- Improve reliability and abuse handling:
  - Add duplicate-detection heuristics for repeated submissions.
  - Add spam/throttle protections for repeated low-quality submissions.
- Operationalize continuous improvement:
  - Add weekly ops review exports and trend views by category and severity.
  - Add experiment hooks for response copy/timing to improve reopen and satisfaction rates.

### Phase 3 Sub-todos

- `phase3-feedback-to-roadmap-tagging`: Add taxonomy tags to map feedback/support issues to product areas and roadmap buckets.
- `phase3-duplicate-intake-detection`: Add deduplication hints based on user, text similarity, and recent submission window.
- `phase3-spam-and-rate-controls`: Add throttling and anti-abuse checks for repeated submissions from same actor/device.
- `phase3-resolution-satisfaction-capture`: Add lightweight post-resolution satisfaction prompt and capture score trend.
- `phase3-ops-export-and-trend-reports`: Add admin export/report endpoint for weekly trend analysis by category, status, and SLA.
- `phase3-response-optimization-experiments`: Add experiment flags for update timing and response template variants.

## Recommended Implementation Areas

- Frontend customer-care and feedback intake:
  - `react-frontend/src/pages/CustomerCarePage.jsx`
  - `react-frontend/src/pages/FeedbackPage.jsx`
  - `react-frontend/src/pages/SupportPage.css`
  - `react-frontend/src/utils/api.js`
  - `react-frontend/src/App.js`
- Backend support and feedback handling:
  - `node-backend/controllers/support.controller.js`
  - `node-backend/controllers/feedback.controller.js`
  - `node-backend/models/supportQuery.model.js`
  - `node-backend/models/feedback.model.js`
  - `node-backend/routes/support.routes.js`
  - `node-backend/routes/feedback.routes.js`
- Backend admin operations and notifications:
  - `node-backend/services/email.service.js`
  - `node-backend/storage/createTables.js`
  - `node-backend/server.js`

## Success Metrics

- Median first-response time for support submissions.
- Median time-to-resolution for support and feedback issues.
- SLA breach rate by priority tier.
- Queue aging distribution (share of open items older than 24h/72h/7d).
- Reopen rate after marked resolution.
- Post-resolution satisfaction score and response rate.
- Feedback-to-roadmap conversion rate (share of tagged items mapped to active work).

## Suggested Delivery Order

- Deliver all Phase 1 intake and lifecycle schema changes first so data quality and triage are stable.
- Implement assignment, SLA, and status notification loops from Phase 2 before adding optimization work.
- Finish with Phase 3 reliability and insight improvements once baseline operational metrics are trustworthy.
