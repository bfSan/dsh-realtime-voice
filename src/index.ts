/** DSH Host half: same-process realtime voice route, provider bridge, and complete disposal. */
import type { Duplex } from 'node:stream'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { WebSocketServer } from 'ws'
import {
  VOICE_DIRECT_PROTOCOL,
  VOICE_INBOX_ROUTE,
  VOICE_PREVIEW_ROUTE,
  VOICE_PROTOCOL,
  VOICE_ROUTE,
  VOICE_STATUS_ROUTE,
  type VoiceInboxSnapshot,
} from './protocol.ts'
import { VOICE_DIRECT_ROUTE, VOICE_DIRECT_STATUS_ROUTE } from './direct-protocol.ts'
import { Config, type VoiceConfig } from './host/config.ts'
import { installApiProxyCompat } from './host/dsh-runtime-compat.ts'
import { VoiceConnection } from './host/voice-connection.ts'
import { VoiceRuntime } from './host/voice-runtime.ts'
import { DirectControlConnection } from './host/direct-control-connection.ts'
import { REALTIME_VOICE_SETTINGS_NAMESPACE } from './models.ts'
import { registerDefaultHandoffSkill } from './host/handoff-skill.ts'
import { startVoiceInbox, VoiceInbox } from './host/voice-inbox.ts'
import type { HandoffGuidanceRuntime } from './host/handoff-guidance.ts'
import { InboxPersistence, voiceInboxStorageSpec, type InboxGlobal } from './host/inbox-persistence.ts'
import { ButlerRegistry } from './host/butler-registry.ts'
import { butlerStorageSpec, parseStoredButlers } from './host/butler-persistence.ts'
import { VoiceTaskDirectory, type VoiceProject, type VoiceAgent } from './host/voice-task-directory.ts'
import { VOICE_DIRECTORY_ROUTE } from './supervisor-protocol.ts'
import { createVoicePreviewHandler } from './host/voice-preview-route.ts'

export { Config }
export type { VoiceConfig }

/**
 * Host services required before the route can be mounted. `apiProxy` is absent
 * because DSH 0.1.5 removed it: this plugin now installs that legacy surface
 * itself over `sessionController`, so it is a provider of the name rather than
 * a dependent on it.
 */
export const inject = ['webServer', 'credentials', 'agents', 'systemPrompt', 'tools']

/** Mount one exact WebSocket route. Every accepted connection is owned by this plugin fiber. */
export function apply(ctx: Context, config: VoiceConfig): void {
  const proxyServer = new WebSocketServer({ noServer: true })
  const directServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })

  // `skills` is optional: this plugin must mount on a DSH build without the
  // skill bundle, and Cordis throws when a non-injected service is read. The
  // injection below fills this holder only once the service actually exists,
  // so guidance resolution can stay a plain, testable function.
  const guidanceRuntime: HandoffGuidanceRuntime = {
    logger: ctx.logger,
    readFile: async (path: string) => await readFile(path, 'utf8'),
  }
  ctx.inject(['skills'], (skillsCtx) => {
    const registry = (skillsCtx as unknown as { skills?: HandoffGuidanceRuntime['skills'] }).skills
    if (registry !== undefined) guidanceRuntime.skills = registry
    // The built-in reporting skill is a convenience, not a dependency: a
    // project skill with the same name outranks it by DSH's normal layering.
    skillsCtx.effect(
      () => registerDefaultHandoffSkill(skillsCtx) ?? (() => {}),
      'realtime-voice: built-in handoff skill',
    )
  })

  const connections = new Set<{ dispose(reason?: string): void }>()
  const voiceRuntime = new VoiceRuntime()
  const inbox = new VoiceInbox()
  const butlers = new ButlerRegistry()
  const directoryServices: {
    projects?: () => Promise<VoiceProject[]>
    agents?: () => Promise<VoiceAgent[]>
    controller?: Context['sessionController']
    butlers?: ButlerRegistry
  } = {}
  ctx.inject(['workspaceRegistry'], registryCtx => {
    const registry = (registryCtx as unknown as { workspaceRegistry: { list(): VoiceProject[] } }).workspaceRegistry
    directoryServices.projects = async () => registry.list().map(row => ({ id: row.id, path: row.path, title: row.title }))
    registryCtx.effect(() => () => { delete directoryServices.projects }, 'voice project directory')
  })
  ctx.inject(['agentPresets'], presetsCtx => {
    const presets = (presetsCtx as unknown as { agentPresets: { list(): Promise<VoiceAgent[]> } }).agentPresets
    directoryServices.agents = async () => (await presets.list()).map(row => ({
      id: row.id, ...(row.name === undefined ? {} : { name: row.name }),
      ...(row.broken === undefined ? {} : { broken: row.broken }),
    }))
    presetsCtx.effect(() => () => { delete directoryServices.agents }, 'voice agent directory')
  })
  ctx.inject(['sessionController'], controllerCtx => {
    directoryServices.controller = controllerCtx.sessionController
    controllerCtx.effect(() => () => { delete directoryServices.controller }, 'voice task directory')
  })
  const controller = () => {
    if (!directoryServices.controller) throw new Error('DSH 会话服务尚未就绪')
    return directoryServices.controller
  }
  const directory = new VoiceTaskDirectory({
    projects: async () => {
      if (!directoryServices.projects) throw new Error('DSH 项目目录不可用')
      return directoryServices.projects()
    },
    agents: async () => {
      if (!directoryServices.agents) throw new Error('DSH Agent 目录不可用')
      return directoryServices.agents()
    },
    tasks: async () => (await controller().list({}, new AbortController().signal)).items,
    history: async sessionId => {
      const page = await controller().page({ address: { kind: 'session', sessionId: SessionId(sessionId) }, throughSeq: -1, maxMessages: 200 }, new AbortController().signal)
      return page.records.map(record => typeof record === 'object' && record !== null && 'event' in record ? record.event : record)
    },
    create: async input => controller().create(input as Parameters<Context['sessionController']['create']>[0]),
  })
  ctx.inject(['storageDomain'], (storageCtx) => {
    const storage = (storageCtx as unknown as { storageDomain: {
      open(spec: unknown): Promise<{ global: InboxGlobal; close(): Promise<void> }>
    } }).storageDomain
    let disposed = false
    let closeInbox: (() => Promise<void>) | undefined
    let closeButlers: (() => Promise<void>) | undefined
    const setup = (async () => {
      const domain = await storage.open(voiceInboxStorageSpec)
      closeInbox = () => domain.close()
      if (disposed) return
      const persistence = new InboxPersistence(domain.global)
      const stored = await persistence.load()
      inbox.restore(stored.entries)
      inbox.setOnChange(() => {
        void persistence.save({ schemaVersion: 1, entries: inbox.list() }).catch(() => {
          inbox.storageError = '回拨状态保存失败，请保留当前窗口并检查 DSH 存储。'
        })
      })
    })().catch((error: unknown) => {
      ctx.logger.warn(`realtime voice inbox storage initialization failed: ${String(error)}`)
      inbox.storageError = '回拨历史恢复失败；原存储未覆盖。本次新回拨仍可使用。'
    })
    const butlerSetup = (async () => {
      const domain = await storage.open(butlerStorageSpec)
      closeButlers = () => domain.close()
      if (disposed) return
      butlers.restore(parseStoredButlers(domain.global.get()))
      directoryServices.butlers = butlers
      butlers.setOnChange(() => {
        void domain.global.set(butlers.snapshot() as never).catch(() => {})
      })
    })().catch((error: unknown) => {
      ctx.logger.warn(`realtime voice butler roster initialization failed: ${String(error)}`)
    })
    storageCtx.effect(() => async () => {
      disposed = true
      inbox.setOnChange(undefined)
      butlers.setOnChange(undefined)
      delete directoryServices.butlers
      await setup
      await butlerSetup
      await closeInbox?.()
      await closeButlers?.()
    }, 'realtime-voice: durable inbox')
  })
  let readConfig = (): VoiceConfig => config

  // The call-back inbox runs for the lifetime of the plugin, not of a call:
  // its whole purpose is to catch the tasks that outlive the user's call. It
  // waits for the compat facade, because that is where the mux stream lives.
  ctx.inject(['apiProxy'], (inboxCtx) => {
    inboxCtx.effect(() => startVoiceInbox(inboxCtx, inbox), 'realtime-voice: call-back inbox lifecycle')
  })
  // A live call already speaks its own approvals and questions, so the inbox
  // must stay quiet about those and list only what the user missed.
  inbox.setIsLiveCall(sessionId => voiceRuntime.ownsSession(sessionId))
  inbox.setDelegateInteraction(interactionId => { interactions.delegateInteraction(interactionId) })

  // Settings are optional at the Cordis boundary. When the Web profile serves
  // them, model changes become authoritative for the next accepted call; an
  // already connected upstream keeps its negotiated model until that call ends.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, REALTIME_VOICE_SETTINGS_NAMESPACE, Config, config, {
      setSource(source) { readConfig = source },
      onChange() {},
    })
  })

  // DSH 0.1.5 deleted the `apiProxy` service and the Session/Typert runtime the
  // rc.7 host bridge was written against. Reinstall the exact surface the rest
  // of this plugin consumes, backed by the current authoritative runtime.
  const interactions = installApiProxyCompat(ctx, {
    isVoiceSession: sessionId => voiceRuntime.ownsSession(sessionId),
    // A handoff outlives the call that started it: a question raised after the
    // user hung up must still reach the voice surface, or the Agent blocks on
    // a decision nobody can see.
    watchesHandoff: sessionId => inbox.watchesSession(sessionId),
  })

  const authorizeUpgrade = (request: IncomingMessage, socket: Duplex): VoiceConfig | undefined => {
    const activeConfig = readConfig()
    if (!isLoopback(request.socket.remoteAddress) || !isAllowedOrigin(request)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return undefined
    }
    if (connections.size >= activeConfig.maxConnections) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return undefined
    }
    return activeConfig
  }

  const upgradeProxy = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const activeConfig = authorizeUpgrade(request, socket)
    if (activeConfig === undefined) return
    proxyServer.handleUpgrade(request, socket, head, (websocket) => {
      let connection: VoiceConnection
      connection = new VoiceConnection(
        ctx,
        websocket,
        request,
        activeConfig,
        () => connections.delete(connection),
        voiceRuntime,
        inbox,
        guidanceRuntime,
        directory,
        butlers,
      )
      connections.add(connection)
    })
  }

  const upgradeDirect = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const activeConfig = authorizeUpgrade(request, socket)
    if (activeConfig === undefined) return
    directServer.handleUpgrade(request, socket, head, (websocket) => {
      let connection: DirectControlConnection
      connection = new DirectControlConnection(
        ctx,
        websocket,
        request,
        activeConfig,
        () => connections.delete(connection),
        voiceRuntime,
        undefined,
        inbox,
        guidanceRuntime,
      )
      connections.add(connection)
    })
  }

  const status = (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' })
      response.end()
      return
    }
    if (!isLoopback(request.socket.remoteAddress) || !isAllowedOrigin(request)) {
      response.writeHead(403)
      response.end()
      return
    }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end(JSON.stringify(voiceRuntime.occupancy(
      request.url?.startsWith(VOICE_DIRECT_STATUS_ROUTE) === true ? VOICE_DIRECT_PROTOCOL : undefined,
    )))
  }

  const callbacks = (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== 'GET' && request.method !== 'DELETE' && request.method !== 'PATCH') {
      response.writeHead(405, { Allow: 'GET, DELETE, PATCH' })
      response.end()
      return
    }
    if (!isLoopback(request.socket.remoteAddress) || !isAllowedOrigin(request)) {
      response.writeHead(403)
      response.end()
      return
    }
    if (request.method === 'DELETE') {
      const ids = new URL(request.url ?? VOICE_INBOX_ROUTE, 'http://localhost').searchParams.getAll('id')
      inbox.dismiss(ids)
    }
    if (request.method === 'PATCH') {
      inbox.snooze(new URL(request.url ?? VOICE_INBOX_ROUTE, 'http://localhost').searchParams.getAll('id'))
    }
    const snapshot: VoiceInboxSnapshot = {
      protocol: VOICE_PROTOCOL, entries: inbox.list(),
      ...(inbox.storageError === undefined ? {} : { error: inbox.storageError }),
    }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end(JSON.stringify(snapshot))
  }

  ctx.effect(() => {
    const unregisterDirectory = ctx.webServer.register({
      kind: 'exact', path: VOICE_DIRECTORY_ROUTE,
      handler: (request, response) => {
        if (request.method !== 'GET' || !isLoopback(request.socket.remoteAddress) || !isAllowedOrigin(request)) {
          response.writeHead(403); response.end(); return
        }
        void Promise.all([directory.listProjects(), directory.listAgents(), directory.listTasks()]).then(([projects, agents, tasks]) => {
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          response.end(JSON.stringify({ projects, agents, tasks }))
        }).catch(() => {
          response.writeHead(503, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ error: 'DSH 项目、Agent 或会话目录尚不可用，请重试。' }))
        })
      },
    })
    const unregisterStatus = ctx.webServer.register({ kind: 'exact', path: VOICE_STATUS_ROUTE, handler: status })
    const unregisterDirectStatus = ctx.webServer.register({ kind: 'exact', path: VOICE_DIRECT_STATUS_ROUTE, handler: status })
    const unregisterInbox = ctx.webServer.register({ kind: 'exact', path: VOICE_INBOX_ROUTE, handler: callbacks })
    const unregisterPreview = ctx.webServer.register({
      kind: 'exact',
      path: VOICE_PREVIEW_ROUTE,
      handler: createVoicePreviewHandler(
        ctx,
        () => readConfig(),
        request => isLoopback(request.socket.remoteAddress) && isAllowedOrigin(request),
      ),
    })
    const unregister = ctx.webServer.registerUpgrade({ path: VOICE_ROUTE, handler: upgradeProxy })
    const unregisterDirect = ctx.webServer.registerUpgrade({ path: VOICE_DIRECT_ROUTE, handler: upgradeDirect })
    return async () => {
      unregisterDirectory()
      unregisterDirect()
      unregister()
      unregisterInbox()
      unregisterPreview()
      unregisterDirectStatus()
      unregisterStatus()
      for (const connection of [...connections]) connection.dispose()
      connections.clear()
      voiceRuntime.clear()
      await Promise.all([
        new Promise<void>((resolve) => proxyServer.close(() => resolve())),
        new Promise<void>((resolve) => directServer.close(() => resolve())),
      ])
    }
  }, 'realtime-voice: route and active call lifecycle')
}
function isLoopback(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin
  if (origin === undefined) return true
  const host = request.headers.host
  if (host === undefined) return false
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}
