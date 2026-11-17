import { test, expect } from '@playwright/test';

test('approval endpoint independently validates citations against canonical ticket messages', async ({ request, baseURL }) => {
  const invalid = await request.post(`${baseURL}/api/tickets/T-100/approve`, { headers: { 'x-agent-id': 'agent-1' }, data: { summary: 'Package missing.', sourceIds: ['m1', 'x1'] } });
  expect(invalid.status()).toBe(422);
  expect(await invalid.json()).toMatchObject({ error: 'summary_not_approvable', reason: 'unknown_source' });
  const missing = await request.post(`${baseURL}/api/tickets/T-100/approve`, { headers: { 'x-agent-id': 'agent-1' }, data: { summary: 'Package missing.', sourceIds: [] } });
  expect(missing.status()).toBe(422);
});
test('approval endpoint rejects an agent who does not own the ticket', async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/api/tickets/T-100/approve`, { headers: { 'x-agent-id': 'agent-2' }, data: { summary: 'Package missing.', sourceIds: ['m1'] } });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ error: 'ticket_not_owned_by_agent' });
});
test('approval endpoint approves a valid summary for the owning agent', async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/api/tickets/T-100/approve`, { headers: { 'x-agent-id': 'agent-1' }, data: { summary: 'Package marked delivered; customer cannot locate it.', sourceIds: ['m1'] } });
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({ status: 'approved', promptVersion: expect.any(String), modelVersion: expect.any(String) });
});
test('metadata exposes immutable prompt and model version labels for each run', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/api/meta`);
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ promptVersion: expect.any(String), modelVersion: expect.any(String) });
});

test('local generation adapter returns prompt and model version metadata', async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/api/tickets/T-100/summary`);
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: 'ok', promptVersion: expect.any(String), modelVersion: expect.any(String) });
});
