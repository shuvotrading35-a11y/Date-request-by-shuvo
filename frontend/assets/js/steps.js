/* ============================================
   STEPS.JS — Multi-Step Journey Logic
   Date Request Platform
   ============================================ */

'use strict';

// ── Response State ──
const RESPONSE = {
  token: null,
  requestId: null,
  senderName: null,
  secretLetter: null,
  foods: [],
  activity: null,
  place: null,
  date: null,
  time: null,
  loveMeter: 50,
  message: '',
};

// ── Calendar State ──
const CAL = {
  viewYear:  new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  selected:  null,
};

// ── Step Data ──
const FOODS = [
  { emoji:'🍕', label:'Pizza' },     { emoji:'🍔', label:'Burger' },
  { emoji:'🍣', label:'Sushi' },     { emoji:'🍝', label:'Pasta' },
  { emoji:'🌮', label:'Tacos' },     { emoji:'🍜', label:'Noodles' },
  { emoji:'🍗', label:'Chicken' },   { emoji:'🥩', label:'BBQ' },
  { emoji:'🍱', label:'Bento Box' }, { emoji:'🥗', label:'Salad' },
  { emoji:'🍛', label:'Curry' },     { emoji:'🧆', label:'Falafel' },
  { emoji:'🍦', label:'Ice Cream' }, { emoji:'🍩', label:'Donuts' },
  { emoji:'🍫', label:'Chocolate' }, { emoji:'🥐', label:'Pastry' },
];

const ACTIVITIES = [
  { emoji:'🎬', label:'Movie Night' },   { emoji:'☕', label:'Coffee & Talk' },
  { emoji:'🌊', label:'Beach Walk' },    { emoji:'🎡', label:'Carnival' },
  { emoji:'🌸', label:'Picnic' },        { emoji:'🚗', label:'Long Drive' },
  { emoji:'🎮', label:'Gaming Together'},{ emoji:'🌃', label:'Night Walk' },
  { emoji:'🎤', label:'Karaoke' },       { emoji:'🍨', label:'Ice Cream Date' },
  { emoji:'🎨', label:'Art & Craft' },   { emoji:'🧘', label:'Spa Day' },
  { emoji:'📸', label:'Photoshoot' },    { emoji:'🎲', label:'Board Games' },
  { emoji:'🎻', label:'Live Music' },
];

const PLACES = [
  { emoji:'☕', label:'Coffee Shop' },   { emoji:'🍽️', label:'Restaurant' },
  { emoji:'🌊', label:'Beach' },         { emoji:'🏞️', label:'Park' },
  { emoji:'🎡', label:'Amusement Fair'}, { emoji:'🏕️', label:'Resort' },
  { emoji:'🎥', label:'Cinema Hall' },   { emoji:'🏖️', label:'Sea Beach' },
  { emoji:'🏰', label:'Rooftop' },       { emoji:'🌸', label:'Garden' },
  { emoji:'🎳', label:'Bowling Alley' }, { emoji:'🌆', label:'City View' },
];

const TIMES = ['10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];

const EMOJIS = ['💕','😊','🥰','😍','🤩','💘','🌹','✨','🎉','🥺','❤️','💗','😘','🌸','💫','🎊'];

const LOVE_MILESTONES = [
  { min:0,  max:20,  emoji:'😶',  msg:'Umm... okay' },
  { min:21, max:40,  emoji:'😊',  msg:"That's cute!" },
  { min:41, max:60,  emoji:'🥰',  msg:'Getting warmer!' },
  { min:61, max:80,  emoji:'😍',  msg:'Awww yes!!' },
  { min:81, max:99,  emoji:'🤩',  msg:'Oh my heart!!' },
  { min:100,max:100, emoji:'💘',  msg:'YES YES YES!!' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ============================================
// INTRO → APP TRANSITION
// ============================================
function startJourney() {
  const intro = document.getElementById('intro-screen');
  const app   = document.getElementById('app');
  intro.classList.add('exit');
  setTimeout(() => {
    intro.style.display = 'none';
    app.classList.add('visible');
    // Load token from URL
    loadRequestFromURL();
  }, 800);
}

async function loadRequestFromURL() {
  const parts = window.location.pathname.split('/');
  const token = parts[parts.length - 1];
  if (token && token.length > 4 && token !== 'index.html') {
    RESPONSE.token = token;
    try {
      const result = await apiFetch(`/public/date/${token}`);
      if (result?.ok) {
        RESPONSE.requestId   = result.data.id;
        RESPONSE.senderName  = result.data.senderName || 'Someone Special';
        RESPONSE.secretLetter = result.data.secretLetter || null;
        // Log view
        apiFetch(`/public/date/${token}/view`, { method: 'POST' });
      }
    } catch (e) {
      // Offline / demo mode — continue normally
    }
  }
}

// ============================================
// STEP NAVIGATION
// ============================================
let currentStep = 1;

function goStep(n, direction = 'forward') {
  // Validate before advancing
  if (direction === 'forward' || n > currentStep) {
    const valid = validateStep(currentStep);
    if (!valid) return;
  }

  const from = document.getElementById(`step-${currentStep}`);
  const to   = document.getElementById(`step-${n}`);
  if (!to) return;

  // Animate out
  if (from) {
    from.style.animation = `slideOutLeft 0.25s var(--ease-smooth) both`;
    setTimeout(() => {
      from.classList.remove('active');
      from.style.animation = '';
    }, 250);
  }

  // Animate in
  setTimeout(() => {
    to.classList.add('active');
    to.style.animation = `slideInRight 0.3s var(--ease-bounce) both`;
    setTimeout(() => to.style.animation = '', 350);
    currentStep = n;
    updateProgressBar(n);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 200);
}

function validateStep(n) {
  switch (n) {
    case 2:
      if (RESPONSE.foods.length === 0) {
        showToast('Please pick at least one food! 🍕', 'warning');
        document.getElementById('food-grid')?.classList.add('animate-shake');
        setTimeout(() => document.getElementById('food-grid')?.classList.remove('animate-shake'), 600);
        return false;
      }
      break;
    case 3:
      if (!RESPONSE.activity) {
        showToast('Pick an activity for your date! 🎉', 'warning');
        return false;
      }
      break;
    case 4:
      if (!RESPONSE.place) {
        showToast('Choose a place to go! 📍', 'warning');
        return false;
      }
      break;
    case 5:
      if (!RESPONSE.date) {
        showToast('Select a date! 📅', 'warning');
        return false;
      }
      break;
    case 6:
      if (!RESPONSE.time) {
        showToast('Pick a time! ⏰', 'warning');
        return false;
      }
      break;
  }
  return true;
}

function updateProgressBar(step) {
  const area = document.getElementById('progress-area');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('step-label');
  const name  = document.getElementById('step-name');

  const stepNames = ['','Proposal','Food','Activity','Place','Date','Time','Love Meter','Message'];

  if (step <= 1) {
    if (area) area.style.display = 'none';
    return;
  }
  if (area) area.style.display = 'block';
  const pct = Math.round(((step - 1) / 8) * 100);
  if (fill)  fill.style.width = `${pct}%`;
  if (label) label.textContent = `Step ${step} of 8`;
  if (name)  name.textContent  = stepNames[step] || '';
}

// ============================================
// STEP 1 — YES / NO
// ============================================
function answerYes() {
  const btn = document.querySelector('.yes-btn');
  if (btn) {
    btn.style.animation = 'none';
    btn.textContent = '💖 YAY!! 💖';
  }
  // Mini confetti at button
  const rect = btn?.getBoundingClientRect();
  if (rect) miniConfetti(rect.left + rect.width/2, rect.top + rect.height/2);

  setTimeout(() => {
    goStep(2);
    initStep2();
  }, 600);
}

function dodgeNo(btn, event) {
  APP.noClickCount++;

  if (APP.noClickCount >= 10) {
    btn.style.display = 'none';
    return;
  }

  if (APP.noClickCount >= 5) {
    openModal('no-popup-overlay');
    return;
  }

  // Dodge logic
  btn.classList.add('no-btn-dodge');
  setTimeout(() => btn.classList.remove('no-btn-dodge'), 300);

  const isMobile = window.innerWidth <= 768;
  const maxX = window.innerWidth  - 120;
  const maxY = window.innerHeight - 60;

  const newX = Math.max(20, Math.floor(Math.random() * maxX));
  const newY = Math.max(20, Math.floor(Math.random() * maxY));

  if (isMobile) {
    btn.style.position = 'fixed';
    btn.style.left = `${newX}px`;
    btn.style.top  = `${newY}px`;
    btn.style.zIndex = '9999';
  } else {
    // Desktop — relative dodge inside proposal card
    const parent = btn.closest('.proposal-card') || document.body;
    const pRect  = parent.getBoundingClientRect();
    btn.style.position = 'fixed';
    btn.style.left = `${Math.max(10, Math.min(newX, pRect.right - 80))}px`;
    btn.style.top  = `${Math.max(10, Math.min(newY, pRect.bottom - 40))}px`;
    btn.style.zIndex = '9999';
  }

  // Taunts
  const taunts = ['Nope!','Try again!','Missed me!','Nice try 😏','Keep trying...','Almost! 🤭'];
  btn.textContent = taunts[Math.floor(Math.random() * taunts.length)];
}

// ============================================
// STEP 2 — FOOD
// ============================================
function initStep2() {
  const grid = document.getElementById('food-grid');
  if (!grid || grid.children.length > 0) return;

  FOODS.forEach((food, i) => {
    const card = createSelCard(food.emoji, food.label, `food-${i}`, true);
    card.addEventListener('click', () => toggleFood(food.label, card));
    card.style.animationDelay = `${i * 30}ms`;
    card.classList.add('animate-fade-in-up');
    grid.appendChild(card);
  });
}

function toggleFood(label, card) {
  const idx = RESPONSE.foods.indexOf(label);
  if (idx === -1) {
    RESPONSE.foods.push(label);
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
  } else {
    RESPONSE.foods.splice(idx, 1);
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  }
}

// ============================================
// STEP 3 — ACTIVITY
// ============================================
function initStep3() {
  const grid = document.getElementById('activity-grid');
  if (!grid || grid.children.length > 0) return;

  ACTIVITIES.forEach((act, i) => {
    const card = createSelCard(act.emoji, act.label, `act-${i}`, false);
    card.addEventListener('click', () => selectSingle('activity', act.label, card, grid));
    card.style.animationDelay = `${i * 25}ms`;
    card.classList.add('animate-fade-in-up');
    grid.appendChild(card);
  });
}

function selectSingle(field, value, card, grid) {
  grid.querySelectorAll('.sel-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  RESPONSE[field] = value;
}

// ============================================
// STEP 4 — PLACE
// ============================================
function initStep4() {
  const grid = document.getElementById('place-grid');
  if (!grid || grid.children.length > 0) return;

  PLACES.forEach((pl, i) => {
    const card = createSelCard(pl.emoji, pl.label, `place-${i}`, false);
    card.addEventListener('click', () => selectSingle('place', pl.label, card, grid));
    card.style.animationDelay = `${i * 30}ms`;
    card.classList.add('animate-fade-in-up');
    grid.appendChild(card);
  });
}

// ============================================
// HELPER — Create Selection Card
// ============================================
function createSelCard(emoji, label, id, multiSelect) {
  const card = document.createElement('div');
  card.className = 'sel-card selection-card';
  card.id = id;
  card.setAttribute('role', multiSelect ? 'checkbox' : 'radio');
  card.setAttribute('aria-pressed', 'false');
  card.setAttribute('tabindex', '0');
  card.innerHTML = `
    <span class="sel-card__emoji" aria-hidden="true">${emoji}</span>
    <span class="sel-card__label">${label}</span>
    ${multiSelect ? '<span class="sel-card__check" aria-hidden="true">✓</span>' : ''}
  `;
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
  });
  return card;
}

// ============================================
// STEP 5 — CALENDAR
// ============================================
function initStep5() {
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const lbl  = document.getElementById('cal-month-label');
  if (!grid) return;

  lbl.textContent = `${MONTHS[CAL.viewMonth]} ${CAL.viewYear}`;

  const firstDay = new Date(CAL.viewYear, CAL.viewMonth, 1).getDay();
  const daysInMonth = new Date(CAL.viewYear, CAL.viewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  grid.innerHTML = '';

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(CAL.viewYear, CAL.viewMonth, d);
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSel   = CAL.selected && date.getTime() === CAL.selected.getTime();

    const cell = document.createElement('div');
    cell.className = 'cal-day' +
      (isPast ? ' disabled' : '') +
      (isToday ? ' today' : '') +
      (isSel   ? ' selected' : '');
    cell.textContent = d;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', date.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));
    cell.setAttribute('aria-selected', isSel ? 'true' : 'false');
    if (!isPast) {
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('click', () => selectCalDay(date, cell));
      cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCalDay(date, cell); }});
    }
    grid.appendChild(cell);
  }
}

function selectCalDay(date, cell) {
  CAL.selected = date;
  RESPONSE.date = date;
  document.querySelectorAll('.cal-day.selected').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-selected', 'false');
  });
  cell.classList.add('selected');
  cell.setAttribute('aria-selected', 'true');

  const display = document.getElementById('selected-date-display');
  if (display) {
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    display.textContent = `📅 ${date.toLocaleDateString('en-US', opts)}`;
  }
}

function changeMonth(dir) {
  CAL.viewMonth += dir;
  if (CAL.viewMonth > 11) { CAL.viewMonth = 0; CAL.viewYear++; }
  if (CAL.viewMonth < 0)  { CAL.viewMonth = 11; CAL.viewYear--; }
  renderCalendar();
}

function quickDate(type) {
  const today = new Date(); today.setHours(0,0,0,0);
  let target;

  if (type === 'weekend') {
    const day = today.getDay();
    const daysToSat = (6 - day + 7) % 7 || 7;
    target = new Date(today); target.setDate(today.getDate() + daysToSat);
  } else if (type === 'nextweek') {
    target = new Date(today); target.setDate(today.getDate() + 7);
  } else if (type === 'nextmonth') {
    target = new Date(today); target.setMonth(today.getMonth() + 1);
  } else if (type === 'surprise') {
    const daysAhead = 3 + Math.floor(Math.random() * 25);
    target = new Date(today); target.setDate(today.getDate() + daysAhead);
  }

  if (target) {
    CAL.viewYear  = target.getFullYear();
    CAL.viewMonth = target.getMonth();
    renderCalendar();
    // Select the day after render
    setTimeout(() => {
      const cells = document.querySelectorAll('.cal-day:not(.empty):not(.disabled)');
      const dayNum = target.getDate();
      const cell = [...cells].find(c => parseInt(c.textContent) === dayNum);
      if (cell) selectCalDay(target, cell);
    }, 50);
  }
}

// Swipe support
let calTouchStart = 0;
document.getElementById('cal-grid')?.addEventListener('touchstart', e => { calTouchStart = e.touches[0].clientX; });
document.getElementById('cal-grid')?.addEventListener('touchend', e => {
  const diff = calTouchStart - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) changeMonth(diff > 0 ? 1 : -1);
});

// ============================================
// STEP 6 — TIME
// ============================================
function initStep6() {
  const container = document.getElementById('time-chips');
  if (!container || container.children.length > 0) return;

  TIMES.forEach(t => {
    const chip = document.createElement('button');
    chip.className = 'time-chip';
    chip.textContent = t;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      document.querySelectorAll('.time-chip').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      RESPONSE.time = t;
      // Hide custom input
      document.getElementById('custom-time-input').style.display = 'none';
      document.getElementById('custom-time-toggle').textContent = '⚙️ Pick exact time';
    });
    container.appendChild(chip);
  });
}

function toggleCustomTime() {
  const input  = document.getElementById('custom-time-input');
  const toggle = document.getElementById('custom-time-toggle');
  const shown  = input.style.display !== 'none';
  input.style.display = shown ? 'none' : 'block';
  toggle.textContent  = shown ? '⚙️ Pick exact time' : '⬆️ Hide';

  if (!shown) {
    const timeEl = document.getElementById('custom-time');
    timeEl.focus();
    timeEl.addEventListener('change', () => {
      RESPONSE.time = formatTime(timeEl.value);
      // Deselect chips
      document.querySelectorAll('.time-chip').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
    });
  }
}

// ============================================
// STEP 7 — LOVE METER
// ============================================
function initStep7() {
  const slider  = document.getElementById('love-slider');
  const tooltip = document.getElementById('meter-tooltip');
  if (!slider) return;

  slider.value = RESPONSE.loveMeter;
  updateMeter(RESPONSE.loveMeter);

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    RESPONSE.loveMeter = val;
    updateMeter(val);
    slider.style.setProperty('--val', `${val}%`);
  });

  // Init background fill
  slider.style.setProperty('--val', `${RESPONSE.loveMeter}%`);
}

function updateMeter(val) {
  const emoji   = document.getElementById('meter-emoji');
  const message = document.getElementById('meter-message');
  const tooltip = document.getElementById('meter-tooltip');

  const milestone = LOVE_MILESTONES.find(m => val >= m.min && val <= m.max);
  if (milestone) {
    if (emoji)   emoji.textContent   = milestone.emoji;
    if (message) message.textContent = milestone.msg;
  }
  if (tooltip) {
    tooltip.textContent = `${val}%`;
    // Position tooltip
    const pct = val / 100;
    const sliderEl = document.getElementById('love-slider');
    if (sliderEl) {
      const rect = sliderEl.getBoundingClientRect();
      const thumbOffset = pct * rect.width;
      tooltip.style.left = `calc(${pct * 100}% - 20px)`;
    }
  }

  // Special at 100%
  if (val === 100) {
    miniConfetti(window.innerWidth / 2, window.innerHeight / 2);
    spawnFloatingHearts(10);
  }
}

// ============================================
// STEP 8 — MESSAGE
// ============================================
function initStep8() {
  const strip = document.getElementById('emoji-strip');
  if (!strip || strip.children.length > 0) return;

  EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = em;
    btn.setAttribute('aria-label', `Insert ${em}`);
    btn.addEventListener('click', () => insertEmoji(em));
    strip.appendChild(btn);
  });
}

function insertEmoji(em) {
  const ta = document.getElementById('personal-message');
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const val   = ta.value;
  const newVal = val.slice(0, start) + em + val.slice(end);
  if (newVal.length <= 300) {
    ta.value = newVal;
    ta.selectionStart = ta.selectionEnd = start + em.length;
    ta.focus();
    RESPONSE.message = newVal;
    updateCharCount(ta);
  }
}

function updateCharCount(ta) {
  const len = ta.value.length;
  RESPONSE.message = ta.value;
  const counter = document.getElementById('char-counter');
  if (counter) {
    counter.textContent = `${len} / 300`;
    counter.className = 'char-counter' + (len >= 300 ? ' over' : len >= 250 ? ' warn' : '');
  }
}

// ============================================
// SUBMIT RESPONSE
// ============================================
async function submitResponse() {
  // Final validation
  if (!RESPONSE.date || !RESPONSE.time || !RESPONSE.activity || !RESPONSE.place || RESPONSE.foods.length === 0) {
    showToast('Please complete all steps before submitting! 💕', 'warning');
    return;
  }

  const payload = {
    requestId:    RESPONSE.requestId,
    selectedFoods:    RESPONSE.foods,
    selectedActivity: RESPONSE.activity,
    selectedPlace:    RESPONSE.place,
    selectedDate:     RESPONSE.date?.toISOString(),
    selectedTime:     RESPONSE.time,
    loveMeter:        RESPONSE.loveMeter,
    personalMessage:  RESPONSE.message,
  };

  try {
    if (RESPONSE.token) {
      await apiFetch(`/public/date/${RESPONSE.token}/respond`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  } catch (e) {
    // Demo mode — continue
  }

  showConfirmation();
}

// ============================================
// CONFIRMATION PAGE
// ============================================
function showConfirmation() {
  // Hide app
  document.getElementById('app').classList.remove('visible');
  document.getElementById('app').style.display = 'none';
  document.getElementById('progress-area').style.display = 'none';

  // Show confirm
  const screen = document.getElementById('confirm-screen');
  screen.classList.add('active');

  // Subtitle
  const sub = document.getElementById('confirm-sub');
  if (sub && RESPONSE.senderName) {
    sub.textContent = `${RESPONSE.senderName} can't wait to see you! 🥺❤️`;
  }

  // Build summary
  const table = document.getElementById('summary-table');
  if (table) {
    const dateStr = RESPONSE.date ? RESPONSE.date.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : '—';
    const rows = [
      { icon:'📅', key:'Date',     val: dateStr },
      { icon:'⏰', key:'Time',     val: RESPONSE.time || '—' },
      { icon:'🍕', key:'Food',     val: RESPONSE.foods.join(', ') || '—' },
      { icon:'📍', key:'Place',    val: RESPONSE.place || '—' },
      { icon:'🎬', key:'Activity', val: RESPONSE.activity || '—' },
      { icon:'❤️', key:'Love',     val: `${RESPONSE.loveMeter}% ${RESPONSE.loveMeter === 100 ? '💘' : RESPONSE.loveMeter >= 80 ? '🤩' : RESPONSE.loveMeter >= 60 ? '😍' : '💕'}` },
    ];
    if (RESPONSE.message) {
      rows.push({ icon:'💬', key:'Message', val: `"${sanitizeHTML(RESPONSE.message)}"` });
    }
    table.innerHTML = rows.map((r, i) => `
      <div class="summary-row" style="animation-delay:${i * 80}ms">
        <span class="summary-key">${r.icon} ${r.key}</span>
        <span class="summary-val">${r.val}</span>
      </div>
    `).join('');
  }

  // Celebration!
  setTimeout(() => {
    launchConfetti(4000);
    spawnFloatingHearts(25);
    screen.style.animation = 'fadeInUp 0.8s ease both';
  }, 200);
}

// ============================================
// CONFIRMATION ACTIONS
// ============================================
function saveMemory() {
  const card = document.querySelector('.confirm-card');
  if (card) takeScreenshot(card, 'my-date-response.png');
}

function shareResponse() {
  const dateStr = RESPONSE.date ? RESPONSE.date.toLocaleDateString('en-US', { month:'long', day:'numeric' }) : 'soon';
  webShare(
    '💌 I said YES to a date!',
    `I'm going on a date on ${dateStr}! We're going to ${RESPONSE.place} for ${RESPONSE.activity} 💕`,
    window.location.href
  );
}

// ============================================
// SECRET LETTER
// ============================================
function openLetter() {
  const letterEl = document.getElementById('letter-text');
  if (letterEl) {
    if (RESPONSE.secretLetter) {
      letterEl.innerHTML = sanitizeHTML(RESPONSE.secretLetter);
    } else {
      letterEl.innerHTML = '💕 No secret letter was added, but know that every moment with you is special! ❤️';
    }
  }
  // Reset envelope state
  const icon = document.getElementById('envelope-icon');
  const wrap = document.getElementById('envelope-wrap');
  const text = document.getElementById('letter-text');
  if (icon) { icon.textContent = '💌'; icon.style.animation = ''; }
  if (wrap) wrap.style.display = 'block';
  if (text) text.classList.remove('visible');

  openModal('letter-modal');
}

function openEnvelope() {
  const icon = document.getElementById('envelope-icon');
  const wrap = document.getElementById('envelope-wrap');
  const text = document.getElementById('letter-text');

  if (icon) {
    icon.style.animation = 'none';
    icon.textContent = '💌';
    // Open animation
    icon.style.transform = 'scale(1.3)';
    setTimeout(() => {
      icon.textContent = '📨';
      icon.style.transform = 'scale(1)';
    }, 300);
    setTimeout(() => {
      icon.textContent = '📄';
      if (wrap) wrap.style.opacity = '0.3';
      if (text) text.classList.add('visible');
      spawnFloatingHearts(8);
    }, 700);
  }
}

// ============================================
// STEP INIT ON TRANSITION
// ============================================
// Observe step changes to init content
const origGoStep = window.goStep;
const stepInits = {
  2: initStep2,
  3: initStep3,
  4: initStep4,
  5: initStep5,
  6: initStep6,
  7: initStep7,
  8: initStep8,
};

// Patch goStep to call initializers
window._goStep = function(n, direction) {
  goStep(n, direction);
  if (stepInits[n]) setTimeout(() => stepInits[n](), 250);
};

// Override the onclick calls — redirect to _goStep via event override
// Actually just call inits inside goStep:
const _origGoStep = goStep;
window.goStep = function(n, direction) {
  _origGoStep(n, direction);
  if (stepInits[n]) setTimeout(() => stepInits[n](), 280);
};
