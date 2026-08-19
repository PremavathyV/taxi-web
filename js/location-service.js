/**
 * location-service.js – Sundara Travels
 * TomTom → Geoapify → Nominatim fallback chain
 * Shows matching locations as user types (Uber/Ola style)
 */
'use strict';

var TOMTOM_KEY   = 'p31xjqKewqDp97XEtDXUZLIz6pSvjy8z';
var GEOAPIFY_KEY = '4dda2d6c7fe0462793ab462db1b57d89';

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
BookingLocationModel.prototype.fromFeature = function(f) {
  var p = f.properties || {};
  var coords = (f.geometry || {}).coordinates || [0, 0];
  this.address    = p.formatted || p.address_line1 || p.name || '';
  this.placeId    = p.place_id  || '';
  this.latitude   = String(coords[1] || '');
  this.longitude  = String(coords[0] || '');
  this.city       = p.city || p.county || p.state_district || '';
  this.state      = p.state || '';
  this.country    = p.country || 'India';
  this.postalCode = p.postcode || '';
  this.confirmed  = (this.latitude !== '' && this.latitude !== '0');
  return this;
};
BookingLocationModel.prototype.isValid = function() {
  return this.confirmed && !!this.latitude && this.latitude !== '0';
};
BookingLocationModel.prototype.clear = function() {
  this.address = ''; this.placeId = ''; this.latitude = '';
  this.longitude = ''; this.city = ''; this.state = '';
  this.country = 'India'; this.postalCode = ''; this.confirmed = false;
  return this;
};
BookingLocationModel.prototype.toPayload = function() {
  return { address: this.address, placeId: this.placeId,
    latitude: this.latitude, longitude: this.longitude,
    city: this.city, state: this.state, country: this.country, postalCode: this.postalCode };
};

/* ══════════════════════════════════════════════════════════
   DistanceService
   ══════════════════════════════════════════════════════════ */
var DistanceService = (function() {
  var STATIC = {
    'chennai-bangalore':350,'chennai-coimbatore':497,'chennai-madurai':462,
    'chennai-trichy':330,'chennai-salem':340,'chennai-pondicherry':162,
    'chennai-vellore':140,'chennai-tirunelveli':625,'chennai-erode':400,
    'chennai-ooty':545,'chennai-kodaikanal':528,'chennai-kumbakonam':290,
    'chennai-thanjavur':315,'chennai-kanyakumari':700,'chennai-tirupati':140,
    'chennai-hyderabad':625,'chennai-kochi':693,'chennai-munnar':655,
    'chennai-mysore':480,'bangalore-coimbatore':360,'bangalore-madurai':450,
    'bangalore-trichy':380,'bangalore-salem':220,'bangalore-pondicherry':310,
    'bangalore-vellore':210,'bangalore-tirunelveli':570,'bangalore-ooty':270,
    'bangalore-kodaikanal':470,'bangalore-hyderabad':570,'bangalore-kochi':540,
    'bangalore-mysore':145,'bangalore-munnar':470,'bangalore-tirupati':260,
    'coimbatore-madurai':210,'coimbatore-trichy':200,'coimbatore-ooty':90,
    'coimbatore-kochi':190,'coimbatore-munnar':145,'coimbatore-salem':160,
    'madurai-trichy':140,'madurai-tirunelveli':170,'madurai-kanyakumari':247,
    'madurai-kodaikanal':120,'trichy-kumbakonam':95,'trichy-thanjavur':58,
    'ooty-mysore':124,'kochi-munnar':130,
  };
  function norm(s) { return (s||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z]/g,''); }
  function getStaticDistance(a, b) {
    var an = norm(a), bn = norm(b);
    var keys = Object.keys(STATIC);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split('-');
      if ((norm(parts[0])===an && norm(parts[1])===bn) ||
          (norm(parts[0])===bn && norm(parts[1])===an)) return STATIC[keys[i]];
    }
    return null;
  }
  function formatDuration(sec) {
    var h = Math.floor(sec/3600), m = Math.round((sec%3600)/60);
    return h===0 ? m+' min' : (m>0 ? h+'h '+m+'m' : h+'h');
  }
  function getDrivingDistance(la1,lo1,la2,lo2,signal) {
    var url = 'https://router.project-osrm.org/route/v1/driving/'+lo1+','+la1+';'+lo2+','+la2+'?overview=false';
    return fetch(url,{signal:signal})
      .then(function(r){return r.json();})
      .then(function(d){
        if(d.code!=='Ok'||!d.routes||!d.routes.length) throw new Error('no route');
        return {distKm:Math.round(d.routes[0].distance/1000),
          durationText:formatDuration(Math.round(d.routes[0].duration)),source:'osrm'};
      })
      .catch(function(e){
        if(e&&e.name==='AbortError') throw e;
        var s=Math.round(Math.sqrt(Math.pow((la2-la1)*111,2)+Math.pow((lo2-lo1)*111*Math.cos(la1*Math.PI/180),2)));
        var dk=Math.round(s*1.3)||1;
        return {distKm:dk,durationText:formatDuration(dk*90),source:'estimated'};
      });
  }
  return {getStaticDistance:getStaticDistance,getDrivingDistance:getDrivingDistance,formatDuration:formatDuration};
}());

/* ══════════════════════════════════════════════════════════
   LocationAutocomplete
   ══════════════════════════════════════════════════════════ */
function LocationAutocomplete(opts) {
  this.input    = document.getElementById(opts.inputId);
  this.hidden   = document.getElementById(opts.hiddenId);
  this.suggest  = document.getElementById(opts.suggestId);
  this.onSelect = opts.onSelect || function(){};
  this.model    = new BookingLocationModel();
  this._idx     = -1;
  this._timer   = null;
  this._ctrl    = null;
  this._query   = '';
  this._cache   = {};
  if (this.input && this.hidden && this.suggest) this._bind();
}

LocationAutocomplete.prototype._bind = function() {
  var self = this;
  this.input.addEventListener('input', function() {
    self.model.clear(); self.hidden.value = '';
    var q = self.input.value.trim();
    clearTimeout(self._timer);
    if (!q) { self._hide(); return; }
    self._timer = setTimeout(function(){ self._search(q); }, 280);
  });
  this.input.addEventListener('focus', function() {
    var q = self.input.value.trim();
    if (q && !self.model.isValid()) self._search(q);
  });
  this.input.addEventListener('keydown', function(e) {
    var items = self.suggest.querySelectorAll('.loc-item');
    if (!items.length || self.suggest.style.display==='none') return;
    if (e.key==='ArrowDown') { e.preventDefault(); self._idx=Math.min(self._idx+1,items.length-1); self._hl(items); }
    else if (e.key==='ArrowUp') { e.preventDefault(); self._idx=Math.max(self._idx-1,0); self._hl(items); }
    else if (e.key==='Enter' && self._idx>=0) { e.preventDefault(); items[self._idx].dispatchEvent(new MouseEvent('mousedown')); }
    else if (e.key==='Escape') self._hide();
  });
  document.addEventListener('click', function(e) {
    if (!self.input.contains(e.target) && !self.suggest.contains(e.target)) self._hide();
  });
};

LocationAutocomplete.prototype._hl = function(items) {
  var idx = this._idx;
  [].forEach.call(items, function(li,i){ li.classList.toggle('active', i===idx); });
  if (items[idx]) items[idx].scrollIntoView({block:'nearest'});
};

LocationAutocomplete.prototype._search = function(q) {
  var self = this;
  self._query = q;
  if (self._cache[q]) { self._render(self._cache[q]); return; }
  self._showLoading();
  if (self._ctrl) { try { self._ctrl.abort(); } catch(e){} }
  self._ctrl = new AbortController();
  self._tomtom(q);
};

LocationAutocomplete.prototype._tomtom = function(q) {
  var self = this;
  var url = 'https://api.tomtom.com/search/2/search/'+encodeURIComponent(q)+'.json?'+
    'key='+TOMTOM_KEY+'&countrySet=IN&language=en-GB&limit=8&typeahead=true';
  fetch(url, {signal:self._ctrl.signal})
    .then(function(r){ if(!r.ok) throw new Error('tt'+r.status); return r.json(); })
    .then(function(d) {
      var results = (d&&d.results)||[];
      if (!results.length) { self._geoapify(q); return; }
      var features = results.map(function(r) {
        var addr = r.address||{}, poi = r.poi||{};
        var name = poi.name||addr.streetName||addr.municipalitySubdivision||addr.municipality||(addr.freeformAddress||'').split(',')[0];
        var suburb = addr.municipalitySubdivision||'';
        var city   = addr.municipality||'';
        var state  = addr.countrySubdivision||'';
        var parts  = []; if(suburb&&suburb!==name) parts.push(suburb); if(city&&city!==name&&city!==suburb) parts.push(city); if(state) parts.push(state);
        return { properties:{ name:name, address_line1:name, address_line2:parts.join(', '),
            city:city||suburb, state:state, country:'India', postcode:addr.postalCode||'', place_id:r.id||''},
          geometry:{coordinates:[parseFloat((r.position||{}).lon)||0, parseFloat((r.position||{}).lat)||0]} };
      });
      self._cache[q]=features; self._render(features);
    })
    .catch(function(e){ if(e&&e.name==='AbortError') return; self._geoapify(q); });
};

LocationAutocomplete.prototype._geoapify = function(q) {
  var self = this;
  var url = 'https://api.geoapify.com/v1/geocode/autocomplete?text='+encodeURIComponent(q)+
    '&filter=countrycode:in&bias=proximity:80.2707,13.0827&limit=8&lang=en&apiKey='+GEOAPIFY_KEY;
  fetch(url, {signal:self._ctrl.signal})
    .then(function(r){ if(!r.ok) throw new Error('geo'+r.status); return r.json(); })
    .then(function(d) {
      var features=(d&&d.features)||[];
      if(features.length){ self._cache[q]=features; self._render(features); }
      else self._nominatim(q);
    })
    .catch(function(e){ if(e&&e.name==='AbortError') return; self._nominatim(q); });
};

LocationAutocomplete.prototype._nominatim = function(q) {
  var self = this;
  fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&countrycodes=in&addressdetails=1&limit=8&format=json',
    {headers:{'Accept-Language':'en'}})
    .then(function(r){return r.json();})
    .then(function(data) {
      if(!data||!data.length){ self._showEmpty(); return; }
      var features = data.map(function(p) {
        var addr=p.address||{}, name=p.display_name.split(',')[0];
        return { properties:{ name:name, address_line1:name,
            address_line2:p.display_name.split(',').slice(1,4).join(',').trim(),
            city:addr.city||addr.town||addr.village||'', state:addr.state||'',
            country:'India', postcode:addr.postcode||'', place_id:'osm:'+p.osm_id},
          geometry:{coordinates:[parseFloat(p.lon)||0,parseFloat(p.lat)||0]} };
      });
      self._render(features);
    })
    .catch(function(){ self._showEmpty(); });
};

LocationAutocomplete.prototype._render = function(features) {
  var self = this;
  self.suggest.innerHTML = ''; self._idx = -1;
  if (!features||!features.length) { self._hide(); return; }
  features.forEach(function(f) {
    var p = f.properties||{};
    var name = p.address_line1||p.name||(p.formatted||'').split(',')[0];
    var ctx  = p.address_line2||'';
    var li   = document.createElement('li');
    li.className = 'loc-item';
    li.setAttribute('role','option');
    li.innerHTML = '<span class="loc-item-pin"><i class="fas fa-map-marker-alt"></i></span>'+
      '<span class="loc-item-body">'+
      '<span class="loc-item-name">'+self._highlight(name)+'</span>'+
      (ctx?'<span class="loc-item-context">'+ctx+'</span>':'')+
      '</span>';
    li.addEventListener('mousedown', function(e){ e.preventDefault(); self._select(f,name); });
    self.suggest.appendChild(li);
  });
  self.suggest.style.display = 'block';
};

LocationAutocomplete.prototype._highlight = function(text) {
  if (!this._query||!text) return text;
  try {
    var safe = this._query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return text.replace(new RegExp('('+safe+')','gi'),'<strong>$1</strong>');
  } catch(e){ return text; }
};

LocationAutocomplete.prototype._select = function(feature, displayName) {
  var self = this;
  var model = new BookingLocationModel();
  model.fromFeature(feature);
  self.input.value  = displayName || model.city || (model.address.split(',')[0]);
  self.hidden.value = model.city  || self.input.value;
  self.model        = model;
  self._hide();
  self.input.classList.remove('loc-error');
  self.input.style.borderColor=''; self.input.style.boxShadow='';
  var wrap = self.input.closest('.loc-autocomplete-wrap');
  if (wrap&&wrap.parentElement) { var e=wrap.parentElement.querySelector('.loc-err-msg'); if(e) e.remove(); }
  self.onSelect(model);
  self.hidden.dispatchEvent(new Event('change'));
};

LocationAutocomplete.prototype._showLoading = function() {
  this.suggest.innerHTML='<li class="loc-state"><i class="fas fa-circle-notch fa-spin"></i> Searching…</li>';
  this.suggest.style.display='block';
};
LocationAutocomplete.prototype._showEmpty = function() {
  this.suggest.innerHTML='<li class="loc-state loc-empty"><i class="fas fa-search"></i> No locations found</li>';
  this.suggest.style.display='block';
};
LocationAutocomplete.prototype._hide = function() {
  this.suggest.style.display='none'; this.suggest.innerHTML=''; this._idx=-1;
};
LocationAutocomplete.prototype.clear = function() {
  this.input.value=''; this.hidden.value=''; this.model.clear(); this._hide();
};
LocationAutocomplete.prototype.isValid = function() { return this.model.isValid(); };
LocationAutocomplete.prototype.showError = function(msg) {
  this.input.classList.add('loc-error');
  this.input.style.borderColor='#EF4444'; this.input.style.boxShadow='0 0 0 3px rgba(239,68,68,.15)';
  var wrap=this.input.closest('.loc-autocomplete-wrap');
  var parent=wrap?wrap.parentElement:null; if(!parent) return;
  var old=parent.querySelector('.loc-err-msg'); if(old) old.remove();
  var s=document.createElement('span'); s.className='loc-err-msg'; s.setAttribute('role','alert');
  s.style.cssText='font-size:.72rem;color:#EF4444;margin-top:3px;display:block;'; s.textContent=msg;
  parent.appendChild(s);
};
LocationAutocomplete.prototype.clearError = function() {
  this.input.classList.remove('loc-error'); this.input.style.borderColor=''; this.input.style.boxShadow='';
  var wrap=this.input.closest('.loc-autocomplete-wrap');
  if(wrap&&wrap.parentElement){ var e=wrap.parentElement.querySelector('.loc-err-msg'); if(e) e.remove(); }
};

/* Export */
window.SundaraLocation = {
  BookingLocationModel: BookingLocationModel,
  LocationAutocomplete: LocationAutocomplete,
  DistanceService:      DistanceService,
  setApiKey:    function(k){ GEOAPIFY_KEY=k; },
  setTomTomKey: function(k){ TOMTOM_KEY=k; },
};
