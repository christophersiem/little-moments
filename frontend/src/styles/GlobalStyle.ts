import { createGlobalStyle } from 'styled-components'
import './tokens.css'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
    min-height: 100%;
  }

  body {
    margin: 0;
    min-width: 320px;
    font-family: ${({ theme }) => theme.typography.bodyFamily};
    font-size: ${({ theme }) => theme.typography.bodySize};
    color: ${({ theme }) => theme.colors.text};
    background:
      radial-gradient(circle at 0% 0%, ${({ theme }) => theme.colors.backgroundGlowStart} 0%, transparent 45%),
      radial-gradient(circle at 100% 100%, ${({ theme }) => theme.colors.backgroundGlowEnd} 0%, transparent 40%),
      linear-gradient(160deg, ${({ theme }) => theme.colors.background}, ${({ theme }) => theme.colors.backgroundAlt});
    background-attachment: fixed;
  }

  h1,
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.typography.headingFamily};
    font-weight: 600;
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.h1Size};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.h2Size};
  }

  p {
    margin: 0;
    line-height: ${({ theme }) => theme.typography.bodyLineHeight};
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  @keyframes rise-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`
