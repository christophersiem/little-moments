# Little Moments — Product Overview

## Core Idea
Voice-first journaling app for parents of young children (1–4 years).
Users record short (30–60s) audio memories in the evening.
The system transcribes, structures, stores, and later enables reflection.

---

## Target User
Parents with low cognitive energy (evening use case).
Primary context: 9:30pm, child asleep, user tired.

---

## Core Problem
Parents want to preserve meaningful small moments.
Writing feels too effortful.
Photos miss emotional nuance.
Memories fade quickly.

---

## MVP Scope (Strict)

### Must Have
- Record or upload audio
- Store audio in storage bucket
- Async transcription
- Structured memory generation:
    - title
    - short summary
    - tags
    - optional child_age
    - mood
- Store transcript + metadata in database
- Simple list/timeline view
- Basic semantic search over memories

### Out of Scope (MVP)
- Social sharing
- Advanced analytics
- Multi-child profiles
- Complex auth logic
- Push notifications
- Medical or developmental assessments

---

## Core Flow (MVP)

1. User records audio
2. Audio uploaded to storage
3. DB row created (status = UPLOADED)
4. Background process:
    - Transcribe
    - Structure with LLM
    - Generate embedding
5. Memory visible in timeline

---

## Success Criteria

- Memory can be recorded in < 10 seconds
- Transcription fully automated
- System robust against partial failure
- User never sees technical states

---

## Future Vision (Post-MVP)

- Monthly summaries
- “Ask about my child’s language development”
- AI-powered reflection prompts
- Print-ready memory book