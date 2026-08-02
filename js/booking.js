/**
 * booking.js – Sundara Travels
 * WhatsApp Booking Form + Contact Form + Newsletter
 * Hero booking form removed as per client request.
 */
'use strict';

const API_BASE = 'https://taxi-web-mrk9.onrender.com';

function showToastMsg(msg) { if (window.showToast) window.showToast(msg); }
function todayStr()        { return new Date().toISOString().split('T')[0]; }

/* ══════════════════════════════════════════════════════
   WHATSAPP BOOKING FORM  (#whatsappBookForm)
   ══════════════════════════════════════════════════════ */
(function () {
  const WHATSAPP = '917639103970';

  const form          = document.getElementById('whatsappBookForm');
  if (!form) return;

  const fName         = document.getElementById('wbFullName');
  const fMobile       = document.getElementById('wbMobile');
  const fEmail        = document.getElementById('wbEmail');
  const fPickup       = document.getElementById('wbPickup');
  const fDrop         = document.getElementById('wbDrop');
  const fDate         = document.getElementById('wbDate');
  const fTime         = document.getElementById('wbTime');
  const fVehicle      = document.getElementById('wbVehicle');
  const fMessage      = document.getElementById('wbMessage');
  const vehiclePicker = document.getElementById('wbVehiclePicker');
  const submitBtn     = document.getElementById('wbSubmitBtn');
  const nameCounter   = document.getElementById('wbNameCounter');
  const mobileStatus  = document.getElementById('wbMobileStatus');
  const overlay       = document.getElementById('wbConfirmOverlay');
  const confirmSummary = document.getElementById('wbConfirmSummary');
  const confirmMeta    = document.getElementById('wbConfirmMeta');

  if (fDate) fDate.min = todayStr();

  /* Name counter */
  if (fName) {
    fName.addEventListener('input', function () {
      const len = this.value.length;
      if (nameCounter) {
        nameCounter.textContent = len + ' / 50';
        nameCounter.className = 'wb-char-counter' + (len >= 48 ? ' limit' : len >= 40 ? ' warn' : '');
      }
      wbClear(this);
    });
  }

  /* Mobile real-time */
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

  /* Email real-time */
  if (fEmail) fEmail.addEventListener('input', () => wbClear(fEmail));

  /* Vehicle picker */
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
    if (el) { el.addEventListener('input', () => wbClear(el)); el.addEventListener('change', () => wbClear(el)); }
  });

  /* SUBMIT */
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
    const emailVal   = fEmail.value.trim();
    const pickupVal  = fPickup.value.trim();
    const dropVal    = fDrop.value.trim();
    const vehicleVal = fVehicle.value;
    const dateVal    = fDate.value;
    const timeVal    = fTime.value;
    const messageVal = fMessage?.value.trim() || '';

    const dateObj       = new Date(dateVal + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const [hh, mm]  = timeVal.split(':');
    const h         = parseInt(hh, 10);
    const formattedTime = `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;

    /* Save to backend + trigger confirmation email */
    try {
      const res = await fetch(API_BASE + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameVal, mobile: mobileVal, email: emailVal,
          pickup: pickupVal, drop: dropVal,
          journeyDate: dateVal, pickupTime: timeVal,
          vehicleType: vehicleVal,
          specialInstructions: messageVal,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Booking failed.');
    } catch (err) {
      submitBtn.querySelector('.wbBtn-inner').innerHTML = origInner;
      submitBtn.disabled = false; busy = false;
      showToastMsg('❌ ' + (err.message || 'Network error. Please try again.'));
      return;
    }

    /* Show confirmation overlay */
    if (confirmSummary) confirmSummary.textContent = `${nameVal} · +91 ${mobileVal}`;
    if (confirmMeta) {
      confirmMeta.innerHTML = [
        `<span><i class="fas fa-location-dot"></i> ${pickupVal}</span>`,
        `<span><i class="fas fa-flag-checkered"></i> ${dropVal}</span>`,
        `<span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>`,
        `<span><i class="far fa-clock"></i> ${formattedTime}</span>`,
        `<span><i class="fas fa-car"></i> ${vehicleVal}</span>`,
        emailVal ? `<span><i class="fas fa-envelope"></i> Confirmation sent to ${emailVal}</span>` : '',
      ].join('');
    }
    if (overlay) { overlay.removeAttribute('hidden'); void overlay.offsetWidth; overlay.classList.add('wb-overlay-in'); }
    showToastMsg('✅ Booking confirmed! Opening WhatsApp…');

    /* Build WhatsApp message */
    const msg = [
      '🚕 *SUNDARA TRAVELS – Booking Request*', '',
      `👤 *Name:*      ${nameVal}`,
      `📱 *Mobile:*    +91 ${mobileVal}`,
      `📧 *Email:*     ${emailVal}`,
      `📍 *Pickup:*    ${pickupVal}`,
      `🏁 *Drop:*      ${dropVal}`,
      `📅 *Date:*      ${formattedDate}`,
      `🕐 *Time:*      ${formattedTime}`,
      `🚗 *Vehicle:*   ${vehicleVal}`,
      messageVal ? `💬 *Message:*   ${messageVal}` : '',
      '', '✅ Please confirm availability.',
    ].filter(l => l !== '').join('\n');

    const waURL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

    /* Open WhatsApp pre-filled — user taps Send */
    setTimeout(() => {
      window.open(waURL, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        if (overlay) { overlay.classList.remove('wb-overlay-in'); setTimeout(() => overlay.setAttribute('hidden', ''), 350); }
        submitBtn.querySelector('.wbBtn-inner').innerHTML = origInner;
        submitBtn.disabled = false; busy = false;
        form.reset();
        // clear autocomplete visible inputs
        const pi = document.getElementById('wbPickupInput'); if (pi) pi.value = '';
        const di = document.getElementById('wbDropInput');   if (di) di.value = '';
        document.getElementById('wbFareCard').style.display = 'none';
        if (fDate) fDate.min = todayStr();
        if (vehiclePicker) vehiclePicker.querySelectorAll('.wb-vehicle-opt').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-checked','false'); });
        if (nameCounter) { nameCounter.textContent = '0 / 50'; nameCounter.className = 'wb-char-counter'; }
        if (mobileStatus) { mobileStatus.innerHTML = ''; mobileStatus.className = 'wb-mobile-status'; }
        [fName, fMobile, fEmail, fPickup, fDrop, fDate, fTime, fVehicle].forEach(wbClear);
      }, 1500);
    }, 1800);
  });

  /* Validation */
  function wbValidate() {
    let ok = true;
    const name = fName.value.trim();
    if (!name)            { wbErr(fName, 'Please enter your full name.'); ok = false; }
    else if (name.length < 3)  { wbErr(fName, 'Name must be at least 3 characters.'); ok = false; }
    else if (name.length > 50) { wbErr(fName, 'Name cannot exceed 50 characters.'); ok = false; }

    const mob = fMobile.value.replace(/\D/g, '');
    if (!mob)                    { wbErr(fMobile, 'Please enter your mobile number.'); ok = false; }
    else if (!/^[6-9]\d{9}$/.test(mob)) { wbErr(fMobile, 'Enter a valid 10-digit Indian mobile number.'); ok = false; }

    const email = fEmail?.value.trim() || '';
    if (!email)                   { wbErr(fEmail, 'Please enter your email address.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { wbErr(fEmail, 'Enter a valid email address.'); ok = false; }

    if (!fPickup.value.trim()) { wbErr(document.getElementById('wbPickupInput'), 'Please select a pickup city.'); ok = false; }
    if (!fDrop.value.trim())   { wbErr(document.getElementById('wbDropInput'),   'Please select a drop city.'); ok = false; }
    if (fPickup.value.trim() && fDrop.value.trim() &&
        fPickup.value.trim().toLowerCase() === fDrop.value.trim().toLowerCase()) {
      wbErr(document.getElementById('wbDropInput'), 'Pickup and drop city cannot be the same.'); ok = false;
    }

    if (!fDate.value) { wbErr(fDate, 'Please select journey date.'); ok = false; }
    else {
      const sel = new Date(fDate.value + 'T00:00:00'); const now = new Date(); now.setHours(0,0,0,0);
      if (sel < now) { wbErr(fDate, 'Journey date cannot be in the past.'); ok = false; }
    }

    if (!fTime.value) { wbErr(fTime, 'Please select pickup time.'); ok = false; }

    if (!fVehicle.value) {
      if (vehiclePicker) vehiclePicker.classList.add('wb-picker-error');
      const ex = vehiclePicker?.parentElement?.querySelector('.wb-err-msg');
      if (!ex && vehiclePicker) {
        const s = document.createElement('span'); s.className = 'wb-err-msg'; s.setAttribute('role','alert');
        s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:4px;display:block;';
        s.textContent = 'Please select a vehicle type.'; vehiclePicker.after(s);
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
    el.classList.add('wb-error'); el.style.borderColor = '#EF4444'; el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
    const parent = el.closest?.('.wb-input-icon-wrap')?.parentElement || el.parentElement;
    parent?.querySelector('.wb-err-msg')?.remove();
    if (!msg) return;
    const s = document.createElement('span'); s.className = 'wb-err-msg'; s.setAttribute('role','alert');
    s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:3px;display:block;';
    s.textContent = msg; parent?.appendChild(s);
  }

  function wbClear(el) {
    if (!el) return;
    el.classList.remove('wb-error'); el.style.borderColor = ''; el.style.boxShadow = '';
    const parent = el.closest?.('.wb-input-icon-wrap')?.parentElement || el.parentElement;
    parent?.querySelector('.wb-err-msg')?.remove();
  }

}());

/* ══════════════════════════════════════════════════════
   CONTACT FORM (#contactForm)
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
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Sending…'; btn.disabled = true;

    try {
      const res  = await fetch(API_BASE + '/api/contacts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed.');
      btn.innerHTML = '<i class="fas fa-check me-2"></i> Message Sent!';
      btn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
      showToastMsg("✅ Message sent! We'll get back to you within 24 hours.");
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; btn.style.background = ''; form.reset(); }, 4000);
    } catch (err) {
      btn.innerHTML = orig; btn.disabled = false;
      showToastMsg('❌ ' + (err.message || 'Could not send message.'));
    }
  });
}());

/* ══════════════════════════════════════════════════════
   NEWSLETTER FORM
   ══════════════════════════════════════════════════════ */
(function () {
  const nlForm = document.querySelector('.footer-nl-form');
  if (!nlForm) return;
  nlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = this.querySelector('.footer-nl-input');
    const email = input?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if (input) input.style.borderColor = '#EF4444'; return; }
    if (input) { input.style.borderColor = '#10B981'; input.value = ''; }
    showToastMsg('✅ Subscribed successfully!');
    setTimeout(() => { if (input) input.style.borderColor = ''; }, 3000);
  });
}());


/* ══════════════════════════════════════════════════════
   LOCATION AUTOCOMPLETE — OpenStreetMap Nominatim
   Real place search (cities, areas, landmarks) — no API key needed
   ══════════════════════════════════════════════════════ */
(function () {

  /* Fallback city list shown when offline or before first API response */
  const FALLBACK = [
    'Chennai','Bangalore','Coimbatore','Madurai','Trichy','Salem',
    'Pondicherry','Vellore','Tirunelveli','Erode','Ooty','Kodaikanal',
    'Kumbakonam','Thanjavur','Kanyakumari','Tirupati','Hyderabad',
    'Kochi','Munnar','Mysore','Nagercoil','Dindigul','Hosur','Tirupur',
    'Coonoor','Palani','Pollachi','Thoothukudi','Rameswaram','Chidambaram',
  ];

  function buildLocationSearch(inputId, hiddenId, suggestId) {
    const input   = document.getElementById(inputId);
    const hidden  = document.getElementById(hiddenId);
    const suggest = document.getElementById(suggestId);
    if (!input || !hidden || !suggest) return;

    let activeIdx  = -1;
    let debounceT  = null;
    let lastQuery  = '';
    let controller = null; // AbortController for in-flight requests

    /* ── Render suggestion list ─────────────────────── */
    function renderList(items) {
      suggest.innerHTML = '';
      activeIdx = -1;
      if (!items.length) { suggest.style.display = 'none'; return; }

      items.forEach(item => {
        const li  = document.createElement('li');
        li.setAttribute('role', 'option');

        const name    = item.name    || '';
        const subtext = item.subtext || '';
        const type    = item.type    || '';
        const icon    = getIcon(type);

        li.innerHTML = `
          <span class="wb-sug-icon">${icon}</span>
          <span class="wb-sug-text">
            <span class="wb-sug-name">${highlight(name, lastQuery)}</span>
            ${subtext ? `<span class="wb-sug-sub">${subtext}</span>` : ''}
          </span>`;

        li.addEventListener('mousedown', e => { e.preventDefault(); selectPlace(item); });
        suggest.appendChild(li);
      });
      suggest.style.display = 'block';
    }

    /* ── Icon based on place type ───────────────────── */
    function getIcon(type) {
      const t = (type || '').toLowerCase();
      if (['city','town','village','suburb','municipality'].some(x => t.includes(x)))
        return '<i class="fas fa-city"></i>';
      if (['airport','aerodrome'].some(x => t.includes(x)))
        return '<i class="fas fa-plane"></i>';
      if (['railway','station','junction'].some(x => t.includes(x)))
        return '<i class="fas fa-train"></i>';
      if (['hotel','lodge','resort'].some(x => t.includes(x)))
        return '<i class="fas fa-hotel"></i>';
      return '<i class="fas fa-map-marker-alt"></i>';
    }

    /* ── Highlight matched query in name ────────────── */
    function highlight(text, q) {
      if (!q) return text;
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(re, '<strong>$1</strong>');
    }

    /* ── Fetch from Nominatim ───────────────────────── */
    async function fetchNominatim(q) {
      if (controller) controller.abort();
      controller = new AbortController();

      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q)}&` +
        `countrycodes=in&` +           // India only
        `addressdetails=1&` +
        `limit=8&` +
        `format=json`;

      const res  = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();

      return data.map(p => {
        const addr = p.address || {};
        const rawName = addr.city || addr.town || addr.village || addr.county ||
                     addr.state_district || p.display_name.split(',')[0];
        const normalized = normalizeCity(rawName);
        const parts = p.display_name.split(',').slice(1, 3).join(',').trim();
        return {
          name:     normalized,
          subtext:  parts,
          fullName: p.display_name,
          type:     p.type || p.class || '',
          lat: p.lat,
          lon: p.lon,
        };
      });
    }

    /* ── Fallback static list ───────────────────────── */
    function getFallback(q) {
      const ql = q.toLowerCase();
      return FALLBACK
        .filter(c => c.toLowerCase().startsWith(ql))
        .concat(FALLBACK.filter(c => !c.toLowerCase().startsWith(ql) && c.toLowerCase().includes(ql)))
        .slice(0, 8)
        .map(c => ({ name: c, subtext: 'Tamil Nadu / South India', type: 'city' }));
    }

    /* ── Show loading spinner in list ──────────────── */
    function showLoading() {
      suggest.innerHTML = '<li class="wb-sug-loading"><i class="fas fa-circle-notch fa-spin"></i> Searching…</li>';
      suggest.style.display = 'block';
    }

    /* ── Main search trigger ────────────────────────── */
    async function search(q) {
      lastQuery = q;
      if (q.length < 2) { suggest.style.display = 'none'; return; }

      // Show fallback instantly, then fetch real results
      const fb = getFallback(q);
      if (fb.length) renderList(fb);
      else showLoading();

      try {
        const results = await fetchNominatim(q);
        if (results.length) renderList(results);
        else if (!fb.length) suggest.style.display = 'none';
      } catch (err) {
        if (err.name !== 'AbortError') {
          // keep fallback shown if network fails
          if (!fb.length) suggest.style.display = 'none';
        }
      }
    }

    /* ── Normalize place name to match distances table ─ */
    function normalizeCity(raw) {
      if (!raw) return raw;
      // Map of common Nominatim variants → canonical name in distances table
      const MAP = {
        'bengaluru':'Bangalore','bengaluru urban':'Bangalore','bengaluru rural':'Bangalore',
        'greater chennai corporation':'Chennai','chennai district':'Chennai',
        'coimbatore district':'Coimbatore','coimbatore corporation':'Coimbatore',
        'madurai district':'Madurai','madurai corporation':'Madurai',
        'tiruchirappalli':'Trichy','tiruchirappalli district':'Trichy',
        'trichy':'Trichy','tiruchirapalli':'Trichy',
        'salem district':'Salem',
        'puducherry':'Pondicherry','pondicherry':'Pondicherry',
        'vellore district':'Vellore',
        'tirunelveli district':'Tirunelveli','tirunelveli corporation':'Tirunelveli',
        'erode district':'Erode',
        'udhagamandalam':'Ooty','ootacamund':'Ooty','ooty':'Ooty',
        'kodaikanal':'Kodaikanal',
        'kumbakonam':'Kumbakonam',
        'thanjavur district':'Thanjavur','tanjore':'Thanjavur',
        'kanyakumari district':'Kanyakumari','cape comorin':'Kanyakumari',
        'tirupati':'Tirupati','tirupathi':'Tirupati',
        'hyderabad district':'Hyderabad',
        'ernakulam':'Kochi','cochin':'Kochi','kochi':'Kochi',
        'munnar':'Munnar',
        'mysuru':'Mysore','mysore':'Mysore','mysuru district':'Mysore',
        'nagercoil':'Nagercoil','kanyakumari':'Kanyakumari',
        'dindigul district':'Dindigul',
        'hosur':'Hosur',
        'tiruppur':'Tirupur','tirupur':'Tirupur',
        'coonoor':'Coonoor',
        'palani':'Palani',
        'pollachi':'Pollachi',
        'thoothukudi':'Thoothukudi','tuticorin':'Thoothukudi',
        'rameswaram':'Rameswaram',
        'chidambaram':'Chidambaram',
      };
      const lower = raw.toLowerCase().trim();
      if (MAP[lower]) return MAP[lower];
      // Try matching known city names as substrings
      const KNOWN = [
        'Chennai','Bangalore','Coimbatore','Madurai','Trichy','Salem',
        'Pondicherry','Vellore','Tirunelveli','Erode','Ooty','Kodaikanal',
        'Kumbakonam','Thanjavur','Kanyakumari','Tirupati','Hyderabad',
        'Kochi','Munnar','Mysore','Nagercoil','Dindigul','Hosur','Tirupur',
        'Coonoor','Palani','Pollachi','Thoothukudi','Rameswaram','Chidambaram',
      ];
      for (const city of KNOWN) {
        if (lower.includes(city.toLowerCase())) return city;
      }
      // Return original (capitalized first letter) for display
      return raw.split(',')[0].trim();
    }

    /* ── Select a place ─────────────────────────────── */
    function selectPlace(item) {
      const normalized = normalizeCity(item.name);
      input.value  = normalized;          // show clean city name
      hidden.value = normalized;          // used by fare calc
      suggest.style.display = 'none';
      suggest.innerHTML = '';
      activeIdx = -1;
      // clear error
      input.classList.remove('wb-error');
      input.style.borderColor = '';
      input.style.boxShadow   = '';
      const wrap = input.closest('.wb-autocomplete-wrap')?.parentElement;
      wrap?.querySelector('.wb-err-msg')?.remove();
      // trigger fare calc
      hidden.dispatchEvent(new Event('change'));
    }

    /* ── Events ─────────────────────────────────────── */
    input.addEventListener('input', function () {
      hidden.value = '';
      const q = this.value.trim();
      clearTimeout(debounceT);
      if (!q) { suggest.style.display = 'none'; return; }
      debounceT = setTimeout(() => search(q), 300); // 300ms debounce
    });

    input.addEventListener('focus', function () {
      if (this.value.trim().length >= 2) search(this.value.trim());
    });

    input.addEventListener('keydown', function (e) {
      const items = suggest.querySelectorAll('li:not(.wb-sug-loading)');
      if (!items.length || suggest.style.display === 'none') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
        items[activeIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
        items[activeIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0 && items[activeIdx]) {
          e.preventDefault();
          items[activeIdx].dispatchEvent(new MouseEvent('mousedown'));
        }
      } else if (e.key === 'Escape') {
        suggest.style.display = 'none';
        activeIdx = -1;
      }
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !suggest.contains(e.target)) {
        suggest.style.display = 'none';
      }
    });
  }

  buildLocationSearch('wbPickupInput', 'wbPickup', 'wbPickupSuggestions');
  buildLocationSearch('wbDropInput',   'wbDrop',   'wbDropSuggestions');

}());
(function () {
  const toggle = document.getElementById('wbTripToggle');
  const hidden = document.getElementById('wbTripType');
  if (!toggle || !hidden) return;
  toggle.querySelectorAll('.wb-trip-opt').forEach(btn => {
    btn.addEventListener('click', function () {
      toggle.querySelectorAll('.wb-trip-opt').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-checked','false'); });
      this.classList.add('selected'); this.setAttribute('aria-checked','true');
      hidden.value = this.dataset.value;
      // re-trigger fare calc
      document.getElementById('wbPickup')?.dispatchEvent(new Event('change'));
    });
  });
}());

/* ══════════════════════════════════════════════════════
   FARE ESTIMATOR
   ══════════════════════════════════════════════════════ */
(function () {
  /* Rates per km + driver bata */
  const RATES = {
    'Sedan':  { oneWay: 15, roundTrip: 14, bata: 400,  min: 1000, seats: 4 },
    'SUV':    { oneWay: 20, roundTrip: 18, bata: 500,  min: 1400, seats: 6 },
    'Innova': { oneWay: 21, roundTrip: 19, bata: 500,  min: 1600, seats: 7 },
  };

  /* Distances in km between city pairs (one-way) */
  const DIST = {
    'chennai-bangalore':    350, 'chennai-coimbatore':   497,
    'chennai-madurai':      462, 'chennai-trichy':       330,
    'chennai-salem':        340, 'chennai-pondicherry':  162,
    'chennai-vellore':      140, 'chennai-tirunelveli':  625,
    'chennai-erode':        400, 'chennai-ooty':         545,
    'chennai-kodaikanal':   528, 'chennai-kumbakonam':   290,
    'chennai-thanjavur':    315, 'chennai-kanyakumari':  700,
    'chennai-tirupati':     140, 'chennai-hyderabad':    625,
    'chennai-kochi':        693, 'chennai-munnar':       655,
    'chennai-mysore':       480,
    'bangalore-coimbatore': 360, 'bangalore-madurai':    450,
    'bangalore-trichy':     380, 'bangalore-salem':      220,
    'bangalore-pondicherry':310, 'bangalore-vellore':    210,
    'bangalore-tirunelveli':570, 'bangalore-ooty':       270,
    'bangalore-kodaikanal': 470, 'bangalore-hyderabad':  570,
    'bangalore-kochi':      540, 'bangalore-mysore':     145,
    'bangalore-munnar':     470, 'bangalore-tirupati':   260,
    'bangalore-kumbakonam': 430, 'bangalore-thanjavur':  450,
    'bangalore-kanyakumari':740, 'bangalore-erode':      290,
    'coimbatore-madurai':   210, 'coimbatore-trichy':    200,
    'coimbatore-ooty':       90, 'coimbatore-kodaikanal':180,
    'coimbatore-kochi':     190, 'coimbatore-munnar':    145,
    'coimbatore-salem':     160, 'coimbatore-mysore':    255,
    'madurai-trichy':       140, 'madurai-tirunelveli':  170,
    'madurai-kanyakumari':  247, 'madurai-kodaikanal':   120,
    'madurai-kumbakonam':   220, 'madurai-thanjavur':    175,
    'trichy-kumbakonam':     95, 'trichy-thanjavur':      58,
    'trichy-salem':         160, 'trichy-vellore':       225,
    'salem-erode':           60, 'pondicherry-vellore':  155,
    'ooty-kodaikanal':      280, 'ooty-mysore':          124,
    'hyderabad-tirupati':   520, 'kochi-munnar':         130,
  };

  /* Build symmetric lookup — both directions */
  const distances = {};
  Object.entries(DIST).forEach(([k, v]) => {
    distances[k] = v;
    const [a, b] = k.split('-');
    distances[`${b}-${a}`] = v;
  });

  const pickupEl  = document.getElementById('wbPickup');
  const dropEl    = document.getElementById('wbDrop');
  const vehicleEl = document.getElementById('wbVehicle');
  const tripEl    = document.getElementById('wbTripType');
  const fareCard  = document.getElementById('wbFareCard');
  const fareRoute = document.getElementById('wbFareRoute');
  const fareBreak = document.getElementById('wbFareBreakdown');
  const fareAmt   = document.getElementById('wbFareAmount');
  const fareBadge = document.getElementById('wbFareBadge');

  if (!pickupEl || !dropEl || !vehicleEl || !fareCard) return;

  function calcFare() {
    const pickup  = pickupEl.value.trim();
    const drop    = dropEl.value.trim();
    const vehicle = vehicleEl.value;
    const trip    = tripEl?.value || 'one_way';

    fareCard.style.display = 'none';
    if (!pickup || !drop || !vehicle || pickup === drop) return;

    const key  = `${pickup.toLowerCase()}-${drop.toLowerCase()}`;
    const dist = distances[key];
    if (!dist) return; // route not in table

    const r        = RATES[vehicle];
    const rate     = trip === 'round_trip' ? r.roundTrip : r.oneWay;
    const totalDist= trip === 'round_trip' ? dist * 2 : dist;
    const baseFare = Math.max(totalDist * rate, r.min);
    const totalFare= baseFare + r.bata;
    const isRT     = trip === 'round_trip';

    fareBadge.textContent = isRT ? 'Round Trip' : 'One Way';
    fareBadge.className   = 'wb-fare-badge' + (isRT ? ' rt' : '');

    fareRoute.innerHTML = `
      <span class="wb-fare-city"><i class="fas fa-location-dot"></i> ${pickup}</span>
      <span class="wb-fare-arrow"><i class="fas fa-arrow-right"></i>${isRT ? '<i class="fas fa-arrow-left ms-1"></i>' : ''}</span>
      <span class="wb-fare-city"><i class="fas fa-flag-checkered"></i> ${drop}</span>
      <span class="wb-fare-dist">${isRT ? totalDist : dist} km${isRT ? ' (both ways)' : ''}</span>`;

    fareBreak.innerHTML = `
      <div class="wb-fare-row"><span>Distance</span><span>${isRT ? dist + ' km × 2' : dist + ' km'}</span></div>
      <div class="wb-fare-row"><span>Rate / km</span><span>₹${rate}</span></div>
      <div class="wb-fare-row"><span>Base Fare</span><span>₹${baseFare.toLocaleString('en-IN')}</span></div>
      <div class="wb-fare-row"><span>Driver Bata</span><span>₹${r.bata}</span></div>`;

    fareAmt.textContent = '₹' + totalFare.toLocaleString('en-IN');
    fareCard.style.display = 'block';
    // animate in
    fareCard.classList.remove('wb-fare-in');
    void fareCard.offsetWidth;
    fareCard.classList.add('wb-fare-in');
  }

  [pickupEl, dropEl, vehicleEl, tripEl].forEach(el => {
    if (el) { el.addEventListener('change', calcFare); el.addEventListener('input', calcFare); }
  });
}());

