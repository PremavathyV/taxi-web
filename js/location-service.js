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
var GOOGLE_MAPS_KEY = '';
/* Google Maps / Places API */
var GOOGLE_MAPS_READY = false;

function setGoogleMapsKey(key) {
  GOOGLE_MAPS_KEY = (key || '').trim();
  GOOGLE_MAPS_READY = false;
  if (window.__googlePlacesPromise) {
    window.__googlePlacesPromise = null;
  }
  return GOOGLE_MAPS_KEY;
}

/* ══════════════════════════════════════════════════════════
   Google Places API loader
   ══════════════════════════════════════════════════════════ */

function loadGooglePlaces() {
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  if (window.__googlePlacesPromise) {
    return window.__googlePlacesPromise;
  }

  window.__googlePlacesPromise = new Promise(function(resolve, reject) {
    var script = document.createElement('script');

    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      '?key=' + encodeURIComponent(GOOGLE_MAPS_KEY) +
      '&libraries=places' +
      '&v=weekly';

    script.async = true;
    script.defer = true;

    script.onload = function() {
      GOOGLE_MAPS_READY = true;
      if (window.google && window.google.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps JavaScript API loaded without maps object.'));
    };

    script.onerror = function() {
      reject(new Error('Google Maps JavaScript API failed to load.'));
    };

    document.head.appendChild(script);
  });

  return window.__googlePlacesPromise;
}

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
   Google Places Autocomplete (New)
   ══════════════════════════════════════════════════════════ */

function LocationAutocomplete(opts) {
  this.input    = document.getElementById(opts.inputId);
  this.hidden   = document.getElementById(opts.hiddenId);
  this.suggest  = document.getElementById(opts.suggestId);
  this.onSelect = opts.onSelect || function() {};
  this.model    = new BookingLocationModel();

  this._activeIdx = -1;
  this._debounceT = null;
  this._lastQuery = '';

  if (this.input && this.hidden && this.suggest) {
    this._bind();
  }
}


/* ──────────────────────────────────────────────────────────
   Bind input events
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._bind = function() {
  var self = this;

  self.input.addEventListener('input', function() {
    self.model.clear();
    self.hidden.value = '';

    var q = self.input.value.trim();

    clearTimeout(self._debounceT);

    if (!q || q.length < 2) {
      self._hide();
      return;
    }

    self._debounceT = setTimeout(function() {
      self._search(q);
    }, 300);
  });


  self.input.addEventListener('focus', function() {
    var q = self.input.value.trim();

    if (q.length >= 2 && !self.model.isValid()) {
      self._search(q);
    }
  });


  self.input.addEventListener('keydown', function(e) {
    var items = self.suggest.querySelectorAll('.loc-item');

    if (!items.length ||
        self.suggest.style.display === 'none') {
      return;
    }

    if (e.key === 'ArrowDown') {

      e.preventDefault();

      self._activeIdx = Math.min(
        self._activeIdx + 1,
        items.length - 1
      );

      self._highlight(items);

    } else if (e.key === 'ArrowUp') {

      e.preventDefault();

      self._activeIdx = Math.max(
        self._activeIdx - 1,
        0
      );

      self._highlight(items);

    } else if (e.key === 'Enter') {

      if (
        self._activeIdx >= 0 &&
        items[self._activeIdx]
      ) {
        e.preventDefault();

        items[self._activeIdx]
          .dispatchEvent(new MouseEvent('mousedown'));
      }

    } else if (e.key === 'Escape') {

      self._hide();
    }
  });


  document.addEventListener('click', function(e) {
    if (
      !self.input.contains(e.target) &&
      !self.suggest.contains(e.target)
    ) {
      self._hide();
    }
  });
};


/* ──────────────────────────────────────────────────────────
   Google Places search
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._search = function(q) {

  var self = this;

  self._lastQuery = q;

  self._showLoading();

  loadGooglePlaces()
    .then(function() {

      return self._googleSearch(q);

    })
    .catch(function(err) {

      console.error(
        'Google Places error:',
        err
      );

      self._showEmpty();
    });
};


/* ──────────────────────────────────────────────────────────
   Google Places Autocomplete (New)
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._googleSearch = async function(q) {

  var self = this;

  try {

    /*
     * Import the new Places library.
     */
    var placesLib =
      await google.maps.importLibrary('places');

    var PlaceAutocompleteElement =
      placesLib.PlaceAutocompleteElement;


    /*
     * Create a temporary Google autocomplete element.
     *
     * We don't display this element.
     * We use it only to obtain Google predictions.
     */
    var autocomplete =
      new PlaceAutocompleteElement();


    /*
     * Restrict suggestions to India.
     */
    autocomplete.includedRegionCodes = ['in'];


    /*
     * Use the user's typed query.
     */
    autocomplete.value = q;


    /*
     * Listen for prediction selection.
     *
     * The actual visible dropdown is still OUR
     * existing custom dropdown.
     */
    var container =
      document.createElement('div');

    container.style.display = 'none';

    container.appendChild(autocomplete);

    document.body.appendChild(container);


    /*
     * Google autocomplete widget handles
     * prediction requests internally.
     *
     * Unfortunately, PlaceAutocompleteElement
     * is a complete UI component and is not designed
     * to expose arbitrary predictions directly.
     *
     * Therefore we use the Data API below instead.
     */
    container.remove();

    await self._googleDataSearch(q);

  } catch (err) {

    console.error(
      'Google Places search failed:',
      err
    );

    self._showEmpty();
  }
};


/* ──────────────────────────────────────────────────────────
   Google Places Autocomplete Data API
   Custom UI version
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._googleDataSearch = async function(q) {

  var self = this;

  try {

    var placesLib =
      await google.maps.importLibrary('places');

    var AutocompleteSessionToken =
      placesLib.AutocompleteSessionToken;

    var AutocompleteSuggestion =
      placesLib.AutocompleteSuggestion;


    /*
     * Create a session token.
     */
    var sessionToken =
      new AutocompleteSessionToken();


    /*
     * Build autocomplete request.
     */
    var request = {
      input: q,

      includedRegionCodes: ['in'],

      sessionToken: sessionToken
    };


    /*
     * Ask Google for predictions.
     */
    var response =
      await AutocompleteSuggestion
        .fetchAutocompleteSuggestions(request);


    var suggestions =
      response.suggestions || [];


    if (!suggestions.length) {

      self._showEmpty();

      return;
    }


    /*
     * Convert Google suggestions into the
     * same structure expected by our renderer.
     */
    var features = suggestions.map(function(item) {

      var prediction =
        item.placePrediction;

      if (!prediction) {
        return null;
      }


      var text =
        prediction.text || {};

      var mainText =
        text.text || '';


      var secondaryText = '';

      if (text.matches &&
          text.matches.length) {

        secondaryText =
          mainText;
      }


      return {

        googlePrediction: prediction,

        properties: {

          name: mainText,

          address_line1: mainText,

          address_line2:
            secondaryText,

          city: '',

          state: '',

          country: 'India',

          postcode: '',

          place_id:
            prediction.placeId || '',

          result_type:
            'google-place'
        },

        geometry: {

          coordinates: [0, 0]

        }

      };

    }).filter(Boolean);


    self._render(features);

  } catch (err) {

    console.error(
      'Google Autocomplete Data API error:',
      err
    );

    self._showEmpty();
  }
};


/* ──────────────────────────────────────────────────────────
   Render Google suggestions
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._render = function(features) {

  var self = this;

  self.suggest.innerHTML = '';

  self._activeIdx = -1;


  if (!features || !features.length) {

    self._hide();

    return;
  }


  features.forEach(function(f) {

    var p =
      f.properties || {};


    var name =
      p.name ||
      p.address_line1 ||
      '';


    var context =
      p.address_line2 || '';


    var li =
      document.createElement('li');


    li.className =
      'loc-item';


    li.setAttribute(
      'role',
      'option'
    );


    li.innerHTML =

      '<span class="loc-item-pin">' +

        '<i class="fas fa-map-marker-alt"></i>' +

      '</span>' +

      '<span class="loc-item-body">' +

        '<span class="loc-item-name">' +

          self._hl(name) +

        '</span>' +

        (
          context

            ? ' <span class="loc-item-context">' +
                self._hl(context) +
              '</span>'

            : ''
        ) +

      '</span>';


    li.addEventListener(
      'mousedown',
      function(e) {

        e.preventDefault();

        self._selectGoogle(
          f
        );

      }
    );


    self.suggest.appendChild(li);

  });


  self.suggest.style.display =
    'block';
};


/* ──────────────────────────────────────────────────────────
   Select Google place
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._selectGoogle = async function(feature) {

  var self = this;

  var prediction =
    feature.googlePrediction;


  if (!prediction) {
    return;
  }


  try {

    self._showLoading();


    /*
     * Convert prediction to Place.
     */
    var place =
      prediction.toPlace();


    /*
     * Fetch only the fields we actually need.
     */
    await place.fetchFields({

      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'addressComponents'
      ]

    });


    /*
     * Build our existing BookingLocationModel.
     */
    var model =
      new BookingLocationModel();


    model.placeId =
      place.id || '';


    model.address =
      place.formattedAddress ||
      place.displayName ||
      '';


    if (place.location) {

      model.latitude =
        String(place.location.lat());

      model.longitude =
        String(place.location.lng());

    }


    model.country =
      'India';


    /*
     * Read address components.
     */
    var components =
      place.addressComponents || [];


    components.forEach(function(component) {

      var types =
        component.types || [];

      var value =
        component.longText ||
        component.shortText ||
        '';


      if (
        types.indexOf(
          'locality'
        ) !== -1
      ) {

        model.city = value;

      } else if (
        types.indexOf(
          'administrative_area_level_2'
        ) !== -1 &&
        !model.city
      ) {

        model.city = value;

      } else if (
        types.indexOf(
          'administrative_area_level_1'
        ) !== -1
      ) {

        model.state = value;

      } else if (
        types.indexOf(
          'country'
        ) !== -1
      ) {

        model.country = value;

      } else if (
        types.indexOf(
          'postal_code'
        ) !== -1
      ) {

        model.postalCode = value;

      }

    });


    /*
     * Mark location as confirmed only when
     * Google returned valid coordinates.
     */
    model.confirmed =
      model.latitude !== '' &&
      model.longitude !== '';


    /*
     * Display clean Google place name.
     */
    self.input.value =
      place.displayName ||
      place.formattedAddress ||
      '';


    /*
     * Existing hidden field.
     *
     * We store the city here because your
     * existing code uses it for static-distance
     * lookup.
     */
    self.hidden.value =
      model.city ||
      self.input.value;


    self.model =
      model;


    self._hide();


    /*
     * Clear existing errors.
     */
    self.input.classList.remove(
      'loc-error'
    );

    self.input.style.borderColor =
      '';

    self.input.style.boxShadow =
      '';


    var wrap =
      self.input.closest(
        '.loc-autocomplete-wrap'
      );


    if (
      wrap &&
      wrap.parentElement
    ) {

      var err =
        wrap.parentElement.querySelector(
          '.loc-err-msg'
        );

      if (err) {
        err.remove();
      }

    }


    /*
     * Existing callback.
     *
     * Your pickup/drop code can continue
     * using this without modification.
     */
    self.onSelect(model);


    /*
     * Existing hidden input event.
     */
    self.hidden.dispatchEvent(
      new Event('change')
    );


  } catch (err) {

    console.error(
      'Google Place Details error:',
      err
    );

    self._showEmpty();
  }
};


/* ──────────────────────────────────────────────────────────
   Keyboard highlighting
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._highlight = function(items) {

  var idx =
    this._activeIdx;


  [].forEach.call(
    items,
    function(li, i) {

      li.classList.toggle(
        'active',
        i === idx
      );

    }
  );


  if (items[idx]) {

    items[idx].scrollIntoView({
      block: 'nearest'
    });

  }
};


/* ──────────────────────────────────────────────────────────
   Highlight search text
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._hl = function(text) {

  if (
    !this._lastQuery ||
    !text
  ) {
    return text;
  }


  try {

    var safe =
      this._lastQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );


    return text.replace(
      new RegExp(
        '(' + safe + ')',
        'gi'
      ),
      '<strong>$1</strong>'
    );

  } catch(e) {

    return text;
  }
};


/* ──────────────────────────────────────────────────────────
   Loading state
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._showLoading = function() {

  this.suggest.innerHTML =

    '<li class="loc-state">' +

      '<i class="fas fa-circle-notch fa-spin"></i> ' +

      'Searching Google Maps…' +

    '</li>';


  this.suggest.style.display =
    'block';
};


/* ──────────────────────────────────────────────────────────
   Empty state
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._showEmpty = function() {

  this.suggest.innerHTML =

    '<li class="loc-state loc-empty">' +

      '<i class="fas fa-search"></i> ' +

      'No locations found' +

    '</li>';


  this.suggest.style.display =
    'block';
};


/* ──────────────────────────────────────────────────────────
   Hide suggestions
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype._hide = function() {

  this.suggest.style.display =
    'none';

  this.suggest.innerHTML =
    '';

  this._activeIdx =
    -1;
};


/* ──────────────────────────────────────────────────────────
   Clear
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype.clear = function() {

  this.input.value =
    '';

  this.hidden.value =
    '';

  this.model.clear();

  this._hide();
};


/* ──────────────────────────────────────────────────────────
   Validation
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype.isValid = function() {

  return this.model.isValid();
};


/* ──────────────────────────────────────────────────────────
   Show error
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype.showError = function(msg) {

  this.input.classList.add(
    'loc-error'
  );

  this.input.style.borderColor =
    '#EF4444';

  this.input.style.boxShadow =
    '0 0 0 3px rgba(239,68,68,.15)';


  var wrap =
    this.input.closest(
      '.loc-autocomplete-wrap'
    );


  var parent =
    wrap
      ? wrap.parentElement
      : null;


  if (!parent) {
    return;
  }


  var old =
    parent.querySelector(
      '.loc-err-msg'
    );


  if (old) {
    old.remove();
  }


  var s =
    document.createElement(
      'span'
    );


  s.className =
    'loc-err-msg';


  s.setAttribute(
    'role',
    'alert'
  );


  s.style.cssText =
    'font-size:.72rem;' +
    'color:#EF4444;' +
    'margin-top:3px;' +
    'display:block;';


  s.textContent =
    msg;


  parent.appendChild(s);
};


/* ──────────────────────────────────────────────────────────
   Clear error
   ────────────────────────────────────────────────────────── */

LocationAutocomplete.prototype.clearError = function() {

  this.input.classList.remove(
    'loc-error'
  );

  this.input.style.borderColor =
    '';

  this.input.style.boxShadow =
    '';


  var wrap =
    this.input.closest(
      '.loc-autocomplete-wrap'
    );


  if (
    wrap &&
    wrap.parentElement
  ) {

    var err =
      wrap.parentElement.querySelector(
        '.loc-err-msg'
      );


    if (err) {
      err.remove();
    }

  }
};


/* ──────────────────────────────────────────────────────────
   Export
   ────────────────────────────────────────────────────────── */

window.SundaraLocation = {

  BookingLocationModel:
    BookingLocationModel,

  LocationAutocomplete:
    LocationAutocomplete,

  DistanceService:
    DistanceService,

  setGoogleMapsKey:
    setGoogleMapsKey,

  loadGooglePlaces:
    loadGooglePlaces,

  loadGoogleMaps:
    loadGooglePlaces

};