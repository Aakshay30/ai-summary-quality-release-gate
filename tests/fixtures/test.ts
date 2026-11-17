import { test as base, expect, type Page } from '@playwright/test';
import { crossTicketSummary, insufficientInformation, unavailable, validSummary, missingCitationSummary } from './summary-fixtures';
type Fixtures = { dashboard: Page; mockSummary: (responses: unknown[]) => Promise<void> };
export const test = base.extend<Fixtures>({
  dashboard: async ({ page }, use) => {
    await page.route('**/api/tickets/T-100', (route) => route.fulfill({ json: { id: 'T-100', subject: 'Package marked delivered but missing', messages: [{ id: 'm1', body: 'Package marked delivered but missing.' }, { id: 'm2', body: 'Agent verified address and suggested reception.' }] } }));
    await page.goto('/'); await page.getByRole('heading', { name: 'Package marked delivered but missing' }).waitFor();
    await page.waitForFunction(() => document.body.dataset.ticketLoaded === 'true'); await use(page);
  },
  mockSummary: async ({ page }, use) => { await use(async (responses) => { let index = 0; await page.route('**/api/tickets/T-100/summary', async (route) => { const response = responses[Math.min(index, responses.length - 1)]; index += 1; if (response && typeof response === 'object' && 'error' in response) await route.fulfill({ status: 503, json: response }); else await route.fulfill({ status: 200, json: response }); }); }); },
});
export { expect, validSummary, insufficientInformation, unavailable, crossTicketSummary, missingCitationSummary };
