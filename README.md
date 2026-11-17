# Playwright AI Summary Release Gate

A Git-importable TypeScript project for a support-ticket summary workflow. It combines a local deterministic dashboard, Playwright UI/API tests, runtime response-contract validation, a curated semantic golden set, version metadata, and an optional non-blocking live-model canary.

**Local/PR execution requires no model credentials, paid services, or external AI calls.** The live canary is a separate opt-in workflow and is skipped when no endpoint is configured.

## Requirements and setup

- Node.js 22 (Node 20+ should work)
- npm

```bash
git clone https://github.com/Aakshay30/ai-summary-quality-release-gate.git
cd ai-summary-quality-release-gate
npm install --no-audit --no-fund
npx playwright install chromium
cp .env.example .env # optional; defaults already work
```

## Run the app and release checks

```bash
npm run dev                 # http://127.0.0.1:4173
npm run build               # strict TypeScript compile
npm run test:contracts      # upstream response schema contract
npm run test:evaluation     # deterministic golden dataset + thresholds
npm run test:api            # server-side ownership and citation enforcement
npm test                    # Playwright browser acceptance suite
npm run check               # all blocking checks in sequence
```

The local adapter is synthetic and deterministic. Playwright intercepts the generation HTTP boundary per test; API tests call the actual local approval endpoint. Every test gets an isolated browser context and test-owned route handler.

## Feature behavior covered

| Response | Expected behavior | Release coverage |
|---|---|---|
| `200 { status: "ok", summary, sourceIds }` | Render summary; enable approval only when citations belong to current ticket | UI + domain + API |
| `200 { status: "insufficient_information" }` | Show explicit insufficient-information state; approval disabled | UI + contract |
| `503 { error: "unavailable" }` | Show error and retry; approval disabled until valid retry | UI |
| Missing/cross-ticket citations | Ineligible for approval | UI + server API + golden evaluation |

Summary wording is not asserted verbatim in UI tests.

## Additional controls

### Server-side approval authorization and citation validation

`POST /api/tickets/:ticketId/approve` is the authoritative write boundary. It reloads the ticket from the server's canonical in-memory fixture, checks that the authenticated principal is the ticket's assigned agent, validates a non-empty summary, requires at least one citation, and rejects every citation ID not present on that ticket. Only then does it create an approval record and return `201`.

The demo uses `x-agent-id` with a default of `agent-1` to make the fixture runnable without credentials. **This is a local authentication adapter, not production authentication.** Replace `demoPrincipal` with verified session/JWT middleware and derive the agent identity from the verified principal; never trust a caller-controlled identity header in production. The browser's citation check is only a usability optimization; the server is authoritative.

### AI response contract tests

`src/contracts/summary-contract.ts` is a strict runtime parser for the three supported response variants. It rejects unknown discriminators, empty summary text, empty/malformed citation arrays, and unexpected properties. `tests/contracts` tests valid variants and schema drift. The local adapter validates its upstream-shaped response before returning it.

### Curated semantic golden evaluation

`data/golden/summary-cases.json` contains acceptable and unacceptable synthetic cases. The deterministic evaluator checks attribution, grounding, and unsupported certainty. This is a regression evaluator, not a general natural-language entailment engine; it does not establish full factuality, completeness, fairness, or quality for arbitrary paraphrases.

Blocking thresholds are at least **80% classification accuracy** across positive and negative examples and at least **80% mean expected-fact coverage** on positive examples.

### Prompt/model version tracking

Set `PROMPT_VERSION` and `MODEL_VERSION` in the runtime environment. Defaults are `ticket-summary-v1.2.0` and `local-mock-v1`. `/api/meta` exposes both values.

### Separate non-blocking live-model canary

`.github/workflows/model-canary.yml` is independent of the PR release gate. It can run manually or weekly. Configure repository variable `AI_CANARY_ENDPOINT` to an internal adapter implementing the documented request/response interface. Optionally configure secret `AI_CANARY_API_KEY`, plus variables `MODEL_CANDIDATE_VERSION` and `PROMPT_VERSION`.

The canary is advisory (`continue-on-error: true`) and never blocks the main release gate. It writes `canary-results.json` and uploads it as an artifact. It is provider-neutral and is not wired to a specific model vendor.

## Release-blocking policy

The `AI summary release gate` workflow blocks PR merge/release on any failure in the TypeScript build, contract tests, deterministic golden-set evaluation, server API tests, or Playwright UI tests. The separate live-model canary is non-blocking.

## Test boundary

- Playwright UI tests: visible states, disabled/enabled approval, retry, and user interaction.
- API tests: actual server ownership and citation enforcement.
- Contract tests: shape/discriminator/type compatibility at the model-service boundary.
- Golden evaluation: deterministic fact coverage, source attribution, and selected risk heuristics.
- Live canary: candidate-model behavior against the curated set, isolated from blocking PR CI.

## Production hardening backlog

- Replace demo header identity with OIDC/JWT/session authentication and role-based ticket access.
- Persist tickets, generated summaries, approvals, and immutable prompt/model/dataset audit metadata.
- Bind approval to a server-issued generation ID or signed summary artifact; make approval idempotent.
- Expand goldens with paraphrases, negation, dates, amounts, multi-language cases, PII leakage, policy violations, and prompt injection.
- Calibrate semantic judge/human review agreement; monitor citation precision/recall, unsupported-claim rate, refusal rate, latency, and cost.
- Add cross-browser, accessibility, load, and security tests.
