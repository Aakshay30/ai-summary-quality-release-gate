import type { InsufficientInformation, SuccessfulSummary, SummaryError, SummaryResponse } from '../domain/summary';

export type ContractResult = { success: true; data: SummaryResponse } | { success: false; issues: string[] };

/** Runtime boundary parser. Unknown keys are rejected to make upstream contract drift visible. */
export function parseSummaryServiceResponse(input: unknown): ContractResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { success: false, issues: ['response must be an object'] };
  const value = input as Record<string, unknown>;
  if (value.status === 'ok') {
    const issues: string[] = [];
    if (typeof value.summary !== 'string' || !value.summary.trim()) issues.push('summary must be a non-empty string');
    if (!Array.isArray(value.sourceIds) || value.sourceIds.length === 0 || value.sourceIds.some((id) => typeof id !== 'string' || !id.trim())) issues.push('sourceIds must be a non-empty array of non-empty strings');
    if (Object.keys(value).some((key) => !['status', 'summary', 'sourceIds'].includes(key))) issues.push('unexpected property in successful response');
    return issues.length ? { success: false, issues } : { success: true, data: value as unknown as SuccessfulSummary };
  }
  if (value.status === 'insufficient_information') {
    return Object.keys(value).length === 1 ? { success: true, data: value as unknown as InsufficientInformation } : { success: false, issues: ['unexpected property in insufficient_information response'] };
  }
  if (value.error === 'unavailable') {
    return Object.keys(value).length === 1 ? { success: true, data: value as unknown as SummaryError } : { success: false, issues: ['unexpected property in error response'] };
  }
  return { success: false, issues: ['unknown response discriminator'] };
}
