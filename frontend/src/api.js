import { getDeviceFingerprint, getDeviceName } from './lib/deviceFingerprint';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token, admin, trial } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = admin
    ? localStorage.getItem('adminPassword')
    : trial
    ? localStorage.getItem('trialToken')
    : token || localStorage.getItem('token');
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    if (isJson && data.locked) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      try {
        sessionStorage.setItem('lockedMessage', data.error);
      } catch {
        // 忽略隐私模式下sessionStorage不可用的情况
      }
      window.dispatchEvent(new Event('account-locked'));
    }
    throw new Error((isJson && data.error) || '请求失败，请稍后重试');
  }
  return data;
}

async function streamRequest(path, body, { trial } = {}) {
  const token = trial ? localStorage.getItem('trialToken') : localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = '陪练暂时休息中，请稍后再试';
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // 忽略非JSON错误体
    }
    throw new Error(message);
  }
  return res.body;
}

function withDevice(payload) {
  return { ...payload, device_fingerprint: getDeviceFingerprint(), device_name: getDeviceName() };
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: withDevice(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: withDevice(payload) }),
  getMe: () => request('/auth/me'),
  getCurrentSkill: () => request('/skills/current'),
  getSkills: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/skills${qs ? `?${qs}` : ''}`);
  },
  getSkill: (id) => request(`/skills/${id}`),
  searchSkills: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/skills/search${qs ? `?${qs}` : ''}`);
  },
  matchSkills: (query) => request('/skills/match', { method: 'POST', body: { query } }),
  getModules: () => request('/modules'),
  getModule: (slug) => request(`/modules/${slug}`),
  submitStamp: (id, payload) => request(`/skills/${id}/stamp`, { method: 'POST', body: payload }),
  getSkillStamps: (id) => request(`/skills/${id}/stamps`),
  getStamps: () => request('/stamps'),
  getProgress: () => request('/progress'),
  checkin: () => request('/checkin', { method: 'POST' }),
  getCoachHistory: (skill_id) => request(`/coach/${skill_id}/history`),
  resetCoach: (skill_id) => request(`/coach/${skill_id}`, { method: 'DELETE' }),
  coachMessage: (skill_id, message) => streamRequest('/coach/message', { skill_id, message }),

  getTodayQuote: () => request('/quotes/today'),
  saveQuote: (skill_id, quote_content) => request('/quotes/save', { method: 'POST', body: { skill_id, quote_content } }),
  getSavedQuotes: () => request('/quotes/saved'),

  trialStart: (wechat_id, referral) =>
    request('/trial/start', { method: 'POST', body: { wechat_id, ...referral } }),
  trialMatch: (concern) => request('/trial/match', { method: 'POST', body: { concern }, trial: true }),
  getTrialSkill: () => request('/trial/skill', { trial: true }),
  getTrialCoachHistory: () => request('/trial/coach/history', { trial: true }),
  trialCoachMessage: (skill_id, message) =>
    streamRequest('/trial/coach/message', { skill_id, message }, { trial: true }),

  recordShare: (skill_id, share_type) =>
    request('/referral/share', { method: 'POST', body: { skill_id, share_type } }),
  recordReferralClick: (ref, skill_id, share_type) =>
    request('/referral/click', { method: 'POST', body: { ref, skill_id, share_type } }),
  trackReferralClick: (ref) =>
    request('/referral/track-click', { method: 'POST', body: { ref, device_fingerprint: getDeviceFingerprint() } }),

  getPendingRewards: () => request('/rewards/pending'),
  markRewardNotified: (id) => request(`/rewards/${id}/mark-notified`, { method: 'POST' }),
  getMyRewards: () => request('/rewards/me'),

  adminGenerateCodes: (count) => request('/admin/activation-codes', { method: 'POST', body: { count }, admin: true }),
  adminListCodes: () => request('/admin/activation-codes', { admin: true }),
  adminListStudents: () => request('/admin/students', { admin: true }),
  adminResetPassword: (id) => request(`/admin/students/${id}/reset-password`, { method: 'POST', admin: true }),
  adminListTrialUsers: () => request('/admin/trial-users', { admin: true }),
  adminUpdateTrialUser: (id, payload) =>
    request(`/admin/trial-users/${id}`, { method: 'PUT', body: payload, admin: true }),
  adminListReferrals: () => request('/admin/referrals', { admin: true }),
  adminSettleReferrals: (userId) =>
    request(`/admin/referrals/${userId}/settle`, { method: 'PUT', admin: true }),
  adminGetReferralSettings: () => request('/admin/referral-settings', { admin: true }),
  adminUpdateReferralSettings: (commission_per_conversion) =>
    request('/admin/referral-settings', { method: 'PUT', body: { commission_per_conversion }, admin: true }),
  adminListSkills: () => request('/admin/skills', { admin: true }),
  adminCreateSkill: (payload) => request('/admin/skills', { method: 'POST', body: payload, admin: true }),
  adminUpdateSkill: (id, payload) => request(`/admin/skills/${id}`, { method: 'PUT', body: payload, admin: true }),
  adminDeleteSkill: (id) => request(`/admin/skills/${id}`, { method: 'DELETE', admin: true }),

  adminListModules: () => request('/admin/modules', { admin: true }),
  adminGetModule: (id) => request(`/admin/modules/${id}`, { admin: true }),
  adminCreateModule: (payload) => request('/admin/modules', { method: 'POST', body: payload, admin: true }),
  adminUpdateModule: (id, payload) => request(`/admin/modules/${id}`, { method: 'PUT', body: payload, admin: true }),
  adminDeleteModule: (id) => request(`/admin/modules/${id}`, { method: 'DELETE', admin: true }),

  adminListSecurity: () => request('/admin/security', { admin: true }),
  adminUnlockAccount: (userId, resetDevices) =>
    request(`/admin/security/${userId}/unlock`, { method: 'POST', body: { reset_devices: resetDevices }, admin: true }),
  adminClearDevices: (userId) => request(`/admin/security/${userId}/clear-devices`, { method: 'POST', admin: true }),

  adminListReferralRewards: () => request('/admin/referral-rewards', { admin: true }),
  adminAdjustReferralCounts: (id, payload) =>
    request(`/admin/referral-rewards/${id}/adjust`, { method: 'PUT', body: payload, admin: true }),
  adminSetCommissionRate: (id, referral_commission_rate) =>
    request(`/admin/referral-rewards/${id}/commission-rate`, { method: 'PUT', body: { referral_commission_rate }, admin: true }),

  adminListFangsVoice: () => request('/admin/fangs-voice', { admin: true }),
  adminCreateFangsVoice: (payload) => request('/admin/fangs-voice', { method: 'POST', body: payload, admin: true }),
  adminUpdateFangsVoice: (id, payload) => request(`/admin/fangs-voice/${id}`, { method: 'PUT', body: payload, admin: true }),
  adminDeleteFangsVoice: (id) => request(`/admin/fangs-voice/${id}`, { method: 'DELETE', admin: true }),

  adminRecordPayment: (id, payload) => request(`/admin/students/${id}/record-payment`, { method: 'POST', body: payload, admin: true }),
  adminListCommissions: () => request('/admin/commissions', { admin: true }),
  adminSettleCommissions: (beneficiaryId) =>
    request(`/admin/commissions/${beneficiaryId}/settle`, { method: 'PUT', admin: true }),
};

export const API_BASE_URL = API_BASE;
