/**
 * Short synthesized ring for an incoming voice report.
 *
 * Synthesizing avoids shipping and decoding an audio asset, and keeps the
 * payload free of any third-party sample. Browsers require a user gesture
 * before audio may start, so a blocked context is a normal, silent outcome:
 * the list is still visible and the user can take the call manually.
 */
/** Default ring length; the Host setting overrides it. Zero never rings. */
export declare const RINGTONE_DURATION_MS = 5000;
/**
 * Start a ring of the requested length.
 *
 * @returns a stop function, or undefined when the browser cannot play audio
 *   or the configured duration is zero.
 */
export declare function playRingtone(durationMs?: number): (() => void) | undefined;
