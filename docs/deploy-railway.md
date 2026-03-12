# Railway Deploy + CD (Demo Setup)

This guide deploys the current MVP as two Railway services from this monorepo:

- `backend/` (Spring Boot API)
- `frontend/` (Vite static build served by Nginx)

## What is already prepared in this repo

- Backend now supports Railway's dynamic port env via:
  - `server.port=${PORT:${SERVER_PORT:8080}}`
- Frontend Docker build now accepts:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL`
- CD workflow is added:
  - `.github/workflows/cd-railway.yml`
  - It deploys both services to Railway after CI succeeds on `main`.

## 1) Create Railway project + services

1. Open Railway and create a new project.
2. Connect your GitHub repository.
3. Add service `backend` from folder `backend/`.
4. Add service `frontend` from folder `frontend/`.
5. Ensure both services use their existing Dockerfiles.

## 2) Configure backend service variables

Set these Railway variables on the `backend` service:

- `SPRING_DATASOURCE_URL` (Supabase Postgres connection string)
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional, default `https://api.openai.com`)
- `OPENAI_TRANSCRIPTION_MODEL` (optional)
- `OPENAI_INSIGHTS_MODEL` (optional)
- `OPENAI_SPLITTER_MODEL` (optional)
- `OPENAI_INSIGHTS_ENABLED` (optional, default `true`)
- `OPENAI_SPLITTER_ENABLED` (optional, default `true`)
- `MEMORY_SPLITTER_MAX` (optional)
- `MEMORY_SPLITTER_MIN_EXCERPT_CHARS` (optional)
- `CORS_ALLOWED_ORIGINS` (must include your frontend Railway domain)

Example `CORS_ALLOWED_ORIGINS`:

```text
https://your-frontend.up.railway.app
```

After first deploy, verify:

- `GET https://<backend-domain>/health` returns `{"status":"ok"}`

## 3) Configure frontend service variables

Set these Railway variables on the `frontend` service:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` = `https://<backend-domain>/api`

After deploy, verify:

- Frontend loads
- Auth works
- API requests hit backend domain (browser network tab)

## 4) Configure GitHub secrets for CD workflow

Add these repository secrets in GitHub:

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_NAME` (usually `production`)
- `RAILWAY_BACKEND_SERVICE_ID`
- `RAILWAY_FRONTEND_SERVICE_ID`

## 5) CD behavior

- Existing `CI` workflow runs tests/builds.
- New `CD Railway` workflow runs automatically when:
  - `CI` on branch `main` finishes successfully.
- Manual deploy is also possible via `workflow_dispatch`.

## 6) One-time go-live checklist

1. Railway domains generated for both services.
2. Backend `CORS_ALLOWED_ORIGINS` includes frontend domain.
3. Frontend `VITE_API_URL` points to backend `/api`.
4. Backend health endpoint reachable.
5. End-to-end MVP flow works:
   - record -> save -> processing -> list -> detail
6. Push to `main` triggers CI then CD successfully.
