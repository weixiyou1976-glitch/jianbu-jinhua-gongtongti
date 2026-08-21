const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token, admin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = admin ? localStorage.getItem('adminPassword') : token || localStorage.getItem('token');
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error((isJson && data.error) || '请求失败，请稍后重试');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getCurrentSkill: () => request('/skills/current'),
  getSkills: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/skills${qs ? `?${qs}` : ''}`);
  },
  getSkill: (id) => request(`/skills/${id}`),
  submitStamp: (id, payload) => request(`/skills/${id}/stamp`, { method: 'POST', body: payload }),
  getStamps: () => request('/stamps'),
  getProgress: () => request('/progress'),

  adminGenerateCodes: (count) => request('/admin/activation-codes', { method: 'POST', body: { count }, admin: true }),
  adminListCodes: () => request('/admin/activation-codes', { admin: true }),
  adminListStudents: () => request('/admin/students', { admin: true }),
  adminListSkills: () => request('/admin/skills', { admin: true }),
  adminCreateSkill: (payload) => request('/admin/skills', { method: 'POST', body: payload, admin: true }),
  adminUpdateSkill: (id, payload) => request(`/admin/skills/${id}`, { method: 'PUT', body: payload, admin: true }),
  adminDeleteSkill: (id) => request(`/admin/skills/${id}`, { method: 'DELETE', admin: true }),
};

export const API_BASE_URL = API_BASE;
