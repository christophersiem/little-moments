import styled from 'styled-components'

interface SettingsPageProps {
  navigate: (nextPath: string) => void
}

interface SettingsItemProps {
  $interactive: boolean
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
`

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space.x4};
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const Item = styled.button<SettingsItemProps>`
  width: 100%;
  min-height: 76px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x3};
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
  text-align: left;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const ItemIcon = styled.span`
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
`

const ItemText = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};
`

const ItemTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.bodySize};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`

const ItemSubtitle = styled.span`
  font-size: ${({ theme }) => theme.typography.bodySize};
  color: ${({ theme }) => theme.colors.textMuted};
`

const Chevron = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.25rem;
  line-height: 1;
`

export function SettingsPage({ navigate }: SettingsPageProps) {
  return (
    <Section>
      <Heading>Settings</Heading>
      <List>
        <Item $interactive onClick={() => navigate('/settings/account')}>
          <ItemIcon>◌</ItemIcon>
          <ItemText>
            <ItemTitle>Account</ItemTitle>
            <ItemSubtitle>Name, email, password</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item $interactive={false} type="button" aria-disabled>
          <ItemIcon>▭</ItemIcon>
          <ItemText>
            <ItemTitle>Subscription</ItemTitle>
            <ItemSubtitle>Premium summaries</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item $interactive={false} type="button" aria-disabled>
          <ItemIcon>◍</ItemIcon>
          <ItemText>
            <ItemTitle>Privacy</ItemTitle>
            <ItemSubtitle>Data & permissions</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>
      </List>
    </Section>
  )
}
