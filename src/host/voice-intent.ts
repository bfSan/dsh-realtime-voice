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
