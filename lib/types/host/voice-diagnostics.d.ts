export interface VoiceDiagnosticEvent {
    callId: string;
    at: number;
    kind: 'accept' | 'ready' | 'inject' | 'response-start' | 'response-end' | 'cancel' | 'drained' | 'error';
    source?: 'local-vad' | 'server-vad' | 'user' | 'transport';
    reportId?: string;
    responseId?: string;
    requestId?: string;
}
/** Explicit fields prevent accidental logging of provider payloads or secrets. */
export declare function createVoiceDiagnostics(write: (line: string) => void): (event: VoiceDiagnosticEvent) => void;
