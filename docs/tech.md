# Technical Architecture

## Stack

Frontend:
- React (Vite)
- Mobile-first UI

Backend:
- Spring Boot (REST API)
- Maven Wrapper

Database:
- Postgres (Supabase Postgres-compatible)

AI Services:
- Speech-to-text (backend forwards uploaded audio directly)

---

## High-Level Architecture

Frontend
↓
Spring Boot API
↓
Postgres (Supabase)

Processing:
- Request uploads audio blob to backend
- Backend creates memory row with `PROCESSING`
- Backend transcribes immediately
- Backend stores transcript and final status (`READY` or `FAILED`)
- Audio bytes are discarded (not stored)

---

## Processing State (Reduced MVP)

- PROCESSING
- READY
- FAILED

---

## Environment Variables

Backend:
- OPENAI_API_KEY
- DB_URL
- DB_USER
- DB_PASSWORD

Frontend:
- VITE_API_BASE_URL

---

## Non-Goals (MVP)

- Audio storage buckets
- Structuring metadata generation
- Embeddings and semantic search
- Timeline visualization
