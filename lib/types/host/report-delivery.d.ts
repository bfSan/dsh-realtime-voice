type DeliveryState = 'queued' | 'playing' | 'interrupted' | 'completed' | 'failed';
export declare class ReportDelivery {
    private readonly attempts;
    private readonly current;
    begin(reportId: string, attemptId: string): void;
    attachResponse(attemptId: string, _responseId: string): void;
    responseEnded(attemptId: string): void;
    playbackDrained(attemptId: string): void;
    interrupt(attemptId: string): void;
    state(reportId: string): DeliveryState | undefined;
    private advance;
}
export {};
