# auth-and-family-sharing.md (Supabase Auth + RLS Spec)

This spec adapts our auth + family sharing model to Supabase Auth (Postgres + RLS).
It stays aligned with the Little Moments foundation (voice-first memories, scalable model). :contentReference[oaicite:0]{index=0}

Non-goals (first iteration):
- No paid plans
- No public sharing links
- No social feed
- No complex org management

---

## 1) Core concepts

We model access around a Family (household). A Child belongs to exactly one Family. Memories belong to a Child. Users join families via FamilyMember rows.

Roles (minimum):
- OWNER: can manage invites + members, create children
- MEMBER: can read/write memories for children in that family

---

## 2) Supabase Auth fundamentals

- Users live in `auth.users` (managed by Supabase).
- In application tables we reference the authenticated user via `auth.uid()` (uuid).
- All authorization is enforced via Postgres Row Level Security (RLS), not in the frontend.
- The backend/service should never trust a client-provided user_id.

---

## 3) Database schema (public.*)

### families
- id uuid pk default gen_random_uuid()
- name text null
- created_at timestamptz not null default now()
- created_by uuid not null references auth.users(id)

### family_members
- family_id uuid not null references families(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- role text not null check (role in ('OWNER','MEMBER'))
- joined_at timestamptz not null default now()
  PRIMARY KEY (family_id, user_id)

Indexes:
- (user_id)
- (family_id)

### children
- id uuid pk default gen_random_uuid()
- family_id uuid not null references families(id) on delete cascade
- name text not null
- birthdate date null
- created_at timestamptz not null default now()
- created_by uuid not null references auth.users(id)

Indexes:
- (family_id)

### memories
- id uuid pk default gen_random_uuid()
- child_id uuid not null references children(id) on delete cascade
- created_at timestamptz not null default now()
- recorded_at timestamptz not null
- transcript text null
- status text not null check (status in ('PROCESSING','READY','FAILED'))
- error_message text null
- created_by uuid not null references auth.users(id)

Indexes:
- (child_id, created_at desc)
- (child_id, recorded_at desc)

### invitations
Purpose: invite by email to a family with a role. We store only a hash of the token.

- id uuid pk default gen_random_uuid()
- family_id uuid not null references families(id) on delete cascade
- email text not null
- role text not null check (role in ('OWNER','MEMBER')) default 'MEMBER'
- token_hash text not null
- expires_at timestamptz not null
- accepted_at timestamptz null
- created_at timestamptz not null default now()
- created_by uuid not null references auth.users(id)

Indexes:
- (family_id)
- (email)
- (expires_at)

Security:
- Do NOT store raw token.
- Token is single-use: once accepted, set accepted_at and prevent re-use.

---

## 4) RLS policies (core)

Enable RLS:
- ALTER TABLE families ENABLE ROW LEVEL SECURITY;
- ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
- ALTER TABLE children ENABLE ROW LEVEL SECURITY;
- ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
- ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

Helper patterns:
- Membership check: exists in family_members where user_id = auth.uid() and family_id = ...
- Owner check: same + role='OWNER'

### families
SELECT: user can read families they are a member of
INSERT: allow authenticated user to create a family where created_by = auth.uid()
UPDATE/DELETE: owner-only (optional for MVP)

### family_members
SELECT: members of a family can read member list for that family
INSERT: only via “accept invitation” RPC / server-side (recommended), not direct client insert
DELETE: owner-only (and must not delete last owner; enforce via RPC)

### children
SELECT: members of family can read
INSERT: owner-only (recommended for MVP)
UPDATE/DELETE: owner-only (optional)

### memories
SELECT: members of child’s family can read
INSERT: members can create (created_by = auth.uid())
UPDATE/DELETE: simplest MVP: members can update/delete (or restrict to created_by)

### invitations
SELECT: owner-only within their families
INSERT: owner-only
UPDATE: only via RPC (accept)

---

## 5) Minimal SQL policy examples (pseudocode-level)

NOTE: Implement with EXISTS subqueries; avoid exposing cross-family data.

### membership subquery
exists (
select 1 from family_members fm
where fm.family_id = families.id
and fm.user_id = auth.uid()
)

### owner subquery
exists (
select 1 from family_members fm
where fm.family_id = families.id
and fm.user_id = auth.uid()
and fm.role = 'OWNER'
)

Apply same idea via joins for children/memories:
- memory -> child -> family_id

---

## 6) RPC functions (recommended)

Because some operations require multi-step transactional logic or constraints (last-owner rule, token hashing), implement these as SECURITY DEFINER functions and expose via Supabase RPC:

### rpc_create_family_with_owner(name text)
Creates:
- families row (created_by = auth.uid())
- family_members row with role OWNER (user_id = auth.uid())
  Returns: family_id

Why: guarantees family always has an OWNER.

### rpc_create_invitation(family_id uuid, email text, role text)
Owner-only:
- validate caller is OWNER in that family
- generate random token (server-side), store token_hash, set expires_at
  Return: raw token (only once) OR return invite_link
  Email sending can be done later via Edge Function / provider.

### rpc_accept_invitation(token text)
Authenticated user required:
- hash(token) to match token_hash
- check not expired, not accepted
- check email matches current user email (auth.users.email) OR skip this check (less safe)
- insert family_members (family_id, auth.uid(), role)
- set accepted_at
  Return: family_id

Also implement:
- unique constraint prevents duplicate membership

### rpc_remove_member(family_id uuid, user_id uuid)
Owner-only:
- ensure not removing last OWNER (transactional check)
- delete from family_members

---

## 7) UX flows

### Register / Login (Supabase)
- Use Supabase Auth UI or custom forms with `supabase.auth.signUp` / `signInWithPassword`.
- After first login:
    - if user has no families: call `rpc_create_family_with_owner` and optionally create default child.

### Invite flow (Owner)
Settings → Family Members
- Enter email, choose role (default MEMBER)
- Call `rpc_create_invitation`
- Show shareable link:
    - https://yourapp.com/invite?token=RAW_TOKEN

### Accept invite (Invitee)
- Open link
- If not logged in: prompt login/register, then continue
- Call `rpc_accept_invitation(token)`
- Redirect to family/child context

---

## 8) Frontend integration notes (minimal)

- Store currentFamilyId and currentChildId in app state (URL param or local storage).
- All data queries are scoped:
    - children: select where family_id = currentFamilyId
    - memories: select where child_id = currentChildId
- Never filter by user_id on the client to “simulate” permissions. RLS must be the source of truth.

---

## 9) Migration from current no-auth model

For MVP:
- Prefer DB reset.
  If migration is needed:
- Create family + child for the first authenticated user
- Backfill existing memories to that child, set created_by to that user

---

## 10) Acceptance criteria

- User can sign up / log in (Supabase Auth)
- New user gets a family and becomes OWNER
- Owner can create a child
- Owner can invite another email
- Invitee can accept and becomes MEMBER
- Both users can see same child and memories
- Non-members get denied (RLS) for any family/child/memory access