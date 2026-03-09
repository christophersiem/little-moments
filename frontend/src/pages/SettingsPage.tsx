import styled from 'styled-components'

interface SettingsPageProps {
  navigate: (nextPath: string) => void
  onLogout: () => void
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

const LogoutSection = styled.div`
  margin-top: ${({ theme }) => theme.space.x5};
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

const LogoutItem = styled(Item)`
  border-color: ${({ theme }) => theme.colors.danger};
  background: ${({ theme }) => theme.colors.surface};
`

const LogoutIcon = styled(ItemIcon)`
  border-color: ${({ theme }) => theme.colors.danger};
  color: ${({ theme }) => theme.colors.danger};
`

const LogoutTitle = styled(ItemTitle)`
  color: ${({ theme }) => theme.colors.danger};
`

const Glyph = styled.svg`
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
`

function AccountIcon() {
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.5 18.2C6.8 15.7 9.2 14.4 12 14.4s5.2 1.3 6.5 3.8" />
    </Glyph>
  )
}

function FamilyIcon() {
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="9" r="2.6" />
      <circle cx="15.5" cy="10.2" r="2.2" />
      <path d="M4.8 18.2C5.8 16.2 7.6 15.1 9.8 15.1c2.1 0 3.9 1.1 4.9 3.1" />
      <path d="M13.6 17.8c.7-1.3 1.9-2.1 3.3-2.1 1.1 0 2.1.4 2.9 1.2" />
    </Glyph>
  )
}

function PrivacyIcon() {
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3.8l6 2.2v4.6c0 4.1-2.4 7-6 8.7-3.6-1.7-6-4.6-6-8.7V6l6-2.2z" />
      <path d="M9.9 12.1l1.6 1.6 2.7-2.9" />
    </Glyph>
  )
}

function LogoutArrowIcon() {
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden>
      <path d="M10 6H7.5A2.5 2.5 0 0 0 5 8.5v7A2.5 2.5 0 0 0 7.5 18H10" />
      <path d="M13 15l3-3-3-3" />
      <path d="M8.8 12H16" />
    </Glyph>
  )
}

export function SettingsPage({ navigate, onLogout }: SettingsPageProps) {
  return (
    <Section>
      <Heading>Settings</Heading>
      <List>
        <Item type="button" $interactive onClick={() => navigate('/settings/account')}>
          <ItemIcon>
            <AccountIcon />
          </ItemIcon>
          <ItemText>
            <ItemTitle>Account</ItemTitle>
            <ItemSubtitle>Name, email, password</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item type="button" $interactive onClick={() => navigate('/settings/family')}>
          <ItemIcon>
            <FamilyIcon />
          </ItemIcon>
          <ItemText>
            <ItemTitle>Family</ItemTitle>
            <ItemSubtitle>Members & invite links</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item type="button" $interactive onClick={() => navigate('/settings/privacy')}>
          <ItemIcon>
            <PrivacyIcon />
          </ItemIcon>
          <ItemText>
            <ItemTitle>Privacy</ItemTitle>
            <ItemSubtitle>Privacy & data protection</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>
      </List>

      <LogoutSection>
        <LogoutItem type="button" $interactive onClick={onLogout}>
          <LogoutIcon>
            <LogoutArrowIcon />
          </LogoutIcon>
          <ItemText>
            <LogoutTitle>Logout</LogoutTitle>
            <ItemSubtitle>Sign out of your account</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </LogoutItem>
      </LogoutSection>
    </Section>
  )
}
