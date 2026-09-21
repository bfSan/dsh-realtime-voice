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
 * Strip written-only markup and return the text the realtime model should say.
 *
 * Everything this removes is structure or an identifier: markdown markers,
 * code fences, paths, hashes, emphasis. Facts, ordering and verdicts are
 * preserved, and an over-long report is cut at the tail rather than rewritten.
 */
export declare function toSpokenText(value: string, maxLength?: number): string;
/** Whether anything is left to say once the written-only markup is gone. */
export declare function hasSpokenContent(value: string): boolean;
