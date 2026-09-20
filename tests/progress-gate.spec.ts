import { describe, expect, it } from 'vitest'
import { ProgressAnnouncementGate } from '../src/host/progress-gate.ts'
import { REALTIME_VOICE_PROGRESS_REPORTING } from '../src/models.ts'

const keyOnly = {
  mode: REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
  minIntervalMs: 45_000,
  quietTaskMs: 20_000,
} as const

describe('DSH progress announcement gate', () => {
  it('announces every stage update when the user asks for full reporting', () => {
    const gate = new ProgressAnnouncementGate({
      mode: REALTIME_VOICE_PROGRESS_REPORTING.all,
      minIntervalMs: 45_000,
      quietTaskMs: 20_000,
    })
    gate.markTurnStarted(0)

    expect(gate.decide(1_000)).toBe(true)
    expect(gate.decide(1_500)).toBe(true)
    expect(gate.decide(2_000)).toBe(true)
  })

  it('stays silent for stage updates when reporting is disabled', () => {
    const gate = new ProgressAnnouncementGate({
      mode: REALTIME_VOICE_PROGRESS_REPORTING.silent,
      minIntervalMs: 45_000,
      quietTaskMs: 20_000,
    })
    gate.markTurnStarted(0)

    expect(gate.decide(60_000)).toBe(false)
    expect(gate.decide(600_000)).toBe(false)
  })

  it('keeps a short task quiet and reports only its terminal result', () => {
    const gate = new ProgressAnnouncementGate(keyOnly)
    gate.markTurnStarted(0)

    expect(gate.decide(3_000)).toBe(false)
    expect(gate.decide(11_000)).toBe(false)
    expect(gate.decide(19_999)).toBe(false)
  })

  it('throttles key-only updates to one announcement per interval', () => {
    const gate = new ProgressAnnouncementGate(keyOnly)
    gate.markTurnStarted(0)

    expect(gate.decide(30_000)).toBe(true)
    expect(gate.decide(31_000)).toBe(false)
    expect(gate.decide(60_000)).toBe(false)
    expect(gate.decide(74_999)).toBe(false)
    // The next announcement carries the newest text, not a replayed backlog.
    expect(gate.decide(75_000)).toBe(true)
  })

  it('restores a full interval budget for each new DSH turn', () => {
    const gate = new ProgressAnnouncementGate(keyOnly)
    gate.markTurnStarted(0)
    expect(gate.decide(30_000)).toBe(true)
    gate.markTurnEnded()

    gate.markTurnStarted(40_000)
    expect(gate.decide(55_000)).toBe(false)
    expect(gate.decide(61_000)).toBe(true)
  })

  it('starts the quiet window at the first update when a turn start was missed', () => {
    const gate = new ProgressAnnouncementGate(keyOnly)

    expect(gate.decide(5_000)).toBe(false)
    expect(gate.decide(24_000)).toBe(false)
    expect(gate.decide(26_000)).toBe(true)
  })

  it('never announces without an interval budget of zero', () => {
    const gate = new ProgressAnnouncementGate({
      mode: REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
      minIntervalMs: 0,
      quietTaskMs: 0,
    })
    gate.markTurnStarted(0)

    expect(gate.decide(0)).toBe(true)
    expect(gate.decide(0)).toBe(true)
  })
})
