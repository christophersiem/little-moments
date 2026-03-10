import type { ReactNode } from 'react'
import styled from 'styled-components'
import { useAppearance, type AppearanceMode } from '../app/appearance'
import { APP_ROUTES } from '../app/routes'

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
  font-size: 1.5rem;
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

const StaticItem = styled.div`
  width: 100%;
  min-height: 76px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4}`};
`

const StaticItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.x3};
`

const AppearanceControls = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.x2};
`

const AppearanceOption = styled.button<{ $active: boolean }>`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.accentStrong : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.accent : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onAccent : theme.colors.text};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const AppearanceToggleIcon = styled.svg`
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
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

function AppearanceIcon() {
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17V3.5Z" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17" />
    </Glyph>
  )
}

function SystemThemeIcon() {
  return (
    <AppearanceToggleIcon viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="5.5" width="16" height="11" rx="2" />
      <path d="M9.2 19h5.6" />
      <path d="M12 16.5V19" />
    </AppearanceToggleIcon>
  )
}

function LightThemeIcon() {
  return (
    <AppearanceToggleIcon viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5M18.2 18.2l-1.5-1.5M7.3 7.3 5.8 5.8" />
    </AppearanceToggleIcon>
  )
}

function DarkThemeIcon() {
  return (
    <AppearanceToggleIcon viewBox="0 0 24 24" aria-hidden>
      <path d="M15.8 4.5a7.4 7.4 0 1 0 3.7 13.8 8 8 0 1 1-3.7-13.8Z" />
    </AppearanceToggleIcon>
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
  const { mode, setMode } = useAppearance()

  const appearanceOptions: Array<{ value: AppearanceMode; label: string; icon: ReactNode }> = [
    { value: 'system', label: 'System', icon: <SystemThemeIcon /> },
    { value: 'light', label: 'Light', icon: <LightThemeIcon /> },
    { value: 'dark', label: 'Dark', icon: <DarkThemeIcon /> },
  ]

  return (
    <Section>
      <Heading>Settings</Heading>
      <List>
        <StaticItem>
          <StaticItemRow>
            <ItemIcon>
              <AppearanceIcon />
            </ItemIcon>
            <ItemText>
              <ItemTitle>Appearance</ItemTitle>
              <ItemSubtitle>System, Light or Dark theme</ItemSubtitle>
            </ItemText>
          </StaticItemRow>
          <AppearanceControls role="radiogroup" aria-label="Appearance">
            {appearanceOptions.map((option) => (
              <AppearanceOption
                key={option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                aria-label={option.label}
                $active={mode === option.value}
                onClick={() => setMode(option.value)}
              >
                {option.icon}
              </AppearanceOption>
            ))}
          </AppearanceControls>
        </StaticItem>

        <Item type="button" $interactive onClick={() => navigate(APP_ROUTES.settingsAccount)}>
          <ItemIcon>
            <AccountIcon />
          </ItemIcon>
          <ItemText>
            <ItemTitle>Account</ItemTitle>
            <ItemSubtitle>Name, email, password</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item type="button" $interactive onClick={() => navigate(APP_ROUTES.settingsFamily)}>
          <ItemIcon>
            <FamilyIcon />
          </ItemIcon>
          <ItemText>
            <ItemTitle>Family</ItemTitle>
            <ItemSubtitle>Members & invite links</ItemSubtitle>
          </ItemText>
          <Chevron>›</Chevron>
        </Item>

        <Item type="button" $interactive onClick={() => navigate(APP_ROUTES.settingsPrivacy)}>
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
