import styled from 'styled-components'

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Heading = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.h1Size};
  color: ${({ theme }) => theme.colors.text};
`

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const Body = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

export function InsightsPage() {
  return (
    <Section>
      <Heading>Insights</Heading>
      <Card>
        <Body>Monthly and yearly insights will appear here once enough memories are available.</Body>
      </Card>
    </Section>
  )
}
