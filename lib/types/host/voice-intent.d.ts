/**
 * Conservative guard for short utterances that ask to hear existing facts.
 * Any explicit object or write verb falls through to the normal model route.
 */
export declare function isReadOnlyReportIntent(text: string): boolean;
/**
 * Whether the user audibly agreed to the task the supervisor just proposed.
 *
 * Only the opening of the utterance is examined, so a natural "对，那就开始吧"
 * still confirms while an unrelated or corrective sentence does not.
 */
export declare function isConfirmationUtterance(text: string): boolean;
