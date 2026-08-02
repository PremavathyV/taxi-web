/**
 * location-service.js – Sundara Travels
 * ─────────────────────────────────────────────────────────────────────────────
 * Modules:
 *   LocationAutocomplete  – Nominatim (OSM) place search, debounced, cached
 *   GoogleMapsService     – Wraps place details extraction (address components)
 *   DistanceService       – OSRM real driving distance + travel time
 *   BookingLocationModel  – Structured data model for pickup / drop
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero API keys required. 100% free. Production-ready.
 */
'use strict';

/* ═══════════════════════════════════════════════════════
   BookingLocationModel
   Stores all location details for pickup / drop
   ═══════════════════════════════════════════════════════ */
class BookingLocationModel {
  constructor() {
    this.address    = '';   // Full display address
    this.placeId    = '';   // Nominatim OSM ID (equivalent to Google placeId)
    this.latitude   = '';
    this.longitude  = '';
    this.city       = '';
    this.state      = '';
    this.country    = '';
    this.postalCode = '';
    this.confirmed  = false; // true only when selected from autocomplete
  }

  /** Populate from a Nominatim result object */
  fromNominatim(result) {
    const addr      = result.address || {};
    this.address    = result.display_name || '';
    this.placeId    = `osm:${result.osm_type || 'N'}:${result.osm_id || ''}`;
    this.latitude   = result.lat  || '';
    this.longitude  = result.lon  || '';
    this.city       = addr.city || addr.town || addr.village ||
                      addr.county || addr.state_district || '';
    this.state      = addr.state || '';
    this.country    = addr.country || 'India';
    this.postalCode = addr.postcode || '';
    this.confirmed  = true;
    return this;
  }

  /** Reset to empty state */
  clear() {
    Object.assign(this, new BookingLocationModel());
    return this;
  }

  /** Validate: must be confirmed from autocomplete */
  isValid() {
    return this.confirmed && this.latitude !== '' && this.longitude !== '';
  }

  /** Serialise for backend API / WhatsApp */
  toPayload() {
    return {
      address:    this.address,
      placeId:    this.placeId,
      latitude:   this.latitude,
      longitude:  this.longitude,
      city:       this.city,
      state:      this.state,
      country:    this.country,
      postalCode: this.postalCode,
    };
  }
}

/* ═══════════════════════════════════════════════════════
   GoogleMapsService
   Wraps address-component extraction & place utilities.
   API key not required for this implementation —
   drop in your Maps JS API key here when upgrading.
   ═══════════════════════════════════════════════════════ */
const GoogleMapsService = (() => {
  /* City name normaliser — maps Nominatim variants to canonical names */
  const CITY_MAP = {
    'bengaluru':'Bangalore','bengaluru urban':'Bangalore','bengaluru rural':'Bangalore',
    'greater chennai corporation':'Chennai','chennai district':'Chennai',
    'coimbatore district':'Coimbatore','coimbatore corporation':'Coimbatore',
    'madurai district':'Madurai','madurai corporation':'Madurai',
    'tiruchirappalli':'Trichy','tiruchirappalli district':'Trichy',
    'tiruchirapalli':'Trichy',
    'puducherry':'Pondicherry',
    'vellore district':'Vellore',
    'tirunelveli district':'Tirunelveli',
    'erode district':'Erode',
    'udhagamandalam':'Ooty','ootacamund':'Ooty',
    'thanjavur district':'Thanjavur','tanjore':'Thanjavur',
    'kanyakumari district':'Kanyakumari','cape comorin':'Kanyakumari',
    'tirupathi':'Tirupati',
    'ernakulam':'Kochi','cochin':'Kochi',
    'mysuru':'Mysore','mysuru district':'Mysore',
    'tiruppur':'Tirupur',
    'thoothukudi':'Thoothukudi','tuticorin':'Thoothukudi',
    'hyderabad district':'Hyderabad',
  };

  const KNOWN_CITIES = [
    'Chennai','Bangalore','Coimbatore','Madurai','Trichy','Salem',
    'Pondicherry','Vellore','Tirunelveli','Erode','Ooty','Kodaikanal',
    'Kumbakonam','Thanjavur','Kanyakumari','Tirupati','Hyderabad',
    'Kochi','Munnar','Mysore','Nagercoil','Dindigul','Hosur','Tirupur',
    'Coonoor','Palani','Pollachi','Thoothukudi','Rameswaram','Chidambaram',
    'Vellore','Cuddalore','Villupuram','Karur','Namakkal','Nagapattinam',
  ];

  function normalizeCity(raw) {
    if (!raw) return '';
    const lower = raw.toLowerCase().trim();
    if (CITY_MAP[lower]) return CITY_MAP[lower];
    for (const city of KNOWN_CITIES) {
      if (lower.includes(city.toLowerCase())) return city;
    }
    return raw.split(',')[0].trim();
  }

  function getPlaceIcon(type) {
    const t = (type || '').toLowerCase();
    if (['aerodrome','airport'].some(x => t.includes(x))) return 'fa-plane';
    if (['railway','station','junction'].some(x => t.includes(x))) return 'fa-train';
    if (['hotel','lodge','resort','hostel'].some(x => t.includes(x))) return 'fa-hotel';
    if (['hospital','clinic','medical'].some(x => t.includes(x))) return 'fa-hospital';
    if (['college','university','school'].some(x => t.includes(x))) return 'fa-graduation-cap';
    if (['city','town','village','municipality','suburb'].some(x => t.includes(x))) return 'fa-city';
    return 'fa-map-marker-alt';
  }

  return { normalizeCity, getPlaceIcon, KNOWN_CITIES };
})();

/* ═══════════════════════════════════════════════════════
   DistanceService
   Uses OSRM public API — real road driving distance & time.
   Falls back to Haversine straight-line if OSRM fails.
   ═══════════════════════════════════════════════════════ */
const DistanceService = (() => {
  /* Static distances table (km) for fast fare estimation when lat/lon unavailable */
  const STATIC_DIST = {
    'chennai-bangalore':350,'chennai-coimbatore':497,'chennai-madurai':462,
    'chennai-trichy':330,'chennai-salem':340,'chennai-pondicherry':162,
    'chennai-vellore':140,'chennai-tirunelveli':625,'chennai-erode':400,
    'chennai-ooty':545,'chennai-kodaikanal':528,'chennai-kumbakonam':290,
    'chennai-thanjavur':315,'chennai-kanyakumari':700,'chennai-tirupati':140,
    'chennai-hyderabad':625,'chennai-kochi':693,'chennai-munnar':655,
    'chennai-mysore':480,'chennai-nagercoil':690,'chennai-hosur':40,
    'bangalore-coimbatore':360,'bangalore-madurai':450,'bangalore-trichy':380,
    'bangalore-salem':220,'bangalore-pondicherry':310,'bangalore-vellore':210,
    'bangalore-tirunelveli':570,'bangalore-ooty':270,'bangalore-kodaikanal':470,
    'bangalore-hyderabad':570,'bangalore-kochi':540,'bangalore-mysore':145,
    'bangalore-munnar':470,'bangalore-tirupati':260,'bangalore-kumbakonam':430,
    'bangalore-thanjavur':450,'bangalore-kanyakumari':740,'bangalore-erode':290,
    'coimbatore-madurai':210,'coimbatore-trichy':200,'coimbatore-ooty':90,
    'coimbatore-kodaikanal':180,'coimbatore-kochi':190,'coimbatore-munnar':145,
    'coimbatore-salem':160,'coimbatore-mysore':255,'coimbatore-erode':60,
    'madurai-trichy':140,'madurai-tirunelveli':170,'madurai-kanyakumari':247,
    'madurai-kodaikanal':120,'madurai-kumbakonam':220,'madurai-thanjavur':175,
    'madurai-dindigul':65,'trichy-kumbakonam':95,'trichy-thanjavur':58,
    'trichy-salem':160,'trichy-vellore':225,'trichy-dindigul':90,
    'salem-erode':60,'pondicherry-vellore':155,'ooty-kodaikanal':280,
    'ooty-mysore':124,'ooty-coonoor':19,'hyderabad-tirupati':520,
    'kochi-munnar':130,'mysore-ooty':124,'vellore-tirupati':100,
    'nagercoil-kanyakumari':22,'thanjavur-kumbakonam':40,
  };

  /** Get static distance between two cities (symmetric, case-insensitive) */
  function getStaticDistance(cityA, cityB) {
    const norm = s => (s || '').toLowerCase().trim()
      .replace(/\s+/g, '')          // remove spaces
      .replace(/[^a-z]/g, '');      // letters only
    const a = norm(cityA);
    const b = norm(cityB);
    // direct lookup
    for (const [k, v] of Object.entries(STATIC_DIST)) {
      const [ka, kb] = k.split('-');
      if ((norm(ka) === a && norm(kb) === b) ||
          (norm(ka) === b && norm(kb) === a)) return v;
    }
    return null;
  }

  /** Haversine formula — straight-line km between two coordinates */
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /** Format seconds → "Xh Ym" */
  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /**
   * Get real driving distance & duration via OSRM.
   * Returns { distKm, durationSec, durationText, source }
   */
  async function getDrivingDistance(lat1, lon1, lat2, lon2, signal) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${lon1},${lat1};${lon2},${lat2}` +
        `?overview=false&geometries=polyline`;

      const res  = await fetch(url, { signal });
      if (!res.ok) throw new Error('OSRM error');
      const data = await res.json();

      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');

      const route       = data.routes[0];
      const distKm      = Math.round(route.distance / 1000);
      const durationSec = Math.round(route.duration);

      return { distKm, durationSec, durationText: formatDuration(durationSec), source: 'osrm' };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      // Fallback: haversine + 1.3 road factor
      const straightKm = haversine(lat1, lon1, lat2, lon2);
      const distKm     = Math.round(straightKm * 1.3);
      const durationSec= Math.round(distKm * 90); // ~40 km/h avg
      return { distKm, durationSec, durationText: formatDuration(durationSec), source: 'fallback' };
    }
  }

  return { getStaticDistance, getDrivingDistance, haversine, formatDuration };
})();

/* ═══════════════════════════════════════════════════════
   LocationAutocomplete
   Full-featured place search component. One instance
   per input field. Uses Nominatim OSM API.
   ═══════════════════════════════════════════════════════ */
class LocationAutocomplete {
  /**
   * @param {object} opts
   * @param {string}  opts.inputId      – visible text input id
   * @param {string}  opts.hiddenId     – hidden input id (city name for fare calc)
   * @param {string}  opts.suggestId    – <ul> id for suggestions
   * @param {string}  opts.modelKey     – 'pickup' | 'drop'
   * @param {function} opts.onSelect    – callback(BookingLocationModel)
   */
  constructor(opts) {
    this.input    = document.getElementById(opts.inputId);
    this.hidden   = document.getElementById(opts.hiddenId);
    this.suggest  = document.getElementById(opts.suggestId);
    this.modelKey = opts.modelKey;
    this.onSelect = opts.onSelect || (() => {});
    this.model    = new BookingLocationModel();

    if (!this.input || !this.hidden || !this.suggest) return;

    this._activeIdx  = -1;
    this._debounceT  = null;
    this._controller = null;
    this._lastQuery  = '';
    this._cache      = new Map(); // simple LRU-style cache

    this._FALLBACK = GoogleMapsService.KNOWN_CITIES.map(c => ({
      display_name: c + ', Tamil Nadu, India',
      address: { city: c, state: 'Tamil Nadu', country: 'India' },
      lat: '', lon: '', osm_type: 'N', osm_id: c,
      type: 'city', class: 'place',
    }));

    this._bindEvents();
  }

  /* ── Public: clear the field ─────────────────────── */
  clear() {
    this.input.value  = '';
    this.hidden.value = '';
    this.model.clear();
    this._hideSuggestions();
  }

  /* ── Public: check if a valid place is selected ──── */
  isValid() { return this.model.isValid(); }

  /* ── Bind DOM events ─────────────────────────────── */
  _bindEvents() {
    this.input.addEventListener('input', () => {
      this.model.clear();
      this.hidden.value = '';
      const q = this.input.value.trim();
      clearTimeout(this._debounceT);
      if (!q) { this._hideSuggestions(); return; }
      this._debounceT = setTimeout(() => this._search(q), 300);
    });

    this.input.addEventListener('focus', () => {
      if (this.input.value.trim().length >= 2 && !this.model.isValid()) {
        this._search(this.input.value.trim());
      }
    });

    this.input.addEventListener('keydown', e => this._onKeyDown(e));

    document.addEventListener('click', e => {
      if (!this.input.contains(e.target) && !this.suggest.contains(e.target)) {
        this._hideSuggestions();
      }
    });
  }

  /* ── Keyboard navigation ─────────────────────────── */
  _onKeyDown(e) {
    const items = this.suggest.querySelectorAll('li.loc-sug-item');
    if (!items.length || this.suggest.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._activeIdx = Math.min(this._activeIdx + 1, items.length - 1);
      this._highlightItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._activeIdx = Math.max(this._activeIdx - 1, 0);
      this._highlightItem(items);
    } else if (e.key === 'Enter') {
      if (this._activeIdx >= 0 && items[this._activeIdx]) {
        e.preventDefault();
        items[this._activeIdx].dispatchEvent(new MouseEvent('mousedown'));
      }
    } else if (e.key === 'Escape') {
      this._hideSuggestions();
    }
  }

  _highlightItem(items) {
    items.forEach((li, i) => li.classList.toggle('active', i === this._activeIdx));
    items[this._activeIdx]?.scrollIntoView({ block: 'nearest' });
  }

  /* ── Search ──────────────────────────────────────── */
  async _search(q) {
    this._lastQuery = q;

    // Show fallback instantly
    const fallback = this._getFallback(q);
    if (fallback.length) this._renderList(fallback);
    else this._showLoading();

    // Check cache
    if (this._cache.has(q)) {
      this._renderList(this._cache.get(q));
      return;
    }

    try {
      if (this._controller) this._controller.abort();
      this._controller = new AbortController();

      const results = await this._fetchNominatim(q, this._controller.signal);
      if (results.length) {
        this._cache.set(q, results);
        // Trim cache to 20 entries
        if (this._cache.size > 20) {
          this._cache.delete(this._cache.keys().next().value);
        }
        this._renderList(results);
      } else if (!fallback.length) {
        this._showNoResults();
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !fallback.length) {
        this._showError();
      }
    }
  }

  /* ── Fetch from Nominatim ────────────────────────── */
  async _fetchNominatim(q, signal) {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(q + ' India')}&` +
      `countrycodes=in&addressdetails=1&limit=8&format=json`;

    const res  = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return await res.json();
  }

  /* ── Fallback from static list ───────────────────── */
  _getFallback(q) {
    const ql = q.toLowerCase();
    const matched = GoogleMapsService.KNOWN_CITIES
      .filter(c => c.toLowerCase().startsWith(ql))
      .concat(GoogleMapsService.KNOWN_CITIES.filter(
        c => !c.toLowerCase().startsWith(ql) && c.toLowerCase().includes(ql)
      ));
    return matched.slice(0, 6).map(c => ({
      display_name: `${c}, Tamil Nadu, India`,
      address: { city: c, state: 'Tamil Nadu', country: 'India' },
      lat: '', lon: '', osm_type: 'N', osm_id: c,
      type: 'city', class: 'place',
    }));
  }

  /* ── Render suggestion list ──────────────────────── */
  _renderList(rawResults) {
    this.suggest.innerHTML = '';
    this._activeIdx = -1;
    if (!rawResults.length) { this._hideSuggestions(); return; }

    rawResults.forEach(raw => {
      const addr    = raw.address || {};
      const rawCity = addr.city || addr.town || addr.village ||
                      addr.county || addr.state_district ||
                      raw.display_name.split(',')[0];
      const city    = GoogleMapsService.normalizeCity(rawCity);
      const parts   = raw.display_name.split(',').slice(1, 4).join(',').trim();
      const icon    = GoogleMapsService.getPlaceIcon(raw.type || raw.class);
      const query   = this._lastQuery;

      const li = document.createElement('li');
      li.className = 'loc-sug-item';
      li.setAttribute('role', 'option');
      li.innerHTML = `
        <span class="loc-sug-icon"><i class="fas ${icon}"></i></span>
        <span class="loc-sug-text">
          <span class="loc-sug-name">${this._highlight(city || raw.display_name.split(',')[0], query)}</span>
          ${parts ? `<span class="loc-sug-sub">${parts}</span>` : ''}
        </span>`;

      li.addEventListener('mousedown', e => {
        e.preventDefault();
        this._selectPlace(raw, city);
      });

      this.suggest.appendChild(li);
    });

    this.suggest.style.display = 'block';
  }

  /* ── Select a place ──────────────────────────────── */
  _selectPlace(raw, displayCity) {
    // Populate model
    this.model.fromNominatim(raw);
    if (displayCity) this.model.city = displayCity;

    // Update inputs
    this.input.value  = displayCity || this.model.city || raw.display_name.split(',')[0];
    this.hidden.value = this.model.city || this.input.value;

    this._hideSuggestions();

    // Clear any error state on the visible input
    this.input.classList.remove('loc-error');
    this.input.style.borderColor = '';
    this.input.style.boxShadow   = '';
    this.input.closest('.loc-autocomplete-wrap')
      ?.parentElement?.querySelector('.loc-err-msg')?.remove();

    // Notify parent
    this.onSelect(this.model);

    // Trigger fare calc via hidden input
    this.hidden.dispatchEvent(new Event('change'));
  }

  /* ── Helpers ─────────────────────────────────────── */
  _highlight(text, q) {
    if (!q || !text) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${safe})`, 'gi'), '<strong>$1</strong>');
  }

  _showLoading() {
    this.suggest.innerHTML =
      '<li class="loc-sug-state"><i class="fas fa-circle-notch fa-spin"></i> Searching…</li>';
    this.suggest.style.display = 'block';
  }

  _showNoResults() {
    this.suggest.innerHTML =
      '<li class="loc-sug-state loc-sug-empty"><i class="fas fa-search-minus"></i> No locations found</li>';
    this.suggest.style.display = 'block';
  }

  _showError() {
    this.suggest.innerHTML =
      '<li class="loc-sug-state loc-sug-err"><i class="fas fa-wifi"></i> Network error – try again</li>';
    this.suggest.style.display = 'block';
  }

  _hideSuggestions() {
    this.suggest.style.display = 'none';
    this.suggest.innerHTML = '';
    this._activeIdx = -1;
  }

  /* ── Validate and show field error ──────────────── */
  showError(msg) {
    this.input.classList.add('loc-error');
    this.input.style.borderColor = '#EF4444';
    this.input.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
    const wrap = this.input.closest('.loc-autocomplete-wrap')?.parentElement;
    if (!wrap) return;
    wrap.querySelector('.loc-err-msg')?.remove();
    const s = document.createElement('span');
    s.className = 'loc-err-msg';
    s.setAttribute('role', 'alert');
    s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:3px;display:block;';
    s.textContent = msg;
    wrap.appendChild(s);
  }

  clearError() {
    this.input.classList.remove('loc-error');
    this.input.style.borderColor = '';
    this.input.style.boxShadow   = '';
    this.input.closest('.loc-autocomplete-wrap')
      ?.parentElement?.querySelector('.loc-err-msg')?.remove();
  }
}

/* ── Export to global scope for booking.js ────────── */
window.SundaraLocation = {
  BookingLocationModel,
  LocationAutocomplete,
  GoogleMapsService,
  DistanceService,
};
