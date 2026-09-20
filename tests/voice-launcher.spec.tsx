// @vitest-environment jsdom
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { VoiceLauncher } from '../src/client/VoiceLauncher.tsx'

it('can dial without an open conversation and does not create an execution task', async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ projects: [], agents: [], tasks: [] }) })))
  const container = document.createElement('div')
  const root = createRoot(container)
  const startSupervisor = vi.fn(async () => {})
  const createTask = vi.fn()
  await act(async () => root.render(<VoiceLauncher {...({
    useVoice: (selector: (value: unknown) => unknown) => selector({ phase: 'idle' }),
    startSupervisor, createTask, selectTask: vi.fn(),
  } as never)} />))
  await act(async () => (container.querySelector('button') as HTMLButtonElement).click())
  const dial = [...container.querySelectorAll('button')].find(button => button.textContent === '拨打电话')
  await act(async () => dial!.click())
  expect(startSupervisor).toHaveBeenCalledOnce()
  expect(createTask).not.toHaveBeenCalled()
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
