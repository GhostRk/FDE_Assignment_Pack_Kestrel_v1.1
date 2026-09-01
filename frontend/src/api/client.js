async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.provider_message || `Request failed (${response.status})`);
  return body;
}

export const api = {
  service: (groupBy) => request(`/api/service/performance?group_by=${groupBy}`),
  coldChain: () => request('/api/cold-chain/overview'),
  money: () => request('/api/money/overview'),
  prices: (city) => request(`/api/prices/position?city=${encodeURIComponent(city)}`),
  syncMoney: () => request('/api/money/sync-freight-invoices?from=2026-04-01&to=2026-06-30', { method: 'POST' }),
  syncPrices: () => request('/api/prices/sync-competitor-prices', { method: 'POST' }),
  ask: (question, previousInteractionId) => request('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ question, ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}) }),
  }),
};
