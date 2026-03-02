import type { SVGProps } from 'react'
import styled, { css, keyframes } from 'styled-components'

export type RippleLogoAnimate = 'idle' | 'recording' | 'stopped'

interface RippleLogoProps extends SVGProps<SVGSVGElement> {
  animate?: RippleLogoAnimate
}

const arcWave = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  18% {
    opacity: 0.88;
  }
  62% {
    transform: scale(var(--wave-scale-mid));
    opacity: 0.34;
  }
  100% {
    transform: scale(var(--wave-scale-end));
    opacity: 0;
  }
`

const StyledLogo = styled.svg<{ $animate: RippleLogoAnimate }>`
  overflow: visible;

  [data-part^='arc'] {
    transform-box: view-box;
    transform-origin: 50% 50%;
    will-change: transform, opacity;
    opacity: ${({ $animate }) => ($animate === 'recording' ? 0 : 0.98)};
    transition: opacity 220ms ease;
  }

  [data-part='arc-1'] {
    --wave-scale-mid: 1.95;
    --wave-scale-end: 2.25;
  }

  [data-part='arc-2'] {
    --wave-scale-mid: 2.05;
    --wave-scale-end: 2.35;
  }

  [data-part='arc-3'] {
    --wave-scale-mid: 1.9;
    --wave-scale-end: 2.18;
  }

  [data-part='arc-4'] {
    --wave-scale-mid: 2.1;
    --wave-scale-end: 2.42;
  }

  ${({ $animate }) =>
    $animate === 'recording' &&
    css`
      [data-part='arc-1'] {
        animation: ${arcWave} 4.1s ease-in-out infinite;
      }

      [data-part='arc-2'] {
        animation: ${arcWave} 4.1s ease-in-out infinite 340ms;
      }

      [data-part='arc-3'] {
        animation: ${arcWave} 4.1s ease-in-out infinite 680ms;
      }

      [data-part='arc-4'] {
        animation: ${arcWave} 4.1s ease-in-out infinite 1020ms;
      }
    `}

  [data-part='dot'] {
    transform-box: fill-box;
    transform-origin: center;
    transform: none;
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-part^='arc'] {
      animation: none !important;
      transform: none !important;
    }
  }
`

export function RippleLogo({ animate = 'idle', ...props }: RippleLogoProps) {
  return (
    <StyledLogo
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 354 378"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden
      $animate={animate}
      {...props}
    >
      <g fill="currentColor" stroke="none">
        <g data-part="arc-1">
          <path d="M 172.5 0 L 176.5 0 L 183 4.5 L 185 7.5 L 185 15.5 L 171.5 30 L 145.5 53 L 116 82.5 L 106 94.5 L 90 119.5 L 84 136.5 L 80 157.5 L 80 175.5 L 83 190.5 L 89 206.5 L 100 222.5 L 108.5 231 L 119.5 239 L 140.5 248 L 161.5 251 L 167 256.5 L 168 262.5 L 166 267.5 L 163.5 270 L 161.5 271 L 146.5 271 L 125.5 266 L 106.5 257 L 94.5 249 L 77 230.5 L 67 214.5 L 60 196.5 L 57 181.5 L 56 157.5 L 60 132.5 L 65 117.5 L 73 100.5 L 89 76.5 L 103 60.5 L 137.5 27 L 166.5 2 L 172.5 0 Z" />
        </g>
        <g data-part="arc-2">
          <path d="M 217.5 41 L 238.5 44 L 264.5 53 L 288.5 66 L 311.5 84 L 329 102.5 L 345 126.5 L 354 149.5 L 353 158.5 L 349.5 162 L 340.5 162 L 338 159.5 L 335 154.5 L 335 151.5 L 331 141.5 L 319 121.5 L 300.5 101 L 284.5 88 L 272.5 80 L 252.5 70 L 231.5 63 L 217.5 61 L 213.5 59 L 211 56.5 L 210 48.5 L 213 43.5 L 217.5 41 Z" />
        </g>
        <g data-part="arc-3">
          <path d="M 192.5 100 L 211.5 101 L 236.5 108 L 261.5 122 L 276 134.5 L 291 153.5 L 300 171.5 L 305 192.5 L 305 217.5 L 301 237.5 L 299 240.5 L 297 248.5 L 284 272.5 L 270 291.5 L 239.5 324 L 202.5 358 L 180.5 377 L 171.5 378 L 165 371.5 L 165 362.5 L 167 359.5 L 210.5 322 L 250 281.5 L 268 256.5 L 268 254.5 L 277 237.5 L 282 217.5 L 282 194.5 L 279 181.5 L 273 168.5 L 264 155.5 L 248.5 141 L 230.5 130 L 214.5 124 L 189.5 120 L 186 115.5 L 185 109.5 L 186 105.5 L 192.5 100 Z" />
        </g>
        <path
          data-part="dot"
          d="M 170.5 156 L 183.5 156 L 192.5 159 L 203 167.5 L 209 177.5 L 210 193.5 L 206 205.5 L 195.5 216 L 183.5 221 L 171.5 221 L 158.5 216 L 150 207.5 L 145 195.5 L 145 179.5 L 149 170.5 L 158.5 161 L 170.5 156 Z"
        />
        <g data-part="arc-4">
          <path d="M 6.5 201 L 13.5 202 L 17 205.5 L 21 221.5 L 33 246.5 L 44 261.5 L 61.5 279 L 63.5 279 L 66.5 283 L 91.5 298 L 107.5 304 L 124.5 308 L 130.5 308 L 135.5 310 L 138 313.5 L 137 324.5 L 131.5 328 L 122.5 328 L 91.5 320 L 79.5 315 L 67.5 308 L 45.5 291 L 32 277.5 L 21 263.5 L 13 250.5 L 7 237.5 L 0 214.5 L 0 206.5 L 2.5 203 L 6.5 201 Z" />
        </g>
      </g>
    </StyledLogo>
  )
}
