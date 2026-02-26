import 'styled-components'

declare module 'styled-components' {
  export interface DefaultTheme {
    space: {
      x1: string
      x2: string
      x3: string
      x4: string
      x5: string
      x6: string
      x7: string
    }
    radii: {
      sm: string
      md: string
      lg: string
      xl: string
      pill: string
    }
    typography: {
      bodyFamily: string
      headingFamily: string
      h1Size: string
      h2Size: string
      bodySize: string
      secondarySize: string
      timerSize: string
      bodyLineHeight: string
      relaxedLineHeight: string
    }
    colors: {
      background: string
      backgroundAlt: string
      backgroundGlowStart: string
      backgroundGlowEnd: string
      surface: string
      surfaceStrong: string
      border: string
      text: string
      textMuted: string
      accent: string
      accentStrong: string
      danger: string
      onAccent: string
      overlay: string
    }
    shadows: {
      card: string
      sheet: string
    }
    layout: {
      maxWidth: string
      minTouchTarget: string
      primaryButtonHeight: string
      centerCardMinHeight: string
    }
  }
}
