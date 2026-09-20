export interface VoiceDiagnosticEvent {
  callId: string
  at: number
  kind: 'accept' | 'ready' | 'inject' | 'response-start' | 'response-end' | 'cancel' | 'drained' | 'error'
  source?: 'local-vad' | 'server-vad' | 'user' | 'transport'
  reportId?: string
  responseId?: string
  requestId?: string
}

/** Explicit fields prevent accidental logging of provider payloads or secrets. */
export function createVoiceDiagnostics(write: (line: string) => void): (event: VoiceDiagnosticEvent) => void {
  return event => {
    const { callId, at, kind, source, reportId, responseId, requestId } = event
    write(JSON.stringify({ callId, at, kind, source, reportId, responseId, requestId }))
  }
}
