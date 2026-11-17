import { test, expect, validSummary, insufficientInformation, unavailable, crossTicketSummary, missingCitationSummary } from './fixtures/test';

test('successful generation displays summary and server accepts approval', async ({ dashboard, mockSummary }) => {
  await mockSummary([validSummary]);
  await dashboard.getByRole('button', { name: 'Generate summary' }).click();
  await expect(dashboard.getByText('Summary generated. Citations verified.')).toBeVisible();
  await expect(dashboard.locator('#summary-text')).toContainText('customer cannot locate a package');
  await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeEnabled();
  await dashboard.getByRole('button', { name: 'Approve summary' }).click();
  await expect(dashboard.getByText(/Summary approved/)).toBeVisible();
});
test('insufficient information is explicit and cannot be approved', async ({ dashboard, mockSummary }) => {
  await mockSummary([insufficientInformation]); await dashboard.getByRole('button', { name: 'Generate summary' }).click();
  await expect(dashboard.getByText(/Insufficient information/)).toBeVisible(); await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeDisabled();
});
test('503 offers retry; successful retry recovers and enables approval', async ({ dashboard, mockSummary }) => {
  await mockSummary([unavailable, validSummary]); await dashboard.getByRole('button', { name: 'Generate summary' }).click();
  await expect(dashboard.getByText(/Service unavailable \(503\)/)).toBeVisible(); await expect(dashboard.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeDisabled(); await dashboard.getByRole('button', { name: 'Retry' }).click();
  await expect(dashboard.getByText('Summary generated. Citations verified.')).toBeVisible(); await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeEnabled();
});
test('invalid cross-ticket citations block UI approval', async ({ dashboard, mockSummary }) => {
  await mockSummary([crossTicketSummary]); if (process.env.INTENTIONAL_CITATION_REGRESSION === '1') await dashboard.goto('/?regression=1');
  await dashboard.getByRole('button', { name: 'Generate summary' }).click();
  await expect(dashboard.getByText(/Summary rejected: citations are missing or do not belong/)).toBeVisible(); await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeDisabled();
});
test('summary with no citations blocks UI approval', async ({ dashboard, mockSummary }) => {
  await mockSummary([missingCitationSummary]); await dashboard.getByRole('button', { name: 'Generate summary' }).click();
  await expect(dashboard.getByText(/Summary rejected: citations are missing or do not belong/)).toBeVisible(); await expect(dashboard.getByRole('button', { name: 'Approve summary' })).toBeDisabled();
});
