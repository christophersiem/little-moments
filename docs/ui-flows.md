# Little Moments — UI Flows (Current)

## Main Routes
- `/record`
- `/memories`
- `/memories/:id`
- `/onboarding`
- `/invite/accept`
- `/settings`
- `/settings/account`
- `/settings/family`
- `/settings/privacy`

## 1) Authentication + Bootstrap
- No session -> AuthGate (sign in/register).
- Session available -> bootstrap family and child context.
- No memberships -> onboarding flow.
- Membership exists:
  - owner lands on `/record`
  - member lands on `/memories`

## 2) Record Flow
- Idle -> recording -> stopped.
- On stop, show Save/Discard sheet.
- Discard requires confirmation.
- Save starts upload only after explicit confirmation.
- After Save, app navigates directly to `/memories`.

## 3) Processing Experience on Memories Page
- Top status banner communicates upload/processing state.
- Pending row can appear immediately at top of list.
- Polling updates PROCESSING -> READY/FAILED.
- Retry path is available on failure.

## 4) Memories List
- Reverse chronological, grouped by month.
- Sticky compact header with inline filter chips:
  - Month (single select)
  - Tags (multi-select)
  - Clear (shown only when active)
- Infinite scroll with load-more sentinel.
- Empty states:
  - no memories
  - no matches for active filters

## 5) Memory Detail
- Displays title, date/time, tags, summary, transcript.
- Owner actions are in overflow menu:
  - edit title/date/transcript/tags
  - delete memory (with confirmation)
- Members are read-only.

## 6) Family and Invite Flow
- Family page shows member list + role badges.
- Owner can:
  - invite via link (email + role)
  - promote/demote
  - remove members (with guardrails)
- Member can view list but cannot manage invites or roles.

## 7) Settings and Account
- Settings entries: Account, Family, Privacy, Logout.
- Account page supports:
  - display name update
  - email update
  - password update
