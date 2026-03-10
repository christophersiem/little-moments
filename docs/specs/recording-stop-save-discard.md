# Spec — Stop Recording: Save vs Discard

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
- Start upload to backend
- Navigate immediately to `/memories`
- Show non-blocking processing banner in list view
- Backend starts transcription only after Save (no transcription before)
- On success: pending item resolves to READY in list/detail
- On failure: show error banner + retry (re-upload if local audio still available)

## State Rules
- No transcription request is made until user selects "Save".
- Discard must remove audio from memory/state so it cannot be uploaded later by accident.
- Back navigation during choice modal returns to recording stopped state (audio retained) unless Discard confirmed.

## Acceptance Criteria
- Stop always shows Save/Discard choice.
- Discard always asks for confirmation.
- Save triggers backend request only after user confirmation.
- User is routed to `/memories` after save and sees processing state there.
- No backend call happens if user discards.
