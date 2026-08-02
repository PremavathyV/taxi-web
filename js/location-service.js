/**
 * location-service.js – Sundara Travels
 * ─────────────────────────────────────────────────────────────
 * TomTom Fuzzy Search API — Uber/Ola level locality detection
 * Free: 2,500 req/day — signup: developer.tomtom.com
 * Fallback: Geoapify → Nominatim (OSM)
 * ─────────────────────────────────────────────────────────────
 */
'use strict';

var TOMTOM_KEY   = 'p31xjqKewqDp97XEtDXUZLIz6pSvjy8z';
var GEOAPIFY_KEY = '4dda2d6c7fe0462793ab462db1b57d89'; // backup

/* ══════════════════════════════════════════════════════════
   BookingLocationModel
   ══════════════════════════════════════════════════════════ */
function BookingLocationModel() {
  this.address    = '';
  this.placeId    = '';
  this.latitude   = '';
  this.longitude  = '';
  this.city       = '';
  this.state      = '';
  this.country    = 'India';
  this.postalCode = '';
  this.confirmed  = false;
}

BookingLocationModel.prototype.fromGeoapify = function(feature) {
  var p   = feature.properties || {};
  var geo = feature.geometry   || {};
  var coords = geo.coordinates || [0, 0];

  this.address    = p.formatted || p.address_line1 || p.name || '';
  this.placeId    = p.place_id  || '';
  this.latitude   = String(coords[1] || '');   /* GeoJSON: [lon, lat] */
  this.longitude  = String(coords[0] || '');
  this.city       = p.city   || p.county || p.state_district || '';
  this.state      = p.state  || '';
  this.country    = p.country || 'India';
  this.postalCode = p.postcode || p.postalCode || '';
  this.confirmed  = (this.latitude !== '0' && this.latitude !== '');
  return this;
};

BookingLocationModel.prototype.isValid = function() {
  return this.confirmed && this.latitude !== '' && this.longitude !== '';
};

BookingLocationModel.prototype.clear = function() {
  this.address = ''; this.placeId = ''; this.latitude = '';
  this.longitude = ''; this.city = ''; this.state = '';
  this.country = 'India'; this.postalCode = ''; this.confirmed = false;
  return this;
};

BookingLocationModel.prototype.toPayload = function() {
  return {
    address: this.address, placeId: this.placeId,
    latitude: this.latitude, longitude: this.longitude,
    city: this.city, state: this.state,
    country: this.country, postalCode: this.postalCode,
  };
};

/* ══════════════════════════════════════════════════════════
   DistanceService — OSRM real driving distance
   ══════════════════════════════════════════════════════════ */
var DistanceService = (function() {

  var STATIC_DIST = {
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
    'trichy-kumbakonam':95,'trichy-thanjavur':58,'trichy-salem':160,
    'trichy-vellore':225,'salem-erode':60,'pondicherry-vellore':155,
    'ooty-kodaikanal':280,'ooty-mysore':124,'hyderabad-tirupati':520,
    'kochi-munnar':130,'vellore-tirupati':100,
  };

  function norm(s) {
    return (s||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z]/g,'');
  }

  function getStaticDistance(cityA, cityB) {
    var a = norm(cityA), b = norm(cityB);
    var keys = Object.keys(STATIC_DIST);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split('-');
      var ka = norm(parts[0]), kb = norm(parts[1]);
      if ((ka === a && kb === b) || (ka === b && kb === a)) return STATIC_DIST[keys[i]];
    }
    return null;
  }

  function formatDuration(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.round((seconds % 3600) / 60);
    if (h === 0) return m + ' min';
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
  }

  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
            Math.sin(dLon/2)*Math.sin(dLon/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  function getDrivingDistance(lat1, lon1, lat2, lon2, signal) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' +
      lon1+','+lat1+';'+lon2+','+lat2+'?overview=false';
    return fetch(url, { signal: signal })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('No route');
        var route = data.routes[0];
        var distKm = Math.round(route.distance / 1000);
        var durSec = Math.round(route.duration);
        return { distKm: distKm, durationSec: durSec, durationText: formatDuration(durSec), source: 'osrm' };
      })
      .catch(function(err) {
        if (err && err.name === 'AbortError') throw err;
        var straight = haversine(lat1, lon1, lat2, lon2);
        var distKm   = Math.round(straight * 1.3);
        var durSec   = Math.round(distKm * 90);
        return { distKm: distKm, durationSec: durSec, durationText: formatDuration(durSec), source: 'fallback' };
      });
  }

  return { getStaticDistance: getStaticDistance, getDrivingDistance: getDrivingDistance, formatDuration: formatDuration };
}());

/* ══════════════════════════════════════════════════════════
   LocationAutocomplete
   Uber/Ola-style — Geoapify Places API
   ══════════════════════════════════════════════════════════ */
function LocationAutocomplete(opts) {
  this.input    = document.getElementById(opts.inputId);
  this.hidden   = document.getElementById(opts.hiddenId);
  this.suggest  = document.getElementById(opts.suggestId);
  this.onSelect = opts.onSelect || function() {};
  this.model    = new BookingLocationModel();

  this._activeIdx  = -1;
  this._debounceT  = null;
  this._controller = null;
  this._lastQuery  = '';
  this._cache      = {}; // fresh cache — no stale entries

  if (this.input && this.hidden && this.suggest) this._bind();
}

LocationAutocomplete.prototype._bind = function() {
  var self = this;

  this.input.addEventListener('input', function() {
    self.model.clear();
    self.hidden.value = '';
    var q = self.input.value.trim();
    clearTimeout(self._debounceT);
    if (!q || q.length < 1) { self._hide(); return; }
    self._debounceT = setTimeout(function() { self._search(q); }, 300);
  });

  this.input.addEventListener('focus', function() {
    var q = self.input.value.trim();
    if (q.length >= 2 && !self.model.isValid()) self._search(q);
  });

  this.input.addEventListener('keydown', function(e) {
    var items = self.suggest.querySelectorAll('.loc-item');
    if (!items.length || self.suggest.style.display === 'none') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      self._activeIdx = Math.min(self._activeIdx + 1, items.length - 1);
      self._highlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      self._activeIdx = Math.max(self._activeIdx - 1, 0);
      self._highlight(items);
    } else if (e.key === 'Enter') {
      if (self._activeIdx >= 0 && items[self._activeIdx]) {
        e.preventDefault();
        items[self._activeIdx].dispatchEvent(new MouseEvent('mousedown'));
      }
    } else if (e.key === 'Escape') {
      self._hide();
    }
  });

  document.addEventListener('click', function(e) {
    if (!self.input.contains(e.target) && !self.suggest.contains(e.target)) self._hide();
  });
};

LocationAutocomplete.prototype._highlight = function(items) {
  var idx = this._activeIdx;
  [].forEach.call(items, function(li, i) { li.classList.toggle('active', i === idx); });
  if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
};

LocationAutocomplete.prototype._search = function(q) {
  var self = this;
  self._lastQuery = q;
  if (self._cache[q]) { self._render(self._cache[q]); return; }
  self._showLoading();
  if (self._controller) { try { self._controller.abort(); } catch(e) {} }
  self._controller = new AbortController();

  if (TOMTOM_KEY && TOMTOM_KEY !== 'YOUR_TOMTOM_API_KEY') {
    self._tomtomSearch(q);
  } else {
    self._geoapifySearch(q);
  }
};

/* TomTom Fuzzy Search — primary */
LocationAutocomplete.prototype._tomtomSearch = function(q) {
  var self = this;
  var url = 'https://api.tomtom.com/search/2/search/' +
    encodeURIComponent(q) + '.json?' +
    'key=' + TOMTOM_KEY +
    '&countrySet=IN' +
    '&language=en-GB&limit=8&typeahead=true';

  fetch(url, { signal: self._controller.signal })
    .then(function(res) { if (!res.ok) throw new Error('TomTom ' + res.status); return res.json(); })
    .then(function(data) {
      var results = (data && data.results) ? data.results : [];
      if (!results.length) { self._showEmpty(); return; }
      var features = results.map(function(r) {
        var addr = r.address || {};
        var poi  = r.poi || {};

        /* Best display name — pick the most specific available */
        var name = poi.name                          // POI like "Perambur Railway Station"
          || addr.streetName                         // Street name
          || addr.municipalitySubdivision            // Suburb/area like "Kolathur"
          || addr.municipality                       // City like "Chennai"
          || (addr.freeformAddress || '').split(',')[0];

        var suburb = addr.municipalitySubdivision || '';
        var city   = addr.municipality || '';
        var state  = addr.countrySubdivision || '';

        /* Context line: Suburb, City, State */
        var parts = [];
        if (suburb && suburb !== name) parts.push(suburb);
        if (city   && city !== name && city !== suburb) parts.push(city);
        if (state) parts.push(state);
        var context = parts.join(', ');

        var lat = r.position ? r.position.lat : '';
        var lon = r.position ? r.position.lon : '';

        return {
          properties: {
            name:          name,
            address_line1: name,
            address_line2: context,
            city:          city || suburb,
            state:         state,
            country:       'India',
            postcode:      addr.postalCode || '',
            place_id:      r.id || '',
            result_type:   r.type || (poi.name ? 'amenity' : 'locality'),
          },
          geometry: { coordinates: [parseFloat(lon)||0, parseFloat(lat)||0] },
        };
      });
      self._cache[q] = features;
      var keys = Object.keys(self._cache);
      if (keys.length > 30) delete self._cache[keys[0]];
      self._render(features);
    })
    .catch(function(err) {
      if (err && err.name === 'AbortError') return;
      self._geoapifySearch(q);
    });
};

/* Geoapify Search — secondary fallback */
LocationAutocomplete.prototype._geoapifySearch = function(q) {
  var self = this;
  var url = 'https://api.geoapify.com/v1/geocode/autocomplete?' +
    'text=' + encodeURIComponent(q) +
    '&filter=countrycode:in' +
    '&bias=proximity:80.2707,13.0827' +
    '&limit=8&lang=en&apiKey=' + GEOAPIFY_KEY;

  fetch(url, { signal: self._controller.signal })
    .then(function(res) { if (!res.ok) throw new Error('Geoapify ' + res.status); return res.json(); })
    .then(function(data) {
      var features = (data && data.features) ? data.features : [];
      if (features.length) {
        self._cache[q] = features;
        var keys = Object.keys(self._cache);
        if (keys.length > 30) delete self._cache[keys[0]];
        self._render(features);
      } else {
        self._nominatimFallback(q);
      }
    })
    .catch(function(err) {
      if (err && err.name === 'AbortError') return;
      self._nominatimFallback(q);
    });
};

/* Nominatim fallback when Geoapify fails */
LocationAutocomplete.prototype._nominatimFallback = function(q) {
  var self = this;
  var url = 'https://nominatim.openstreetmap.org/search?' +
    'q=' + encodeURIComponent(q) +
    '&countrycodes=in&addressdetails=1&limit=8&format=json&accept-language=en';

  fetch(url, { headers: { 'Accept-Language': 'en' } })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data || !data.length) { self._showEmpty(); return; }
      var features = data.map(function(p) {
        var addr = p.address || {};
        var name = p.display_name.split(',')[0];
        var rest = p.display_name.split(',').slice(1,4).join(',').trim();
        return {
          properties: {
            formatted:     p.display_name,
            name:          name,
            address_line1: name,
            address_line2: rest,
            city:          addr.city || addr.town || addr.village || addr.county || '',
            state:         addr.state || '',
            country:       'India',
            postcode:      addr.postcode || '',
            place_id:      'osm:' + (p.osm_type||'N') + ':' + (p.osm_id||''),
            result_type:   p.type || p.class || 'unknown',
          },
          geometry: { coordinates: [parseFloat(p.lon)||0, parseFloat(p.lat)||0] },
        };
      });
      self._render(features);
    })
    .catch(function() { self._showEmpty(); });
};

LocationAutocomplete.prototype._render = function(features) {
  var self = this;
  self.suggest.innerHTML = '';
  self._activeIdx = -1;
  if (!features || !features.length) { self._hide(); return; }

  features.forEach(function(f) {
    var p = f.properties || {};

    /* Place name — just the locality/area name, not full address */
    var name = p.name || p.address_line1 || (p.formatted || '').split(',')[0];

    /* Context — City, State (like "Chennai, Tamil Nadu") */
    var city  = p.city || p.county || p.state_district || '';
    var state = p.state || '';
    var context = '';
    if (city && state && city !== state) context = city + ', ' + state;
    else if (state) context = state;
    else if (city)  context = city;

    var li = document.createElement('li');
    li.className = 'loc-item';
    li.setAttribute('role', 'option');
    li.innerHTML =
      '<span class="loc-item-pin"><i class="fas fa-map-marker-alt"></i></span>' +
      '<span class="loc-item-body">' +
        '<span class="loc-item-name">' + self._hl(name) + '</span>' +
        (context ? ' <span class="loc-item-context">' + context + '</span>' : '') +
      '</span>';

    li.addEventListener('mousedown', function(e) {
      e.preventDefault();
      self._select(f, name);
    });
    self.suggest.appendChild(li);
  });

  self.suggest.style.display = 'block';
};

LocationAutocomplete.prototype._icon = function(type, name) {
  var t = (type + ' ' + (name || '')).toLowerCase();
  if (/airport|aerodrome/.test(t))                          return 'fa-plane';
  if (/railway station|train station|junction/.test(t))     return 'fa-train';
  if (/metro|mrts|rapid transit/.test(t))                   return 'fa-subway';
  if (/bus.?stop|bus.?stand|bus.?depot|omni/.test(t))       return 'fa-bus';
  if (/hospital|clinic|medical|health/.test(t))             return 'fa-hospital';
  if (/school|college|university|institute/.test(t))        return 'fa-graduation-cap';
  if (/hotel|resort|lodge|inn/.test(t))                     return 'fa-hotel';
  if (/street|road|salai|main road|cross/.test(t))          return 'fa-road';
  if (/suburb|locality|nagar|puram|pet|ur$|ar$/.test(t))   return 'fa-map-pin';
  if (/city|town|district|municipality|ward/.test(t))       return 'fa-city';
  return 'fa-map-marker-alt';
};

LocationAutocomplete.prototype._hl = function(text) {
  if (!this._lastQuery || !text) return text;
  try {
    var safe = this._lastQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + safe + ')', 'gi'), '<strong>$1</strong>');
  } catch(e) { return text; }
};

LocationAutocomplete.prototype._select = function(feature, displayName) {
  var self  = this;
  var model = new BookingLocationModel();
  model.fromGeoapify(feature);

  /* Show clean name in input */
  self.input.value  = displayName || model.city || (model.address.split(',')[0]);
  /* Store city for static distance table lookup */
  self.hidden.value = model.city || self.input.value;
  self.model        = model;

  self._hide();

  /* Clear errors */
  self.input.classList.remove('loc-error');
  self.input.style.borderColor = '';
  self.input.style.boxShadow   = '';
  var wrap = self.input.closest('.loc-autocomplete-wrap');
  if (wrap && wrap.parentElement) {
    var err = wrap.parentElement.querySelector('.loc-err-msg');
    if (err) err.remove();
  }

  /* Fire callback with full model (has lat/lon) */
  self.onSelect(model);
  /* Also fire change on hidden input */
  self.hidden.dispatchEvent(new Event('change'));
};

LocationAutocomplete.prototype._showLoading = function() {
  this.suggest.innerHTML =
    '<li class="loc-state"><i class="fas fa-circle-notch fa-spin"></i> Searching…</li>';
  this.suggest.style.display = 'block';
};

LocationAutocomplete.prototype._showEmpty = function() {
  this.suggest.innerHTML =
    '<li class="loc-state loc-empty"><i class="fas fa-search"></i> No locations found</li>';
  this.suggest.style.display = 'block';
};

LocationAutocomplete.prototype._hide = function() {
  this.suggest.style.display = 'none';
  this.suggest.innerHTML = '';
  this._activeIdx = -1;
};

LocationAutocomplete.prototype.clear = function() {
  this.input.value  = '';
  this.hidden.value = '';
  this.model.clear();
  this._hide();
};

LocationAutocomplete.prototype.isValid = function() {
  return this.model.isValid();
};

LocationAutocomplete.prototype.showError = function(msg) {
  this.input.classList.add('loc-error');
  this.input.style.borderColor = '#EF4444';
  this.input.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
  var wrap = this.input.closest('.loc-autocomplete-wrap');
  var parent = wrap ? wrap.parentElement : null;
  if (!parent) return;
  var old = parent.querySelector('.loc-err-msg');
  if (old) old.remove();
  var s = document.createElement('span');
  s.className = 'loc-err-msg';
  s.setAttribute('role', 'alert');
  s.style.cssText = 'font-size:.72rem;color:#EF4444;margin-top:3px;display:block;';
  s.textContent = msg;
  parent.appendChild(s);
};

LocationAutocomplete.prototype.clearError = function() {
  this.input.classList.remove('loc-error');
  this.input.style.borderColor = '';
  this.input.style.boxShadow   = '';
  var wrap = this.input.closest('.loc-autocomplete-wrap');
  if (wrap && wrap.parentElement) {
    var err = wrap.parentElement.querySelector('.loc-err-msg');
    if (err) err.remove();
  }
};

/* ── Export ──────────────────────────────────────────────*/
window.SundaraLocation = {
  BookingLocationModel: BookingLocationModel,
  LocationAutocomplete: LocationAutocomplete,
  DistanceService:      DistanceService,
  setApiKey:    function(key) { GEOAPIFY_KEY = key; },
  setTomTomKey: function(key) { TOMTOM_KEY = key; },
};
