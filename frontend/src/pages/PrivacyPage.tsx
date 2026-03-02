import styled from 'styled-components'
import { Button } from '../components/Button'

interface PrivacyPageProps {
  navigate: (nextPath: string) => void
}

const Section = styled.section`
  width: 100%;
  padding-top: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x4};
`

const Heading = styled.h2`
  margin: 0;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
`

const Intro = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const Block = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const BlockTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.headingFamily};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.25rem;
`

const BulletList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
  color: ${({ theme }) => theme.colors.text};
`

const BulletText = styled.span`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const LinkText = styled.a`
  color: ${({ theme }) => theme.colors.accentStrong};
`

export function PrivacyPage({ navigate }: PrivacyPageProps) {
  return (
    <Section>
      <Heading>Privacy & Data Protection</Heading>
      <Intro>
        Your family memories are personal. We built Little Moments to keep them private, secure, and fully under your
        control.
      </Intro>

      <Block>
        <BlockTitle>What We Store</BlockTitle>
        <BulletList>
          <li>
            <BulletText>
              <strong>Audio recordings</strong>: Your original voice notes, so you can revisit the exact moment and
              context.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Transcripts</strong>: Text versions of your recordings, so memories are searchable and easy to
              read later.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Structured memories</strong>: AI-generated title, summary, date context, and tags, so your
              timeline stays clear and organized.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Embeddings</strong>: Numeric representations of your text, used only to improve relevance when
              finding related memories.
            </BulletText>
          </li>
        </BulletList>
      </Block>

      <Block>
        <BlockTitle>How We Protect Your Data</BlockTitle>
        <BulletList>
          <li>
            <BulletText>
              <strong>Encryption in transit</strong> (Placeholder: confirm implementation): Data is protected while
              moving between your device and our servers (for example, TLS/HTTPS).
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Encryption at rest</strong> (Placeholder: confirm implementation): Stored data is encrypted on
              secure infrastructure.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Secure cloud infrastructure</strong> (Placeholder: confirm provider details): We use managed
              cloud security controls and monitoring.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>No selling of data</strong>: We do not sell your personal data.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>No advertising use</strong>: Your memories are not used to build ad profiles or target ads.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Limited internal access</strong>: Access is restricted to authorized team members who need it to
              operate and support the service.
            </BulletText>
          </li>
        </BulletList>
      </Block>

      <Block>
        <BlockTitle>AI & Data Usage</BlockTitle>
        <BulletList>
          <li>
            <BulletText>
              AI processes your recordings and transcripts to create summaries, titles, tags, and organization.
            </BulletText>
          </li>
          <li>
            <BulletText>AI output is based only on your own memory data and your in-app context.</BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Model training</strong> (Placeholder: confirm vendor contract setting): Your data is <strong>not</strong>{' '}
              used to train third-party foundation models.
            </BulletText>
          </li>
        </BulletList>
      </Block>

      <Block>
        <BlockTitle>Your Control</BlockTitle>
        <BulletList>
          <li>
            <BulletText>
              <strong>Delete a single memory</strong>: Remove one entry at any time from memory details.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Delete account</strong> (Placeholder: confirm flow timing): Request permanent account deletion,
              including associated memories.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Export your data</strong> (Placeholder: confirm format): Download your memories and transcripts
              in a portable format.
            </BulletText>
          </li>
          <li>
            <BulletText>
              <strong>Data retention</strong> (Placeholder: confirm retention window): We keep your data until you
              delete it; backup copies are removed within the defined retention period.
            </BulletText>
          </li>
        </BulletList>
      </Block>

      <Block>
        <BlockTitle>Transparency</BlockTitle>
        <BulletList>
          <li>
            <BulletText>
              Questions about privacy: <strong>privacy@littlemoments.app</strong> (Placeholder: replace with real
              contact email)
            </BulletText>
          </li>
          <li>
            <BulletText>
              Full legal policy:{' '}
              <LinkText href="https://littlemoments.app/privacy" target="_blank" rel="noreferrer">
                littlemoments.app/privacy
              </LinkText>{' '}
              (Placeholder: replace with final policy URL)
            </BulletText>
          </li>
        </BulletList>
      </Block>

      <Button onClick={() => navigate('/settings')}>Back to Settings</Button>
    </Section>
  )
}
