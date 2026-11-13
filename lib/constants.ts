export const SYNC_EVENT = "gstlens:sync:completed";
export const UPDATE_CREDIT_EVENT = "gstlens:crdit:update";
export const AI_RETRY_EVENT = "gstlens:ai:retry";

export interface AiRetryEventDetail {
  active: boolean;
  attempt: number;
  maxRetries: number;
  secondsLeft: number;
}
