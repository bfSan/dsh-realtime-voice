/**
 * Whether one spoken report actually reached the user's ears.
 *
 * Two independent facts decide it, and neither alone is enough:
 *
 * - the provider finished generating the response;
 * - the browser played every frame of it to the end.
 *
 * The two arrive in either order, and a barge-in can land between them. A
 * drain is the stronger signal of the two: it is measured after the audio
 * left the speaker, so an attempt that drained was heard almost in full. That
 * is why a drain settles a report even when a cancel raced it - treating such
 * an attempt as unheard left the task in the call-back list forever and let
 * the same report ring again.
 *
 * Only a genuinely unheard attempt stays interrupted, and that is expressed by
 * its drain never arriving.
 */

type DeliveryState = 'queued' | 'playing' | 'interrupted' | 'completed' | 'failed'

interface Attempt {
  reportId: string
  state: DeliveryState
  ended: boolean
  drained: boolean
}

export class ReportDelivery {
  private readonly attempts = new Map<string, Attempt>()
  /** The attempt currently responsible for one report id. */
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

  /**
   * The browser finished playing this attempt's audio.
   *
   * This is the strongest evidence available that the user heard the report,
   * so it also settles an attempt a cancel already marked interrupted: the
   * audio was demonstrably delivered before that cancel mattered.
   */
  playbackDrained(attemptId: string): void {
    const attempt = this.attempts.get(attemptId)
    if (attempt === undefined) return
    attempt.drained = true
    if (attempt.state === 'interrupted') {
      attempt.state = 'completed'
      return
    }
    if (attempt.ended && attempt.state === 'playing') attempt.state = 'completed'
  }

  interrupt(attemptId: string): void {
    const attempt = this.attempts.get(attemptId)
    // A drained attempt was heard, so a late cancel cannot un-hear it.
    if (attempt === undefined || attempt.state === 'completed' || attempt.drained) return
    attempt.state = 'interrupted'
  }

  state(reportId: string): DeliveryState | undefined {
    return this.attempts.get(this.current.get(reportId) ?? '')?.state
  }

  private advance(id: string, flag: 'ended' | 'drained'): void {
    const attempt = this.attempts.get(id)
    if (attempt === undefined || attempt.state === 'interrupted' || attempt.state === 'completed') return
    attempt[flag] = true
    if (attempt.ended && attempt.drained) attempt.state = 'completed'
  }
}
