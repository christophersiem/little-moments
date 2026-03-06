# Little Moments — Product Overview (Current MVP)

## Core Idea
Little Moments is a voice-first journaling app for parents.
Users quickly record a moment, save it, and get a structured memory they can revisit.

## Primary User Context
- Evening use
- Low energy
- One-handed, low-friction interaction

## Current MVP Capabilities
- Record -> Stop -> Save/Discard flow
- Backend transcription from audio upload
- Memory status lifecycle (`PROCESSING`, `READY`, `FAILED`)
- Auto-generated title and summary from transcript
- Auto-assigned tags from transcript content
- Memories list with month and tag filters
- Memory detail view with owner edit/delete controls
- Family model with roles (`OWNER`, `MEMBER`)
- Invite link flow with role assignment on invite
- Account/profile settings (display name, email, password)

## Current Core Flow
1. User records audio.
2. User stops and explicitly chooses Save.
3. App navigates to Memories and shows non-blocking processing state.
4. Backend transcribes and enriches memory.
5. Memory appears as READY in list/detail.

## Product Rules in Current Build
- Members can view memories but cannot record or mutate memory data.
- Owners can record, edit, delete, and manage invites/members.
- Access control is enforced by Supabase RLS + RPC checks.
- Audio is processed for transcription and not persisted in default flow.

## Out of Scope (Current MVP)
- Public sharing / social feed
- Ads and growth loops
- Medical/diagnostic interpretation
- Advanced analytics dashboards
- Automated email invite sending (invite links are copied manually)
