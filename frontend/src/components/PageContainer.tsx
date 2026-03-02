import type { HTMLAttributes } from 'react'
import styled from 'styled-components'

const Container = styled.div`
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  padding-inline: ${({ theme }) => `clamp(${theme.space.x4}, 5vw, ${theme.space.x5})`};
`

export type PageContainerProps = HTMLAttributes<HTMLElement>

export function PageContainer(props: PageContainerProps) {
  return <Container {...props} />
}
