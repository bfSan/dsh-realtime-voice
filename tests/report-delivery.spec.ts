import { expect, it } from 'vitest'
import { ReportDelivery } from '../src/host/report-delivery.ts'

it('requires response completion and playback drain in either order', () => {
  for (const reverse of [false, true]) {
    const delivery = new ReportDelivery()
    delivery.begin('r1', 'a1')
    delivery.attachResponse('a1', 'response1')
    if (reverse) delivery.playbackDrained('a1')
    else delivery.responseEnded('a1')
    expect(delivery.state('r1')).toBe('playing')
    if (reverse) delivery.responseEnded('a1')
    else delivery.playbackDrained('a1')
    expect(delivery.state('r1')).toBe('completed')
  }
})

it('lets an audible drain settle a report a racing cancel already interrupted', () => {
  const delivery = new ReportDelivery()
  delivery.begin('r1', 'a1')
  delivery.attachResponse('a1', 'response1')
  delivery.responseEnded('a1')
  delivery.interrupt('a1')
  delivery.playbackDrained('a1')
  // Every frame reached the speaker, so the user heard this report. Treating
  // it as unheard left it in the call-back list forever and let it ring twice.
  expect(delivery.state('r1')).toBe('completed')
})

it('keeps an attempt interrupted when the audio never drained', () => {
  const delivery = new ReportDelivery()
  delivery.begin('r1', 'a1')
  delivery.attachResponse('a1', 'response1')
  // A real interruption: the report stopped mid-way, so no drain follows.
  delivery.interrupt('a1')
  delivery.responseEnded('a1')
  expect(delivery.state('r1')).toBe('interrupted')
})

it('does not let a superseded attempt complete the current one', () => {
  const delivery = new ReportDelivery()
  delivery.begin('r1', 'a1')
  delivery.attachResponse('a1', 'response1')
  delivery.responseEnded('a1')
  delivery.begin('r1', 'a2')
  delivery.responseEnded('a1')
  expect(delivery.state('r1')).toBe('queued')
})
