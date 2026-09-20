/**
 * Conservative guard for short utterances that ask to hear existing facts.
 * Any explicit object or write verb falls through to the normal model route.
 */
export declare function isReadOnlyReportIntent(text: string): boolean;
