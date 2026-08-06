const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export async function submitReport(token, reportData) {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(reportData)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit report');
  }
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Login failed');
    err.requiresVerification = data.requiresVerification;
    err.email = data.email;
    err.purpose = data.purpose;
    throw err;
  }
  return data; // { message, email, purpose } — no token yet, OTP step follows
}

export async function register(name, email, phone, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.errors && data.errors[0]?.msg) || data.error || 'Registration failed');
  return data; // { message, email, purpose }
}

export async function verifyOtp(email, code, purpose) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, purpose })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verification failed');
  return data; // { token, user }
}

export async function resendOtp(email, purpose) {
  const res = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to resend code');
  return data;
}

export async function getReport(token, id) {
  const res = await fetch(`${API_BASE}/reports/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
}

export async function fetchReports(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/reports${params ? `?${params}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function fetchAnalytics(token) {
  const res = await fetch(`${API_BASE}/reports/analytics/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchHotspots(token) {
  const res = await fetch(`${API_BASE}/reports/analytics/hotspots`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch hotspots');
  return res.json();
}

export async function fetchTrends(token) {
  const res = await fetch(`${API_BASE}/reports/analytics/trends`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
}

export async function fetchHotspotTrends(token) {
  const res = await fetch(`${API_BASE}/reports/analytics/hotspot-trends`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch hotspot trends');
  return res.json();
}

export async function fetchPriorityQueue(token) {
  const res = await fetch(`${API_BASE}/reports/priority-queue`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch priority queue');
  return res.json();
}

export async function fetchDuplicateCandidates(token, reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/duplicates`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch duplicate candidates');
  return res.json();
}

export async function mergeReports(token, reportId, originalReportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ original_report_id: originalReportId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to merge reports');
  }
  return res.json();
}

export async function unmergeReports(token, reportId, linkId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/merge/${linkId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to unmerge reports');
  return res.json();
}

export async function reassignReport(token, reportId, updates) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/reassign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to reassign report');
  }
  return res.json();
}

export async function fetchDepartments(token) {
  const res = await fetch(`${API_BASE}/reports/departments/list`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

export async function verifyPhoto(token, file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_BASE}/reports/verify-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Photo verification failed');
  return res.json();
}

export async function fetchFeed(token) {
  const res = await fetch(`${API_BASE}/reports/feed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
}

export async function fetchComments(token, reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/comments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function postComment(token, reportId, text) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to post comment');
  }
  return res.json();
}

export async function deleteComment(token, reportId, commentId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete comment');
  return res.json();
}

export async function approveComment(token, reportId, commentId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/comments/${commentId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to approve comment');
  return res.json();
}

export async function fetchNotifications(token) {
  const res = await fetch(`${API_BASE}/reports/notifications/list`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(token, id) {
  const res = await fetch(`${API_BASE}/reports/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to mark notification read');
  return res.json();
}

export async function markAllNotificationsRead(token) {
  const res = await fetch(`${API_BASE}/reports/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to mark notifications read');
  return res.json();
}

export async function voteReport(token, reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}/vote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to vote');
  }
  return res.json();
}

export async function chatWithBot(token, message) {
  const res = await fetch(`${API_BASE}/reports/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Chatbot unavailable');
  return res.json();
}

export async function updateReportStatus(token, id, status) {
  const res = await fetch(`${API_BASE}/reports/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}