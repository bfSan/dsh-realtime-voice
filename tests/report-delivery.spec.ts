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

it('never lets an interrupted or superseded attempt mark a report complete', () => {
  const delivery = new ReportDelivery()
  delivery.begin('r1', 'a1')
  delivery.attachResponse('a1', 'response1')
  delivery.responseEnded('a1')
  delivery.interrupt('a1')
  delivery.playbackDrained('a1')
  expect(delivery.state('r1')).toBe('interrupted')
  delivery.begin('r1', 'a2')
  delivery.responseEnded('a1')
  expect(delivery.state('r1')).toBe('queued')
})
