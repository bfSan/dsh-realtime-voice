/**
 * Short synthesized ring for an incoming voice report.
 *
 * Synthesizing avoids shipping and decoding an audio asset, and keeps the
 * payload free of any third-party sample. Browsers require a user gesture
 * before audio may start, so a blocked context is a normal, silent outcome:
 * the list is still visible and the user can take the call manually.
 */
export declare const RINGTONE_DURATION_MS = 5000;
/**
 * Play one five-second ring.
 *
 * @returns a stop function, or undefined when the browser cannot play audio.
 */
export declare function playRingtone(): (() => void) | undefined;
