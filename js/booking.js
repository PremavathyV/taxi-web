/**
 * booking.js – Sundara Travels
 * WhatsApp Booking Form + Contact Form + Newsletter
 * Hero booking form removed as per client request.
 */
'use strict';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''   // local: relative URL (same server)
  : 'https://taxi-web-mrk9.onrender.com';

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
    const routeMeta = window._currentRouteMeta || null;

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
          estimatedDistanceKm: routeMeta && routeMeta.distanceKm ? routeMeta.distanceKm : undefined,
          estimatedTravelTimeMin: routeMeta && routeMeta.durationInTrafficSec ? Math.round(routeMeta.durationInTrafficSec / 60) : undefined,
          routeMeta: routeMeta,
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
    // Google Ads Conversion Tracking
if (window.gtag) {
  window.gtag('event', 'conversion', {
    send_to: 'AW-11132042767/Uoo5CLTd9NscEI_8lbwp'
  });
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

    /* Build WhatsApp message with fare details */
    const distKm  = window._currentDistKm || '';
    const tripType = document.getElementById('wbTripType')?.value || 'one_way';
    const RATES   = { 'Sedan':{oneWay:15,roundTrip:14,bata:400,min:1000}, 'SUV':{oneWay:20,roundTrip:18,bata:500,min:1400}, 'Innova':{oneWay:21,roundTrip:19,bata:500,min:1600} };
    let fareLines = [];
    if (distKm && vehicleVal && RATES[vehicleVal]) {
      const r = RATES[vehicleVal], isRT = tripType === 'round_trip';
      const rate = isRT ? r.roundTrip : r.oneWay;
      const totalDist = isRT ? distKm * 2 : distKm;
      const base  = Math.max(totalDist * rate, r.min);
      const grand = base + r.bata;
      fareLines = [
        '',
        '💰 *FARE ESTIMATE*',
        `🛣 *Distance:*   ${totalDist} km${isRT ? ' (both ways)' : ''}`,
        `💵 *Rate/km:*    ₹${rate}`,
        `🧾 *Base Fare:*  ₹${base.toLocaleString('en-IN')}`,
        `👨‍✈️ *Driver Bata:* ₹${r.bata}`,
        `✅ *Total:*      ₹${grand.toLocaleString('en-IN')}`,
        '_Toll, parking & permit charges extra_',
      ];
    }

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
      ...fareLines,
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
        // clear location autocomplete fields
        window._pickupAC?.clear(); window._dropAC?.clear();
        window._pickupModel = null; window._dropModel = null;
        window._currentDistKm = null;
        const distBar = document.getElementById('locDistBar');
        if (distBar) distBar.style.display = 'none';
        const fareCard = document.getElementById('wbFareCard');
        if (fareCard) fareCard.style.display = 'none';
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

    if (!fPickup.value.trim()) {
      window._pickupAC?.showError('Please select a pickup location from the list.');
      ok = false;
    }
    if (!fDrop.value.trim()) {
      window._dropAC?.showError('Please select a drop location from the list.');
      ok = false;
    }
    if (fPickup.value.trim() && fDrop.value.trim() &&
        fPickup.value.trim().toLowerCase() === fDrop.value.trim().toLowerCase()) {
      window._dropAC?.showError('Pickup and drop cannot be the same location.');
      ok = false;
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
   LOCATION AUTOCOMPLETE — powered by location-service.js
   LocationAutocomplete + DistanceService + BookingLocationModel
   ══════════════════════════════════════════════════════ */
(function () {
  if (!window.SundaraLocation) return;
  const { LocationAutocomplete, DistanceService, loadGoogleMaps } = window.SundaraLocation;

  let _osrmCtrl = null;
  window._currentDistKm = null;
  window._currentRouteMeta = null;

  let _map = null;
  let _dirSvc = null;
  let _dirRdr = null;
  let _mapReady = false;

  function ensureMapReady() {
    const mapEl = document.getElementById('wbRouteMap');
    if (!mapEl) return Promise.resolve(false);
    return loadGoogleMaps().then(function() {
      const gm = window.google && window.google.maps;
      if (!gm) return false;
      if (!_map) {
        _map = new gm.Map(mapEl, {
          center: { lat: 13.0827, lng: 80.2707 },
          zoom: 7,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative',
        });
        _dirSvc = new gm.DirectionsService();
        _dirRdr = new gm.DirectionsRenderer({
          suppressMarkers: false,
          preserveViewport: false,
          polylineOptions: { strokeColor: '#2563EB', strokeOpacity: 0.9, strokeWeight: 5 },
        });
        _dirRdr.setMap(_map);
      }
      _mapReady = true;
      return true;
    }).catch(function() {
      _mapReady = false;
      return false;
    });
  }

  function drawRouteOnMap(pModel, dModel) {
    const mapEl = document.getElementById('wbRouteMap');
    if (!mapEl || !pModel || !dModel) return;

    ensureMapReady().then(function(ok) {
      if (!ok || !_dirSvc || !_dirRdr) { mapEl.style.display = 'none'; return; }

      const pLat = parseFloat(pModel.latitude || '0');
      const pLon = parseFloat(pModel.longitude || '0');
      const dLat = parseFloat(dModel.latitude || '0');
      const dLon = parseFloat(dModel.longitude || '0');
      if (!pLat || !pLon || !dLat || !dLon) { mapEl.style.display = 'none'; return; }

      _dirSvc.route({
        origin: { lat: pLat, lng: pLon },
        destination: { lat: dLat, lng: dLon },
        travelMode: 'DRIVING',
      }, function(result, status) {
        if (status === 'OK' && result) {
          _dirRdr.setDirections(result);
          mapEl.style.display = 'block';
        } else {
          mapEl.style.display = 'none';
        }
      });
    });
  }

  /* Distance bar UI */
  function updateDistBar(distKm, durText, source, trafficText) {
    const bar   = document.getElementById('locDistBar');
    const kmEl  = document.getElementById('locDistKm');
    const durEl = document.getElementById('locDistDur');
    const trafficEl = document.getElementById('locDistTraffic');
    const srcEl = document.getElementById('locDistSrc');
    if (!bar) return;
    if (!distKm) {
      bar.style.display = 'none';
      if (trafficEl) trafficEl.style.display = 'none';
      return;
    }
    kmEl.innerHTML  = `<i class="fas fa-road"></i> <strong>${distKm} km</strong>`;
    durEl.innerHTML = `<i class="fas fa-clock"></i> <strong>${durText}</strong>`;
    if (trafficEl) {
      if (trafficText) {
        trafficEl.innerHTML = `<i class="fas fa-car"></i> <strong>${trafficText}</strong>`;
        trafficEl.style.display = 'inline-flex';
      } else {
        trafficEl.style.display = 'none';
      }
    }
    if (srcEl) {
      if (source === 'google') srcEl.textContent = '· live road estimate';
      else if (source === 'osrm') srcEl.textContent = '· road estimate';
      else srcEl.textContent = '· estimated';
    }
    bar.style.display = 'flex';
  }

  /* Core: called whenever pickup or drop changes */
  function onLocationChanged() {
    const pickup = (document.getElementById('wbPickup')?.value || '').trim();
    const drop   = (document.getElementById('wbDrop')?.value   || '').trim();

    if (!pickup || !drop || pickup === drop) {
      window._currentDistKm = null;
      window._currentRouteMeta = null;
      updateDistBar(null);
      const mapEl = document.getElementById('wbRouteMap');
      if (mapEl) mapEl.style.display = 'none';
      window.triggerFareCalc?.();
      return;
    }

    // Haversine distance between two lat/lon points
    function hvs(la1, lo1, la2, lo2) {
      const R = 6371, d2r = Math.PI / 180;
      const dLa = (la2-la1)*d2r, dLo = (lo2-lo1)*d2r;
      const a = Math.sin(dLa/2)**2 + Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLo/2)**2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    }

    /* 1. Static table — instant for known city pairs */
    const staticDist = DistanceService.getStaticDistance(pickup, drop);
    if (staticDist) {
      window._currentDistKm = staticDist;
      window._currentRouteMeta = {
        distanceKm: staticDist,
        durationSec: staticDist * 90,
        durationInTrafficSec: staticDist * 90,
        durationText: DistanceService.formatDuration(staticDist * 90),
        durationInTrafficText: DistanceService.formatDuration(staticDist * 90),
        source: 'static',
      };
      updateDistBar(staticDist, DistanceService.formatDuration(staticDist * 90), 'static');
      window.triggerFareCalc?.();
    }

    /* 2. Use lat/lon from TomTom model */
    const p    = window._pickupModel;
    const d    = window._dropModel;
    const pLat = p && p.latitude  ? parseFloat(p.latitude)  : 0;
    const pLon = p && p.longitude ? parseFloat(p.longitude) : 0;
    const dLat = d && d.latitude  ? parseFloat(d.latitude)  : 0;
    const dLon = d && d.longitude ? parseFloat(d.longitude) : 0;

    if (pLat && pLon && dLat && dLon) {
      /* Instant haversine estimate (× 1.3 road factor) */
      const estKm = Math.round(hvs(pLat, pLon, dLat, dLon) * 1.3) || 1;
      if (!staticDist || estKm > 0) {
        window._currentDistKm = estKm;
        window._currentRouteMeta = {
          distanceKm: estKm,
          durationSec: estKm * 90,
          durationInTrafficSec: estKm * 90,
          durationText: DistanceService.formatDuration(estKm * 90),
          durationInTrafficText: DistanceService.formatDuration(estKm * 90),
          source: 'estimated',
        };
        updateDistBar(estKm, DistanceService.formatDuration(estKm * 90), 'estimated');
        window.triggerFareCalc?.();
      }

      drawRouteOnMap(p, d);

      /* Then fetch real OSRM driving distance */
      (async () => {
        try {
          if (_osrmCtrl) _osrmCtrl.abort();
          _osrmCtrl = new AbortController();
          const dt = document.getElementById('wbDate')?.value || '';
          const tm = document.getElementById('wbTime')?.value || '';
          let departureTime = new Date();
          if (dt && tm) {
            const parsed = new Date(dt + 'T' + tm + ':00');
            if (!Number.isNaN(parsed.getTime())) departureTime = parsed;
          }

          const osrm = await DistanceService.getDrivingDistance(
            pLat, pLon, dLat, dLon, _osrmCtrl.signal, { departureTime: departureTime }
          );
          if (osrm && osrm.distKm > 0) {
            window._currentDistKm = osrm.distKm;
            window._currentRouteMeta = {
              distanceKm: osrm.distKm,
              durationSec: osrm.durationSec,
              durationInTrafficSec: osrm.durationInTrafficSec || osrm.durationSec,
              durationText: DistanceService.formatDuration(osrm.durationSec),
              durationInTrafficText: DistanceService.formatDuration(osrm.durationInTrafficSec || osrm.durationSec),
              source: osrm.source,
            };
            updateDistBar(
              osrm.distKm,
              DistanceService.formatDuration(osrm.durationSec),
              osrm.source,
              osrm.durationInTrafficSec && osrm.durationInTrafficSec !== osrm.durationSec
                ? DistanceService.formatDuration(osrm.durationInTrafficSec)
                : ''
            );
            window.triggerFareCalc?.();
          }
        } catch(e) { /* keep haversine estimate */ }
      })();
    }
  }

  /* Build autocomplete for pickup */
  window._pickupAC = new LocationAutocomplete({
    inputId:   'wbPickupInput',
    hiddenId:  'wbPickup',
    suggestId: 'wbPickupSuggestions',
    modelKey:  'pickup',
    onSelect:  (model) => { window._pickupModel = model; onLocationChanged(); },
  });

  /* Build autocomplete for drop */
  window._dropAC = new LocationAutocomplete({
    inputId:   'wbDropInput',
    hiddenId:  'wbDrop',
    suggestId: 'wbDropSuggestions',
    modelKey:  'drop',
    onSelect:  (model) => { window._dropModel = model; onLocationChanged(); },
  });

  /* Also listen on hidden inputs directly — catches any programmatic changes */
  ['wbPickup','wbDrop'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', onLocationChanged);
  });

  ['wbDate','wbTime'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', onLocationChanged);
  });

  window.triggerFareCalc = () => {};
}());


/* ══════════════════════════════════════════════════════
   TRIP TYPE TOGGLE
   ══════════════════════════════════════════════════════ */
(function () {
  const toggle = document.getElementById('wbTripToggle');
  const hidden = document.getElementById('wbTripType');
  if (!toggle || !hidden) return;
  toggle.querySelectorAll('.wb-trip-opt').forEach(btn => {
    btn.addEventListener('click', function () {
      toggle.querySelectorAll('.wb-trip-opt').forEach(b => {
        b.classList.remove('selected'); b.setAttribute('aria-checked','false');
      });
      this.classList.add('selected'); this.setAttribute('aria-checked','true');
      hidden.value = this.dataset.value;
      window.triggerFareCalc?.();
    });
  });
}());


/* ══════════════════════════════════════════════════════
   FARE ESTIMATOR
   Uses real OSRM distance (window._currentDistKm)
   ══════════════════════════════════════════════════════ */
(function () {
  const RATES = {
    'Sedan':  { oneWay: 15, roundTrip: 14, bata: 400, min: 1000 },
    'SUV':    { oneWay: 20, roundTrip: 18, bata: 500, min: 1400 },
    'Innova': { oneWay: 21, roundTrip: 19, bata: 500, min: 1600 },
  };

  const vehicleEl = document.getElementById('wbVehicle');
  const tripEl    = document.getElementById('wbTripType');
  const fareCard  = document.getElementById('wbFareCard');
  const fareRoute = document.getElementById('wbFareRoute');
  const fareBreak = document.getElementById('wbFareBreakdown');
  const fareAmt   = document.getElementById('wbFareAmount');
  const fareBadge = document.getElementById('wbFareBadge');

  if (!vehicleEl || !fareCard) return;

  function calcFare() {
    const pickup  = document.getElementById('wbPickup')?.value.trim();
    const drop    = document.getElementById('wbDrop')?.value.trim();
    const vehicle = vehicleEl.value;
    const trip    = tripEl?.value || 'one_way';
    const distKm  = window._currentDistKm;

    // Always hide fare card if no distance yet
    if (!distKm || !pickup || !drop || pickup === drop) {
      fareCard.style.display = 'none';
      // Hide all vehicle total badges
      ['Sedan','SUV','Innova'].forEach(v => {
        const el = document.getElementById('wbvTotal' + v);
        if (el) el.style.display = 'none';
      });
      return;
    }

    const isRT = trip === 'round_trip';

    // ── Update total amount on EACH vehicle card ──────────
    ['Sedan','SUV','Innova'].forEach(v => {
      const r    = RATES[v];
      const rate = isRT ? r.roundTrip : r.oneWay;
      const dist = isRT ? distKm * 2 : distKm;
      const amt  = Math.max(dist * rate, r.min) + r.bata;
      const el   = document.getElementById('wbvTotal' + v);
      if (el) {
        el.textContent = '₹' + amt.toLocaleString('en-IN');
        el.style.display = 'inline-block';
      }
    });

    // ── Show fare breakdown card only when vehicle selected ─
    fareCard.style.display = 'none';
    if (!vehicle) return;

    const r     = RATES[vehicle];
    const rate  = isRT ? r.roundTrip : r.oneWay;
    const total = isRT ? distKm * 2 : distKm;
    const base  = Math.max(total * rate, r.min);
    const grand = base + r.bata;

    fareBadge.textContent = isRT ? 'Round Trip' : 'One Way';
    fareBadge.className   = 'wb-fare-badge' + (isRT ? ' rt' : '');

    fareRoute.innerHTML = `
      <span class="wb-fare-city"><i class="fas fa-location-dot"></i> ${pickup}</span>
      <span class="wb-fare-arrow"><i class="fas fa-arrow-right"></i>${isRT ? '<i class="fas fa-arrow-left ms-1"></i>':''}</span>
      <span class="wb-fare-city"><i class="fas fa-flag-checkered"></i> ${drop}</span>
      <span class="wb-fare-dist">${total} km${isRT?' (both ways)':''}</span>`;

    fareBreak.innerHTML = `
      <div class="wb-fare-row"><span>Distance</span><span>${isRT ? distKm+' km × 2' : distKm+' km'}</span></div>
      <div class="wb-fare-row"><span>Rate / km</span><span>₹${rate}</span></div>
      <div class="wb-fare-row"><span>Base Fare</span><span>₹${base.toLocaleString('en-IN')}</span></div>
      <div class="wb-fare-row"><span>Driver Bata</span><span>₹${r.bata}</span></div>`;

    fareAmt.textContent = '₹' + grand.toLocaleString('en-IN');
    fareCard.style.display = 'block';
    fareCard.classList.remove('wb-fare-in');
    void fareCard.offsetWidth;
    fareCard.classList.add('wb-fare-in');
  }

  window.triggerFareCalc = calcFare;
  // Fire on hidden select change AND vehicle picker card clicks
  vehicleEl.addEventListener('change', calcFare);
  document.getElementById('wbVehiclePicker')?.querySelectorAll('.wb-vehicle-opt').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(calcFare, 50));
  });
}());

