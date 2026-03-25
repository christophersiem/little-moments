import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { BottomSheet } from '../../../components/BottomSheet'
import { Button } from '../../../components/Button'
import { formatMonthDay } from '../../../lib/utils'
import { askMemories } from '../api'
import type { MemoryChatResponse } from '../types'

interface MemoryChatSheetProps {
  open: boolean
  familyId: string | null
  onClose: () => void
  onOpenMemory: (memoryId: string) => void
}

const EXAMPLE_QUESTIONS = [
  'When were his first steps?',
  'What were the highlights from last month?',
  'When did we first visit the zoo?',
  'Show memories about sleep.',
] as const

const Content = styled.div`
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x4} ${theme.space.x4}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Intro = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const ExampleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const ExampleButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  text-align: left;
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const ResultCard = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surfaceStrong};
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const ResultLabel = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
`

const ResultAnswer = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const ResultNotes = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const SourceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const SourceButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  padding: ${({ theme }) => `${theme.space.x2} ${theme.space.x3}`};
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x1};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accentStrong};
    outline-offset: 2px;
  }
`

const SourceMeta = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
`

const SourceTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`

const SourceSnippet = styled.span`
  font-size: ${({ theme }) => theme.typography.secondarySize};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.relaxedLineHeight};
`

const Footer = styled.form`
  padding: ${({ theme }) => theme.space.x3};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x2};
`

const Input = styled.input`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.minTouchTarget};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0 ${({ theme }) => theme.space.x3};
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.typography.secondarySize};
`

const StatusHint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem;
`

export function MemoryChatSheet({ open, familyId, onClose, onOpenMemory }: MemoryChatSheetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MemoryChatResponse | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setQuestion('')
    setLoading(false)
    setError('')
    setResult(null)
  }, [open])

  const statusHint = useMemo(() => {
    if (!result) {
      return ''
    }
    if (result.status === 'unsafe') {
      return 'This assistant only supports memory-related questions.'
    }
    if (result.status === 'out_of_scope') {
      return 'Try asking about your saved moments, milestones, or highlights.'
    }
    if (result.status === 'insufficient_evidence') {
      return "I couldn't find a clear match yet. Try asking more broadly or with a different timeframe."
    }
    if (result.confidence === 'low') {
      return 'Confidence is low, so treat this as a best effort summary.'
    }
    return ''
  }, [result])

  const submitQuestion = async (nextQuestion: string) => {
    const normalized = nextQuestion.trim()
    if (!normalized || loading) {
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await askMemories(normalized, familyId)
      setResult(response)
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Could not ask memories right now.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      title="Ask your memories"
      onClose={onClose}
      initialFocusRef={inputRef}
      footer={
        <Footer
          onSubmit={(event) => {
            event.preventDefault()
            void submitQuestion(question)
          }}
        >
          <Input
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your moments..."
            aria-label="Ask your memories"
            maxLength={600}
          />
          <Button type="submit" variant="primary" disabled={loading || question.trim().length === 0}>
            {loading ? 'Thinking…' : 'Ask memories'}
          </Button>
        </Footer>
      }
    >
      <Content>
        <Intro>Answers are grounded in your saved memories only.</Intro>

        {!result && (
          <ExampleList>
            {EXAMPLE_QUESTIONS.map((example) => (
              <ExampleButton
                type="button"
                key={example}
                onClick={() => {
                  setQuestion(example)
                  void submitQuestion(example)
                }}
              >
                {example}
              </ExampleButton>
            ))}
          </ExampleList>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        {result && (
          <>
            <ResultCard>
              <ResultLabel>Answer</ResultLabel>
              <ResultAnswer>{result.answer}</ResultAnswer>
              {result.notes ? <ResultNotes>{result.notes}</ResultNotes> : null}
              {statusHint ? <StatusHint>{statusHint}</StatusHint> : null}
            </ResultCard>

            {result.sources.length > 0 ? (
              <SourceList>
                <ResultLabel>Sources</ResultLabel>
                {result.sources.map((source) => (
                  <SourceButton
                    type="button"
                    key={source.id}
                    onClick={() => {
                      onOpenMemory(source.id)
                      onClose()
                    }}
                  >
                    <SourceMeta>{formatMonthDay(source.recordedAt)}</SourceMeta>
                    <SourceTitle>{source.title}</SourceTitle>
                    {source.snippet ? <SourceSnippet>{source.snippet}</SourceSnippet> : null}
                  </SourceButton>
                ))}
              </SourceList>
            ) : null}
          </>
        )}
      </Content>
    </BottomSheet>
  )
}
