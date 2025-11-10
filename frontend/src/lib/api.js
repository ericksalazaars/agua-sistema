const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function http(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => http("GET", "/health"),
  listClients: (q) => http("GET", `/clients${q?`?q=${encodeURIComponent(q)}`:""}`),
  getClient: (id) => http("GET", `/clients/${id}`),
  createClient: (data) => http("POST", "/clients", data),
  updateClient: (id, data) => http("PUT", `/clients/${id}`, data),
  deleteClient: (id) => http("DELETE", `/clients/${id}`),

  createVisit: (data) => http("POST", "/visits", data),
  listVisits: (date, clientId) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (clientId) params.set("clientId", clientId);
    return http("GET", `/visits?${params.toString()}`);
  },
  deleteVisit: (id) => http("DELETE", `/visits/${id}`),
};
