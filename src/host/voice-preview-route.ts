import type { IncomingMessage, ServerResponse } from 'node:http'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { Context } from '@deepseek-ai/cordis'
import { isRealtimeVoiceModel, isRealtimeVoiceVoice } from '../models.ts'
import type { VoiceConfig } from './config.ts'
import { renderVoicePreview } from './voice-preview.ts'

const MAX_PREVIEW_REQUEST_BYTES = 4 * 1024

export function createVoicePreviewHandler(
  ctx: Context,
  readConfig: () => VoiceConfig,
  isAllowed: (request: IncomingMessage) => boolean,
  render: typeof renderVoicePreview = renderVoicePreview,
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ error: '音色试听失败，请稍后重试。' }))
    })
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' })
      response.end()
      return
    }
    if (!isAllowed(request)) {
      response.writeHead(403)
      response.end()
      return
    }
    const input = await readPreviewInput(request)
    if (input === undefined) {
      respondJson(response, 400, { error: '音色或模型参数无效。' })
      return
    }
    const base = readConfig()
    const credential = await ctx.credentials.resolve(credentialRef(base.apiKeyEnv))
    if (credential === undefined) {
      respondJson(response, 409, { error: `未检测到 ${base.apiKeyEnv}，请先保存百炼 API Key。` })
      return
    }
    try {
      const audio = await render({ ...base, model: input.model, voice: input.voice }, credential.value)
      response.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audio.byteLength),
        'Cache-Control': 'no-store',
      })
      response.end(audio)
    } catch {
      ctx.logger.warn('[realtime-voice] voice preview failed')
      respondJson(response, 502, { error: '百炼没有生成可播放的试听音频，请稍后重试。' })
    }
  }
}

async function readPreviewInput(request: IncomingMessage): Promise<{
  model: VoiceConfig['model']
  voice: VoiceConfig['voice']
} | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.byteLength
    if (size > MAX_PREVIEW_REQUEST_BYTES) return undefined
    chunks.push(bytes)
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks, size).toString('utf8'))
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const { model, voice } = value as Record<string, unknown>
    if (!isRealtimeVoiceModel(model) || !isRealtimeVoiceVoice(voice)) return undefined
    return { model, voice }
  } catch {
    return undefined
  }
}

function respondJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(value))
}
