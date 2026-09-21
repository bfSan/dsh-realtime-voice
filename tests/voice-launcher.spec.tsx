// @vitest-environment jsdom
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { VoiceLauncher } from '../src/client/VoiceLauncher.tsx'

function renderLauncher(overrides: Record<string, unknown> = {}) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ projects: [], agents: [], tasks: [] }) })))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const calls = {
    startSupervisor: vi.fn(async () => {}),
    createTask: vi.fn(async () => {}),
    selectTask: vi.fn(async () => {}),
    createButler: vi.fn(async () => 'butler-1'),
    ...overrides,
  }
  return { container, root, calls }
}

it('dials on a single click without creating a butler or a task', async () => {
  const { container, root, calls } = renderLauncher()
  await act(async () => root.render(<VoiceLauncher {...({
    useVoice: (selector: (value: unknown) => unknown) => selector({ phase: 'idle' }),
    butlers: [],
    ...calls,
  } as never)} />))
  const ball = container.querySelector('[aria-label="打给语音总管"]') as HTMLButtonElement
  expect(ball).toBeTruthy()
  await act(async () => ball.click())
  expect(calls.startSupervisor).toHaveBeenCalledOnce()
  expect(calls.createTask).not.toHaveBeenCalled()
  expect(calls.createButler).not.toHaveBeenCalled()
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

it('offers existing butlers and a new one only on long press', async () => {
  const { container, root, calls } = renderLauncher()
  await act(async () => root.render(<VoiceLauncher {...({
    useVoice: (selector: (value: unknown) => unknown) => selector({ phase: 'idle' }),
    butlers: [{ id: 'ops', name: '运维' }],
    ...calls,
  } as never)} />))
  expect(container.textContent).not.toContain('新安排一位总管')
  const ball = container.querySelector('[aria-label="打给语音总管"]') as HTMLButtonElement
  await act(async () => {
    ball.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  })
  expect(container.textContent).toContain('运维')
  expect(container.textContent).toContain('新安排一位总管')
  const input = container.querySelector('input[aria-label="新总管称呼"]') as HTMLInputElement
  expect(input).toBeTruthy()
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
