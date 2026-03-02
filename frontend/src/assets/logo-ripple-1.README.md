# Ripple Logo 1 (Vector Asset)

Source raster:
- `frontend/src/assets/Logo_1.png`

Generated vector assets:
- `frontend/src/assets/logo-ripple-1.svg`
- `frontend/src/assets/logo-ripple-1.clean.svg` (simplified path variant)

Notes:
- SVG is true vector (`<path>` only), no embedded raster `<image>`.
- Background is transparent.
- Icon color is controlled with `currentColor`.

Usage (inline React component):
```tsx
import { RippleLogo } from '../components/RippleLogo'

<RippleLogo style={{ color: 'var(--color-accent-contrast)', width: 24, height: 24 }} />
```

Checked icon rendering sizes:
- `16px`
- `24px`
- `32px`
- `48px`
