async function request(path, options) {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options,
    });
  } catch {
    const err = new Error('network');
    err.code = 'network';
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'generic');
    err.code = data.error || 'generic';
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  globe: () => request('/api/globe'),
  groups: () => request('/api/groups'),
  invite: (code) => request(`/api/invite/${encodeURIComponent(code)}`),
  catalog: () => request('/api/catalog'),
  survey: (body) =>
    request('/api/survey', { method: 'POST', body: JSON.stringify(body) }),
  family: (body) =>
    request('/api/family', { method: 'POST', body: JSON.stringify(body) }),
};
