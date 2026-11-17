import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSummaryServiceResponse } from '../../src/contracts/summary-contract';

test('contract accepts successful generation response', () => {
  assert.equal(parseSummaryServiceResponse({ status: 'ok', summary: 'A concise summary.', sourceIds: ['m1'] }).success, true);
});
test('contract accepts insufficient-information response', () => {
  assert.deepEqual(parseSummaryServiceResponse({ status: 'insufficient_information' }), { success: true, data: { status: 'insufficient_information' } });
});
test('contract accepts service unavailable response', () => {
  assert.equal(parseSummaryServiceResponse({ error: 'unavailable' }).success, true);
});
test('contract rejects missing, empty, or malformed citation fields', () => {
  for (const payload of [
    { status: 'ok', summary: 'x' },
    { status: 'ok', summary: 'x', sourceIds: [] },
    { status: 'ok', summary: 'x', sourceIds: [''] },
    { status: 'ok', summary: '', sourceIds: ['m1'] },
  ]) assert.equal(parseSummaryServiceResponse(payload).success, false);
});
test('contract rejects unknown discriminators and additional fields', () => {
  assert.equal(parseSummaryServiceResponse({ status: 'success', summary: 'x', sourceIds: ['m1'] }).success, false);
  assert.equal(parseSummaryServiceResponse({ status: 'ok', summary: 'x', sourceIds: ['m1'], debug: true }).success, false);
});
