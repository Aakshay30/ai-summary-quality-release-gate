import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateSummaryCitations } from './domain/summary';
import { parseSummaryServiceResponse } from './contracts/summary-contract';

const app = express();
const port = Number(process.env.PORT ?? 4173);
const publicDir = path.join(process.cwd(), 'src', 'public');
export const PROMPT_VERSION = process.env.PROMPT_VERSION ?? 'ticket-summary-v1.2.0';
export const MODEL_VERSION = process.env.MODEL_VERSION ?? 'local-mock-v1';
const tickets = {
  'T-100': { id: 'T-100', subject: 'Package marked delivered but missing', assignedAgentId: 'agent-1', messages: [
    { id: 'm1', body: 'Customer says package was marked delivered yesterday but is not at the door.' },
    { id: 'm2', body: 'Agent confirmed the delivery address and suggested checking with building reception.' },
  ] },
  'T-200': { id: 'T-200', subject: 'Refund status', assignedAgentId: 'agent-2', messages: [{ id: 'x1', body: 'Customer asks when their refund will arrive.' }] },
} as const;
type TicketId = keyof typeof tickets;
const approvals = new Map<string, { ticketId: string; agentId: string; approvedAt: string; summary: string; sourceIds: string[]; promptVersion: string; modelVersion: string }>();
app.use(express.json());
app.use(express.static(publicDir));

// Demo authentication adapter. Production must replace this with verified session/JWT middleware.
function demoPrincipal(req: Request, res: Response, next: NextFunction) {
  const agentId = req.header('x-agent-id') ?? 'agent-1';
  if (!agentId) return res.status(401).json({ error: 'unauthenticated' });
  res.locals.agentId = agentId;
  next();
}
app.use('/api', demoPrincipal);
app.get('/api/meta', (_req, res) => res.json({ promptVersion: PROMPT_VERSION, modelVersion: MODEL_VERSION }));
app.get('/api/tickets/:ticketId', (req, res) => {
  const ticket = tickets[req.params.ticketId as TicketId];
  if (!ticket) return res.status(404).json({ error: 'not_found' });
  return res.json({ id: ticket.id, subject: ticket.subject, messages: ticket.messages });
});

// Deterministic local adapter; this is the only generation boundary in the no-credentials demo.
app.post('/api/tickets/:ticketId/summary', (req, res) => {
  const ticket = tickets[req.params.ticketId as TicketId];
  if (!ticket) return res.status(404).json({ error: 'not_found' });
  const upstream = { status: 'ok', summary: 'The package is marked delivered, but the customer cannot locate it. The agent verified the address and suggested checking reception.', sourceIds: ['m1', 'm2'] };
  const parsed = parseSummaryServiceResponse(upstream);
  if (!parsed.success) return res.status(502).json({ error: 'invalid_upstream_contract', issues: parsed.issues });
  return res.json({ ...parsed.data, promptVersion: PROMPT_VERSION, modelVersion: MODEL_VERSION });
});

// Security invariant: the server loads the canonical ticket and independently checks ownership + citations.
app.post('/api/tickets/:ticketId/approve', (req, res) => {
  const ticket = tickets[req.params.ticketId as TicketId];
  if (!ticket) return res.status(404).json({ error: 'not_found' });
  const agentId = res.locals.agentId as string;
  if (ticket.assignedAgentId !== agentId) return res.status(403).json({ error: 'ticket_not_owned_by_agent' });
  const body = (req.body ?? {}) as { summary?: unknown; sourceIds?: unknown };
  if (typeof body.summary !== 'string' || !Array.isArray(body.sourceIds) || body.sourceIds.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'invalid_approval_payload' });
  }
  const validation = validateSummaryCitations({ summary: body.summary, sourceIds: body.sourceIds as string[] }, ticket.messages);
  if (!validation.valid) return res.status(422).json({ error: 'summary_not_approvable', reason: validation.reason });
  const approvalId = randomUUID();
  approvals.set(approvalId, { ticketId: ticket.id, agentId, approvedAt: new Date().toISOString(), summary: body.summary, sourceIds: body.sourceIds as string[], promptVersion: PROMPT_VERSION, modelVersion: MODEL_VERSION });
  return res.status(201).json({ approvalId, status: 'approved', promptVersion: PROMPT_VERSION, modelVersion: MODEL_VERSION });
});

if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`Support dashboard listening on http://127.0.0.1:${port}`));
export { app };
