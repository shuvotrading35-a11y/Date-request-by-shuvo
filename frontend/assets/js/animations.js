/* ============================================
   ANIMATIONS.JS — Visual Effects
   Date Request Platform
   ============================================ */

'use strict';

// ============================================
// FIREWORKS
// ============================================
function launchFireworks(duration = 3000) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const rockets = [];
  const colors  = ['#FF6B9D','#FFD700','#FF9EC4','#C23B77','#FF4F8B','#FFF0F5','#FF8FAB','#FFEB3B'];

  function createRocket() {
    const x = 100 + Math.random() * (canvas.width - 200);
    rockets.push({
      x, y: canvas.height,
      tx: 100 + Math.random() * (canvas.width - 200),
      ty: 80  + Math.random() * (canvas.height * 0.4),
      speed: 8 + Math.random() * 4,
      exploded: false,
      particles: [],
      trail: [],
    });
  }

  function explode(rocket) {
    rocket.exploded = true;
    const count = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 5;
      rocket.particles.push({
        x: rocket.x, y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
        life: 1,
        decay: 0.015 + Math.random() * 0.015,
      });
    }
  }

  const startTime = Date.now();
  let lastRocket = 0;

  function frame() {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    if (now - startTime < duration && now - lastRocket > 600) {
      createRocket();
      lastRocket = now;
    }

    rockets.forEach(r => {
      if (!r.exploded) {
        const dx = r.tx - r.x;
        const dy = r.ty - r.y;
        const dist = Math.hypot(dx, dy);

        if (dist < r.speed) {
          explode(r);
        } else {
          r.x += (dx / dist) * r.speed;
          r.y += (dy / dist) * r.speed;
          r.trail.push({ x: r.x, y: r.y, opacity: 1 });
          if (r.trail.length > 12) r.trail.shift();

          r.trail.forEach((t, i) => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,107,157,${(i / r.trail.length) * 0.8})`;
            ctx.fill();
          });
        }
      } else {
        r.particles.forEach(p => {
          p.x  += p.vx;
          p.y  += p.vy;
          p.vy += 0.08;
          p.vx *= 0.99;
          p.life -= p.decay;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        r.particles = r.particles.filter(p => p.life > 0);
      }
    });

    const alive = rockets.some(r => !r.exploded || r.particles.length > 0);
    if (alive || now - startTime < duration + 2000) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(frame);
}

// ============================================
// HEART EXPLOSION (centered burst)
// ============================================
function heartExplosion(cx, cy, count = 30) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const heart = document.createElement('span');
      const hearts = ['❤️','💕','💗','💖','💓','💘','🌹'];
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist  = 50 + Math.random() * 150;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      heart.style.cssText = `
        position: fixed;
        left: ${cx}px; top: ${cy}px;
        font-size: ${0.8 + Math.random() * 1.2}rem;
        pointer-events: none;
        z-index: 9998;
        transform: translate(-50%, -50%);
        transition: transform ${0.6 + Math.random() * 0.6}s cubic-bezier(0.22,1,0.36,1),
                    opacity   ${0.6 + Math.random() * 0.6}s ease;
        will-change: transform, opacity;
      `;
      document.body.appendChild(heart);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heart.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
          heart.style.opacity   = '0';
        });
      });
      setTimeout(() => heart.remove(), 1500);
    }, i * 50);
  }
}

// ============================================
// STAR SHIMMER
// ============================================
function starShimmer(count = 30) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const star = document.createElement('span');
      star.textContent = ['✨','⭐','💫','🌟'][Math.floor(Math.random() * 4)];
      star.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top:  ${Math.random() * 100}vh;
        font-size: ${0.6 + Math.random() * 1.4}rem;
        pointer-events: none;
        z-index: 9997;
        animation: sparkle ${1 + Math.random() * 2}s ease-in-out forwards;
      `;
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 3000);
    }, i * 80);
  }
}

// ============================================
// FULL CELEBRATION (confirmation page)
// ============================================
function fullCelebration() {
  launchConfetti(4000);
  launchFireworks(3000);
  spawnFloatingHearts(30);
  starShimmer(25);
  setTimeout(() => heartExplosion(window.innerWidth / 2, window.innerHeight / 2, 20), 800);
}

// ============================================
// PULSE RING (on YES button click)
// ============================================
function pulseRing(el) {
  const ring = document.createElement('div');
  ring.style.cssText = `
    position: absolute;
    inset: 0;
    border: 3px solid rgba(255,107,157,0.6);
    border-radius: 9999px;
    pointer-events: none;
    animation: pulseRing 0.8s ease-out forwards;
  `;
  el.style.position = 'relative';
  el.appendChild(ring);
  setTimeout(() => ring.remove(), 800);
}

// ============================================
// SCROLL REVEAL
// ============================================
function initScrollReveal() {
  const elements = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.revealDelay || 0;
        setTimeout(() => {
          entry.target.classList.add('animate-fade-in-up');
          entry.target.style.opacity = '1';
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// ============================================
// TYPEWRITER (reusable)
// ============================================
function typewriter(element, text, speed = 50, onDone) {
  let i = 0;
  element.textContent = '';
  const interval = setInterval(() => {
    element.textContent += text[i++];
    if (i >= text.length) {
      clearInterval(interval);
      if (onDone) onDone();
    }
  }, speed);
  return interval;
}

// ============================================
// COUNT UP ANIMATION (for stats)
// ============================================
function countUp(element, target, duration = 1500, prefix = '', suffix = '') {
  const start = parseInt(element.textContent) || 0;
  const range = target - start;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quad
    const eased = 1 - (1 - progress) * (1 - progress);
    const current = Math.round(start + range * eased);
    element.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ============================================
// PROGRESS BAR ANIMATE
// ============================================
function animateProgressBar(fill, targetPct, duration = 1200) {
  const start = performance.now();
  const from  = parseFloat(fill.style.width) || 0;
  const delta = targetPct - from;

  function update(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    fill.style.width = `${from + delta * eased}%`;
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ============================================
// TILT EFFECT (on cards)
// ============================================
function initTiltEffect(selector = '.glass-card') {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ============================================
// INIT ALL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  // Tilt on desktop only
  if (window.innerWidth > 768) {
    setTimeout(() => initTiltEffect('.glass-card'), 500);
  }
});
