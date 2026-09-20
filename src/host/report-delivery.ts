type DeliveryState = 'queued' | 'playing' | 'interrupted' | 'completed' | 'failed'
interface Attempt {
  reportId: string
  state: DeliveryState
  ended: boolean
  drained: boolean
}

export class ReportDelivery {
  private readonly attempts = new Map<string, Attempt>()
  private readonly current = new Map<string, string>()

  begin(reportId: string, attemptId: string): void {
    const previous = this.current.get(reportId)
    if (previous !== undefined) this.attempts.delete(previous)
    this.current.set(reportId, attemptId)
    this.attempts.set(attemptId, { reportId, state: 'queued', ended: false, drained: false })
  }

  attachResponse(attemptId: string, _responseId: string): void {
    const attempt = this.attempts.get(attemptId)
    if (attempt?.state === 'queued') attempt.state = 'playing'
  }

  responseEnded(attemptId: string): void { this.advance(attemptId, 'ended') }
  playbackDrained(attemptId: string): void { this.advance(attemptId, 'drained') }
  interrupt(attemptId: string): void {
    const attempt = this.attempts.get(attemptId)
    if (attempt !== undefined && attempt.state !== 'completed') attempt.state = 'interrupted'
  }

  state(reportId: string): DeliveryState | undefined {
    return this.attempts.get(this.current.get(reportId) ?? '')?.state
  }

  private advance(id: string, flag: 'ended' | 'drained'): void {
    const attempt = this.attempts.get(id)
    if (attempt?.state !== 'playing') return
    attempt[flag] = true
    if (attempt.ended && attempt.drained) attempt.state = 'completed'
  }
}
