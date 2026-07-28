/**
 * OUTSTATION – Main JavaScript
 * Handles: AOS, Swiper, Navbar, Dark Mode, Back to Top,
 *          Sticky Bar, Counter, Smooth Scroll
 */

'use strict';

/* ============================================================
   AOS – Animate on Scroll Initialization
   ============================================================ */
AOS.init({
  duration: 700,
  easing: 'ease-out-cubic',
  once: true,
  offset: 60,
  disable: 'phone', // disable on very small phones for perf
});

/* ============================================================
   SWIPER – Fleet Carousel
   ============================================================ */
const fleetSwiper = new Swiper('.fleetSwiper', {
  slidesPerView: 1,
  spaceBetween: 24,
  loop: true,
  speed: 600,
  grabCursor: true,
  pagination: {
    el: '.fleet-pagination',
    clickable: true,
  },
  navigation: {
    nextEl: '.fleet-next',
    prevEl: '.fleet-prev',
  },
  breakpoints: {
    576: { slidesPerView: 2 },
    768: { slidesPerView: 2 },
    992: { slidesPerView: 3 },
    1200: { slidesPerView: 3 },
  },
  autoplay: {
    delay: 3800,
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
  },
});

/* ============================================================
   NAVBAR – Scroll Behavior & Active Link
   ============================================================ */
const mainNav = document.getElementById('mainNav');

function handleNavScroll() {
  if (window.scrollY > 60) {
    mainNav.classList.add('scrolled');
  } else {
    mainNav.classList.remove('scrolled');
  }
}

// Highlight active nav link based on scroll position
function setActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  let current = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', () => {
  handleNavScroll();
  setActiveNavLink();
  handleBackToTop();
  handleStickyBar();
});

handleNavScroll(); // run on load

/* ============================================================
   DARK MODE TOGGLE
   ============================================================ */
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

// Load saved preference
const savedTheme = localStorage.getItem('outstation-theme') || 'light';
html.setAttribute('data-theme', savedTheme);
updateDarkIcon(savedTheme);

darkToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('outstation-theme', next);
  updateDarkIcon(next);
});

function updateDarkIcon(theme) {
  const icon = darkToggle.querySelector('i');
  if (theme === 'dark') {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
const backToTop = document.getElementById('backToTop');

function handleBackToTop() {
  if (window.scrollY > 400) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
}

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================================================
   STICKY MOBILE BOOKING BAR
   ============================================================ */
const stickyBar = document.getElementById('stickyBar');

function handleStickyBar() {
  if (window.innerWidth <= 767) {
    if (window.scrollY > 500) {
      stickyBar.classList.add('show');
    } else {
      stickyBar.classList.remove('show');
    }
  }
}

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-count'), 10);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString('en-IN');
  }, 16);
}

// Intersection Observer for counters
const counterEls = document.querySelectorAll('.stat-num[data-count]');
const counterObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
        entry.target.classList.add('counted');
        animateCounter(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

counterEls.forEach(el => counterObserver.observe(el));

/* ============================================================
   SMOOTH SCROLL for all anchor links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top = target.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });

      // Close mobile nav if open
      const navCollapse = document.getElementById('navMenu');
      if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navCollapse);
        bsCollapse.hide();
      }
    }
  });
});

/* ============================================================
   PARALLAX – Hero Background (subtle)
   ============================================================ */
const heroSection = document.querySelector('.hero-section');

window.addEventListener('scroll', () => {
  if (heroSection && window.scrollY < window.innerHeight) {
    const offset = window.scrollY * 0.3;
    heroSection.style.backgroundPositionY = `${offset}px`;
  }
}, { passive: true });

/* ============================================================
   LAZY IMAGE LOAD
   ============================================================ */
if ('IntersectionObserver' in window) {
  const lazyImgs = document.querySelectorAll('img[loading="lazy"]');
  const imgObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '0';
        entry.target.addEventListener('load', () => {
          entry.target.style.transition = 'opacity 0.4s ease';
          entry.target.style.opacity = '1';
        }, { once: true });
        imgObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  lazyImgs.forEach(img => imgObserver.observe(img));
}

/* ============================================================
   LIVE CHAT BUTTON (stub)
   ============================================================ */
const liveChatBtn = document.getElementById('liveChatBtn');
if (liveChatBtn) {
  liveChatBtn.addEventListener('click', () => {
    showToast('Live chat starting… Please wait.');
  });
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toastNotif');
  const msg = document.getElementById('toastMsg');
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Export for use in other modules
window.showToast = showToast;
