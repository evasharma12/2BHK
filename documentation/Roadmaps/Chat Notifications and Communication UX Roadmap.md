# Chat Notifications and Communication UX Roadmap (1-2 months)

## Goals

- Reduce message response gaps between buyers/renters and owners.
- Improve visibility of unread chats and conversation priority.
- Increase conversion from property-detail intent to sustained chat activity.

## Phase 1: Chat Visibility and Reliability (Weeks 1-2)

- Strengthen unread and recency cues in chat list:
  - Add clear unread badges, "new" state styling, and stable last-message timestamps.
  - Prioritize thread ordering by `last_message_at` with deterministic fallback sorting.
- Improve thread navigation and continuity:
  - Restore active thread state after refresh/back navigation.
  - Keep property context always visible when users are inside a thread.
- Add baseline notification entry points:
  - Add in-app notification center shell with chat-focused events only for MVP.

### Phase 1 Sub-todos

- `phase1-unread-badge-standardization`: Standardize unread indicator behavior and visual state across chat list and thread header.
- `phase1-thread-ordering-consistency`: Ensure chat thread ordering always reflects latest server-side activity with fallback tie-break logic.
- `phase1-thread-state-persistence`: Persist selected thread and return users to the same conversation after page reload/navigation.
- `phase1-property-context-in-thread`: Surface property summary block in every thread with quick navigation back to property details.
- `phase1-notification-center-shell`: Add lightweight in-app notification center UI with chat notification list and read state support.

## Phase 2: Actionable Notifications and Response UX (Weeks 3-5)

- Introduce actionable notifications:
  - Allow open-thread deep links directly from notification items.
  - Add mark-as-read and clear-all interactions for chat notifications.
- Improve compose and reply quality:
  - Add quick reply templates for common buyer-owner scenarios.
  - Add send-state feedback (sending, failed, retry) to reduce message uncertainty.
- Expand delivery channels:
  - Add optional email notifications for unread chat bursts with frequency controls.

### Phase 2 Sub-todos

- `phase2-notification-deep-linking`: Add deep-link routing from notification items into the exact chat thread and property context.
- `phase2-notification-actions`: Implement mark-read and clear-all actions with backend read-state synchronization.
- `phase2-quick-reply-templates`: Add role-aware quick reply suggestions for first response and follow-up questions.
- `phase2-send-failure-retry`: Add failed-message UX with retry action and clear delivery state transitions.
- `phase2-email-unread-digests`: Add unread chat email digests with configurable cadence and opt-out support.
- `phase2-notification-preferences`: Add per-user notification preference settings for in-app and email chat alerts.

## Phase 3: Prioritization, Safety Signals, and Optimization (Weeks 6-8)

- Add conversation prioritization:
  - Highlight high-intent threads (recent activity + property revisit signals).
  - Group stale threads and suggest re-engagement prompts.
- Add safety and trust communication signals:
  - Surface lightweight verification and anti-spam warnings inside chat flows.
  - Flag repetitive or suspicious message patterns for moderation review.
- Tune engagement outcomes:
  - Experiment on notification timing and CTA copy to improve reply rates.

### Phase 3 Sub-todos

- `phase3-high-intent-prioritization`: Add scoring rules to rank high-intent chat threads and surface them at top of user inbox.
- `phase3-stale-thread-reengagement`: Detect stale conversations and trigger context-aware re-engagement nudges.
- `phase3-chat-safety-signals`: Add trust/safety banners and suspicious-content warnings in message composer and thread view.
- `phase3-notification-timing-experiments`: Run controlled experiments on notification send timing and message framing.
- `phase3-conversion-funnel-instrumentation`: Add end-to-end analytics from notification click to reply sent and ongoing chat retention.

## Recommended Implementation Areas

- Frontend chat and communication UX:
  - `react-frontend/src/components/Chat/ChatList.jsx`
  - `react-frontend/src/components/ContactOwner.jsx`
  - `react-frontend/src/pages/ProfilePage.jsx`
  - `react-frontend/src/pages/PropertyDetailPage.jsx`
  - `react-frontend/src/utils/api.js`
- Backend chat and realtime orchestration:
  - `node-backend/controllers/chat.controller.js`
  - `node-backend/models/chatThread.model.js`
  - `node-backend/models/chatMessage.model.js`
  - `node-backend/routes/chat.routes.js`
  - `node-backend/services/chatRealtime.service.js`
  - `node-backend/server.js`

## Success Metrics

- Median first-response time in chat threads.
- Share of threads receiving a reply within 30 minutes.
- Notification click-through rate to opened chat thread.
- Unread message backlog per active user (7-day rolling).
- Chat thread retention (users with 2+ messages over 7 days).
- Failed-send rate and successful retry completion rate.

## Suggested Delivery Order

- Deliver all Phase 1 reliability and visibility items first to stabilize chat basics.
- Ship deep linking + notification actions from Phase 2 before scaling email notifications.
- Finish with Phase 3 prioritization and experiment loops after baseline metrics are stable.
