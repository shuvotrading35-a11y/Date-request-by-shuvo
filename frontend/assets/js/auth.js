/* ============================================
   AUTH.JS — Authentication Logic
   Date Request Platform
   ============================================ */

'use strict';

// ============================================
// PASSWORD STRENGTH
// ============================================
function checkPasswordStrength(password) {
  let score = 0;
  const checks = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
    long:      password.length >= 12,
  };
  score = Object.values(checks).filter(Boolean).length;

  const levels = [
    { label: '',         color: 'transparent', width: '0%' },
    { label: 'Very Weak',  color: '#F44336',     width: '20%' },
    { label: 'Weak',       color: '#FF5722',     width: '40%' },
    { label: 'Fair',       color: '#FF9800',     width: '60%' },
    { label: 'Strong',     color: '#8BC34A',     width: '80%' },
    { label: 'Very Strong',color: '#4CAF50',     width: '100%' },
  ];

  return { score: Math.min(score, 5), level: levels[Math.min(score, 5)], checks };
}

function updateStrengthUI(password) {
  const bar   = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');
  if (!bar || !label) return;

  const { score, level } = checkPasswordStrength(password);
  bar.style.width      = level.width;
  bar.style.background = level.color;
  bar.style.transition = 'width 0.4s ease, background 0.4s ease';
  label.textContent    = level.label;
  label.style.color    = level.color;
}

// ============================================
// USERNAME AVAILABILITY CHECK
// ============================================
let usernameTimer;
async function checkUsername(username) {
  clearTimeout(usernameTimer);
  const status = document.getElementById('username-status');
  if (!status) return;

  if (username.length < 3) {
    status.textContent = '';
    return;
  }

  status.textContent = '⏳ Checking...';
  status.style.color = 'var(--color-text-muted)';

  usernameTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${window.API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.available) {
        status.textContent = '✅ Available!';
        status.style.color = 'var(--color-success)';
      } else {
        status.textContent = '❌ Already taken';
        status.style.color = 'var(--color-danger)';
      }
    } catch {
      status.textContent = '';
    }
  }, 500);
}

// ============================================
// FORM VALIDATION
// ============================================
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 8;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (field) {
    field.style.borderColor = 'var(--color-danger)';
    field.setAttribute('aria-invalid', 'true');
  }
  if (error) {
    error.textContent = message;
    error.style.display = 'flex';
  }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (field) {
    field.style.borderColor = '';
    field.setAttribute('aria-invalid', 'false');
  }
  if (error) {
    error.textContent = '';
    error.style.display = 'none';
  }
}

function clearAllErrors() {
  document.querySelectorAll('.form-error').forEach(e => { e.textContent = ''; e.style.display = 'none'; });
  document.querySelectorAll('.form-input').forEach(f => { f.style.borderColor = ''; });
}

// ============================================
// REGISTER
// ============================================
async function handleRegister(e) {
  e.preventDefault();
  clearAllErrors();

  const fullName        = document.getElementById('full-name')?.value.trim();
  const username        = document.getElementById('username')?.value.trim();
  const email           = document.getElementById('email')?.value.trim();
  const password        = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirm-password')?.value;
  const termsChecked    = document.getElementById('terms')?.checked;
  const submitBtn       = document.getElementById('register-btn');

  let valid = true;

  if (!fullName || fullName.length < 2) {
    showFieldError('full-name', 'Full name must be at least 2 characters');
    valid = false;
  }
  if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    showFieldError('username', 'Username must be 3+ chars, letters/numbers/underscore only');
    valid = false;
  }
  if (!validateEmail(email)) {
    showFieldError('email', 'Please enter a valid email address');
    valid = false;
  }
  if (!validatePassword(password)) {
    showFieldError('password', 'Password must be at least 8 characters');
    valid = false;
  }
  if (password !== confirmPassword) {
    showFieldError('confirm-password', 'Passwords do not match');
    valid = false;
  }
  if (!termsChecked) {
    showToast('Please agree to the Terms of Service', 'warning');
    valid = false;
  }
  if (!valid) return;

  // Submit
  setLoading(submitBtn, true);

  try {
    const res = await fetch(`${window.API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      showToast('Account created! Redirecting... 🎉', 'success');
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setTimeout(() => { window.location.href = '/dashboard/'; }, 1200);
    } else {
      if (data.field) {
        showFieldError(data.field, data.message);
      } else {
        showToast(data.message || 'Registration failed. Try again.', 'error');
      }
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

// ============================================
// LOGIN
// ============================================
let failedAttempts = 0;

async function handleLogin(e) {
  e.preventDefault();
  clearAllErrors();

  const identifier  = document.getElementById('identifier')?.value.trim();
  const password    = document.getElementById('password')?.value;
  const rememberMe  = document.getElementById('remember-me')?.checked;
  const submitBtn   = document.getElementById('login-btn');

  if (!identifier) { showFieldError('identifier', 'Email or username is required'); return; }
  if (!password)    { showFieldError('password', 'Password is required'); return; }

  setLoading(submitBtn, true);

  try {
    const res = await fetch(`${window.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    const data = await res.json();

    if (res.ok) {
      failedAttempts = 0;
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('Welcome back! 💕', 'success');

      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard/';
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? '/admin/' : redirect;
      }, 800);
    } else {
      failedAttempts++;
      if (failedAttempts >= 5) {
        showToast('Too many failed attempts. Please wait 15 minutes.', 'error');
        submitBtn.disabled = true;
        setTimeout(() => { submitBtn.disabled = false; failedAttempts = 0; }, 15 * 60 * 1000);
      } else {
        showFieldError('password', data.message || 'Invalid credentials');
      }
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

// ============================================
// FORGOT PASSWORD
// ============================================
async function handleForgotPassword(e) {
  e.preventDefault();
  const email     = document.getElementById('email')?.value.trim();
  const submitBtn = document.getElementById('forgot-btn');

  if (!validateEmail(email)) {
    showFieldError('email', 'Please enter a valid email address');
    return;
  }
  setLoading(submitBtn, true);

  try {
    const res = await fetch(`${window.API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      showToast('Reset link sent! Check your email 📧', 'success');
      document.getElementById('forgot-form')?.classList.add('hidden');
      document.getElementById('forgot-success')?.classList.remove('hidden');
    } else {
      const data = await res.json();
      showToast(data.message || 'Something went wrong', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

// ============================================
// RESET PASSWORD
// ============================================
async function handleResetPassword(e) {
  e.preventDefault();
  const password        = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirm-password')?.value;
  const token           = new URLSearchParams(window.location.search).get('token');
  const submitBtn       = document.getElementById('reset-btn');

  if (!validatePassword(password)) {
    showFieldError('password', 'Password must be at least 8 characters');
    return;
  }
  if (password !== confirmPassword) {
    showFieldError('confirm-password', 'Passwords do not match');
    return;
  }
  setLoading(submitBtn, true);

  try {
    const res = await fetch(`${window.API_BASE_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      showToast('Password reset! Redirecting to login...', 'success');
      setTimeout(() => { window.location.href = '/auth/login.html'; }, 1500);
    } else {
      const data = await res.json();
      showToast(data.message || 'Reset failed. Link may be expired.', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

// ============================================
// LOADING STATE
// ============================================
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span>';
    btn.disabled  = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled  = false;
  }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
  try {
    await fetch(`${window.API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      credentials: 'include',
    });
  } catch {}
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

// ============================================
// GUARD — Redirect if not logged in
// ============================================
function requireAuth() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = `/auth/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
}

function requireAdmin() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/dashboard/';
  }
}

// Toggle password visibility
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}
