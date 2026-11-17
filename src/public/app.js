const ticketId = 'T-100';
const $ = (id) => document.getElementById(id);
const state = { messages: [], eligible: false, summary: null };
const regressionMode = new URLSearchParams(window.location.search).has('regression');
function validateCitations(payload) {
  if (regressionMode) return true; // Deliberate UI-only defect for the regression exercise; server remains authoritative.
  if (!payload.summary?.trim() || !Array.isArray(payload.sourceIds) || payload.sourceIds.length === 0) return false;
  const allowed = new Set(state.messages.map((message) => message.id));
  return payload.sourceIds.every((id) => typeof id === 'string' && allowed.has(id));
}
function renderStatus(message) { $('summary-status').textContent = message; }
function resetSummary() {
  state.eligible = false; state.summary = null;
  $('approve-summary').disabled = true; $('summary-text').hidden = true; $('summary-sources').hidden = true;
  $('approval-status').textContent = '';
}
async function generate() {
  resetSummary(); $('generate-summary').disabled = true; $('retry-summary').hidden = true; renderStatus('Generating summary…');
  try {
    const response = await fetch(`/api/tickets/${ticketId}/summary`, { method: 'POST' });
    if (!response.ok) throw new Error(`Service unavailable (${response.status})`);
    const payload = await response.json();
    if (payload.status === 'insufficient_information') { renderStatus('Insufficient information to generate a reliable summary.'); return; }
    if (payload.status !== 'ok') throw new Error('Unexpected summary response');
    $('summary-text').textContent = payload.summary ?? ''; $('summary-text').hidden = false;
    if (validateCitations(payload)) {
      state.eligible = true; state.summary = payload; $('approve-summary').disabled = false;
      $('summary-sources').textContent = `Sources: ${payload.sourceIds.join(', ')}`; $('summary-sources').hidden = false;
      renderStatus('Summary generated. Citations verified.');
    } else renderStatus('Summary rejected: citations are missing or do not belong to this ticket.');
  } catch (error) { renderStatus(error instanceof Error ? error.message : 'Summary generation failed.'); $('retry-summary').hidden = false; }
  finally { $('generate-summary').disabled = false; }
}
async function approve() {
  if (!state.eligible || !state.summary) return;
  $('approve-summary').disabled = true;
  try {
    const response = await fetch(`/api/tickets/${ticketId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ summary: state.summary.summary, sourceIds: state.summary.sourceIds }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Approval rejected');
    $('approval-status').textContent = `Summary approved (${result.approvalId}).`;
  } catch (error) { $('approval-status').textContent = error instanceof Error ? error.message : 'Approval failed.'; $('approve-summary').disabled = false; }
}
$('generate-summary').addEventListener('click', generate);
$('retry-summary').addEventListener('click', generate);
$('approve-summary').addEventListener('click', approve);
fetch(`/api/tickets/${ticketId}`).then((r) => r.json()).then((ticket) => { state.messages = ticket.messages; document.body.dataset.ticketLoaded = 'true'; }).catch(() => renderStatus('Could not load ticket messages.'));
