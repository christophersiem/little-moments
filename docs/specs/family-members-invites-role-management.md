# Spec — Family Members, Roles, and Invites

## Goal
Define family member management, role changes, and invite behavior in Settings -> Family.

## Scope
- Active family switching
- Member list and role badges
- Owner-only member actions
- Invite creation and acceptance integration

## Family Context
- Family page can switch active family via selector.
- Changing active family updates app context and re-runs family bootstrap.

## Member List
- Members are listed with display name, role, and "You" indicator for current user.
- Role badge values:
  - Owner
  - Member
- Any family member can view the member list.

## Owner-Only Actions
- For owners, row menu supports:
  - make owner
  - demote to member
  - remove member
- Sensitive actions require confirmation dialogs.
- Backend/RPC enforces last-owner safety guard.

## Invite Flow
- Invite section is visible only for owners.
- Invite form fields:
  - email
  - role selection (default: MEMBER)
- Owner can generate invite token link and copy it manually.
- No automatic email sending in app flow.

## Invite Acceptance
- Accept invite route reads token from query.
- If unauthenticated, token is stored and resumed after auth.
- On success:
  - pending token is cleared
  - accepted family becomes active
  - app bootstrap resolves child context.

## Permission and Error Handling
- Members never see invite creation UI.
- Forbidden actions return "Not authorized" feedback.
- Unauthorized responses sign user out and redirect to `/record`.

## Acceptance Criteria
- Owners can invite with explicit OWNER/MEMBER role.
- Members can view members but cannot invite or manage roles.
- Role changes and removals refresh member list.
- Last owner cannot be removed or demoted.

## Implementation References
- `frontend/src/pages/FamilyPage.tsx`
- `frontend/src/pages/AcceptInvitePage.tsx`
- `frontend/src/features/families/api.ts`
- `backend/src/main/java/de/csiem/backend/controller/FamilyController.java`
- `docs/sql/step6_supabase_invitations.sql`
- `docs/sql/step9_supabase_multi_owner_management.sql`
