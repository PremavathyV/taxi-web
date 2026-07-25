/**
 * OUTSTATION – Animations JavaScript
 * Handles: Typing Effect, Ripple, Parallax Pins, Image Zoom
 */

'use strict';

/* ============================================================
   TYPING EFFECT – Hero Heading
   ============================================================ */
const typingTargets = ['South India', 'Any City', 'Your Destination'];
let typingEl = null;
let typingIdx = 0;
let charIdx = 0;
let isDeleting = false;
let typingTimeout = null;

function initTypingEffect() {
  const heading = document.querySelector('.hero-heading');
  if (!heading) return;

  // Wrap the changing part
  const span = document.createElement('span');
  span.className = 'typing-text gradient-text';
  span.setAttribute('aria-live', 'polite');

  // Replace the gradient-text span
  const original = heading.querySelector('.gradient-text');
  if (!original) return;

  original.replaceWith(span);
  typingEl = span;

  typeCharacter();
}

function typeCharacter() {
  if (!typingEl) return;
  const current = typingTargets[typingIdx];

  if (!isDeleting) {
    typingEl.textContent = current.substring(0, charIdx + 1);
    charIdx++;

    if (charIdx === current.length) {
      // Pause before deleting
      typingTimeout = setTimeout(() => {
        isDeleting = true;
        typeCharacter();
      }, 2400);
      return;
    }
  } else {
    typingEl.textContent = current.substring(0, charIdx - 1);
    charIdx--;

    if (charIdx === 0) {
      isDeleting = false;
      typingIdx = (typingIdx + 1) % typingTargets.length;
    }
  }

  const speed = isDeleting ? 60 : 100;
  typingTimeout = setTimeout(typeCharacter, speed);
}

/* ============================================================
   RIPPLE EFFECT on Buttons
   ============================================================ */
function createRipple(event) {
  const btn = event.currentTarget;
  const existingRipple = btn.querySelector('.ripple-circle');
  if (existingRipple) existingRipple.remove();

  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  const rect = btn.getBoundingClientRect();

  circle.className = 'ripple-circle';
  circle.style.cssText = `
    position: absolute;
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${event.clientX - rect.left - radius}px;
    top: ${event.clientY - rect.top - radius}px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    transform: scale(0);
    animation: rippleAnim 0.55s linear;
    pointer-events: none;
    z-index: 0;
  `;

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(circle);

  setTimeout(() => circle.remove(), 600);
}

// Inject ripple animation keyframe once
function injectRippleStyle() {
  if (document.getElementById('ripple-style')) return;
  const style = document.createElement('style');
  style.id = 'ripple-style';
  style.textContent = `
    @keyframes rippleAnim {
      to { transform: scale(4); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function initRippleButtons() {
  injectRippleStyle();
  document.querySelectorAll('.btn-hero-primary, .btn-hero-secondary, .btn-book-submit, .btn-fleet, .btn-route, .btn-cta-primary, .btn-cta-whatsapp, .btn-book-nav').forEach(btn => {
    btn.removeEventListener('click', createRipple);
    btn.addEventListener('click', createRipple);
  });
}

/* ============================================================
   PARALLAX – Floating Pins on Mouse Move
   ============================================================ */
function initParallaxPins() {
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) return;

  const pins = document.querySelectorAll('.floating-pin');
  const depths = [0.04, 0.07, 0.025]; // parallax depth per pin

  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;

    pins.forEach((pin, i) => {
      const d = depths[i] || 0.04;
      const tx = dx * d;
      const ty = dy * d;
      pin.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  });

  heroSection.addEventListener('mouseleave', () => {
    pins.forEach(pin => {
      pin.style.transform = '';
      pin.style.transition = 'transform 0.6s ease';
    });
  });
}

/* ============================================================
   HOVER IMAGE ZOOM – About Section
   ============================================================ */
function initImageZoom() {
  document.querySelectorAll('.about-img-main').forEach(wrap => {
    const img = wrap.querySelector('img');
    if (!img) return;

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
      img.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
    });

    wrap.addEventListener('mouseleave', () => {
      img.style.transform = '';
    });
  });
}

/* ============================================================
   SECTION REVEAL – Intersection Observer fallback
   (enhances AOS with custom triggers)
   ============================================================ */
function initSectionReveal() {
  const sections = document.querySelectorAll('section');
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        }
      });
    },
    { threshold: 0.08 }
  );
  sections.forEach(s => revealObserver.observe(s));
}

/* ============================================================
   STATS BAR – Gradient text shimmer trigger
   ============================================================ */
function initShimmerTrigger() {
  const statNums = document.querySelectorAll('.stat-num');
  const shimmerObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'shimmer 2s ease-in-out';
          shimmerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  statNums.forEach(el => shimmerObserver.observe(el));
}

/* ============================================================
   WHY TIMELINE – progress line draw on scroll
   ============================================================ */
function initTimelineAnimation() {
  const timeline = document.querySelector('.why-timeline');
  if (!timeline) return;

  const line = timeline.querySelector('::before');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        timeline.classList.add('timeline-active');
      }
    });
  }, { threshold: 0.2 });

  observer.observe(timeline);
}

/* ============================================================
   BOOKING CARD – subtle tilt effect
   ============================================================ */
function initCardTilt() {
  const card = document.querySelector('.booking-card');
  if (!card || window.innerWidth < 992) return;

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.5s ease';
  });
}

/* ============================================================
   FLEET CARD – image zoom on hover
   ============================================================ */
function initFleetHover() {
  document.querySelectorAll('.fleet-card').forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;
    card.addEventListener('mouseenter', () => { img.style.transform = 'scale(1.08)'; });
    card.addEventListener('mouseleave', () => { img.style.transform = ''; });
  });
}

/* ============================================================
   INIT ALL
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTypingEffect();
  initRippleButtons();
  initParallaxPins();
  initImageZoom();
  initSectionReveal();
  initShimmerTrigger();
  initCardTilt();
  initFleetHover();

  // Re-init ripple after dynamic content loads (Swiper)
  setTimeout(initRippleButtons, 1200);
});
