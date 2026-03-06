# Spec — Auth and Family Sharing (Current)

## Goal
Define the current Supabase auth + family sharing model used by the app.

## Core Concepts
- Users authenticate with Supabase Auth (`auth.users`).
- Access is scoped by `family_members` role membership.
- Children belong to exactly one family.
- Memories are scoped through `child_id -> children.family_id`.

## Roles
- `OWNER`
  - can record/create memories
  - can edit/delete memories
  - can manage members and invite links
- `MEMBER`
  - can view shared memories in the family
  - cannot record/create/update/delete memories
  - cannot create invites or manage member roles

## Auth Model
- Frontend uses Supabase session directly.
- App data requests go through backend `/api` with Bearer token.
- Backend forwards authorization to Supabase PostgREST/RPC.
- RLS remains the source of truth for data access.

## Data Model (relevant tables)
- `public.families`
- `public.family_members`
- `public.children`
- `public.memories`
- `public.invitations`
- `public.profiles`

See `docs/data-model.md` and `docs/sql/*.sql` for details.

## Key RPC / Guarded Operations
- `rpc_create_family_with_owner`
- `rpc_create_invitation`
- `rpc_accept_invitation`
- `rpc_set_member_role`
- `rpc_remove_member`

These enforce server-side constraints such as:
- owner-only role management
- no removal/demotion of last owner
- invite token validation and expiry

## Current Bootstrap Behavior
- No implicit family creation on login.
- If authenticated user has zero memberships: route to `/onboarding`.
- Invite token (if pending) is accepted during bootstrap after auth.
- Active family is resolved from accepted invite, stored active family, or first membership.

## Invite Flow
1. Owner creates invite for email and selected role (`MEMBER` default, `OWNER` optional).
2. App returns raw token for manual link sharing.
3. Invitee opens `/invite/accept?token=...`.
4. After auth (if needed), token is accepted and membership is created/updated.

## Security Principles
- Do not trust client-provided `user_id`.
- Keep direct writes to sensitive tables restricted; use RPC for critical mutations.
- Enforce role checks in both:
  - RLS/RPC (authoritative)
  - backend service/controller guards (defense-in-depth)

## Acceptance Criteria
- Unauthenticated users cannot access family data.
- Members only see families where they are members.
- Members can read memories but cannot mutate them.
- Owners can invite/manage roles and create/edit/delete memories.
- Last owner protection is always enforced.
