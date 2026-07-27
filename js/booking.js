/**
 * booking.js – Sundara Travels
 * Handles: Hero booking form, WhatsApp booking form, Contact form
 */

'use strict';

/* ── API Base URL ─────────────────────────────────────────────
   Local (served via backend):  ''
   After Render deploy, change to: 'https://YOUR-APP.onrender.com'
   ─────────────────────────────────────────────────────────── */
const API_BASE = 'https://taxi-web-mrk9.onrender.com';

/* ══════════════════════════════════════════════════════
   SHARED HELPERS
   ══════════════════════════════════════════════════════ */

function showToastMsg(msg) {
  if (window.showToast) window.showToast(msg);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ══════════════════════════════════════════════════════
   1. HERO BOOKING FORM  (#bookingForm)
      Fields: hbPickup, hbDrop, hbDate, hbTime, hbVehicle, hbMobile
   ══════════════════════════════════════════════════════ */
(function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  // Set min date
  const hbDate = document.getElementById('hbDate');
  if (hbDate) hbDate.min = todayStr();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const pickup  = (document.getElementById('hbPickup')?.value || '').trim();
    const drop    = (document.getElementById('hbDrop')?.value   || '').trim();
    const date    = (document.getElementById('hbDate')?.value   || '').trim();
    const time    = (document.getElementById('hbTime')?.value   || '').trim();
    const vehicle = (document.getElementById('hbVehicle')?.value || '').trim();
    const mobile  = (document.getElementById('hbMobile')?.value  || '').replace(/\D/g, '');
    const name    = (document.getElementById('hbName')?.value    || '').trim();

    // Validation
    if (!name || !pickup || !drop || !date || !time || !vehicle || !mobile) {
      showToastMsg('❌ Please fill all fields.'); return;
    }
    if (name.length < 3) {
      showToastMsg('❌ Name must be at least 3 characters.'); return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      showToastMsg('❌ Enter a valid 10-digit Indian mobile number.'); return;
    }
    if (pickup.toLowerCase() === drop.toLowerCase()) {
      showToastMsg('❌ Pickup and Drop cannot be the same.'); return;
    }

    const btn = form.querySelector('.btn-book-submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Booking…';

    try {
      const res  = await fetch(API_BASE + '/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, mobile, pickup, drop,
          journeyDate: date, pickupTime: time, vehicleType: vehicle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed.');

      btn.innerHTML = '<i class="fas fa-check me-2"></i> Booking Submitted!';
      btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
      showToastMsg('✅ Booking submitted! We will contact you shortly.');

      setTimeout(() => {
        btn.innerHTML = orig; btn.disabled = false; btn.style.background = '';
        form.reset();
        if (hbDate) hbDate.min = todayStr();
      }, 4000);

    } catch (err) {
      btn.innerHTML = orig; btn.disabled = false;
      showToastMsg('❌ ' + err.message);
    }
  });
}());

/* ══════════════════════════════════════════════════════
   2. WHATSAPP BOOKING FORM  (#whatsappBookForm)
      Full validation + confirmation overlay + API save
   ══════════════════════════════════════════════════════ */
(function () {
  const WHATSAPP = '919444539285';

  const form          = document.getElementById('whatsappBookForm');
  if (!form) return;

  const fName         = document.getElementById('wbFullName');
  const fMobile       = document.getElementById('wbMobile');
  const fPickup       = document.getElementById('wbPickup');
  const fDrop         = document.getElementById('wbDrop');
  const fDate         = document.getElementById('wbDate');
  const fTime         = document.getElementById('wbTime');
  const fVehicle      = document.getElementById('wbVehicle');
  const vehiclePicker = document.getElementById('wbVehiclePicker');
  const submitBtn     = document.getElementById('wbSubmitBtn');
  const nameCounter   = document.getElementById('wbNameCounter');
  const mobileStatus  = document.getElementById('wbMobileStatus');
  const overlay       = document.getElementById('wbConfirmOverlay');
  const confirmSummary = document.getElementById('wbConfirmSummary');
  const confirmMeta    = document.getElementById('wbConfirmMeta');

  // Min date
  if (fDate) fDate.min = todayStr();

  /* ── Name counter ── */
  if (fName) {
    fName.addEventListener('input', function () {
      const len = this.value.length;
      if (nameCounter) {
        nameCounter.textContent = len + ' / 50';
        nameCounter.className = 'wb-char-counter' +
          (len >= 48 ? ' limit' : len >= 40 ? ' warn' : '');
      }
      wbClear(this);
    });
  }

  /* ── Mobile real-time ── */
  if (fMobile) {
    fMobile.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
      wbClear(this);
      if (!mobileStatus) return;
      const v = this.value;
      if (!v.length) { mobileStatus.innerHTML = ''; mobileStatus.className = 'wb-mobile-status'; return; }
      if (/^[6-9]\d{9}$/.test(v)) {
        mobileStatus.innerHTML = '<i class="fas fa-check-circle"></i>';
        mobileStatus.className = 'wb-mobile-status valid';
      } else {
        mobileStatus.innerHTML = v.length === 10 ? '<i class="fas fa-times-circle"></i>' : '';
        mobileStatus.className = v.length === 10 ? 'wb-mobile-status invalid' : 'wb-mobile-status';
      }
    });
  }

  /* ── Vehicle picker ── */
  if (vehiclePicker) {
    vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(btn => {
      btn.addEventListener('click', function () {
        vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(b => {
          b.classList.remove('selected'); b.setAttribute('aria-checked', 'false');
        });
        this.classList.add('selected'); this.setAttribute('aria-checked', 'true');
        if (fVehicle) fVehicle.value = this.dataset.value;
        vehiclePicker.classList.remove('wb-picker-error');
        wbClear(fVehicle);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.click(); }
      });
    });
  }

  [fDate, fTime, fPickup, fDrop].forEach(el => {
    if (el) el.addEventListener('input', () => wbClear(el));
    if (el) el.addEventListener('change', () => wbClear(el));
  });

  /* ── SUBMIT ── */
  let busy = false;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!wbValidate()) return;

    busy = true;
    const origInner = submitBtn.querySelector('.wbBtn-inner').innerHTML;
    submitBtn.disabled = true;
    submitBtn.querySelector('.wbBtn-inner').innerHTML =
      '<i class="fas fa-circle-notch fa-spin wbBtn-icon"></i><span class="wbBtn-text">Processing…</span>';

    const nameVal    = fName.value.trim();
    const mobileVal  = fMobile.value.trim();
    const pickupVal  = fPickup.value.trim();
    const dropVal    = fDrop.value.trim();
    const vehicleVal = fVehicle.value;
    const dateVal    = fDate.value;
    const timeVal    = fTime.value;

    const dateObj       = new Date(dateVal + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const [hh, mm]      = timeVal.split(':');
    const h             = parseInt(hh, 10);
    const formattedTime = `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;

    // Save to database
    try {
      const res = await fetch(API_BASE + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameVal, mobile: mobileVal,
          pickup: pickupVal, drop: dropVal,
          journeyDate: dateVal, pickupTime: timeVal,
          vehicleType: vehicleVal,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Booking failed.');
    } catch (err) {
      submitBtn.querySelector('.wbBtn-inner').innerHTML = origInner;
      submitBtn.disabled = false; busy = false;
      showToastMsg('❌ ' + err.message);
      return;
    }

    // Show confirmation overlay
    if (confirmSummary) confirmSummary.textContent = `${nameVal} · +91 ${mobileVal}`;
    if (confirmMeta) {
      confirmMeta.innerHTML = [
        `<span><i class="fas fa-location-dot"></i> ${pickupVal}</span>`,
        `<span><i class="fas fa-flag-checkered"></i> ${dropVal}</span>`,
        `<span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>`,
        `<span><i class="far fa-clock"></i> ${formattedTime}</span>`,
        `<span><i class="fas fa-car"></i> ${vehicleVal}</span>`,
      ].join('');
    }

    if (overlay) {
      overlay.removeAttribute('hidden');
      void overlay.offsetWidth;
      overlay.classList.add('wb-overlay-in');
    }

    showToastMsg('✅ Booking saved successfully!');

    // Build WhatsApp URL
    const msg = [
      '🚕 *SUNDARA TRAVELS – Booking Request*', '',
      `👤 *Name:*    ${nameVal}`,
      `📱 *Mobile:*  +91 ${mobileVal}`,
      `📍 *Pickup:*  ${pickupVal}`,
      `🏁 *Drop:*    ${dropVal}`,
      `📅 *Date:*    ${formattedDate}`,
      `🕐 *Time:*    ${formattedTime}`,
      `🚗 *Vehicle:* ${vehicleVal}`, '',
      '✅ Please confirm availability.',
    ].join('\n');
    const waURL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

    // Open WhatsApp after 1.8s (after animation)
    setTimeout(() => {
      window.open(waURL, '_blank', 'noopener,noreferrer');

      // Close overlay + reset after 1.5s more
      setTimeout(() => {
        if (overlay) {
          overlay.classList.remove('wb-overlay-in');
          setTimeout(() => overlay.setAttribute('hidden', ''), 350);
        }
        submitBtn.querySelector('.wbBtn-inner').innerHTML = origInner;
        submitBtn.disabled = false; busy = false;
        form.reset();
        if (fDate) fDate.min = todayStr();
        if (vehiclePicker) {
          vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(b => {
            b.classList.remove('selected'); b.setAttribute('aria-checked', 'false');
          });
        }
        if (nameCounter) { nameCounter.textContent = '0 / 50'; nameCounter.className = 'wb-char-counter'; }
        if (mobileStatus) { mobileStatus.innerHTML = ''; mobileStatus.className = 'wb-mobile-status'; }
        [fName, fMobile, fPickup, fDrop, fDate, fTime, fVehicle].forEach(wbClear);
      }, 1500);
    }, 1800);
  });

  /* ── Validation ── */
  function wbValidate() {
    let ok = true;
    const name = fName.value.trim();
    if (!name)          { wbErr(fName, 'Please enter your full name.'); ok = false; }
    else if (name.length < 3)  { wbErr(fName, 'Name must be at least 3 characters.'); ok = false; }
    else if (name.length > 50) { wbErr(fName, 'Name cannot exceed 50 characters.'); ok = false; }

    const mob = fMobile.value.replace(/\D/g, '');
    if (!mob)                   { wbErr(fMobile, 'Please enter your mobile number.'); ok = false; }
    else if (!/^[6-9]\d{9}$/.test(mob)) { wbErr(fMobile, 'Enter a valid 10-digit Indian mobile number.'); ok = false; }

    if (!fPickup.value.trim()) { wbErr(fPickup, 'Please enter pickup location.'); ok = false; }
    if (!fDrop.value.trim())   { wbErr(fDrop,   'Please enter drop location.');   ok = false; }

    if (fPickup.value.trim() && fDrop.value.trim() &&
        fPickup.value.trim().toLowerCase() === fDrop.value.trim().toLowerCase()) {
      wbErr(fDrop, 'Pickup and drop cannot be the same.'); ok = false;
    }

    if (!fDate.value) { wbErr(fDate, 'Please select journey date.'); ok = false; }
    else {
      const sel = new Date(fDate.value + 'T00:00:00');
      const now = new Date(); now.setHours(0,0,0,0);
      if (sel < now) { wbErr(fDate, 'Journey date cannot be in the past.'); ok = false; }
    }

    if (!fTime.value) { wbErr(fTime, 'Please select pickup time.'); ok = false; }

    if (!fVehicle.value) {
      if (vehiclePicker) vehiclePicker.classList.add('wb-picker-error');
      const existing = vehiclePicker?.parentElement?.querySelector('.wb-err-msg');
      if (!existing && vehiclePicker) {
        const s = document.createElement('span');
        s.className = 'wb-err-msg'; s.setAttribute('role','alert');
        s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:4px;display:block;';
        s.textContent = 'Please select a vehicle type.';
        vehiclePicker.after(s);
      }
      ok = false;
    }

    if (!ok) {
      const first = form.querySelector('.wb-error, .wb-picker-error');
      if (first) { first.scrollIntoView({ behavior:'smooth', block:'center' }); first.focus?.(); }
    }
    return ok;
  }

  function wbErr(el, msg) {
    if (!el) return;
    el.classList.add('wb-error');
    el.style.borderColor = '#EF4444';
    el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
    const parent = el.closest('.wb-input-icon-wrap')?.parentElement || el.parentElement;
    parent?.querySelector('.wb-err-msg')?.remove();
    if (!msg) return;
    const s = document.createElement('span');
    s.className = 'wb-err-msg'; s.setAttribute('role','alert');
    s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:3px;display:block;';
    s.textContent = msg;
    parent?.appendChild(s);
  }

  function wbClear(el) {
    if (!el) return;
    el.classList.remove('wb-error');
    el.style.borderColor = ''; el.style.boxShadow = '';
    const parent = el.closest?.('.wb-input-icon-wrap')?.parentElement || el.parentElement;
    parent?.querySelector('.wb-err-msg')?.remove();
  }

}());

/* ══════════════════════════════════════════════════════
   3. CONTACT FORM  (#contactForm)
   ══════════════════════════════════════════════════════ */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name    = (document.getElementById('cfName')?.value    || '').trim();
    const phone   = (document.getElementById('cfPhone')?.value   || '').trim();
    const email   = (document.getElementById('cfEmail')?.value   || '').trim();
    const subject = (document.getElementById('cfSubject')?.value || '').trim();
    const message = (document.getElementById('cfMessage')?.value || '').trim();

    if (!name || !message) { showToastMsg('Please fill Name and Message fields.'); return; }

    const btn = form.querySelector('.btn-book-submit');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Sending…';
    btn.disabled = true;

    try {
      const res  = await fetch(API_BASE + '/api/contacts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');

      btn.innerHTML = '<i class="fas fa-check me-2"></i> Message Sent!';
      btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
      showToastMsg("✅ Message sent! We'll get back to you within 24 hours.");

      setTimeout(() => {
        btn.innerHTML = orig; btn.disabled = false; btn.style.background = '';
        form.reset();
      }, 4000);

    } catch (err) {
      btn.innerHTML = orig; btn.disabled = false;
      showToastMsg('❌ ' + (err.message || 'Could not send message.'));
    }
  });
}());

/* ══════════════════════════════════════════════════════
   4. NEWSLETTER FORM
   ══════════════════════════════════════════════════════ */
(function () {
  const nlForm = document.querySelector('.footer-nl-form');
  if (!nlForm) return;
  nlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = this.querySelector('.footer-nl-input');
    const email = input?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (input) input.style.borderColor = '#EF4444'; return;
    }
    if (input) { input.style.borderColor = '#10B981'; input.value = ''; }
    showToastMsg('✅ Subscribed successfully!');
    setTimeout(() => { if (input) input.style.borderColor = ''; }, 3000);
  });
}());

/* ══════════════════════════════════════════════════════
   5. FARE ESTIMATOR  (hero booking card – live preview)
   ══════════════════════════════════════════════════════ */
(function () {
  const rates = {
    'Sedan': { rate: 14, min: 1000 },
    'SUV':  { rate: 18, min: 1400 },
    'Innova':                        { rate: 20, min: 1600 },
  };
  const distances = {
    'chennai-bangalore': 350, 'bangalore-chennai': 350,
    'chennai-coimbatore': 500, 'coimbatore-chennai': 500,
    'chennai-madurai': 460, 'madurai-chennai': 460,
    'chennai-trichy': 330, 'trichy-chennai': 330,
    'coimbatore-ooty': 90, 'pondicherry-chennai': 160, 'chennai-pondicherry': 160,
  };

  const pickupEl  = document.getElementById('hbPickup');
  const dropEl    = document.getElementById('hbDrop');
  const vehicleEl = document.getElementById('hbVehicle');
  const form      = document.getElementById('bookingForm');
  if (!form || !pickupEl || !dropEl || !vehicleEl) return;

  function update() {
    const key = `${pickupEl.value.trim().toLowerCase()}-${dropEl.value.trim().toLowerCase()}`;
    const dist = distances[key];
    const v    = rates[vehicleEl.value];
    form.querySelector('.fare-preview')?.remove();
    if (!dist || !v) return;
    const fare = Math.max(dist * v.rate, v.min);
    const p = document.createElement('div');
    p.className = 'fare-preview';
    p.style.cssText = 'background:rgba(255,193,7,.1);border:1px solid rgba(255,193,7,.25);border-radius:10px;padding:10px 14px;margin-bottom:14px;text-align:center;';
    p.innerHTML = `<span style="font-size:.75rem;color:rgba(255,255,255,.6);display:block">Estimated Fare</span><strong style="font-size:1.2rem;color:#FFC107">₹${fare.toLocaleString('en-IN')}</strong><span style="font-size:.7rem;color:rgba(255,255,255,.4);display:block">Approx. one-way</span>`;
    form.insertBefore(p, form.querySelector('.btn-book-submit'));
  }

  [pickupEl, dropEl, vehicleEl].forEach(el => {
    el.addEventListener('change', update);
    el.addEventListener('input', update);
  });
}());


