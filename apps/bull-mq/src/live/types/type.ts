export const CALL_END_EVENTS: readonly string[] = ['hangup','completed', 'misscall'] as const;
export interface IDataState{
    callKey: string;
    eventType: string;
    caller: string;
    callee: string;
    did?: string;
    startedAt?: string;
    updatedAt?: string;
}