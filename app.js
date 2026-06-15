// === AGRO HOLDING RU — CINEMATIC SCROLL ENGINE ===
const TOTAL_FRAMES = 419;     // Agro desktop frames
const PAGE_COUNT   = 6;
const LERP         = 0.02;
const CONCURRENCY  = 48;

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

const canvas = document.getElementById('gl-canvas');
const ctx = canvas.getContext('2d');
let canvasDpr = 1;

function resize() {
  canvasDpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width  = innerWidth * canvasDpr;
  canvas.height = innerHeight * canvasDpr;
  canvas.style.width  = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady = false;

function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

async function loadAll() {
  const queue = Array.from({length: TOTAL_FRAMES}, (_, i) => i);
  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;
          const pct = Math.round(loadedCount / TOTAL_FRAMES * 100);
          const bar = document.getElementById('progress-bar');
          if (bar) bar.style.width = pct + '%';
          if (loadedCount === 1) { isReady = true; startAnim(); }
          if (loadedCount === TOTAL_FRAMES) {
            const loader = document.getElementById('loader');
            if (loader) {
              loader.style.transition = 'opacity 0.8s';
              loader.style.opacity = '0';
              setTimeout(() => loader.style.display = 'none', 800);
            }
          }
          resolve();
        };
        img.src = frameName(i);
      });
    }
  }
  await Promise.all(Array.from({length: CONCURRENCY}, worker));
}

let currentFrame = 0;
let targetFrame  = 0;

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress  = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img || !img.complete) return;
  const W = innerWidth;
  const H = innerHeight;
  const r  = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  const x  = (W - iw) / 2;
  const y  = (H - ih) / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);
  // Vignette
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(5,10,3,0)');
  vig.addColorStop(1, 'rgba(5,10,3,0.82)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  // Bottom
  const bot = ctx.createLinearGradient(0, H*0.6, 0, H);
  bot.addColorStop(0, 'rgba(5,10,3,0)');
  bot.addColorStop(1, 'rgba(5,10,3,0.92)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H*0.6, W, H*0.4);
}

function startAnim() {
  function loop() {
    requestAnimationFrame(loop);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) drawFrame(Math.round(currentFrame));
  }
  loop();
}

// Particles
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas ? pCanvas.getContext('2d') : null;
const PARTICLE_COUNT = 45;
let particles = [];

function initParticles() {
  particles = Array.from({length: PARTICLE_COUNT}, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -(Math.random() * 0.25 + 0.05),
    r: Math.random() * 1.5 + 0.3,
    alpha: Math.random() * 0.4 + 0.1,
    green: Math.random() > 0.4,
  }));
}

function drawParticles() {
  if (!pCanvas || !pCtx) return;
  pCanvas.width = innerWidth;
  pCanvas.height = innerHeight;
  pCtx.clearRect(0, 0, innerWidth, innerHeight);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.y < -5) { p.y = innerHeight + 5; p.x = Math.random() * innerWidth; }
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = p.green
      ? `rgba(93,138,44,${p.alpha})`
      : `rgba(212,168,67,${p.alpha})`;
    pCtx.fill();
  });
  requestAnimationFrame(drawParticles);
}
initParticles();
drawParticles();

// IntersectionObserver
const pages    = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
    }
  });
}, { rootMargin: '-40% 0px -40% 0px' });
pages.forEach(p => observer.observe(p));

// Force first section active
if (pages[0]) pages[0].classList.add('is-active');

// Burger
const burger = document.getElementById('burger');
const drawer = document.getElementById('nav-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const drawerClose = document.getElementById('drawer-close');

function openDrawer() { drawer.hidden = false; document.body.style.overflow = 'hidden'; }
function closeDrawer() { drawer.hidden = true; document.body.style.overflow = ''; }

if (burger) burger.addEventListener('click', openDrawer);
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (backdrop) backdrop.addEventListener('click', closeDrawer);
document.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', closeDrawer));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// Form
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (submitBtn) {
      submitBtn.textContent = '✓ Заявка отправлена';
      submitBtn.style.background = 'rgba(93,138,44,0.4)';
      setTimeout(() => { submitBtn.textContent = 'Стать партнёром'; submitBtn.style.background = ''; }, 3000);
    }
  });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

loadAll();
