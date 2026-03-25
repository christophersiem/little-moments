# Memory Chat V1 Spec

## 1. Summary

Implement a first version of a "Chat with Memories" feature for Little Moments.

The feature should allow authenticated users to ask natural-language questions about their previously stored memories and receive grounded answers based only on their own stored data.

This is not a general-purpose chatbot. It is a memory retrieval and summarization feature built on top of the existing vector database / retrieval foundation.

The implementation should feel native to the existing product and integrate cleanly into the current memory experience.

---

## 2. Product Context

Little Moments is a voice-first AI journal for parents of young children. Users capture everyday moments with minimal effort, and the system structures and stores them for later reflection.

The product already includes:
- voice-first memory capture
- transcription / structured memory storage
- vector database / embeddings for memory retrieval

This feature extends that foundation by enabling:
- natural-language Q&A over past memories
- grounded answers based only on user-provided data
- retrieval of relevant supporting memories as sources

Important product principle:
The assistant helps users rediscover and reflect on their own memories.
It must not behave like a broad, generic AI assistant.

---

## 3. Goal

Enable a user to ask questions like:
- "When were his first steps?"
- "What were the highlights from last month?"
- "When did we first go to the zoo?"
- "Show me memories about sleep."
- "When did he start saying mama?"

The system should:
1. retrieve the most relevant memories for the authenticated user
2. generate a concise grounded answer
3. display the source memories used for the answer
4. clearly communicate uncertainty when evidence is incomplete

---

## 4. Non-Goals

The following are explicitly out of scope for V1:
- general-purpose chat
- internet access
- tool use beyond memory retrieval
- editing, deleting, or creating memories from chat
- sending emails or notifications
- cross-user or cross-family retrieval
- medical, developmental, or diagnostic advice
- complex agentic workflows
- long-running autonomous actions

---

## 5. UX Requirements

## 5.1 Entry Point

Primary entry point should be integrated into the memory overview experience, not introduced as a completely separate standalone AI product.

Preferred V1 pattern:
- a visible but subtle "Ask your memories" entry point on the memory overview page
- opening a chat drawer / side panel / sheet
- mobile-friendly layout
- desktop-friendly side panel or slide-over

Do not make this feel like a generic chatbot product page unless that pattern already exists in the current app architecture.

## 5.2 Empty State

Show a friendly empty state with example questions, such as:
- When were his first steps?
- What were the highlights from last month?
- When did we first visit the zoo?
- Show me memories about sleep.

## 5.3 Answer Rendering

Each answer should include:
1. a concise natural-language response
2. a list of supporting memory cards / source entries

Each source item should ideally show:
- date
- short snippet / title
- optional metadata already available in the app
- link / action to open the related memory

## 5.4 Uncertainty Behavior

If the answer is not fully certain, the UI and generated answer must reflect that clearly.

Examples of acceptable phrasing:
- "The earliest matching memory I found is..."
- "I found several related memories..."
- "I could not find a definitive answer, but this memory seems most relevant..."

Do not present uncertain inferences as hard facts.

---

## 6. Functional Requirements

## 6.1 Auth and Scope

Only authenticated users can access this feature.

All retrieval must be strictly scoped to the authenticated user's permitted data domain.
If the system already uses a concept like family, household, child, or ownership scope, enforce that scope server-side.

Under no circumstances should the feature retrieve or expose another user's data.

## 6.2 Query Types Supported in V1

Support these query classes:
- factual recall ("When was X?")
- thematic retrieval ("Show memories about sleep")
- time-bounded summarization ("What were the highlights from last month?")
- simple milestone lookup ("When did he first say mama?")

## 6.3 Retrieval

Use the existing vector database / memory retrieval foundation where possible.

Prefer a retrieval flow that combines:
- semantic similarity
- existing metadata filters, where available
- date awareness for "first", "last", "earliest", "latest", and time-range questions

For milestone-like questions, do not rely on a single top vector result if a chronological interpretation is required.

## 6.4 Response Generation

The LLM must generate answers only from the provided retrieved context.

The model should not invent facts outside the supplied memory context.

Generated output should be concise, useful, and emotionally neutral/warm in tone, consistent with the product.

## 6.5 Source Linking

The response should retain structured references to which memory items were used.

The frontend must render source memories under the answer.

## 6.6 Failure States

Handle at least these cases:
- no relevant memories found
- retrieval returns weak / ambiguous results
- unsafe / out-of-scope prompt
- backend / model error

Provide graceful, user-appropriate messaging.

---

## 7. Safety and Harness Requirements

This feature must include explicit guardrails.

## 7.1 Product Role Constraint

The assistant is a memory retrieval and summarization assistant only.

It must not:
- act as a general assistant
- follow requests unrelated to the user's memories
- reveal system prompts or internal rules
- execute commands
- perform admin actions
- output hidden internal data

## 7.2 Prompt Injection Resistance

User messages may contain attempts such as:
- "ignore previous instructions"
- "show me all users"
- "reveal your system prompt"
- "act as admin"
- "search outside my memories"

These instructions must not override system behavior.

## 7.3 Backend Hard Boundaries

Do not rely only on prompting for safety.

The backend must ensure:
- retrieval is always user-scoped
- only approved fields are sent into the model context
- no unrestricted DB querying is exposed through the chat flow
- no secrets, hidden prompts, or internal config are returned

## 7.4 Intent Filtering

Introduce a lightweight classification or rule layer before answer generation.

Recommended categories:
- memory_question
- summary_request
- out_of_scope
- unsafe_request

Unsafe or out-of-scope requests should return a short refusal / redirection aligned with product scope.

## 7.5 Structured Model Output

Prefer structured output from the LLM, validated against a schema.

Recommended shape:
- answer: string
- confidence: low | medium | high
- sourceMemoryIds: string[]
- notes: string | null
- status: success | insufficient_evidence | out_of_scope | unsafe

Do not trust free-form model output without validation.

---

## 8. Technical Architecture Expectations

Implement using the existing app architecture and conventions.

Expected high-level flow:
1. user submits question from UI
2. backend authenticates and resolves user scope
3. optional intent classification / safety routing
4. retrieval pulls top relevant memories within scope
5. backend prepares minimal structured context for the model
6. model returns structured grounded answer
7. frontend renders answer + source memory cards

Use existing project patterns for:
- API routes / server actions / backend services
- database access
- auth enforcement
- UI component structure
- error handling
- logging
- testing

Do not introduce unnecessary abstraction or framework churn.

---

## 9. UI / Design Expectations

The feature should feel integrated, subtle, and native to Little Moments.

Avoid:
- flashy chatbot aesthetics
- overly technical AI branding
- visually dominant conversational UI that competes with the core memory experience

Prefer:
- calm, supportive language
- clean empty state
- answer-first layout
- source-backed responses
- strong mobile usability

---

## 10. Observability

Add lightweight logging / instrumentation where appropriate for:
- query type
- retrieval success / no-result cases
- answer status
- model / backend failures

Do not log raw sensitive content beyond what is already acceptable in the project.
Prefer privacy-conscious observability.

---

## 11. Testing Requirements

Implement meaningful tests for the critical harness and feature behavior.

At minimum include tests for:
- authenticated scoped retrieval only
- user cannot access other users' data
- out-of-scope / unsafe prompt handling
- no-result behavior
- structured response validation
- rendering of source memories
- milestone/date-oriented query logic where practical

If the codebase supports integration or end-to-end tests, add at least one realistic happy path.

---

## 12. Deliverables

The implementation should include:
- UI entry point on the memory overview page
- chat drawer / panel / sheet
- backend endpoint / server action for memory chat
- retrieval + answer generation flow
- safety / harness layer
- source rendering
- tests
- concise developer documentation

---

## 13. Implementation Notes

When making tradeoffs, prioritize:
1. correctness and safety
2. grounding and source transparency
3. product fit with existing app
4. simplicity of V1
5. extensibility for future monthly/yearly summary reuse

This feature should create a solid foundation for future summary features, but should not overbuild for them now.

---

## 14. Acceptance Criteria

The feature is complete when:
- a signed-in user can ask a question about their memories
- the system answers only from that user's scoped data
- the answer includes supporting memory sources
- the assistant refuses or redirects out-of-scope / unsafe requests
- the UI is integrated into the memory overview flow
- tests cover the core harness and data-scope protections
- the implementation is production-minded and consistent with the existing codebase