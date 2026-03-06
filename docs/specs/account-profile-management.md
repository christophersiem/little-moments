# Spec — Account and Profile Management

## Goal
Define authentication form behavior and account/profile management under Settings -> Account.

## Scope
- AuthGate login/register UX
- Profile bootstrap/ensure behavior
- Account page updates for display name, email, password

## AuthGate Behavior
- Modes:
  - sign in
  - create account
- Register requires:
  - display name
  - password length >= 8
  - repeat password match
- On successful register:
  - if session exists: ensure profile immediately
  - if confirmation required (no session): store pending display name for first authenticated session

## Profile Ensure
- On authenticated app bootstrap, frontend calls profile ensure endpoint.
- Preferred display name source order:
  1. explicit preferred value
  2. pending display name from local storage
  3. auth metadata display_name
  4. fallback `Member`

## Account Page Behavior
- Display name section:
  - editable
  - persisted via backend profile endpoint
- Email section:
  - editable via Supabase `auth.updateUser({ email })`
  - success message indicates inbox confirmation
- Password section:
  - requires >= 8 chars
  - requires repeat match
  - updated via Supabase `auth.updateUser({ password })`

## Caching
- Account page keeps a lightweight in-memory cache for display name/email to reduce repeated loading.

## Error Handling
- Unauthorized profile fetch/update signs out and redirects to `/record`.
- Validation errors shown inline per section.
- Supabase config missing shows explicit message.

## Acceptance Criteria
- Registration blocks invalid display name/password cases.
- Display name is persisted and visible in family member views.
- Email and password updates show clear success/error states.
- Unauthorized account access results in clean sign-out flow.

## Implementation References
- `frontend/src/features/auth/AuthGate.tsx`
- `frontend/src/features/profiles/api.ts`
- `frontend/src/pages/AccountPage.tsx`
- `backend/src/main/java/de/csiem/backend/controller/ProfileController.java`
- `docs/sql/step8_supabase_profiles_account.sql`
