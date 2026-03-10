# Spec — Auth Session Bootstrap and Routing

## Goal
Define how session, family context, and route guards are bootstrapped after app start and after sign-in.

## Scope
- Frontend app shell and routing bootstrap
- AuthGate visibility
- Family and child context resolution
- Onboarding and invite resume entry points

## Flow
1. App starts and checks Supabase session.
2. If no session: show AuthGate.
3. If session exists:
   - ensure own profile (best effort)
   - try pending invite token acceptance
   - fetch memberships
4. If user has no memberships:
   - set onboarding required
   - navigate to `/onboarding` (except when already on invite accept route)
5. If user has memberships:
   - resolve active family from:
     - accepted invite family id (highest priority)
     - stored `activeFamilyId` (if still valid)
     - first membership fallback
   - ensure child context for active family (`first child` or `ensure default child`)
   - set recording permission based on role (`OWNER` can record)

## Route Guard Rules
- After sign-in:
  - owners are redirected to `/record`
  - members are redirected to `/memories`
- If user is on `/onboarding` but already has a valid family context:
  - owners go to `/record`
  - members go to `/memories`
- Non-owners are redirected from `/record` to `/memories`.

## Local State
- `activeFamilyId` is persisted in local storage and validated against current memberships.
- pending invite token is persisted in local storage and cleared after successful accept.

## Error States
- Session check error: shown in AuthGate.
- Family bootstrap error: shown in app content area with message.
- Missing child in selected family: explicit error message is shown.

## Acceptance Criteria
- Unauthenticated users always see AuthGate.
- Authenticated users with no membership always land on onboarding.
- Authenticated users with memberships always get valid `familyId` and `childId`.
- Owner/member route gating is enforced consistently after sign-in and route changes.

## Implementation References
- `frontend/src/app/App.tsx`
- `frontend/src/features/families/localState.ts`
- `frontend/src/features/families/api.ts`
- `frontend/src/pages/OnboardingPage.tsx`
- `frontend/src/pages/AcceptInvitePage.tsx`
