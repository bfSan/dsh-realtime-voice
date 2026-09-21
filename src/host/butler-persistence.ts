import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import {
  MAX_BUTLER_NOTES, MAX_BUTLER_TASKS, type ButlerTaskRef, type StoredButlers, type VoiceButler,
} from './butler-registry.ts'

function oneLine(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.slice(0, limit) : ''
}

function normalizeTask(raw: unknown): ButlerTaskRef {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid butler task')
  const row = raw as Record<string, unknown>
  if (typeof row.sessionId !== 'string' || typeof row.title !== 'string'
    || typeof row.lastTouchedAt !== 'number' || !Number.isFinite(row.lastTouchedAt)) {
    throw new Error('Invalid butler task')
  }
  return {
    sessionId: row.sessionId, title: row.title,
    lastTouchedAt: row.lastTouchedAt, lastSummary: oneLine(row.lastSummary, 200),
    ...(typeof row.projectId === 'string' ? { projectId: row.projectId } : {}),
    ...(typeof row.presetId === 'string' ? { presetId: row.presetId } : {}),
  }
}

function normalizeButler(raw: unknown): VoiceButler {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid butler record')
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string'
    || typeof row.createdAt !== 'number' || !Number.isFinite(row.createdAt)
    || typeof row.lastUsedAt !== 'number' || !Number.isFinite(row.lastUsedAt)) {
    throw new Error('Invalid butler record')
  }
  const scope = typeof row.scope === 'object' && row.scope !== null ? row.scope as Record<string, unknown> : {}
  const memory = typeof row.memory === 'object' && row.memory !== null ? row.memory as Record<string, unknown> : {}
  return {
    id: row.id, name: row.name, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt,
    scope: {
      ...(Array.isArray(scope.projects) ? { projects: scope.projects.filter((value): value is string => typeof value === 'string') } : {}),
      ...(Array.isArray(scope.keywords) ? { keywords: scope.keywords.filter((value): value is string => typeof value === 'string') } : {}),
      ...(typeof scope.defaultAgentPresetId === 'string' ? { defaultAgentPresetId: scope.defaultAgentPresetId } : {}),
    },
    memory: {
      tasks: (Array.isArray(memory.tasks) ? memory.tasks : []).map(normalizeTask).slice(0, MAX_BUTLER_TASKS),
      notes: (Array.isArray(memory.notes) ? memory.notes : [])
        .filter((value): value is string => typeof value === 'string').slice(0, MAX_BUTLER_NOTES),
    },
  }
}

function normalizeStoredButlers(raw: unknown): StoredButlers {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid butler roster')
  const value = raw as Record<string, unknown>
  if (value.schemaVersion !== 1 || !Array.isArray(value.butlers)) throw new Error('Unsupported butler roster schema')
  return {
    schemaVersion: 1,
    butlers: value.butlers.map(normalizeButler),
    ...(typeof value.defaultButlerId === 'string' ? { defaultButlerId: value.defaultButlerId } : {}),
  }
}

const storedButlersSchema: z.ZodType<StoredButlers> = z.unknown().transform((raw, context) => {
  try {
    return normalizeStoredButlers(raw)
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid butler roster' })
    return z.NEVER
  }
})

/** Official DSH storage-domain declaration for the durable butler roster. */
export const butlerStorageSpec = defineDomain({
  name: 'realtime_voice_butlers',
  version: 1,
  tables: {},
  global: {
    schema: storedButlersSchema,
    initial: { schemaVersion: 1, butlers: [] },
  },
})

export function parseStoredButlers(raw: unknown): StoredButlers {
  return storedButlersSchema.parse(raw)
}
