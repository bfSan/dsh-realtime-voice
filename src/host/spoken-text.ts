/**
 * Turn written text into text worth hearing.
 *
 * Agent output is written for a screen: it carries markdown markers, bullet
 * dashes, parenthetical asides, file paths and code identifiers that the
 * realtime model would otherwise pronounce literally. This module rewrites
 * that surface without touching a single fact - every number, status word and
 * verdict survives, because changing one would turn a report into a different
 * report.
 */

/**
 * After this many bullets a list stops being listenable.
 *
 * A voice cannot hold twenty items, and reading them all pushes the conclusion
 * past the point where the user is still paying attention, so the tail is
 * counted instead of spoken.
 */
const MAX_SPOKEN_BULLETS = 4

/**
 * A heading marker at the start of a line.
 *
 * The heading text itself is kept: it is usually the only place a document
 * says what it is about.
 */
const HEADING_MARKER = /^\s{0,3}#{1,6}\s+/

/** A bullet or ordered marker, with any indentation that precedes it. */
const LIST_MARKER = /^(\s*)(?:[-*+\u2022]|\d{1,2}[.)])\s+/

/** A lazy-continuation line under a list item, indented but unmarked. */
const INDENTED_CONTINUATION = /^\s{2,}\S/

/** A horizontal rule, which carries no speech at all. */
const RULED_LINE = /^\s{0,3}(?:-{3,}|={3,}|\*{3,}|_{3,})\s*$/

/** A blockquote marker; the quoted sentence is still worth saying. */
const BLOCKQUOTE_MARKER = /^\s{0,3}>\s?/

/**
 * Our own status banners.
 *
 * Restricted to the vocabulary this plugin injects so a bracketed phrase the
 * Agent meant to say survives. The status word is re-added as prose by the
 * caller, so muting the tag here does not lose the verdict.
 */
const STATUS_TAG = /\[(?:COMPLETE|CANCELLED|FAILED|NEEDS_INPUT|NEEDS_APPROVAL|BACKEND|STATUS|PROGRESS|ERROR|TOOL|APPROVAL|QUESTION)\]/g

/** A markdown image; its alt text is rarely worth a sentence. */
const IMAGE = /!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g

/** A markdown link, reduced to the words the user would say. */
const LINK = /\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g

/** Inline HTML, which reaches speech as stray angle brackets. */
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g

/** A URL is never read aloud, and reading one wastes a whole turn. */
const URI = /\b(?:https?:\/\/|file:\/\/)[^\s，。；）】]+/g

/** A Windows path, including the drive letter. */
const WINDOWS_PATH = /\b[A-Za-z]:[\\/](?:[^\s，。；）】]*[\\/])*[^\s，。；）】]*/g

/** A POSIX path with at least two separators, which is always internal detail. */
const POSIX_PATH = /(?:^|[\s（(【])((?:\.{0,2}\/)?(?:[\w.-]+|~)(?:\/[\w.-]+){2,})/g

/** A commit hash or long id: unintelligible aloud, so it becomes a noun. */
const LONG_HEX = /\b[0-9a-f]{12,}\b/gi

/**
 * snake_case and kebab-case tool or parameter names.
 *
 * The whole token is matched and split in the replacement, because a repeated
 * capture group only ever reports its final iteration: matching segments
 * directly would silently drop every word but the last.
 */
const IDENTIFIER = /\b[a-z][a-z0-9]{1,}(?:[_-][a-z0-9]+){1,4}\b/g

/** Emphasis and inline-code markers wrapped around a word. */
const EMPHASIS = /(\*{1,3}|_{1,3}|`+)/g

/** Every mark that should become a pause rather than a spoken glyph. */
const PUNCTUATION: ReadonlyArray<readonly [RegExp, string]> = [
  [/\.{3,}|…/g, '，'],
  [/\?/g, '？'],
  [/!/g, '！'],
  [/:/g, '：'],
  [/[,;]/g, '，'],
  [/\|/g, '，'],
]

/** Separators that read as clutter when they lead or trail a spoken line. */
const TRAILING_PUNCTUATION = /[\s,;:，、；：]+$/
const LEADING_PUNCTUATION = /^[\s,;:，、；：]+/

/**
 * Rewrite a parenthesised aside as a spoken pause.
 *
 * An empty pair is pure noise; a pair around real content is a parenthetical
 * thought, which a voice renders as a comma. Iterating handles the nesting
 * that written reports produce.
 */
function softenBrackets(value: string): string {
  let result = value
  for (let pass = 0; pass < 3; pass += 1) {
    const next = result
      .replace(/[（(]\s*[）)]/g, '')
      .replace(/[【\[]\s*[\]】]/g, '')
      .replace(/[（(]([^（()）】\]]{1,120})[）)]/g, '，$1，')
      .replace(/[【\[]([^【\[\]()（））】]{1,120})[\]】]/g, '，$1，')
    if (next === result) break
    result = next
  }
  return result
}

/**
 * Replace code-shaped tokens with words a voice can carry.
 *
 * `handoff_to_dsh_agent` becomes "handoff to dsh agent", which a listener
 * parses as a name instead of hearing underscores spelled out.
 */
function humanizeIdentifiers(value: string): string {
  return value
    .replace(IDENTIFIER, match => match.split(/[_-]/).join(' '))
    .replace(LONG_HEX, '编号')
}

/**
 * One pass over the lines of a markdown document.
 *
 * Fenced code is dropped wholesale: a function body read aloud is
 * unintelligible, and the prose around it already says what it does.
 */
function stripListMarkers(value: string): { text: string; omitted: number } {
  const kept: string[] = []
  let inFence = false
  let fenceMarker = ''
  let bullets = 0
  for (const raw of value.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = raw.trimStart()
    const fence = trimmed.match(/^(```|~~~)/)
    if (fence !== null) {
      if (!inFence) {
        inFence = true
        fenceMarker = fence[1] ?? '```'
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false
        fenceMarker = ''
      }
      continue
    }
    if (inFence) continue
    if (RULED_LINE.test(raw)) continue
    const sliced = raw.replace(HEADING_MARKER, '').replace(BLOCKQUOTE_MARKER, '')
    const marker = sliced.match(LIST_MARKER)
    if (marker === null) {
      // A deep-space-aligned continuation of the previous item is content, not
      // an unmarked paragraph, so it keeps its place in the list.
      kept.push(INDENTED_CONTINUATION.test(sliced) ? sliced.trim().replace(/^[-*+]\s+/, '') : sliced)
      continue
    }
    bullets += 1
    if (bullets > MAX_SPOKEN_BULLETS) continue
    kept.push(sliced.replace(LIST_MARKER, '').trim())
  }
  return { text: kept.join('\n'), omitted: Math.max(0, bullets - MAX_SPOKEN_BULLETS) }
}

/** Collapse the punctuation that the rewrites above can leave behind. */
function cleanup(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?，\s*，/g, '，')
    .replace(/，\s*。/g, '。')
    .replace(/。\s*，/g, '，')
    .replace(/，{2,}/g, '，')
    .replace(/。{2,}/g, '。')
    .split('\n')
    .map(line => line.replace(LEADING_PUNCTUATION, '').replace(TRAILING_PUNCTUATION, '').trim())
    .filter(line => line !== '')
    .join('\n')
}

/**
 * Strip written-only markup and return the text the realtime model should say.
 *
 * Everything this removes is structure or an identifier: markdown markers,
 * code fences, paths, hashes, emphasis. Facts, ordering and verdicts are
 * preserved, and an over-long report is cut at the tail rather than rewritten.
 */
export function toSpokenText(value: string, maxLength = 1_200): string {
  if (typeof value !== 'string') return ''
  let text = value
    .replace(STATUS_TAG, ' ')
    .replace(IMAGE, '')
    .replace(LINK, '$1')
    .replace(HTML_TAG, '')
    .replace(URI, '相关链接')
    .replace(WINDOWS_PATH, '项目里的文件')
    .replace(POSIX_PATH, (_match, path: string) => (path.includes('/') ? '项目里的文件' : path))
  text = humanizeIdentifiers(text)
  const { text: body, omitted } = stripListMarkers(text)
  text = softenBrackets(body)
  text = text.replace(EMPHASIS, '').replace(/[\\^~<>]/g, ' ')
  for (const [pattern, replacement] of PUNCTUATION) text = text.replace(pattern, replacement)
  text = cleanup(text)
  if (omitted > 0) text = `${text}\n其余 ${omitted} 条没有展开。`
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).replace(TRAILING_PUNCTUATION, '')}…`
}

/** Whether anything is left to say once the written-only markup is gone. */
export function hasSpokenContent(value: string): boolean {
  return toSpokenText(value).replace(/[\s，。；：！？、…]/g, '') !== ''
}
