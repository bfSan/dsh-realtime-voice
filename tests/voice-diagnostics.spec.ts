import { expect, it } from 'vitest'
import { createVoiceDiagnostics } from '../src/host/voice-diagnostics.ts'

it('serializes only correlation fields, never audio or credentials', () => {
  const lines: string[] = []
  const record = createVoiceDiagnostics(line => lines.push(line))
  record({ callId: 'c1', at: 1, kind: 'cancel', source: 'local-vad',
    audio: 'fixture-audio', apiKey: 'fixture-key', text: 'private words' } as never)
  expect(JSON.parse(lines[0]!)).toEqual({ callId: 'c1', at: 1, kind: 'cancel', source: 'local-vad' })
})
