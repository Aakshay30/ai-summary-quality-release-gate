export interface TicketMessage { id: string; body: string }
export interface SuccessfulSummary { status: 'ok'; summary: string; sourceIds: string[] }
export interface InsufficientInformation { status: 'insufficient_information' }
export interface SummaryError { error: 'unavailable' }
export type SummaryResponse = SuccessfulSummary | InsufficientInformation | SummaryError;
export interface CitationValidation { valid: boolean; reason: 'valid' | 'missing_summary' | 'missing_citations' | 'unknown_source' }
export function validateSummaryCitations(summary: Pick<SuccessfulSummary, 'summary' | 'sourceIds'>, ticketMessages: readonly TicketMessage[]): CitationValidation {
  if (!summary.summary.trim()) return { valid: false, reason: 'missing_summary' };
  if (!Array.isArray(summary.sourceIds) || summary.sourceIds.length === 0) return { valid: false, reason: 'missing_citations' };
  const ids = new Set(ticketMessages.map(({ id }) => id));
  if (summary.sourceIds.some((id) => typeof id !== 'string' || !ids.has(id))) return { valid: false, reason: 'unknown_source' };
  return { valid: true, reason: 'valid' };
}
