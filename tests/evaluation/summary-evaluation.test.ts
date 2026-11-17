import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateDataset, type GoldenCase } from '../../src/evaluation/evaluator';
const cases = JSON.parse(readFileSync('data/golden/summary-cases.json', 'utf8')) as GoldenCase[];
test('curated golden dataset meets accuracy and grounding thresholds', () => {
  const result = evaluateDataset(cases, 0.8, 80);
  assert.equal(result.passed, true, JSON.stringify(result, null, 2));
  assert.ok(result.passRate >= 0.8);
  assert.ok(result.meanScore >= 80);
});
test('golden set contains both positive and negative examples', () => {
  assert.ok(cases.some((sample) => sample.expected === 'pass'));
  assert.ok(cases.some((sample) => sample.expected === 'fail'));
});
