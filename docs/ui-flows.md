# Little Moments — UI Flows (Reduced MVP)

## Screens (Reduced MVP)
- Record
- Processing
- Saved confirmation
- Memories list
- Memory detail

Global rules:
- Each screen has exactly one primary CTA.
- Back navigation never loses a saved memory.
- Avoid multi-step decisions except Stop → Save/Discard.

---

## 1) Record Screen
Goal: Start recording with one tap.

UI:
- Primary element: large record button centered
- Secondary: small hint text ("Tap to record")
- Optional: timer during recording

States:
A) Idle:
- Primary: "Record"
  B) Recording:
- Primary: "Stop"
- Show elapsed time
  C) Stopped (audio captured):
- Show bottom sheet: "Save" (primary) / "Discard" (secondary)

Stop behavior:
- On Stop, never start upload/transcription automatically.
- Present Save/Discard sheet.

---

## 2) Discard Flow
- User taps "Discard" → confirmation dialog:
  Title: "Discard recording?"
  Body: "This cannot be undone."
  Buttons: "Discard" (destructive), "Cancel" (secondary)
- If confirmed:
    - delete local audio blob from state
    - return to Idle record screen

---

## 3) Save → Processing Screen
- User taps "Save" → transition immediately to Processing
  Copy:
- Title: "Saving your moment…"
- Secondary: "This can take a moment."

Rules:
- Upload starts only after Save.
- Disable navigation that would duplicate uploads (or make upload idempotent).

---

## 4) Saved Confirmation
Content:
- Title: "Saved"
- Show 1–2 line transcript preview
  CTA:
- Primary: "View all moments" (go to list)
  Secondary:
- Optional: "Record another"

---

## 5) Memories List
- Reverse chronological.
- Each item: date + 1–2 line snippet.
- Tap opens detail.
  Empty state:
- "No moments yet. Record your first one." + button "Record"

---

## 6) Memory Detail
- Date/time at top
- Full transcript read-only
- No edit in Reduced MVP
- No share/export