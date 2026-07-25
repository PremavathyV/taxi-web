/**
 * OUTSTATION – Booking & Contact Form Handler
 * Handles form validation, submission, and UI feedback
 */

'use strict';

/* ============================================================
   BOOKING FORM
   ============================================================ */
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(this)) return;

    const btn = this.querySelector('.btn-book-submit');
    const originalHTML = btn.innerHTML;

    // Loading state
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Processing…';
    btn.disabled = true;

    // Simulate API call
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-check me-2"></i> Booking Confirmed!';
      btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';

      if (window.showToast) {
        window.showToast('🎉 Booking confirmed! Driver details sent to your mobile.');
      }

      // Reset after 4 seconds
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.background = '';
        bookingForm.reset();
        clearFormErrors(bookingForm);
      }, 4000);
    }, 1800);
  });

  // Real-time validation
  bookingForm.querySelectorAll('.form-input-custom').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => clearFieldError(input));
  });
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm(this)) return;

    const btn = this.querySelector('.btn-book-submit');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Sending…';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-check me-2"></i> Message Sent!';
      btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';

      if (window.showToast) {
        window.showToast('✅ Message sent! We\'ll get back to you within 24 hours.');
      }

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.background = '';
        contactForm.reset();
        clearFormErrors(contactForm);
      }, 4000);
    }, 1800);
  });
}

/* ============================================================
   NEWSLETTER FORM
   ============================================================ */
const nlForm = document.querySelector('.footer-nl-form');

if (nlForm) {
  nlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const emailInput = this.querySelector('.footer-nl-input');
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      emailInput.style.borderColor = '#EF4444';
      return;
    }

    emailInput.style.borderColor = '#10B981';
    emailInput.value = '';

    if (window.showToast) {
      window.showToast('✅ Subscribed successfully! Check your inbox.');
    }

    setTimeout(() => { emailInput.style.borderColor = ''; }, 3000);
  });
}

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

/**
 * Validate all required fields in a form
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateForm(form) {
  let isValid = true;
  form.querySelectorAll('[required], .form-input-custom').forEach(field => {
    if (!validateField(field)) isValid = false;
  });
  return isValid;
}

/**
 * Validate a single field
 * @param {HTMLElement} field
 * @returns {boolean}
 */
function validateField(field) {
  clearFieldError(field);
  const value = field.value.trim();
  const type = field.type;

  // Skip non-required empty fields (like select without required)
  if (!field.hasAttribute('required') && value === '') return true;

  // Empty required
  if (field.hasAttribute('required') && value === '') {
    setFieldError(field, 'This field is required.');
    return false;
  }

  // Email
  if (type === 'email' && value && !isValidEmail(value)) {
    setFieldError(field, 'Please enter a valid email address.');
    return false;
  }

  // Phone
  if (type === 'tel' && value && !isValidPhone(value)) {
    setFieldError(field, 'Please enter a valid 10-digit mobile number.');
    return false;
  }

  // Date – not in past
  if (type === 'date' && value) {
    const selected = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      setFieldError(field, 'Please select a future date.');
      return false;
    }
  }

  setFieldSuccess(field);
  return true;
}

function setFieldError(field, message) {
  field.style.borderColor = '#EF4444';
  field.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';

  // Remove existing error message
  const existing = field.parentElement.querySelector('.field-error');
  if (existing) existing.remove();

  const errEl = document.createElement('span');
  errEl.className = 'field-error';
  errEl.style.cssText = 'font-size:0.72rem;color:#EF4444;margin-top:3px;display:block;';
  errEl.textContent = message;
  field.parentElement.appendChild(errEl);
}

function setFieldSuccess(field) {
  field.style.borderColor = '#10B981';
  field.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
}

function clearFieldError(field) {
  field.style.borderColor = '';
  field.style.boxShadow = '';
  const err = field.parentElement.querySelector('.field-error');
  if (err) err.remove();
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-input-custom').forEach(f => clearFieldError(f));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // Accept formats: +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX (10 digits)
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned);
}

/* ============================================================
   FARE ESTIMATOR – Live calculation
   ============================================================ */
const routeDistances = {
  'chennai-bangalore': 350,
  'bangalore-chennai': 350,
  'chennai-coimbatore': 500,
  'coimbatore-chennai': 500,
  'chennai-madurai': 460,
  'madurai-chennai': 460,
  'chennai-trichy': 330,
  'trichy-chennai': 330,
  'coimbatore-ooty': 90,
  'ooty-coimbatore': 90,
  'pondicherry-chennai': 160,
  'chennai-pondicherry': 160,
};

const vehicleRates = {
  'Hatchback (Maruti Swift)': 12,
  'Sedan (Toyota Etios)': 14,
  'SUV (Mahindra XUV)': 18,
  'Innova': 20,
  'Innova Crysta': 24,
  'Tempo Traveller': 35,
};

const MIN_FARE = {
  'Hatchback (Maruti Swift)': 800,
  'Sedan (Toyota Etios)': 1000,
  'SUV (Mahindra XUV)': 1400,
  'Innova': 1600,
  'Innova Crysta': 1800,
  'Tempo Traveller': 2500,
};

function getEstimatedFare(from, to, vehicle) {
  const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
  const dist = routeDistances[key];
  if (!dist || !vehicleRates[vehicle]) return null;

  const rate = vehicleRates[vehicle];
  const min = MIN_FARE[vehicle];
  return Math.max(dist * rate, min);
}

// Attach fare preview to booking form
if (bookingForm) {
  const pickupInput = bookingForm.querySelectorAll('.form-input-custom')[0];
  const destInput = bookingForm.querySelectorAll('.form-input-custom')[1];
  const vehicleSelect = bookingForm.querySelector('select');

  function updateFarePreview() {
    const from = pickupInput ? pickupInput.value : '';
    const to = destInput ? destInput.value : '';
    const vehicle = vehicleSelect ? vehicleSelect.value : '';

    if (from && to && vehicle) {
      const fare = getEstimatedFare(from, to, vehicle);
      if (fare) {
        const existing = bookingForm.querySelector('.fare-preview');
        if (existing) existing.remove();

        const preview = document.createElement('div');
        preview.className = 'fare-preview';
        preview.style.cssText = `
          background: linear-gradient(135deg, rgba(255,193,7,0.12), rgba(37,99,235,0.08));
          border: 1px solid rgba(255,193,7,0.25); border-radius: 10px;
          padding: 10px 14px; margin-bottom: 14px; text-align: center;
          font-family: var(--font); animation: fadeIn 0.3s ease;
        `;
        preview.innerHTML = `
          <span style="font-size:0.75rem;color:rgba(255,255,255,0.6);display:block;margin-bottom:2px;">Estimated Fare</span>
          <strong style="font-size:1.2rem;color:#FFC107;">₹${fare.toLocaleString('en-IN')}</strong>
          <span style="font-size:0.7rem;color:rgba(255,255,255,0.4);display:block;">Approx. one-way</span>
        `;
        const submitBtn = bookingForm.querySelector('.btn-book-submit');
        bookingForm.insertBefore(preview, submitBtn);
      }
    } else {
      const existing = bookingForm.querySelector('.fare-preview');
      if (existing) existing.remove();
    }
  }

  [pickupInput, destInput, vehicleSelect].forEach(el => {
    if (el) el.addEventListener('change', updateFarePreview);
    if (el && el.tagName !== 'SELECT') el.addEventListener('input', updateFarePreview);
  });
}


/* ============================================================
   WHATSAPP BOOKING FORM  – Enhanced v2
   Features:
     • Plain text inputs for Pickup + Drop (no external API)
     • Vehicle icon-card picker (syncs hidden <select>)
     • Real-time mobile validation with status icon
     • Name character counter (min 3, max 50)
     • Today as min date (set on load + reset)
     • Confirmation animation overlay before WhatsApp opens
     • Multiple-submission guard (button disabled while processing)
     • Loading spinner inside button during processing
     • Pickup ≠ Drop check
   ============================================================ */
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '919444539285';

  /* ── DOM refs ─────────────────────────────────────────────── */
  const form        = document.getElementById('whatsappBookForm');
  if (!form) return;

  const fName       = document.getElementById('wbFullName');
  const fMobile     = document.getElementById('wbMobile');
  const fPickup     = document.getElementById('wbPickup');
  const fDrop       = document.getElementById('wbDrop');
  const fDate       = document.getElementById('wbDate');
  const fTime       = document.getElementById('wbTime');
  const fVehicle    = document.getElementById('wbVehicle');       // hidden <select>
  const vehiclePicker = document.getElementById('wbVehiclePicker');
  const submitBtn   = document.getElementById('wbSubmitBtn');
  const nameCounter = document.getElementById('wbNameCounter');
  const mobileStatus = document.getElementById('wbMobileStatus');
  const overlay     = document.getElementById('wbConfirmOverlay');
  const confirmSummary = document.getElementById('wbConfirmSummary');
  const confirmMeta    = document.getElementById('wbConfirmMeta');

  /* ── Min date = today ─────────────────────────────────────── */
  function setMinDate() {
    fDate.setAttribute('min', new Date().toISOString().split('T')[0]);
  }
  setMinDate();

  /* ══════════════════════════════════════════════════════════
     1. NAME CHARACTER COUNTER  (min 3 / max 50)
     ══════════════════════════════════════════════════════════ */
  fName.addEventListener('input', function () {
    const len = this.value.length;
    if (nameCounter) {
      nameCounter.textContent = `${len} / 50`;
      nameCounter.className = 'wb-char-counter' +
        (len >= 48 ? ' limit' : len >= 40 ? ' warn' : '');
    }
    wbClearError(this);
  });

  /* ══════════════════════════════════════════════════════════
     2. REAL-TIME MOBILE VALIDATION
     ══════════════════════════════════════════════════════════ */
  fMobile.addEventListener('input', function () {
    // Strip non-digits as user types
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
    const val = this.value;

    wbClearError(this);

    if (!mobileStatus) return;

    if (val.length === 0) {
      mobileStatus.innerHTML = '';
      mobileStatus.className = 'wb-mobile-status';
    } else if (/^[6-9]\d{9}$/.test(val)) {
      mobileStatus.innerHTML = '<i class="fas fa-check-circle"></i>';
      mobileStatus.className = 'wb-mobile-status valid';
      // clear any lingering error once valid
      wbClearError(this);
    } else {
      mobileStatus.innerHTML = val.length === 10
        ? '<i class="fas fa-times-circle"></i>'
        : '';
      mobileStatus.className = val.length === 10
        ? 'wb-mobile-status invalid'
        : 'wb-mobile-status';
    }
  });

  /* ══════════════════════════════════════════════════════════
     3. VEHICLE ICON-CARD PICKER
     ══════════════════════════════════════════════════════════ */
  if (vehiclePicker) {
    vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(btn => {
      btn.addEventListener('click', function () {
        // Deselect all
        vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(b => {
          b.classList.remove('selected');
          b.setAttribute('aria-checked', 'false');
        });
        // Select clicked
        this.classList.add('selected');
        this.setAttribute('aria-checked', 'true');
        // Sync hidden <select>
        fVehicle.value = this.dataset.value;
        // Clear picker error
        vehiclePicker.classList.remove('wb-picker-error');
        wbClearError(fVehicle);
      });

      // Keyboard: space / enter to select
      btn.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.click();
        }
      });
    });
  }

  /* Clear errors on date/time change */
  [fDate, fTime].forEach(el => {
    el.addEventListener('change', () => wbClearError(el));
  });
  [fPickup, fDrop].forEach(el => {
    el.addEventListener('input', () => wbClearError(el));
  });

  /* ══════════════════════════════════════════════════════════
     4. FORM SUBMIT – guard + spinner + overlay + WhatsApp
     ══════════════════════════════════════════════════════════ */
  let isProcessing = false;  // multiple-submission guard

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (isProcessing) return;        // prevent double submit
    if (!wbValidateAll()) return;

    isProcessing = true;

    /* ── Disable button + show spinner ─────────────────────── */
    const originalInner = submitBtn.querySelector('.wbBtn-inner').innerHTML;
    submitBtn.disabled = true;
    submitBtn.querySelector('.wbBtn-inner').innerHTML =
      '<i class="fas fa-circle-notch fa-spin wbBtn-icon"></i>' +
      '<span class="wbBtn-text">Processing…</span>';

    /* ── Build formatted values ─────────────────────────────── */
    const dateObj       = new Date(fDate.value + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const [hh, mm]      = fTime.value.split(':');
    const h             = parseInt(hh, 10);
    const formattedTime = `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
    const vehicleLabel  = fVehicle.value;
    const pickupVal     = fPickup.value.trim();
    const dropVal       = fDrop.value.trim();
    const nameVal       = fName.value.trim();
    const mobileVal     = fMobile.value.trim();

    /* ── Show confirmation overlay (after brief spinner delay) ─ */
    setTimeout(() => {

      // Populate overlay summary
      if (confirmSummary) {
        confirmSummary.textContent =
          `${nameVal} · +91 ${mobileVal}`;
      }
      if (confirmMeta) {
        confirmMeta.innerHTML = [
          `<span><i class="fas fa-location-dot"></i> ${pickupVal}</span>`,
          `<span><i class="fas fa-flag-checkered"></i> ${dropVal}</span>`,
          `<span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>`,
          `<span><i class="far fa-clock"></i> ${formattedTime}</span>`,
          `<span><i class="fas fa-car"></i> ${vehicleLabel}</span>`,
        ].join('');
      }

      // Show overlay
      overlay.removeAttribute('hidden');
      // Force reflow so CSS transition fires
      void overlay.offsetWidth;
      overlay.classList.add('wb-overlay-in');

      /* ── Build WhatsApp message ──────────────────────────── */
      const msg = [
        '🚕 *OUTSTATION – New Taxi Booking Request*',
        '',
        `👤 *Name:*     ${nameVal}`,
        `📱 *Mobile:*   +91 ${mobileVal}`,
        `📍 *Pickup:*   ${pickupVal}`,
        `🏁 *Drop:*     ${dropVal}`,
        `📅 *Date:*     ${formattedDate}`,
        `🕐 *Time:*     ${formattedTime}`,
        `🚗 *Vehicle:*  ${vehicleLabel}`,
        '',
        '✅ Please confirm availability and share the fare.',
      ].join('\n');

      const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

      /* ── Open WhatsApp after animation completes (1.8 s) ─── */
      setTimeout(() => {
        window.open(waURL, '_blank', 'noopener,noreferrer');

        if (window.showToast) {
          window.showToast('✅ Opening WhatsApp to confirm your booking!');
        }

        /* ── Close overlay + reset form after another 1.5 s ── */
        setTimeout(() => {
          overlay.classList.remove('wb-overlay-in');
          setTimeout(() => overlay.setAttribute('hidden', ''), 350);

          // Reset button
          submitBtn.querySelector('.wbBtn-inner').innerHTML = originalInner;
          submitBtn.disabled = false;
          isProcessing = false;

          // Reset form fields
          form.reset();
          setMinDate();

          // Reset vehicle picker
          if (vehiclePicker) {
            vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(b => {
              b.classList.remove('selected');
              b.setAttribute('aria-checked', 'false');
            });
          }

          // Reset name counter
          if (nameCounter) {
            nameCounter.textContent = '0 / 50';
            nameCounter.className = 'wb-char-counter';
          }

          // Reset mobile status
          if (mobileStatus) {
            mobileStatus.innerHTML = '';
            mobileStatus.className = 'wb-mobile-status';
          }

          // Clear all field errors
          [fName, fMobile, fPickup, fDrop, fDate, fTime, fVehicle]
            .forEach(wbClearError);

        }, 1500);
      }, 1800);

    }, 700); // brief spinner → overlay delay
  });

  /* ══════════════════════════════════════════════════════════
     5. VALIDATION
     ══════════════════════════════════════════════════════════ */
  function wbValidateAll() {
    let ok = true;

    /* Full Name: required, min 3, max 50 */
    const nameVal = fName.value.trim();
    if (!nameVal) {
      wbSetError(fName, 'Please enter your full name.'); ok = false;
    } else if (nameVal.length < 3) {
      wbSetError(fName, 'Name must be at least 3 characters.'); ok = false;
    } else if (nameVal.length > 50) {
      wbSetError(fName, 'Name cannot exceed 50 characters.'); ok = false;
    }

    /* Mobile: exactly 10 digits, starts with 6–9 */
    const mob = fMobile.value.trim().replace(/\D/g, '');
    if (!mob) {
      wbSetError(fMobile, 'Please enter your mobile number.'); ok = false;
    } else if (!/^[6-9]\d{9}$/.test(mob)) {
      wbSetError(fMobile, 'Enter a valid 10-digit Indian mobile number.'); ok = false;
    }

    /* Pickup */
    if (!fPickup.value.trim()) {
      wbSetError(fPickup, 'Please enter the pickup location.'); ok = false;
    }

    /* Drop */
    if (!fDrop.value.trim()) {
      wbSetError(fDrop, 'Please enter the drop location.'); ok = false;
    }

    /* Pickup ≠ Drop */
    if (
      fPickup.value.trim() &&
      fDrop.value.trim() &&
      fPickup.value.trim().toLowerCase() === fDrop.value.trim().toLowerCase()
    ) {
      wbSetError(fDrop, 'Pickup and drop locations cannot be the same.');
      if (!fPickup.classList.contains('wb-error')) {
        wbSetError(fPickup, 'Same as drop — please change pickup.');
      }
      ok = false;
    }

    /* Date: required + not in past */
    if (!fDate.value) {
      wbSetError(fDate, 'Please select a journey date.'); ok = false;
    } else {
      const sel   = new Date(fDate.value + 'T00:00:00');
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (sel < today) {
        wbSetError(fDate, 'Journey date cannot be in the past.'); ok = false;
      }
    }

    /* Time */
    if (!fTime.value) {
      wbSetError(fTime, 'Please select a pickup time.'); ok = false;
    }

    /* Vehicle (hidden select must have a value) */
    if (!fVehicle.value) {
      wbSetError(fVehicle, '');            // sets internal flag
      vehiclePicker && vehiclePicker.classList.add('wb-picker-error');
      // insert visible error below picker
      const existing = vehiclePicker
        ? vehiclePicker.parentElement.querySelector('.wb-err-msg')
        : null;
      if (!existing && vehiclePicker) {
        const span = document.createElement('span');
        span.className = 'wb-err-msg';
        span.setAttribute('role', 'alert');
        span.style.cssText =
          'font-size:0.72rem;color:#EF4444;margin-top:4px;display:block;';
        span.textContent = 'Please select a vehicle type.';
        vehiclePicker.after(span);
      }
      ok = false;
    }

    /* Scroll to first error */
    if (!ok) {
      const firstErr = form.querySelector('.wb-error, .wb-picker-error');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstErr.focus) firstErr.focus();
      }
    }

    return ok;
  }

  /* ══════════════════════════════════════════════════════════
     6. UI HELPERS
     ══════════════════════════════════════════════════════════ */
  function wbSetError(el, msg) {
    el.classList.add('wb-error');
    el.style.borderColor = '#EF4444';
    el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';

    // Find the right parent (handle prefix-wrap inputs)
    const parent = el.closest('.wb-input-icon-wrap')
      ? el.closest('.wb-input-icon-wrap').parentElement
      : el.parentElement;

    const old = parent.querySelector('.wb-err-msg');
    if (old) old.remove();

    if (!msg) return; // vehicle error message added manually above

    const span = document.createElement('span');
    span.className = 'wb-err-msg';
    span.setAttribute('role', 'alert');
    span.style.cssText =
      'font-size:0.72rem;color:#EF4444;margin-top:3px;display:block;font-family:inherit;';
    span.textContent = msg;
    parent.appendChild(span);
  }

  function wbClearError(el) {
    el.classList.remove('wb-error');
    el.style.borderColor = '';
    el.style.boxShadow   = '';

    const parent = el.closest('.wb-input-icon-wrap')
      ? el.closest('.wb-input-icon-wrap').parentElement
      : el.parentElement;

    const old = parent ? parent.querySelector('.wb-err-msg') : null;
    if (old) old.remove();
  }

}()); // end IIFE
