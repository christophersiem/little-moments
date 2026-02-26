# Little Moments — Design System (Reduced MVP)

## Product context
Evening use case. Users are tired, low attention, low tolerance for complexity.
Design must feel calm, warm, and effortless. Reduce decisions and cognitive load.

## Core principles
1) One primary action per screen.
2) Minimal text, short labels, no jargon.
3) Strong hierarchy: title → supporting text → action.
4) Feedback must be immediate and unambiguous.
5) Error states are gentle and actionable (Retry / Cancel), never technical.

## Layout
- Mobile-first. Target width: 375px baseline.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- Page padding: 16px.
- Max content width on large screens: 480–560px centered.

## Typography
- Headline (H1): 22–24, semibold
- Section title (H2): 16–18, semibold
- Body: 15–16, regular
- Secondary: 13–14, regular
  Rules:
- No paragraphs longer than 2 lines on mobile.
- Buttons use sentence case (e.g., "Save", not "SAVE").

## Color & tone
Use a soft neutral base + one accent color.
Rules:
- Background: warm light neutral
- Text: dark neutral
- Accent: calm (not saturated)
- Destructive: reserved, only for confirmed discard
  Avoid pure black/white extremes. Avoid loud gradients.

## Elevation & shape
- Cards: subtle shadow or 1px border, never both heavy.
- Corners: 12–16 radius for cards/sheets, 10–12 for buttons.
- Modals/bottom sheets: rounded top corners, strong separation from background.

## Buttons
- Primary: filled, full-width, 48px height minimum
- Secondary: outlined or ghost
- Destructive: only used inside confirmation dialogs
  Rules:
- One primary button per screen.
- Disable primary button only when required; show why (e.g., "Recording…").

## Inputs
Avoid text input in Reduced MVP.
If unavoidable later: large tap targets, clear labels, no placeholder-as-label.

## Loading / processing
- Show a single clear message: "Saving your moment…"
- Use subtle progress indicator.
  Rules:
- Never show spinners without text.
- If processing may exceed ~10s: show secondary line "This can take a moment."

## Empty states
- Calm illustration optional (simple icon).
- Copy: 1 sentence + single action.
  Example: "No moments yet. Record your first one."

## Error states
- Copy: short, human, no technical codes.
- Provide Retry as primary action; Cancel/Back as secondary.
  Example: "Couldn’t save this moment. Try again?"

## Iconography
- Use a single icon set consistently.
- Prefer outline icons, medium stroke weight.

## Component rules (Reduced MVP)
Must have:
- AppShell (top area + content)
- PrimaryButton / SecondaryButton
- Card (for memory list items)
- BottomSheet (Save/Discard choice)
- ConfirmDialog (Discard confirmation)
- Toast or inline error (one pattern only)

## Accessibility (minimum)
- Tap targets ≥ 44px
- Contrast sufficient for body text
- Focus states visible (keyboard)
- Screen titles are real headings