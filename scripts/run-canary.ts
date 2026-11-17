import { readFileSync, writeFileSync } from 'node:fs';
import { evaluateGoldenCase, type GoldenCase } from '../src/evaluation/evaluator';
import { parseSummaryServiceResponse } from '../src/contracts/summary-contract';

async function main() {
const endpoint = process.env.AI_CANARY_ENDPOINT;
if (!endpoint) {
  console.log('CANARY_SKIPPED: AI_CANARY_ENDPOINT is not configured. Local and PR release gates remain credential-free.');
  return;
}
const modelVersion = process.env.MODEL_CANDIDATE_VERSION ?? 'candidate-unpinned';
const promptVersion = process.env.PROMPT_VERSION ?? 'ticket-summary-candidate';
const apiKey = process.env.AI_CANARY_API_KEY;
const cases = JSON.parse(readFileSync('data/golden/summary-cases.json', 'utf8')) as GoldenCase[];
const results: Array<{ id: string; evaluation?: ReturnType<typeof evaluateGoldenCase>; error?: string }> = [];
for (const sample of cases.filter((item) => item.expected === 'pass')) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ ticketId: sample.id, messages: sample.ticketMessages, promptVersion, modelVersion }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseSummaryServiceResponse(await response.json());
    if (!parsed.success || !('status' in parsed.data) || parsed.data.status !== 'ok') throw new Error(`Contract failure: ${parsed.success ? 'non-ok response' : parsed.issues.join('; ')}`);
    results.push({ id: sample.id, evaluation: evaluateGoldenCase({ ...sample, output: { summary: parsed.data.summary, sourceIds: parsed.data.sourceIds } }) });
  } catch (error) { results.push({ id: sample.id, error: error instanceof Error ? error.message : String(error) }); }
}
const passRate = results.filter((r) => r.evaluation?.passed).length / Math.max(results.length, 1);
const meanScore = results.reduce((sum, r) => sum + (r.evaluation?.score ?? 0), 0) / Math.max(results.length, 1);
const report = { modelVersion, promptVersion, generatedAt: new Date().toISOString(), thresholds: { passRate: 0.9, meanScore: 85 }, passRate, meanScore, promotable: passRate >= 0.9 && meanScore >= 85 && results.every((r) => !r.error), results };
writeFileSync('canary-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.promotable) process.exitCode = 1;

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
