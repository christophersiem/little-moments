import styled from 'styled-components'

const Title = styled.h2`
  margin: 0;
  font-size: 1.95rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.25;
`

const MetaText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

export function MemoryDetailSkeleton() {
  return (
    <>
      <Title>Memory</Title>
      <MetaText>Loading memory...</MetaText>
    </>
  )
}
