
export interface ICallState{
  state: 'retrying' | 'dead';
  attemptsMade: number;
  maxAttempts: number;
  backoffDelay: number;
  failedJobId: string;
}