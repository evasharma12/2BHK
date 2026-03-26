# Onboarding Login and Signup UX Roadmap (1-2 months)

## Goals

- Reduce sign-up/login drop-off across first-time and returning users.
- Improve onboarding clarity so users complete identity, profile, and intent setup with less friction.
- Increase downstream conversion from authenticated sessions to key actions (save, chat, post property).

## Phase 1: Friction Removal and Clarity (Weeks 1-2)

- Simplify first-run entry points:
  - Clarify primary CTA hierarchy for login vs signup in navbar and auth screen.
  - Keep role/context hints visible (seeker vs owner intent messaging) before auth completion.
- Reduce interruption and repeated input:
  - Persist partially entered auth form state during accidental refresh/navigation.
  - Improve validation copy and inline error placement for phone/email and password/OTP flows.
- Improve auth confidence signals:
  - Add clearer loading, success, and failure feedback for login/signup requests.
  - Standardize session-restored messaging after refresh.

### Phase 1 Sub-todos

- `phase1-auth-entry-cta-hierarchy`: Update navbar and auth-page CTA hierarchy so users can quickly choose login vs signup with clear intent labels.
- `phase1-form-state-persistence`: Persist partially completed login/signup form fields and restore them on return within the same session.
- `phase1-inline-validation-upgrade`: Add field-level validation and human-readable error copy for phone/email, OTP, and password criteria.
- `phase1-auth-feedback-states`: Standardize pending/success/error feedback states for auth API calls and prevent duplicate submissions.
- `phase1-session-restore-notice`: Add lightweight session restoration banner/toast when users are automatically re-authenticated.

## Phase 2: Guided Onboarding Completion (Weeks 3-5)

- Introduce progressive onboarding steps after successful signup:
  - Collect minimum profile essentials first, then optional preferences.
  - Use progress indicators and skip/continue patterns that keep momentum.
- Personalize first authenticated experience:
  - Route users to role-appropriate next actions (browse properties, post listing, complete profile).
  - Show first-session checklist for high-value setup actions.
- Strengthen account safety and recovery:
  - Improve OTP resend cooldown UX and alternate recovery guidance.
  - Add clear prompts for verified contact completion where missing.

### Phase 2 Sub-todos

- `phase2-progressive-onboarding-flow`: Implement post-signup progressive onboarding steps with progress indicator and skip-safe transitions.
- `phase2-role-based-first-route`: Route newly authenticated users to seeker/owner-specific first destinations and contextual guidance.
- `phase2-first-session-checklist`: Add onboarding checklist module with completion tracking for profile, saved search, and first interaction actions.
- `phase2-otp-resend-and-recovery-ux`: Add visible OTP resend timer, retry handling, and recovery guidance for failed verification attempts.
- `phase2-contact-verification-prompts`: Prompt users to complete missing contact verification details before sensitive actions.
- `phase2-onboarding-state-api`: Add backend onboarding-state persistence and retrieval endpoints for resume-able onboarding.

## Phase 3: Conversion Optimization and Trust Hardening (Weeks 6-8)

- Reduce remaining abandonment points:
  - Instrument and optimize high drop-off steps in login/signup/onboarding funnel.
  - Add targeted nudges for users who stop before onboarding completion.
- Improve trust and abuse protection signals:
  - Surface concise security cues during auth (device/session awareness, suspicious attempt handling).
  - Add clearer messaging around failed auth limits and cooldown periods.
- Run UX experiments on auth conversion:
  - Test copy and placement variants for CTA labels, social proof, and onboarding step framing.

### Phase 3 Sub-todos

- `phase3-auth-funnel-instrumentation`: Add end-to-end analytics for auth and onboarding steps with standardized funnel event taxonomy.
- `phase3-dropoff-nudge-workflow`: Trigger contextual re-entry nudges for incomplete onboarding sessions (in-app first, optional email follow-up).
- `phase3-auth-security-cues`: Add security/trust messaging for unusual login attempts and visible session/device indicators.
- `phase3-rate-limit-feedback-ux`: Improve user-facing feedback for auth rate limits, cooldowns, and retry eligibility windows.
- `phase3-auth-copy-experiments`: Run controlled experiments on auth CTA copy and onboarding step messaging to improve completion rates.

## Recommended Implementation Areas

- Frontend auth and onboarding surfaces:
  - `react-frontend/src/pages/LoginPage.jsx`
  - `react-frontend/src/App.js`
  - `react-frontend/src/components/Navbar.jsx`
  - `react-frontend/src/pages/ProfilePage.jsx`
  - `react-frontend/src/utils/firebasePhoneAuth.js`
  - `react-frontend/src/utils/api.js`
- Backend auth/session/onboarding orchestration:
  - `node-backend/controllers/auth.controller.js`
  - `node-backend/routes/auth.routes.js`
  - `node-backend/middleware/auth.middleware.js`
  - `node-backend/controllers/user.controller.js`
  - `node-backend/routes/user.routes.js`
  - `node-backend/models/user.model.js`
  - `node-backend/storage/createTables.js`
  - `node-backend/services/googleAuth.js`

## Success Metrics

- Login success rate and signup completion rate.
- Auth page drop-off rate by step (submit, verification, onboarding completion).
- Median time-to-authenticated-session and time-to-onboarding-complete.
- Share of new users completing onboarding within first 24 hours.
- 7-day activation rate (users completing at least one core action after onboarding).
- Auth-related support ticket rate per 1,000 auth attempts.

## Suggested Delivery Order

- Ship all Phase 1 friction-reduction items first to stabilize auth reliability and clarity.
- Deliver progressive onboarding flow + role-based routing from Phase 2 before optional enhancements.
- Complete with Phase 3 instrumentation and experiment loops once baseline auth errors are under control.
