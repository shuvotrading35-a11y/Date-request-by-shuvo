/* ============================================
   ADMIN.JS — Super Admin Panel Logic
   Date Request Platform
   ============================================ */

'use strict';

const ADMIN = {
  users: [], requests: [], responses: [], logs: [],
  userPage: 1, responsePage: 1, perPage: 20,
  ws: null,
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  requireAdmin();
  initAdminNav();
  loadAdminOverview();
  initAdminWebSocket();
  document.getElementById('admin-last-updated').textContent =
    'Last updated: ' + new Date().toLocaleTimeString();
});

// ============================================
// NAVIGATION
// ============================================
function initAdminNav() {
  document.querySelectorAll('.admin-nav-item[data-admin-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.adminSection;
      loadAdminSection(section);
      document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
  });
}

function loadAdminSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(`admin-section-${name}`);
  if (section) section.classList.add('active');

  const loaders = {
    overview:      loadAdminOverview,
    analytics:     loadAdminAnalytics,
    users:         loadAdminUsers,
    requests:      loadAdminRequests,
    responses:     loadAdminResponses,
    logs:          loadLogs,
    notifications: loadNotifSettings,
    settings:      loadPlatformSettings,
  };
  if (loaders[name]) loaders[name]();
}

// ============================================
// OVERVIEW
// ============================================
async function loadAdminOverview() {
  const res = await apiFetch('/admin/stats');
  if (!res?.ok) return;
  const stats = res.data;

  const cards = [
    { id:'as-users',     icon:'👥', label:'Total Users',       value: stats.totalUsers     || 0 },
    { id:'as-requests',  icon:'💌', label:'Total Requests',    value: stats.totalRequests  || 0 },
    { id:'as-responses', icon:'💬', label:'Total Responses',   value: stats.totalResponses || 0 },
    { id:'as-today',     icon:'📅', label:"Today's Responses", value: stats.todayResponses || 0 },
    { id:'as-confirmed', icon:'✅', label:'Confirmed',         value: stats.confirmed       || 0 },
    { id:'as-pending',   icon:'⏳', label:'Pending',           value: stats.pending         || 0 },
  ];

  const grid = document.getElementById('admin-stats-grid');
  if (grid) {
    grid.innerHTML = cards.map((c, i) => `
      <div class="stat-card glass-card animate-fade-in-up" style="animation-delay:${i*60}ms;">
        <div class="stat-card__icon">${c.icon}</div>
        <div class="stat-card__value" id="${c.id}">0</div>
        <div class="stat-card__label">${c.label}</div>
      </div>
    `).join('');
    setTimeout(() => cards.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) countUp(el, c.value, 1000);
    }), 100);
  }

  // Recent activity
  const activityRes = await apiFetch('/admin/responses?limit=5&sort=newest');
  if (activityRes?.ok) renderRecentActivity(activityRes.data.responses || []);

  document.getElementById('admin-last-updated').textContent =
    'Last updated: ' + new Date().toLocaleTimeString();
}

function renderRecentActivity(responses) {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  if (!responses.length) {
    container.innerHTML = `<p style="text-align:center;color:var(--color-text-muted);padding:var(--space-8);">No recent activity</p>`;
    return;
  }
  container.innerHTML = responses.map((r, i) => `
    <div style="display:flex;gap:var(--space-4);padding:var(--space-4);border-bottom:1px solid rgba(255,107,157,0.06);animation:fadeInLeft 0.4s ${i*60}ms ease both;">
      <div style="font-size:1.5rem;flex-shrink:0;">💌</div>
      <div style="flex:1;min-width:0;">
        <p style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:2px;">
          <b>${sanitizeHTML(r.senderName||'?')}</b> → <b>${sanitizeHTML(r.receiverName||'?')}</b>
          — ❤️ ${r.loveMeter||0}% · 📍 ${sanitizeHTML(r.selectedPlace||'—')}
        </p>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);">
          ${r.country||'—'} · ${r.deviceType||'—'} · ${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
        </p>
      </div>
      <span class="badge ${r.status==='confirmed'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'}" style="flex-shrink:0;">${r.status||'pending'}</span>
    </div>
  `).join('');
}

// ============================================
// ANALYTICS
// ============================================
async function loadAdminAnalytics() {
  const res = await apiFetch('/admin/analytics');
  if (!res?.ok) return;
  const data = res.data;
  setTimeout(() => {
    renderBarChart('admin-responses-chart', 'Daily Responses', data.responsesPerDay || {});
    renderBarChart('admin-food-chart',      'Food',            data.foods           || {});
    renderBarChart('admin-place-chart',     'Places',          data.places          || {});
    renderBarChart('admin-activity-chart',  'Activities',      data.activities      || {});
  }, 100);
}

// ============================================
// USERS
// ============================================
async function loadAdminUsers(page = 1) {
  ADMIN.userPage = page;
  const status = document.getElementById('user-status-filter')?.value || '';
  const search = document.getElementById('global-search')?.value     || '';
  const res = await apiFetch(`/admin/users?page=${page}&limit=${ADMIN.perPage}&status=${status}&search=${encodeURIComponent(search)}`);
  if (!res?.ok) return;

  ADMIN.users = res.data.users || [];
  const tbody = document.getElementById('users-tbody');
  const count = document.getElementById('users-count');
  if (count) count.textContent = `${res.data.total || 0} users found`;

  if (!tbody) return;
  if (!ADMIN.users.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--color-text-muted);">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN.users.map((u, i) => `
    <tr>
      <td>${(page-1)*ADMIN.perPage + i + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div class="avatar-sm">${(u.fullName||u.username||'U').slice(0,2).toUpperCase()}</div>
          <div>
            <div style="font-weight:700;font-size:var(--text-sm);">${sanitizeHTML(u.fullName||'—')}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);">@${sanitizeHTML(u.username||'—')}</div>
          </div>
        </div>
      </td>
      <td style="font-size:var(--text-sm);">${sanitizeHTML(u.email||'—')}</td>
      <td style="text-align:center;">${u.requestCount||0}</td>
      <td style="text-align:center;">${u.responseCount||0}</td>
      <td style="font-size:var(--text-xs);color:var(--color-text-muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
      <td>
        <span style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);font-weight:700;">
          <span class="status-dot ${u.isSuspended?'suspended':'active'}"></span>
          ${u.isSuspended ? 'Suspended' : 'Active'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm" onclick="viewUser('${u.uuid}')" title="View user">👁️</button>
          <button class="btn btn-${u.isSuspended?'success':'warning'} btn-sm" onclick="toggleSuspend('${u.uuid}', ${!u.isSuspended})" title="${u.isSuspended?'Unsuspend':'Suspend'}">
            ${u.isSuspended ? '✅' : '⏸️'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.uuid}')" title="Delete user">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('users-pagination', page, res.data.totalPages || 1, loadAdminUsers);
}

async function toggleSuspend(uuid, suspend) {
  const res = await apiFetch(`/admin/users/${uuid}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ suspended: suspend }),
  });
  if (res?.ok) {
    showToast(suspend ? 'User suspended' : 'User unsuspended', 'success');
    loadAdminUsers(ADMIN.userPage);
  } else showToast('Action failed', 'error');
}

async function deleteUser(uuid) {
  showConfirmModal('🗑️', 'Delete User?', 'This will permanently delete the user and ALL their data. This cannot be undone.', async () => {
    const res = await apiFetch(`/admin/users/${uuid}`, { method: 'DELETE' });
    if (res?.ok) { showToast('User deleted', 'success'); loadAdminUsers(); }
    else showToast('Failed to delete user', 'error');
  });
}

async function viewUser(uuid) {
  const res = await apiFetch(`/admin/users/${uuid}`);
  if (!res?.ok) return;
  const u = res.data;
  const body = document.getElementById('admin-response-detail');
  const actions = document.getElementById('admin-response-actions');
  if (body) body.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-6);">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--gradient-primary);color:#fff;font-size:1.4rem;font-weight:700;display:flex;align-items:center;justify-content:center;">
        ${(u.fullName||u.username||'U').slice(0,2).toUpperCase()}
      </div>
      <div>
        <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-secondary);">${sanitizeHTML(u.fullName||'—')}</div>
        <div style="color:var(--color-text-muted);font-size:var(--text-sm);">@${sanitizeHTML(u.username||'—')} · ${sanitizeHTML(u.email||'—')}</div>
      </div>
    </div>
    ${[
      ['Role',      u.role||'sender'],
      ['Joined',    u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'],
      ['Last Login',u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'],
      ['Requests',  u.requestCount||0],
      ['Responses', u.responseCount||0],
      ['Status',    u.isSuspended ? '🔴 Suspended' : '🟢 Active'],
    ].map(([k,v]) => `
      <div style="display:flex;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid rgba(255,107,157,0.06);">
        <span style="width:100px;flex-shrink:0;font-size:var(--text-sm);font-weight:700;color:var(--color-text-muted);">${k}</span>
        <span style="color:var(--color-text-primary);">${v}</span>
      </div>
    `).join('')}
  `;
  if (actions) actions.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('admin-response-modal')">Close</button>
    <button class="btn btn-${u.isSuspended?'success':'warning'}" onclick="toggleSuspend('${u.uuid}',${!u.isSuspended});closeModal('admin-response-modal')">
      ${u.isSuspended ? '✅ Unsuspend' : '⏸️ Suspend'}
    </button>
    <button class="btn btn-danger" onclick="deleteUser('${u.uuid}');closeModal('admin-response-modal')">🗑️ Delete</button>
  `;
  openModal('admin-response-modal');
}

function filterUsers(val) { loadAdminUsers(1); }

// ============================================
// REQUESTS (Admin)
// ============================================
async function loadAdminRequests() {
  const res = await apiFetch('/admin/requests?limit=50');
  if (!res?.ok) return;
  const requests = res.data.requests || [];
  const tbody = document.getElementById('admin-requests-tbody');
  if (!tbody) return;

  tbody.innerHTML = requests.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-weight:600;">${sanitizeHTML(r.senderName||'—')}</td>
      <td style="font-family:var(--font-mono);font-size:var(--text-xs);">${r.token||'—'}</td>
      <td style="text-align:center;">${r.viewCount||0}</td>
      <td style="text-align:center;">${r.responseCount||0}</td>
      <td style="font-size:var(--text-xs);color:var(--color-text-muted);">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
      <td><span class="badge ${r.isActive?'badge-success':'badge-danger'}">${r.isActive?'Active':'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm" onclick="window.open('/date/${r.token}','_blank')" title="View request page">🔗</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteRequest('${r.uuid}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--color-text-muted);">No requests found</td></tr>`;
}

async function adminDeleteRequest(uuid) {
  showConfirmModal('🗑️', 'Delete Request?', 'This will delete the request and all its responses.', async () => {
    const res = await apiFetch(`/admin/requests/${uuid}`, { method: 'DELETE' });
    if (res?.ok) { showToast('Request deleted', 'success'); loadAdminRequests(); }
    else showToast('Failed', 'error');
  });
}

function filterAdminRequests(val) { loadAdminRequests(); }

// ============================================
// RESPONSES (Admin)
// ============================================
async function loadAdminResponses(page = 1) {
  ADMIN.responsePage = page;
  const status = document.getElementById('resp-status-filter')?.value || '';
  const device = document.getElementById('resp-device-filter')?.value || '';
  const search = document.querySelector('#admin-section-responses .search-bar__input')?.value || '';

  const res = await apiFetch(`/admin/responses?page=${page}&limit=${ADMIN.perPage}&status=${status}&device=${device}&search=${encodeURIComponent(search)}`);
  if (!res?.ok) return;

  const responses = res.data.responses || [];
  const tbody = document.getElementById('admin-responses-tbody');
  const count = document.getElementById('responses-count');
  if (count) count.textContent = `${res.data.total||0} responses found`;
  if (!tbody) return;

  tbody.innerHTML = responses.map((r, i) => `
    <tr>
      <td>${(page-1)*ADMIN.perPage + i + 1}</td>
      <td style="font-weight:600;font-size:var(--text-sm);">${sanitizeHTML(r.senderName||'—')}</td>
      <td style="font-size:var(--text-sm);">${sanitizeHTML(r.receiverName||'Anonymous')}</td>
      <td style="font-size:var(--text-xs);white-space:nowrap;">${r.selectedDate ? new Date(r.selectedDate).toLocaleDateString() : '—'}</td>
      <td style="font-size:var(--text-sm);">${sanitizeHTML(r.selectedPlace||'—')}</td>
      <td style="font-size:var(--text-xs);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(r.selectedFoods||[]).join(', ')||'—'}</td>
      <td><b style="color:var(--color-primary);">${r.loveMeter||0}%</b></td>
      <td style="font-size:var(--text-xs);">${r.country||'—'}</td>
      <td style="font-size:var(--text-xs);">${r.deviceType||'—'}</td>
      <td><span class="badge ${r.status==='confirmed'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'}">${r.status||'pending'}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm" onclick="adminViewResponse('${r.uuid}')" title="View">👁️</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteResponse('${r.uuid}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--color-text-muted);">No responses found</td></tr>`;

  renderPagination('responses-pagination', page, res.data.totalPages||1, loadAdminResponses);
}

async function adminViewResponse(uuid) {
  const res = await apiFetch(`/admin/responses/${uuid}`);
  if (!res?.ok) return;
  const r = res.data;

  const body = document.getElementById('admin-response-detail');
  const actions = document.getElementById('admin-response-actions');

  if (body) body.innerHTML = [
    ['Sender',     sanitizeHTML(r.senderName||'—')],
    ['Receiver',   sanitizeHTML(r.receiverName||'Anonymous')],
    ['Date',       r.selectedDate ? new Date(r.selectedDate).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '—'],
    ['Time',       r.selectedTime||'—'],
    ['Food',       (r.selectedFoods||[]).join(', ')||'—'],
    ['Place',      sanitizeHTML(r.selectedPlace||'—')],
    ['Activity',   sanitizeHTML(r.selectedActivity||'—')],
    ['Love Meter', `${r.loveMeter||0}% 💕`],
    ['Message',    r.personalMessage ? `"${sanitizeHTML(r.personalMessage)}"` : '(none)'],
    ['Submitted',  r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'],
    ['Country',    r.country||'—'],
    ['Device',     r.deviceType||'—'],
    ['Browser',    r.browser||'—'],
    ['IP Address', r.ipAddress||'—'],
    ['Status',     `<span class="badge ${r.status==='confirmed'?'badge-success':'badge-warning'}">${r.status||'pending'}</span>`],
  ].map(([k,v]) => `
    <div style="display:flex;gap:var(--space-4);padding:var(--space-2) 0;border-bottom:1px solid rgba(255,107,157,0.06);">
      <span style="width:110px;flex-shrink:0;font-size:var(--text-sm);font-weight:700;color:var(--color-text-muted);">${k}</span>
      <span style="flex:1;font-size:var(--text-sm);color:var(--color-text-primary);">${v}</span>
    </div>
  `).join('');

  if (actions) actions.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('admin-response-modal')">Close</button>
    <button class="btn btn-success btn-sm" onclick="updateResponseStatus('${r.uuid}','confirmed')">✅ Confirm</button>
    <button class="btn btn-danger btn-sm" onclick="adminDeleteResponse('${r.uuid}')">🗑️ Delete</button>
  `;
  openModal('admin-response-modal');
}

async function updateResponseStatus(uuid, status) {
  const res = await apiFetch(`/admin/responses/${uuid}/status`, { method:'PATCH', body:JSON.stringify({status}) });
  if (res?.ok) { showToast(`Status updated to ${status}`, 'success'); closeModal('admin-response-modal'); loadAdminResponses(); }
  else showToast('Failed to update status', 'error');
}

async function adminDeleteResponse(uuid) {
  showConfirmModal('🗑️', 'Delete Response?', 'This will permanently delete this response.', async () => {
    const res = await apiFetch(`/admin/responses/${uuid}`, { method: 'DELETE' });
    if (res?.ok) { showToast('Response deleted', 'success'); closeModal('admin-response-modal'); loadAdminResponses(); }
    else showToast('Failed', 'error');
  });
}

function filterAdminResponses(val) { loadAdminResponses(1); }

// ============================================
// AUDIT LOGS
// ============================================
async function loadLogs() {
  const action = document.getElementById('log-action-filter')?.value || '';
  const date   = document.getElementById('log-date-filter')?.value   || '';
  const res = await apiFetch(`/admin/logs?action=${action}&date=${date}&limit=50`);
  if (!res?.ok) return;

  const logs  = res.data.logs || [];
  const tbody = document.getElementById('logs-tbody');
  if (!tbody) return;

  tbody.innerHTML = logs.map((l, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="font-size:var(--text-sm);">${sanitizeHTML(l.userName||'System')}</td>
      <td><span class="badge badge-info" style="font-size:10px;">${l.action||'—'}</span></td>
      <td style="font-family:var(--font-mono);font-size:var(--text-xs);">${l.ipAddress||'—'}</td>
      <td style="font-size:var(--text-xs);color:var(--color-text-muted);">${l.userAgent ? l.userAgent.slice(0,40)+'…' : '—'}</td>
      <td style="font-size:var(--text-xs);white-space:nowrap;">${l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text-muted);">No logs found</td></tr>`;
}

// ============================================
// NOTIFICATION SETTINGS
// ============================================
async function loadNotifSettings() {
  const res = await apiFetch('/admin/settings/notifications');
  if (!res?.ok) return;
  const s = res.data;
  if (document.getElementById('tg-bot-token'))  document.getElementById('tg-bot-token').value  = s.telegramBotToken  || '';
  if (document.getElementById('tg-chat-id'))    document.getElementById('tg-chat-id').value    = s.telegramChatId    || '';
  if (document.getElementById('admin-email'))   document.getElementById('admin-email').value   = s.adminEmail        || '';
  if (document.getElementById('discord-webhook'))document.getElementById('discord-webhook').value = s.discordWebhook || '';
}

async function saveNotifSettings(e) {
  e.preventDefault();
  const payload = {
    telegramBotToken: document.getElementById('tg-bot-token')?.value.trim(),
    telegramChatId:   document.getElementById('tg-chat-id')?.value.trim(),
    adminEmail:       document.getElementById('admin-email')?.value.trim(),
    discordWebhook:   document.getElementById('discord-webhook')?.value.trim(),
  };
  const res = await apiFetch('/admin/settings/notifications', { method:'POST', body:JSON.stringify(payload) });
  if (res?.ok) showToast('Notification settings saved! 💾', 'success');
  else showToast('Failed to save settings', 'error');
}

async function testNotifications() {
  const res = await apiFetch('/admin/settings/notifications/test', { method:'POST' });
  if (res?.ok) showToast('Test notifications sent! Check your channels 🧪', 'success');
  else showToast('Test failed. Check your configuration.', 'error');
}

// ============================================
// PLATFORM SETTINGS
// ============================================
async function loadPlatformSettings() {
  const res = await apiFetch('/admin/settings/platform');
  if (!res?.ok) return;
  const s = res.data;
  if (document.getElementById('site-name'))       document.getElementById('site-name').value       = s.siteName       || '';
  if (document.getElementById('max-requests'))    document.getElementById('max-requests').value    = s.maxRequests    || '';
  if (document.getElementById('maintenance-mode'))document.getElementById('maintenance-mode').checked = s.maintenance || false;
}

async function savePlatformSettings(e) {
  e.preventDefault();
  const payload = {
    siteName:    document.getElementById('site-name')?.value.trim(),
    maxRequests: parseInt(document.getElementById('max-requests')?.value) || 0,
    maintenance: document.getElementById('maintenance-mode')?.checked,
  };
  const res = await apiFetch('/admin/settings/platform', { method:'POST', body:JSON.stringify(payload) });
  if (res?.ok) showToast('Platform settings saved! 💾', 'success');
  else showToast('Failed to save settings', 'error');
}

// ============================================
// EXPORT
// ============================================
async function adminExport(type, format) {
  const token = localStorage.getItem('access_token');
  try {
    const res = await fetch(`/api/v1/admin/export?type=${type}&format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { showToast('Export failed', 'error'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `admin-${type}-export.${format}`;
    a.click();
    showToast(`Exported ${type} as ${format.toUpperCase()} 📥`, 'success');
  } catch { showToast('Export failed', 'error'); }
}

// ============================================
// GLOBAL SEARCH
// ============================================
const globalSearch = debounce((val) => {
  if (!val.trim()) return;
  const active = document.querySelector('.admin-section.active')?.id?.replace('admin-section-','');
  if (active === 'users')     loadAdminUsers(1);
  if (active === 'responses') loadAdminResponses(1);
}, 400);

// ============================================
// PAGINATION HELPER
// ============================================
function renderPagination(containerId, current, total, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container || total <= 1) { if(container) container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="${onPageChange.name}(${current-1})" ${current===1?'disabled':''}>←</button>`;
  for (let i = 1; i <= Math.min(total, 7); i++) {
    if (i === 4 && total > 7) { html += '<span style="color:var(--color-text-muted);">…</span>'; i = total - 2; }
    html += `<button class="page-btn ${i===current?'active':''}" onclick="${onPageChange.name}(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="${onPageChange.name}(${current+1})" ${current===total?'disabled':''}>→</button>`;
  container.innerHTML = html;
}

// ============================================
// CONFIRM MODAL HELPER
// ============================================
function showConfirmModal(icon, title, message, onConfirm) {
  document.getElementById('confirm-icon').textContent    = icon;
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-message').textContent = message;
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.onclick = () => { closeModal('confirm-modal'); onConfirm(); };
  openModal('confirm-modal');
}

// ============================================
// DANGER ZONE
// ============================================
async function confirmDangerAction(action) {
  const configs = {
    'clear-responses': { icon:'⚠️', title:'Clear All Responses?', msg:'This will permanently delete ALL responses from the database.' },
    'clear-logs':      { icon:'⚠️', title:'Clear Audit Logs?',    msg:'This will permanently delete ALL audit log entries.' },
  };
  const cfg = configs[action];
  if (!cfg) return;
  showConfirmModal(cfg.icon, cfg.title, cfg.msg, async () => {
    const res = await apiFetch(`/admin/danger/${action}`, { method:'DELETE' });
    if (res?.ok) showToast('Done. Data cleared.', 'success');
    else showToast('Action failed', 'error');
  });
}

// ============================================
// WEBSOCKET (Admin Real-time)
// ============================================
function initAdminWebSocket() {
  const token = localStorage.getItem('access_token');
  if (!token) return;
  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ADMIN.ws = new WebSocket(`${wsProto}//${window.location.host}/ws?token=${token}`);
    ADMIN.ws.addEventListener('message', e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'new_response') {
          showToast(`💌 New response! ${msg.data?.senderName||''} → ${msg.data?.receiverName||''}`, 'success', 6000);
          // Refresh active section
          const active = document.querySelector('.admin-section.active')?.id?.replace('admin-section-','');
          if (active === 'overview') loadAdminOverview();
          if (active === 'responses') loadAdminResponses();
        }
      } catch {}
    });
    ADMIN.ws.addEventListener('close', () => setTimeout(initAdminWebSocket, 5000));
  } catch {}
}
