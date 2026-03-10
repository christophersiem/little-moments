# Little Moments

Voice-first memory journaling app (React/Vite frontend + Spring Boot backend + Supabase).

## Documentation: Read In This Order
1. `AGENTS.md`  
   Project guardrails and implementation rules.
2. `docs/README.md`  
   Documentation governance (which file is source of truth for what).
3. `docs/product.md`  
   Current MVP scope and product intent.
4. `docs/ui-flows.md`  
   End-to-end user flows and route behavior.
5. `docs/api.md`  
   Backend API contracts used by frontend.
6. `docs/data-model.md` + `docs/sql/README.md`  
   Data model summary + canonical Supabase SQL steps.
7. `docs/specs/README.md`  
   Flow-level as-built specs.

## Quick Start
```bash
# frontend
cd frontend && npm install && npm run dev

# backend
cd backend && ./mvnw spring-boot:run
```
