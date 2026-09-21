/**
 * Whether one spoken report actually reached the user's ears.
 *
 * Two independent facts decide it, and neither alone is enough:
 *
 * - the provider finished generating the response;
 * - the browser played every frame of it to the end.
 *
 * The two arrive in either order, and a barge-in can land between them. A
 * drain is the stronger signal of the two: it is measured after the audio
 * left the speaker, so an attempt that drained was heard almost in full. That
 * is why a drain settles a report even when a cancel raced it - treating such
 * an attempt as unheard left the task in the call-back list forever and let
 * the same report ring again.
 *
 * Only a genuinely unheard attempt stays interrupted, and that is expressed by
 * its drain never arriving.
 */
type DeliveryState = 'queued' | 'playing' | 'interrupted' | 'completed' | 'failed';
export declare class ReportDelivery {
    private readonly attempts;
    /** The attempt currently responsible for one report id. */
    private readonly current;
    begin(reportId: string, attemptId: string): void;
    attachResponse(attemptId: string, _responseId: string): void;
    responseEnded(attemptId: string): void;
    /**
     * The browser finished playing this attempt's audio.
     *
     * This is the strongest evidence available that the user heard the report,
     * so it also settles an attempt a cancel already marked interrupted: the
     * audio was demonstrably delivered before that cancel mattered.
     */
    playbackDrained(attemptId: string): void;
    interrupt(attemptId: string): void;
    state(reportId: string): DeliveryState | undefined;
    private advance;
}
export {};
