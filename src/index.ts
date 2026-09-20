/** DSH Host half: same-process realtime voice route, provider bridge, and complete disposal. */
import type { Duplex } from 'node:stream'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
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
  let readConfig = (): VoiceConfig => config

  // The call-back inbox runs for the lifetime of the plugin, not of a call:
  // its whole purpose is to catch the tasks that outlive the user's call. It
  // waits for the compat facade, because that is where the mux stream lives.
  ctx.inject(['apiProxy'], (inboxCtx) => {
    inboxCtx.effect(() => startVoiceInbox(inboxCtx, inbox), 'realtime-voice: call-back inbox lifecycle')
  })

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
  installApiProxyCompat(ctx, { isVoiceSession: sessionId => voiceRuntime.ownsSession(sessionId) })

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
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      response.writeHead(405, { Allow: 'GET, DELETE' })
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
    const snapshot: VoiceInboxSnapshot = { protocol: VOICE_PROTOCOL, entries: inbox.list() }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end(JSON.stringify(snapshot))
  }

  ctx.effect(() => {
    const unregisterStatus = ctx.webServer.register({ kind: 'exact', path: VOICE_STATUS_ROUTE, handler: status })
    const unregisterDirectStatus = ctx.webServer.register({ kind: 'exact', path: VOICE_DIRECT_STATUS_ROUTE, handler: status })
    const unregisterInbox = ctx.webServer.register({ kind: 'exact', path: VOICE_INBOX_ROUTE, handler: callbacks })
    const unregister = ctx.webServer.registerUpgrade({ path: VOICE_ROUTE, handler: upgradeProxy })
    const unregisterDirect = ctx.webServer.registerUpgrade({ path: VOICE_DIRECT_ROUTE, handler: upgradeDirect })
    return async () => {
      unregisterDirect()
      unregister()
      unregisterInbox()
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
