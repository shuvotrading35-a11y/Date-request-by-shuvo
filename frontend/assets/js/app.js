/* ============================================
   APP.JS — Core Utilities
   Date Request Platform
   ============================================ */

'use strict';

// ── State ──
const APP = {
  theme: localStorage.getItem('theme') || 'light',
  musicPlaying: false,
  noClickCount: 0,
  selectedToken: null,
  requestData: null,
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(APP.theme);
  initParticles();
  initTypewriter();
  initMusicBtn();
});

// ============================================
// THEME
// ============================================
function applyTheme(theme) {
  APP.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.getElementById('theme-btn')?.addEventListener('click', () => {
  applyTheme(APP.theme === 'dark' ? 'light' : 'dark');
});

// ============================================
// TYPEWRITER
// ============================================
function initTypewriter() {
  const el = document.getElementById('typewriter-text');
  if (!el) return;
  const text = "They've been waiting for your answer...";
  let i = 0;
  const type = () => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i++);
      setTimeout(type, 55);
    }
  };
  setTimeout(type, 1800);
}

// ============================================
// MUSIC
// ============================================
function initMusicBtn() {
  const btn = document.getElementById('music-btn');
  const audio = document.getElementById('bg-music');
  if (!btn || !audio) return;

  btn.addEventListener('click', () => {
    if (APP.musicPlaying) {
      audio.pause();
      btn.textContent = '🎵';
      btn.classList.remove('playing');
      APP.musicPlaying = false;
    } else {
      audio.volume = 0;
      audio.play().then(() => {
        APP.musicPlaying = true;
        btn.textContent = '🔇';
        btn.classList.add('playing');
        fadeAudio(audio, 0, 0.35, 1500);
      }).catch(() => {
        showToast('Enable audio in your browser to hear the music 🎵', 'info');
      });
    }
  });
}

function fadeAudio(audio, from, to, duration) {
  const steps = 30;
  const step = (to - from) / steps;
  let current = from;
  const interval = setInterval(() => {
    current += step;
    audio.volume = Math.max(0, Math.min(1, current));
    if ((step > 0 && current >= to) || (step < 0 && current <= to)) {
      clearInterval(interval);
    }
  }, duration / steps);
}

// ============================================
// PARTICLES
// ============================================
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const items = [
    { char: '❤️',  cls: 'particle--heart',   count: 8 },
    { char: '💕',  cls: 'particle--heart',   count: 6 },
    { char: '✨',  cls: 'particle--sparkle', count: 10 },
    { char: '🌹',  cls: 'particle--petal',   count: 5 },
    { char: '💫',  cls: 'particle--sparkle', count: 6 },
    { char: '🌸',  cls: 'particle--petal',   count: 5 },
  ];

  items.forEach(({ char, cls, count }) => {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = `particle ${cls}`;
      p.textContent = char;
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top:  ${Math.random() * 100}%;
        animation-duration: ${4 + Math.random() * 8}s;
        animation-delay: ${-Math.random() * 8}s;
        font-size: ${0.7 + Math.random() * 1}rem;
      `;
      container.appendChild(p);
    }
  });
}

// ============================================
// CONFETTI
// ============================================
function launchConfetti(duration = 3000) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#FF6B9D','#C23B77','#FF9EC4','#FFD700','#FF4F8B','#FFF0F5','#FF8FAB'];
  const pieces = [];

  for (let i = 0; i < 180; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 6 + Math.random() * 10,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
      drift: (Math.random() - 0.5) * 2,
      opacity: 1,
    });
  }

  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      p.y += p.speed;
      p.x += p.drift;
      p.angle += p.spin;
      if (elapsed > duration * 0.7) p.opacity -= 0.015;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < duration + 1000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(frame);
}

function miniConfetti(x, y) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#FF6B9D','#FFD700','#FF9EC4','#C23B77'];
  const pieces = [];
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
    pieces.push({
      x, y,
      vx: Math.cos(angle) * (2 + Math.random() * 4),
      vy: Math.sin(angle) * (2 + Math.random() * 4) - 3,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.15;
      p.opacity -= 0.025;
      if (p.opacity > 0) {
        alive = true;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle   = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });
    if (alive) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(frame);
}

// ============================================
// FLOATING HEARTS (celebration)
// ============================================
function spawnFloatingHearts(count = 20) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const h = document.createElement('span');
      h.textContent = ['❤️','💕','💗','💖','💓'][Math.floor(Math.random() * 5)];
      h.style.cssText = `
        position: fixed;
        left: ${20 + Math.random() * 60}%;
        bottom: 10%;
        font-size: ${1 + Math.random() * 1.5}rem;
        pointer-events: none;
        z-index: 9998;
        animation: petalFall ${2 + Math.random() * 2}s ease-out forwards;
        transform: translateY(0);
      `;
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 4000);
    }, i * 100);
  }
}

// ============================================
// MODAL
// ============================================
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('active');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  }, { once: false });
  // Trap focus
  const focusable = overlay.querySelectorAll('button, input, textarea, [tabindex]');
  if (focusable.length) focusable[0].focus();
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('active');
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'💡', default:'💌' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ============================================
// RIPPLE EFFECT
// ============================================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `left:${x}px;top:${y}px;width:${Math.max(rect.width,rect.height)*2}px;height:${Math.max(rect.width,rect.height)*2}px;margin-left:-${Math.max(rect.width,rect.height)}px;margin-top:-${Math.max(rect.width,rect.height)}px;`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
});

// ============================================
// API HELPERS
// ============================================
const API_BASE = window.API_BASE_URL || '/api/v1';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
      // Try refresh
      const refreshed = await tryRefreshToken();
      if (refreshed) return apiFetch(path, options);
      redirectToLogin();
      return null;
    }
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API error:', err);
    showToast('Network error. Please check your connection.', 'error');
    return null;
  }
}

async function tryRefreshToken() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', credentials: 'include',
    });
    if (!res.ok) return false;
    const { data } = await res.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      return true;
    }
    return false;
  } catch { return false; }
}

function redirectToLogin() {
  localStorage.removeItem('access_token');
  window.location.href = '/auth/login.html';
}

function getUser() {
  const raw = localStorage.getItem('user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// ============================================
// SHARE (Web Share API)
// ============================================
async function webShare(title, text, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') fallbackCopy(url);
    }
  } else {
    fallbackCopy(url);
  }
  return false;
}

function fallbackCopy(text) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast('Link copied to clipboard! 📋', 'success'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Link copied! 📋', 'success');
    });
}

// ============================================
// SCREENSHOT (html2canvas)
// ============================================
async function takeScreenshot(element, filename = 'date-request.png') {
  if (typeof html2canvas === 'undefined') {
    // Dynamically load html2canvas
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  }
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#FFF0F5',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Memory saved! 📸', 'success');
  } catch (e) {
    console.error(e);
    showToast('Screenshot failed. Try a different browser.', 'error');
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ============================================
// FORMAT HELPERS
// ============================================
function formatDate(dateObj) {
  if (!dateObj) return '';
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateObj).toLocaleDateString('en-US', opts);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// DEBOUNCE / THROTTLE
// ============================================
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function throttle(fn, limit) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
}

// ============================================
// INTERSECTION OBSERVER (lazy load)
// ============================================
const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-fade-in-up');
      lazyObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('[data-lazy]').forEach(el => lazyObserver.observe(el));

// ============================================
// WINDOW RESIZE
// ============================================
window.addEventListener('resize', throttle(() => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}, 200));
