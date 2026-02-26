# Spec — Stop Recording: Save vs Discard (Reduced MVP)

## Goal
When user taps "Stop recording", they must choose between:
- Discard (with confirmation)
- Save (starts transcription only after user confirms Save)

## UX Flow
1) User is recording → taps "Stop"
2) Show choice modal/bottom sheet:
    - Primary: "Save"
    - Secondary: "Discard"

3a) If user taps "Discard"
- Show confirmation dialog: "Discard this recording?" (Yes/Cancel)
- If Yes: delete local audio blob, reset UI to idle state
- If Cancel: return to the choice modal

3b) If user taps "Save"
- Close modal
- Transition to "Saving your moment..." state
- Upload audio to backend
- Backend starts transcription only after Save (no transcription before)
- On success: show saved confirmation + transcript preview
- On failure: show error + retry (retry re-uploads same audio if still available)

## State Rules
- No transcription request is made until user selects "Save".
- Discard must remove audio from memory/state so it cannot be uploaded later by accident.
- Back navigation during choice modal returns to recording stopped state (audio retained) unless Discard confirmed.

## Acceptance Criteria
- Stop always shows Save/Discard choice
- Discard always asks for confirmation
- Save triggers backend request and shows processing UI
- No backend call happens if user discards