import { afterEach, expect, it, vi } from 'vitest'
import { VoiceCallController } from '../src/client/controller.ts'

afterEach(() => vi.unstubAllGlobals())

it('retains reports and reports a failed dismissal', async () => {
  vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
    if (options?.method === 'DELETE') return { ok: false, status: 500 }
    return { ok: true, json: async () => url.endsWith('/status')
      ? { protocol: 'dsh.voice.v1', active: false }
      : { protocol: 'dsh.voice.v1', entries: [{ id: 'r1', delivered: false }] } }
  })
  const controller = new VoiceCallController()
  controller.startPresence()
  await vi.waitFor(() => expect(controller.getSnapshot().inbox).toHaveLength(1))
  await controller.dismissInbox(['r1'])
  expect(controller.getSnapshot().inbox.map(entry => entry.id)).toEqual(['r1'])
  expect(controller.getSnapshot().error).toBeTruthy()
  await controller.dispose()
})
