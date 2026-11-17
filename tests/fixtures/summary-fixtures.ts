import type { SummaryResponse } from '../../src/domain/summary';

export const validSummary: SummaryResponse = {
  status: 'ok',
  summary: 'The customer cannot locate a package marked delivered. The agent verified the address and suggested checking reception.',
  sourceIds: ['m1', 'm2'],
};
export const insufficientInformation: SummaryResponse = { status: 'insufficient_information' };
export const unavailable: SummaryResponse = { error: 'unavailable' };
export const crossTicketSummary: SummaryResponse = {
  status: 'ok',
  summary: 'The customer asks about a missing package.',
  sourceIds: ['m1', 'x1'],
};
export const missingCitationSummary: SummaryResponse = {
  status: 'ok', summary: 'The customer asks about a missing package.', sourceIds: [],
};
