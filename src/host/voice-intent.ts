const READ_ONLY_REPORT_UTTERANCES = new Set([
  '汇报',
  '汇报一下',
  '给我汇报',
  '给我汇报一下',
  '请汇报一下',
  '帮我汇报',
  '帮我汇报工作',
  '汇报工作',
  '工作汇报',
  '说一下进展',
  '说下进展',
  '现在什么进展',
  '当前什么进展',
  '现在进展怎么样',
  '把结果告诉我',
  '告诉我结果',
  '你查一下再告诉我',
  '查一下再告诉我',
  '查一下告诉我',
])

/**
 * Conservative guard for short utterances that ask to hear existing facts.
 * Any explicit object or write verb falls through to the normal model route.
 */
export function isReadOnlyReportIntent(text: string): boolean {
  const normalized = text
    .trim()
    .replaceAll(/[\s，。！？!?、,.；;：:]/g, '')
    .replace(/^(?:(?:嗯|啊|呃|唔|那个))+/u, '')
    .replace(/[啊呀吧呢]+$/u, '')
  return READ_ONLY_REPORT_UTTERANCES.has(normalized)
}

/**
 * Short affirmative utterances that answer "就是这个任务，对吗？".
 *
 * Deliberately narrow: the caller uses this to authorize binding a real DSH
 * session, so an unclear or negative answer must fail closed and make the
 * supervisor ask again. A denial is never accepted, because "不对" contains no
 * affirmative token and starts with a negation.
 */
const CONFIRMATIONS = new Set([
  '对', '对的', '对的就是这个', '是', '是的', '是的是这个', '嗯', '嗯对', '对头',
  '可以', '行', '好', '好的', '好吧', '确认', '我确认', '确认了', '就这个', '就它',
  '就这个吧', '用这个', '就用这个', '没错', '对就这个', '对的就这个', '这个可以',
  '是这个是这个', '好那就这个', '行就这个', '没问题', '没问题就这个', 'ok', 'yes',
])

/**
 * Whether the user audibly agreed to the task the supervisor just proposed.
 *
 * Only the opening of the utterance is examined, so a natural "对，那就开始吧"
 * still confirms while an unrelated or corrective sentence does not.
 */
export function isConfirmationUtterance(text: string): boolean {
  const base = text
    .trim()
    .toLowerCase()
    .replaceAll(/[\s，。！？!?、,.；;：:]/g, '')
    .replace(/[啊呀吧呢嘛]$/u, '')
  if (base === '') return false
  // Checked before any filler stripping: a bare "嗯" is a complete answer, and
  // stripping it as a hesitation would throw the confirmation away.
  if (CONFIRMATIONS.has(base)) return true
  const normalized = base.replace(/^(?:(?:嗯|啊|呃|唔|那个|然后|那))+/, '')
  if (normalized === '') return false
  if (CONFIRMATIONS.has(normalized)) return true
  // A leading negation is a correction, never an agreement.
  if (/^(?:不|别|不是|没有|取消|换|先别)/u.test(normalized)) return false
  // "对，开始吧" / "可以，就这个任务" - the agreement leads the sentence.
  return [...CONFIRMATIONS].some(token => token.length >= 1 && normalized.startsWith(token)
    && (normalized.length === token.length || /^(?:那就|就|开始|继续|可以|吧|了|请|你|我们)/u.test(normalized.slice(token.length))))
}
