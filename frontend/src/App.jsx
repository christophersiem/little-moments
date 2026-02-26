import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatDateTime(isoString) {
  if (!isoString) {
    return ''
  }
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function App() {
  const [pathname, setPathname] = useState(() => {
    if (window.location.pathname === '/') {
      return '/record'
    }
    return window.location.pathname
  })

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/record')
    }
    const onPopState = () => setPathname(window.location.pathname || '/record')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (nextPath) => {
    if (nextPath === window.location.pathname) {
      return
    }
    window.history.pushState({}, '', nextPath)
    setPathname(nextPath)
  }

  const detailMatch = pathname.match(/^\/memories\/([0-9a-fA-F-]+)$/)

  let content
  if (pathname === '/record') {
    content = <RecordScreen navigate={navigate} />
  } else if (pathname === '/memories') {
    content = <MemoriesListScreen navigate={navigate} />
  } else if (detailMatch) {
    content = <MemoryDetailScreen memoryId={detailMatch[1]} navigate={navigate} />
  } else {
    content = (
      <section className="panel">
        <h2>Route not found</h2>
        <p>The path does not match the reduced MVP routes.</p>
        <button className="button button-primary" onClick={() => navigate('/record')}>
          Back to Record
        </button>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">Little Moments</div>
        <div className="topbar-nav">
          <button
            className={`button button-nav ${pathname.startsWith('/record') ? 'button-nav-active' : ''}`}
            onClick={() => navigate('/record')}
          >
            Record
          </button>
          <button
            className={`button button-nav ${pathname.startsWith('/memories') ? 'button-nav-active' : ''}`}
            onClick={() => navigate('/memories')}
          >
            Memories
          </button>
        </div>
      </header>
      <div className="content">{content}</div>
    </div>
  )
}

function RecordScreen({ navigate }) {
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const latestRecordingRef = useRef(null)
  const intervalRef = useRef(null)

  const [phase, setPhase] = useState('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [savedResult, setSavedResult] = useState(null)

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const stopTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopTimer()
      cleanupStream()
    }
  }, [])

  const uploadRecording = async (audioBlob, recordedAtIso) => {
    setPhase('saving')
    setErrorMessage('')

    const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
    const formData = new FormData()
    formData.append('audio', audioBlob, `moment-${Date.now()}.${extension}`)
    formData.append('recordedAt', recordedAtIso)

    try {
      const response = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        body: formData,
      })
      const payload = await parseJsonSafe(response)
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || payload?.title || `Upload failed (${response.status})`)
      }
      if (!payload) {
        throw new Error('Upload completed without a response body.')
      }
      if (payload.status === 'FAILED') {
        setErrorMessage(payload.errorMessage || 'Transcription failed.')
        setPhase('error')
        return
      }
      setSavedResult(payload)
      setPhase('saved')
    } catch (error) {
      setErrorMessage(error?.message || 'Could not save your moment.')
      setPhase('error')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      return
    }
    stopTimer()
    setPhase('saving')
    recorder.stop()
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser.')
      setPhase('error')
      return
    }

    setErrorMessage('')
    setSavedResult(null)
    setElapsedSeconds(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        cleanupStream()
        const recordingEndedAt = new Date().toISOString()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        latestRecordingRef.current = { blob, recordedAt: recordingEndedAt }
        uploadRecording(blob, recordingEndedAt)
      }

      recorder.start(300)
      setPhase('recording')
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => current + 1)
      }, 1000)
    } catch (error) {
      cleanupStream()
      setErrorMessage(error?.message || 'Microphone access was denied.')
      setPhase('error')
    }
  }

  const retryUpload = () => {
    if (!latestRecordingRef.current) {
      return
    }
    uploadRecording(latestRecordingRef.current.blob, latestRecordingRef.current.recordedAt)
  }

  const transcriptPreview = useMemo(() => {
    return savedResult?.transcriptPreview || 'Your transcript was saved.'
  }, [savedResult])

  if (phase === 'saving') {
    return (
      <section className="panel panel-center">
        <h1>Saving your moment...</h1>
        <p>We are transcribing and storing your entry.</p>
      </section>
    )
  }

  if (phase === 'saved') {
    return (
      <section className="panel">
        <h1>Saved</h1>
        <p className="preview">{transcriptPreview}</p>
        <div className="row">
          <button className="button button-primary" onClick={() => navigate(`/memories/${savedResult.id}`)}>
            Open Entry
          </button>
          <button className="button" onClick={() => navigate('/memories')}>
            View List
          </button>
          <button className="button" onClick={() => setPhase('idle')}>
            Record Another
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'error') {
    return (
      <section className="panel">
        <h1>Could not save moment</h1>
        <p className="error">{errorMessage}</p>
        <div className="row">
          <button className="button button-primary" onClick={retryUpload} disabled={!latestRecordingRef.current}>
            Retry Upload
          </button>
          <button className="button" onClick={() => setPhase('idle')}>
            Start Over
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'recording') {
    return (
      <section className="panel panel-center">
        <h1>Recording</h1>
        <div className="timer">{formatDuration(elapsedSeconds)}</div>
        <button className="button button-danger" onClick={stopRecording}>
          Stop
        </button>
      </section>
    )
  }

  return (
    <section className="panel panel-center">
      <h1>Record a moment</h1>
      <p>Capture a short memory and save it as a transcript.</p>
      <button className="button button-primary button-large" onClick={startRecording}>
        Start Recording
      </button>
    </section>
  )
}

function MemoriesListScreen({ navigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE}/memories?page=0&size=50`)
        const payload = await parseJsonSafe(response)
        if (!response.ok) {
          throw new Error(payload?.detail || payload?.message || payload?.title || `Request failed (${response.status})`)
        }
        if (isMounted) {
          setItems(payload?.items || [])
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load memories.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <section className="panel panel-center">
        <h1>Memories</h1>
        <p>Loading...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h1>Memories</h1>
        <p className="error">{error}</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h1>Memories</h1>
      {items.length === 0 ? (
        <p>No memories yet. Record your first one.</p>
      ) : (
        <div className="list">
          {items.map((item) => (
            <button
              key={item.id}
              className="memory-card"
              onClick={() => navigate(`/memories/${item.id}`)}
            >
              <div className="memory-date">{formatDateTime(item.recordedAt || item.createdAt)}</div>
              <div className="memory-snippet">
                {item.transcriptSnippet || (item.status === 'FAILED' ? 'Failed to transcribe.' : 'Processing...')}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function MemoryDetailScreen({ memoryId, navigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memory, setMemory] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`)
        const payload = await parseJsonSafe(response)
        if (!response.ok) {
          throw new Error(payload?.detail || payload?.message || payload?.title || `Request failed (${response.status})`)
        }
        if (!payload) {
          throw new Error('Memory details were empty.')
        }
        if (isMounted) {
          setMemory(payload)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load memory.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [memoryId])

  if (loading) {
    return (
      <section className="panel panel-center">
        <h1>Memory</h1>
        <p>Loading...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h1>Memory</h1>
        <p className="error">{error}</p>
        <button className="button" onClick={() => navigate('/memories')}>
          Back to List
        </button>
      </section>
    )
  }

  return (
    <section className="panel">
      <h1>Memory</h1>
      <p className="memory-date">{formatDateTime(memory.recordedAt || memory.createdAt)}</p>
      <div className="detail-status">Status: {memory.status}</div>
      {memory.status === 'FAILED' ? (
        <p className="error">{memory.errorMessage || 'Transcription failed.'}</p>
      ) : (
        <p className="detail-transcript">{memory.transcript || 'Transcription still processing.'}</p>
      )}
      <button className="button" onClick={() => navigate('/memories')}>
        Back to List
      </button>
    </section>
  )
}

export default App
