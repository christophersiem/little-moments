import { StatusBanner } from '../../../components/StatusBanner'
import type { ActiveUploadSession } from '../hooks/uploadSessionStore'

type ProcessingState = 'PROCESSING' | 'READY' | 'FAILED' | 'IDLE' | 'TIMEOUT'

interface ProcessingBannerProps {
  activeUpload: ActiveUploadSession | null
  processingStatus: ProcessingState
  processingError: string
  isProcessingPolling: boolean
  onRetry: () => void
}

const SHORT_TRANSCRIPT_ERROR = 'Recording too short. Please speak at least 8 words.'

function toReadableProcessingError(message: string | null | undefined): string {
  const raw = (message ?? '').trim()
  if (!raw) {
    return 'Please try again.'
  }
  const normalized = raw.toLowerCase()
  if (normalized.includes('transcription response was empty') || normalized.includes('too short')) {
    return SHORT_TRANSCRIPT_ERROR
  }
  return raw
}

export function ProcessingBanner({
  activeUpload,
  processingStatus,
  processingError,
  isProcessingPolling,
  onRetry,
}: ProcessingBannerProps) {
  if (!activeUpload) {
    return null
  }

  if (activeUpload.status === 'uploading') {
    return <StatusBanner title="Saving your moment… It will appear here shortly." detail="You can keep scrolling." />
  }

  if (activeUpload.status === 'processing') {
    if (processingStatus === 'TIMEOUT') {
      return (
        <StatusBanner
          title="Still saving your moment."
          detail="This is taking longer than usual. You can keep using the app."
          actionLabel="Refresh"
          onAction={onRetry}
        />
      )
    }

    return (
      <StatusBanner
        title="Saving your moment… It will appear here shortly."
        detail={isProcessingPolling ? 'You can keep scrolling.' : undefined}
      />
    )
  }

  if (activeUpload.status === 'failed') {
    return (
      <StatusBanner
        tone="error"
        title="We couldn’t finish saving this moment."
        detail={toReadableProcessingError(activeUpload.errorMessage || processingError)}
        actionLabel="Try again"
        onAction={onRetry}
      />
    )
  }

  return null
}
