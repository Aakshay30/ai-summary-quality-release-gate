import { validateSummaryCitations, type TicketMessage } from '../domain/summary';
export interface GoldenCase {
  id: string; ticketMessages: TicketMessage[]; expectedFacts: string[]; forbiddenClaims: string[];
  output: { summary: string; sourceIds: string[] }; expected: 'pass' | 'fail';
}
export interface EvaluationResult { id: string; passed: boolean; score: number; reasons: string[] }
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function evaluateGoldenCase(sample: GoldenCase): EvaluationResult {
  const reasons: string[] = [];
  const citations = validateSummaryCitations(sample.output, sample.ticketMessages);
  if (!citations.valid) reasons.push(`citation:${citations.reason}`);
  const cited = new Set(sample.output.sourceIds);
  const citedBodies = sample.ticketMessages.filter((message) => cited.has(message.id)).map((message) => normalize(message.body));
  const text = normalize(sample.output.summary);
  const covered = sample.expectedFacts.filter((fact) => text.includes(normalize(fact)));
  if (covered.length !== sample.expectedFacts.length) reasons.push(`grounding:covered ${covered.length}/${sample.expectedFacts.length} expected facts`);
  const unsupportedAttribution = sample.expectedFacts.filter((fact) => !citedBodies.some((body) => body.includes(normalize(fact))));
  if (unsupportedAttribution.length) reasons.push(`source_attribution:${unsupportedAttribution.join(', ')}`);
  const forbidden = sample.forbiddenClaims.filter((claim) => text.includes(normalize(claim)));
  if (forbidden.length) reasons.push(`unsupported_claim:${forbidden.join(', ')}`);
  const score = Math.round((covered.length / Math.max(sample.expectedFacts.length, 1)) * 100);
  return { id: sample.id, passed: reasons.length === 0, score, reasons };
}
export function evaluateDataset(samples: GoldenCase[], minimumPassRate = 0.8, minimumMeanScore = 80) {
  const results = samples.map(evaluateGoldenCase);
  const byId = new Map(samples.map((sample) => [sample.id, sample]));
  const correct = results.filter((result) => result.passed === (byId.get(result.id)?.expected === 'pass')).length;
  const passRate = correct / Math.max(results.length, 1);
  const positive = results.filter((result) => byId.get(result.id)?.expected === 'pass');
  const meanScore = positive.reduce((sum, result) => sum + result.score, 0) / Math.max(positive.length, 1);
  return { results, passRate, meanScore, passed: passRate >= minimumPassRate && meanScore >= minimumMeanScore };
}
