/* ============================================
   DASHBOARD.JS — Sender Dashboard Logic
   Date Request Platform
   ============================================ */

'use strict';

// ── State ──
const DASH = {
  requests: [],
  notifications: [],
  unreadCount: 0,
  ws: null,
  currentPage: 1,
  perPage: 10,
  activeSection: 'overview',
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  renderUserInfo();
  loadDashboard();
  initWebSocket();
  initNavigation();
});

// ============================================
// USER INFO
// ============================================
function renderUserInfo() {
  const user = getUser();
  if (!user) return;
  const nameEls = document.querySelectorAll('[data-user-name]');
  const avatarEls = document.querySelectorAll('[data-user-avatar]');
  nameEls.forEach(el => el.textContent = user.fullName || user.username);
  avatarEls.forEach(el => {
    const initials = (user.fullName || user.username || 'U')
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    el.textContent = initials;
  });
}

// ============================================
// LOAD DASHBOARD
// ============================================
async function loadDashboard() {
  showSectionLoading('overview');
  const [statsRes, requestsRes, notifsRes] = await Promise.all([
    apiFetch('/dashboard/stats'),
    apiFetch('/requests'),
    apiFetch('/dashboard/notifications'),
  ]);

  if (statsRes?.ok)    renderStats(statsRes.data);
  if (requestsRes?.ok) renderRequests(requestsRes.data);
  if (notifsRes?.ok)   renderNotifications(notifsRes.data);
}

// ============================================
// STATS
// ============================================
function renderStats(stats) {
  const cards = [
    { id: 'stat-requests',  value: stats.totalRequests,  label: '📋 Total Requests',  icon: '📋' },
    { id: 'stat-views',     value: stats.totalViews,     label: '👁️ Total Views',     icon: '👁️' },
    { id: 'stat-responses', value: stats.totalResponses, label: '💌 Responses',        icon: '💌' },
    { id: 'stat-yesrate',   value: `${stats.yesRate || 0}%`, label: '❤️ YES Rate',    icon: '❤️' },
  ];

  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  grid.innerHTML = cards.map(c => `
    <div class="stat-card animate-fade-in-up glass-card">
      <div class="stat-card__icon">${c.icon}</div>
      <div class="stat-card__value" id="${c.id}">${c.value}</div>
      <div class="stat-card__label">${c.label}</div>
    </div>
  `).join('');

  // Animate numbers
  setTimeout(() => {
    cards.forEach(c => {
      const el = document.getElementById(c.id);
      const num = parseInt(c.value);
      if (el && !isNaN(num)) countUp(el, num, 1200);
    });
  }, 200);
}

// ============================================
// REQUESTS
// ============================================
function renderRequests(data) {
  DASH.requests = data.requests || [];
  const container = document.getElementById('requests-list');
  if (!container) return;

  if (DASH.requests.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-16);color:var(--color-text-muted);">
        <div style="font-size:3rem;margin-bottom:var(--space-4);">💌</div>
        <h3 style="font-family:var(--font-display);margin-bottom:var(--space-2);">No requests yet</h3>
        <p>Create your first Date Request and share it with someone special!</p>
        <button class="btn btn-primary" style="margin-top:var(--space-6);" onclick="openCreateModal()">
          ✨ Create Date Request
        </button>
      </div>`;
    return;
  }

  container.innerHTML = DASH.requests.map((req, i) => `
    <div class="request-card glass-card animate-fade-in-up" style="animation-delay:${i*60}ms;margin-bottom:var(--space-4);padding:var(--space-6);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-3);">
        <div>
          <h3 style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-secondary);margin-bottom:var(--space-1);">
            💌 Date Request #${req.id.toString().slice(-4)}
          </h3>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);">
            Created: ${new Date(req.createdAt).toLocaleString()}
          </p>
        </div>
        <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
          <span class="badge ${req.isActive ? 'badge-success' : 'badge-danger'}">
            ${req.isActive ? '✅ Active' : '⏸️ Inactive'}
          </span>
        </div>
      </div>

      <div style="background:rgba(255,107,157,0.06);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);margin:var(--space-4) 0;display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
        <span style="font-size:var(--text-sm);color:var(--color-text-secondary);word-break:break-all;flex:1;">
          🔗 ${window.location.origin}/date/${req.token}
        </span>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="copyLink('${req.token}')" title="Copy link">📋 Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="shareLink('${req.token}')" title="Share link">🔗 Share</button>
        </div>
      </div>

      <div style="display:flex;gap:var(--space-6);margin-bottom:var(--space-4);">
        <span style="font-size:var(--text-sm);color:var(--color-text-muted);">👁️ <b>${req.viewCount || 0}</b> Views</span>
        <span style="font-size:var(--text-sm);color:var(--color-text-muted);">💌 <b>${req.responseCount || 0}</b> Responses</span>
      </div>

      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="viewResponses('${req.uuid}')">💌 Responses</button>
        <button class="btn btn-ghost btn-sm" onclick="viewAnalytics('${req.uuid}')">📊 Analytics</button>
        <button class="btn btn-ghost btn-sm" onclick="editRequest('${req.uuid}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRequest('${req.uuid}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// CREATE REQUEST MODAL
// ============================================
function openCreateModal() {
  openModal('create-modal');
}

async function createRequest(e) {
  e.preventDefault();
  const secretLetter = document.getElementById('secret-letter')?.value.trim();
  const themeColor   = document.getElementById('theme-color')?.value || '#FF6B9D';
  const submitBtn    = document.getElementById('create-btn');

  setLoading(submitBtn, true);
  const res = await apiFetch('/requests', {
    method: 'POST',
    body: JSON.stringify({ secretLetter, themeColor }),
  });
  setLoading(submitBtn, false);

  if (res?.ok) {
    closeModal('create-modal');
    showToast('Date Request created! 🎉 Share the link!', 'success');
    // Copy link automatically
    const token = res.data.token;
    fallbackCopy(`${window.location.origin}/date/${token}`);
    loadDashboard();
  } else {
    showToast(res?.data?.message || 'Failed to create request', 'error');
  }
}

// ============================================
// LINK ACTIONS
// ============================================
function copyLink(token) {
  fallbackCopy(`${window.location.origin}/date/${token}`);
}

function shareLink(token) {
  webShare(
    '💌 My Date Request',
    'I made something special for you... 💕',
    `${window.location.origin}/date/${token}`
  );
}

// ============================================
// DELETE REQUEST
// ============================================
async function deleteRequest(uuid) {
  if (!confirm('Delete this Date Request? This cannot be undone.')) return;
  const res = await apiFetch(`/requests/${uuid}`, { method: 'DELETE' });
  if (res?.ok) {
    showToast('Request deleted', 'success');
    loadDashboard();
  } else {
    showToast('Failed to delete request', 'error');
  }
}

// ============================================
// VIEW RESPONSES
// ============================================
async function viewResponses(requestUuid) {
  showSection('responses');
  const container = document.getElementById('responses-list');
  if (container) container.innerHTML = '<div class="spinner" style="margin:40px auto;"></div>';

  const res = await apiFetch(`/responses?requestId=${requestUuid}`);
  if (!res?.ok) { showToast('Failed to load responses', 'error'); return; }

  const responses = res.data.responses || [];
  if (!container) return;

  if (responses.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:var(--space-12);color:var(--color-text-muted);">
      <div style="font-size:3rem;">💌</div>
      <p style="margin-top:var(--space-4);">No responses yet. Share your link!</p>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Receiver</th>
            <th>Date</th>
            <th>Place</th>
            <th>Food</th>
            <th>Love ❤️</th>
            <th>Country</th>
            <th>Device</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${responses.map((r, i) => `
            <tr>
              <td>${i+1}</td>
              <td><b>${sanitizeHTML(r.receiverName || 'Anonymous')}</b></td>
              <td>${r.selectedDate ? new Date(r.selectedDate).toLocaleDateString() : '—'}</td>
              <td>${sanitizeHTML(r.selectedPlace || '—')}</td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(r.selectedFoods||[]).join(', ') || '—'}</td>
              <td><b style="color:var(--color-primary);">${r.loveMeter || 0}%</b></td>
              <td>${r.country || '—'}</td>
              <td>${r.deviceType || '—'}</td>
              <td><span class="badge ${r.status==='confirmed'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'}">${r.status||'pending'}</span></td>
              <td><button class="btn btn-ghost btn-sm" onclick="viewResponseDetail('${r.uuid}')">👁️ View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">
      <button class="btn btn-secondary btn-sm" onclick="exportData('csv','${requestUuid}')">📥 Export CSV</button>
      <button class="btn btn-ghost btn-sm" onclick="exportData('pdf','${requestUuid}')">📄 Export PDF</button>
    </div>
  `;
}

// ============================================
// RESPONSE DETAIL MODAL
// ============================================
async function viewResponseDetail(uuid) {
  const res = await apiFetch(`/responses/${uuid}`);
  if (!res?.ok) { showToast('Failed to load response', 'error'); return; }
  const r = res.data;

  const body = document.getElementById('response-detail-body');
  if (!body) return;

  const fields = [
    ['Receiver',  sanitizeHTML(r.receiverName || '—')],
    ['Date',      r.selectedDate ? new Date(r.selectedDate).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—'],
    ['Time',      r.selectedTime || '—'],
    ['Food',      (r.selectedFoods||[]).join(', ') || '—'],
    ['Place',     sanitizeHTML(r.selectedPlace || '—')],
    ['Activity',  sanitizeHTML(r.selectedActivity || '—')],
    ['Love Meter',`${r.loveMeter || 0}% 💕`],
    ['Message',   r.personalMessage ? `"${sanitizeHTML(r.personalMessage)}"` : '(none)'],
    ['Submitted', r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'],
    ['Country',   r.country || '—'],
    ['Device',    r.deviceType || '—'],
    ['Browser',   r.browser || '—'],
    ['IP Address',r.ipAddress || '—'],
    ['Status',    `<span class="badge ${r.status==='confirmed'?'badge-success':'badge-warning'}">${r.status||'pending'}</span>`],
  ];

  body.innerHTML = fields.map(([k,v]) => `
    <div style="display:flex;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid rgba(255,107,157,0.08);">
      <span style="width:120px;flex-shrink:0;font-size:var(--text-sm);font-weight:700;color:var(--color-text-muted);">${k}</span>
      <span style="flex:1;color:var(--color-text-primary);">${v}</span>
    </div>
  `).join('');

  openModal('response-detail-modal');
}

// ============================================
// EXPORT
// ============================================
async function exportData(format, requestId = '') {
  const url = `/api/v1/dashboard/export?format=${format}${requestId ? `&requestId=${requestId}` : ''}`;
  const token = localStorage.getItem('access_token');
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { showToast('Export failed', 'error'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `date-requests-export.${format}`;
    a.click();
    showToast(`Exported as ${format.toUpperCase()} 📥`, 'success');
  } catch {
    showToast('Export failed', 'error');
  }
}

// ============================================
// ANALYTICS
// ============================================
async function viewAnalytics(requestUuid) {
  showSection('analytics');
  const res = await apiFetch(`/requests/${requestUuid}/analytics`);
  if (!res?.ok) { showToast('Failed to load analytics', 'error'); return; }
  renderAnalyticsCharts(res.data);
}

function renderAnalyticsCharts(data) {
  renderBarChart('food-chart', 'Food Popularity', data.foods || {});
  renderBarChart('place-chart', 'Place Popularity', data.places || {});
  renderBarChart('activity-chart', 'Activity Popularity', data.activities || {});
  renderResponsesOverTime('time-chart', data.responsesOverTime || []);

  const avgLove = document.getElementById('avg-love');
  if (avgLove && data.avgLoveMeter !== undefined) {
    avgLove.textContent = `${Math.round(data.avgLoveMeter)}%`;
  }
}

function renderBarChart(canvasId, title, dataObj) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const labels = Object.keys(dataObj);
  const values = Object.values(dataObj);
  const maxVal = Math.max(...values, 1);

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width  = canvas.parentElement?.offsetWidth || 300;
  canvas.height = 220;

  const padding = { top: 20, right: 10, bottom: 60, left: 40 };
  const w = canvas.width  - padding.left - padding.right;
  const h = canvas.height - padding.top  - padding.bottom;
  const barW = Math.max(10, w / labels.length - 8);

  // Bars
  labels.forEach((label, i) => {
    const x    = padding.left + i * (w / labels.length) + (w / labels.length - barW) / 2;
    const barH = (values[i] / maxVal) * h;
    const y    = padding.top + h - barH;

    // Gradient
    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    grad.addColorStop(0, '#FF6B9D');
    grad.addColorStop(1, '#C23B77');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Value
    ctx.fillStyle   = '#C23B77';
    ctx.font        = 'bold 11px Nunito, sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText(values[i], x + barW / 2, y - 4);

    // Label
    ctx.fillStyle   = '#9B6B7F';
    ctx.font        = '10px Nunito, sans-serif';
    ctx.save();
    ctx.translate(x + barW / 2, padding.top + h + 12);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.fillText(label.length > 12 ? label.slice(0,11)+'…' : label, 0, 0);
    ctx.restore();
  });

  // Y-axis
  ctx.strokeStyle = 'rgba(255,107,157,0.15)';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + w, y);
    ctx.stroke();
    ctx.fillStyle = '#9B6B7F';
    ctx.font      = '10px Nunito';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal - (maxVal/4)*i), padding.left - 4, y + 4);
  }
}

function renderResponsesOverTime(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.parentElement?.offsetWidth || 400;
  canvas.height = 200;

  const pad = { top:20, right:10, bottom:40, left:40 };
  const w   = canvas.width  - pad.left - pad.right;
  const h   = canvas.height - pad.top  - pad.bottom;
  const max = Math.max(...data.map(d => d.count), 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#FF6B9D';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';

  data.forEach((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * w;
    const y = pad.top + h - (d.count / max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill under line
  ctx.lineTo(pad.left + w, pad.top + h);
  ctx.lineTo(pad.left, pad.top + h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
  grad.addColorStop(0, 'rgba(255,107,157,0.3)');
  grad.addColorStop(1, 'rgba(255,107,157,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Dots
  data.forEach((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * w;
    const y = pad.top + h - (d.count / max) * h;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B9D';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Labels
    ctx.fillStyle  = '#9B6B7F';
    ctx.font       = '10px Nunito';
    ctx.textAlign  = 'center';
    ctx.fillText(d.label || '', x, pad.top + h + 16);
  });
}

// ============================================
// NOTIFICATIONS
// ============================================
function renderNotifications(data) {
  DASH.notifications = data.notifications || [];
  DASH.unreadCount   = data.unreadCount   || 0;

  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent    = DASH.unreadCount > 9 ? '9+' : DASH.unreadCount;
    badge.style.display  = DASH.unreadCount > 0 ? 'flex' : 'none';
  }

  const list = document.getElementById('notif-list');
  if (!list) return;

  if (DASH.notifications.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);font-size:var(--text-sm);">No notifications yet 🔔</div>';
    return;
  }

  list.innerHTML = DASH.notifications.slice(0, 10).map(n => `
    <div class="notif-item" style="display:flex;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-bottom:1px solid rgba(255,107,157,0.08);cursor:pointer;${!n.isRead?'background:rgba(255,107,157,0.04);':''}" 
         onclick="markNotifRead('${n.uuid}', this)">
      <span style="font-size:1.2rem;flex-shrink:0;">💌</span>
      <div>
        <p style="font-size:var(--text-sm);color:var(--color-text-primary);font-weight:${n.isRead?'400':'600'};">${sanitizeHTML(n.message)}</p>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">${new Date(n.createdAt).toLocaleString()}</p>
      </div>
      ${!n.isRead ? '<span style="width:8px;height:8px;background:var(--color-primary);border-radius:50%;flex-shrink:0;margin-top:6px;"></span>' : ''}
    </div>
  `).join('');
}

async function markNotifRead(uuid, el) {
  await apiFetch(`/dashboard/notifications/${uuid}/read`, { method: 'PATCH' });
  el.style.background = '';
  el.querySelector('b') && (el.querySelector('b').style.fontWeight = '400');
  const dot = el.querySelector('span[style*="background:var(--color-primary)"]');
  if (dot) dot.remove();
  DASH.unreadCount = Math.max(0, DASH.unreadCount - 1);
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent   = DASH.unreadCount;
    badge.style.display = DASH.unreadCount > 0 ? 'flex' : 'none';
  }
}

// ============================================
// WEBSOCKET (Real-time Notifications)
// ============================================
function initWebSocket() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    DASH.ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws?token=${token}`);

    DASH.ws.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleWSMessage(msg);
      } catch {}
    });

    DASH.ws.addEventListener('close', () => {
      // Reconnect after 5s
      setTimeout(initWebSocket, 5000);
    });
  } catch (e) {
    console.warn('WebSocket not available:', e.message);
  }
}

function handleWSMessage(msg) {
  if (msg.type === 'new_response') {
    DASH.unreadCount++;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent   = DASH.unreadCount > 9 ? '9+' : DASH.unreadCount;
      badge.style.display = 'flex';
      badge.style.animation = 'none';
      void badge.offsetWidth;
      badge.style.animation = 'notif-pulse 0.5s ease';
    }
    showToast(`💌 New response to your Date Request!`, 'success', 5000);
    // Refresh if on responses section
    if (DASH.activeSection === 'responses') loadDashboard();
  }
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      showSection(section);
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function showSection(name) {
  DASH.activeSection = name;
  document.querySelectorAll('.dash-section').forEach(s => s.classList.add('hidden'));
  const section = document.getElementById(`section-${name}`);
  if (section) {
    section.classList.remove('hidden');
    section.style.animation = 'fadeInUp 0.4s ease both';
  }
}

function showSectionLoading(name) {
  const section = document.getElementById(`section-${name}`);
  if (section) {
    const existing = section.querySelector('.loading-wrap');
    if (!existing) {
      const div = document.createElement('div');
      div.className = 'loading-wrap';
      div.style.cssText = 'display:flex;justify-content:center;padding:60px;';
      div.innerHTML = '<div class="spinner"></div>';
      section.prepend(div);
    }
  }
}
