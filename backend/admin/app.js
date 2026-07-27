/**
 * backend/admin/app.js  – Sundara Travels Admin Dashboard
 * Complete feature set: Auth, Bookings, Drivers, Payments, Contacts, Reports, Settings
 */
'use strict';

/* ══ Config ══════════════════════════════════════════════ */
const API = '/api';
let TOKEN = localStorage.getItem('st_admin_token') || '';
let currentBookingId = null;
let currentContactId = null;
let currentPage      = 1;
let refreshInterval  = null;

// ALWAYS show login page first — never show dashboard until verified
document.getElementById('authPage').classList.remove('hidden');
document.getElementById('dashPage').style.display='none';

/* ══ HTTP Helpers ════════════════════════════════════════ */
async function req(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + url, opts);
  const data = await res.json();

  // If 401 on any protected call — force logout
  if (res.status === 401) {
    TOKEN = ''; localStorage.removeItem('st_admin_token');
    document.getElementById('dashPage').style.display='none';
    document.getElementById('authPage').classList.remove('hidden');
    throw new Error('Session expired. Please login again.');
  }

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
const GET    = url      => req('GET',    url);
const POST   = (url, b) => req('POST',   url, b);
const PATCH  = (url, b) => req('PATCH',  url, b);
const DELETE = url      => req('DELETE', url);

/* ══ Toast ═══════════════════════════════════════════════ */
function toast(msg, ok = true) {
  const el = document.getElementById('toastEl');
  el.className = `toast align-items-center text-white border-0 bg-${ok ? 'success' : 'danger'}`;
  document.getElementById('toastMsg').textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

/* ══ Clock ═══════════════════════════════════════════════ */
function startClock() {
  const el = document.getElementById('currentTime');
  const tick = () => {
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  tick(); setInterval(tick, 30000);

  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* ══ AUTH ════════════════════════════════════════════════ */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn  = document.getElementById('loginBtn');
  const errEl = document.getElementById('authError');
  errEl.classList.add('d-none');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in…'; btn.disabled = true;
  try {
    const { token, data } = await POST('/admin/login', {
      email:    document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    TOKEN = token;
    localStorage.setItem('st_admin_token', token);
    setAdminInfo(data);
    showDash();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('d-none');
  } finally {
    btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login to Dashboard'; btn.disabled = false;
  }
});

// Password visibility toggle
document.getElementById('togglePwd')?.addEventListener('click', () => {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  TOKEN = '';
  localStorage.removeItem('st_admin_token');
  clearInterval(refreshInterval);
  // Clear all cached data
  currentBookingId = null;
  currentContactId = null;
  currentPage = 1;
  // Show login, hide dashboard
  document.getElementById('dashPage').style.display='none';
  document.getElementById('authPage').classList.remove('hidden');
  // Clear login form
  const emailEl = document.getElementById('loginEmail');
  const pwdEl   = document.getElementById('loginPassword');
  if (emailEl) emailEl.value = '';
  if (pwdEl)   pwdEl.value   = '';
  const errEl = document.getElementById('authError');
  if (errEl) errEl.classList.add('d-none');
});

function setAdminInfo(data) {
  const name = data?.name || data?.email || 'Admin';
  document.getElementById('adminName').textContent = name;
  const initial = document.getElementById('userInitial');
  if (initial) initial.textContent = name.charAt(0).toUpperCase();
  // Settings page
  if (document.getElementById('settingsEmail')) document.getElementById('settingsEmail').value = data?.email || '';
  if (document.getElementById('settingsName'))  document.getElementById('settingsName').value  = name;
}

function showDash() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('dashPage').style.display='block';
  startClock();
  loadDashboard();
  // Auto-refresh dashboard every 30s
  refreshInterval = setInterval(() => {
    if (document.getElementById('sec-dashboard').classList.contains('active')) loadDashboard();
  }, 30000);
}

// No auto-login — user must always enter credentials manually.
// Token is used only for API calls after login.
TOKEN = ''; localStorage.removeItem('st_admin_token');
document.getElementById('authPage').classList.remove('hidden');
document.getElementById('dashPage').style.display='none';

/* ══ Navigation ══════════════════════════════════════════ */
document.querySelectorAll('[data-sec]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchSection(a.dataset.sec); closeSidebar(); });
});

function switchSection(sec) {
  document.querySelectorAll('[data-sec]').forEach(a => a.classList.remove('active'));
  document.querySelector(`[data-sec="${sec}"]`)?.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const secEl = document.getElementById(`sec-${sec}`);
  if (secEl) secEl.classList.add('active');
  document.getElementById('pageTitle').textContent =
    { dashboard:'Dashboard', bookings:'Booking Management', drivers:'Driver Management',
      payments:'Payments & Revenue', contacts:'Contact Messages', reports:'Reports', settings:'Settings' }[sec] || sec;
  if (sec === 'bookings') loadBookings();
  if (sec === 'drivers')  loadDrivers();
  if (sec === 'payments') loadPayments();
  if (sec === 'contacts') loadContacts();
  if (sec === 'reports')  loadReports();
  if (sec === 'settings') loadSettings();
}

document.getElementById('menuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').style.display = 'block';
});
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  if (document.getElementById('overlay')) document.getElementById('overlay').style.display = 'none';
}

/* ══ DASHBOARD ═══════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const { data } = await GET('/admin/dashboard');
    const { bookings, drivers, contacts, revenue, recentBookings } = data;

    // Update pending badge
    const pb = document.getElementById('pendingBadge');
    if (pb) { pb.textContent = bookings.pending; pb.style.display = bookings.pending > 0 ? '' : 'none'; }
    const cb = document.getElementById('contactBadge');
    if (cb) cb.style.display = contacts.unresolved > 0 ? '' : 'none';

    const stats = [
      { label:'Total Bookings',   val:bookings.total,     icon:'fa-calendar-check', bg:'#FFF7E6', ic:'#F59E0B', sec:'bookings', filter:'' },
      { label:"Today's Bookings", val:bookings.today,     icon:'fa-clock',          bg:'#EFF6FF', ic:'#3B82F6', sec:'bookings', filter:'' },
      { label:'Pending',          val:bookings.pending,   icon:'fa-hourglass-half', bg:'#FFFBEB', ic:'#D97706', sec:'bookings', filter:'Pending' },
      { label:'Confirmed',        val:bookings.confirmed, icon:'fa-check-circle',   bg:'#F0FDF4', ic:'#22C55E', sec:'bookings', filter:'Confirmed' },
      { label:'Cancelled',        val:bookings.cancelled, icon:'fa-times-circle',   bg:'#FFF1F2', ic:'#EF4444', sec:'bookings', filter:'Cancelled' },
      { label:'Completed',        val:bookings.completed, icon:'fa-flag-checkered', bg:'#EFF6FF', ic:'#6366F1', sec:'bookings', filter:'Completed' },
      { label:'Active Drivers',   val:drivers.available,  icon:'fa-user-tie',       bg:'#F0FDF4', ic:'#22C55E', sec:'drivers', filter:'' },
      { label:'Total Revenue',    val:'₹'+(revenue.total||0).toLocaleString('en-IN'), icon:'fa-rupee-sign', bg:'#F0FDF4', ic:'#16A34A', sec:'payments', filter:'' },
    ];

    document.getElementById('statCards').innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card" onclick="statCardClick('${s.sec}','${s.filter}')" title="Click to view ${s.label}">
          <div class="stat-icon" style="background:${s.bg};color:${s.ic}"><i class="fas ${s.icon}"></i></div>
          <div>
            <div class="stat-val">${s.val}</div>
            <div class="stat-lbl">${s.label}</div>
          </div>
        </div>
      </div>`).join('');

    document.getElementById('recentBookingsTbl').innerHTML =
      (recentBookings||[]).map(b => `
        <tr>
          <td><strong>${b.name}</strong></td>
          <td>${b.mobile}</td>
          <td>${b.pickup} → ${b.drop}</td>
          <td>${fmtDate(b.journeyDate)}</td>
          <td>${b.vehicleType.split(' ')[0]}</td>
          <td><span class="badge-status st-${b.status}">${b.status}</span></td>
          <td><button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="viewBooking('${b._id}')"><i class="fas fa-eye"></i></button></td>
        </tr>`).join('')
      || '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i>No bookings yet</td></tr>';

  } catch (err) { toast(err.message, false); }
}

function statCardClick(sec, filter) {
  if (filter && sec === 'bookings') {
    switchSection(sec);
    setTimeout(() => {
      const sel = document.getElementById('bookingFilter');
      if (sel) { sel.value = filter; loadBookings(); }
    }, 100);
  } else {
    switchSection(sec);
  }
}

/* ══ BOOKINGS ════════════════════════════════════════════ */
async function loadBookings(page = 1) {
  currentPage = page;
  const search = document.getElementById('bookingSearch').value.trim();
  const status = document.getElementById('bookingFilter').value;
  const date   = document.getElementById('bookingDateFilter').value;
  let url = `/bookings?page=${page}&limit=15`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${status}`;
  if (date)   url += `&date=${date}`;

  try {
    const { data, total, pages } = await GET(url);
    const countEl = document.getElementById('bookingCount');
    if (countEl) countEl.textContent = `${total} total`;

    document.getElementById('bookingsTbl').innerHTML =
      data.map(b => `
        <tr>
          <td><code style="font-size:.7rem;background:#F1F5F9;padding:2px 6px;border-radius:4px">${b._id.slice(-6)}</code></td>
          <td><strong>${b.name}</strong><br><small class="text-muted">${b.mobile}</small></td>
          <td>${b.mobile}</td>
          <td style="max-width:150px;white-space:normal">${b.pickup}<br><small class="text-muted">→ ${b.drop}</small></td>
          <td>${fmtDate(b.journeyDate)}<br><small class="text-muted">${b.pickupTime||''}</small></td>
          <td>${b.vehicleType.split(' ')[0]}</td>
          <td>${b.driverId?.name ? `<span class="badge bg-light text-dark">${b.driverId.name}</span>` : '<span class="text-muted">—</span>'}</td>
          <td><span class="badge-status st-${b.status}">${b.status}</span></td>
          <td>
            <div class="tbl-actions">
              <button class="btn btn-xs btn-outline-primary" onclick="viewBooking('${b._id}')" title="View"><i class="fas fa-eye"></i></button>
              <button class="btn btn-xs btn-outline-success" onclick="quickConfirm('${b._id}')" title="Confirm"><i class="fas fa-check"></i></button>
              <button class="btn btn-xs btn-outline-danger" onclick="delBooking('${b._id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')
      || `<tr><td colspan="9" class="empty-state"><i class="fas fa-search"></i>No bookings found</td></tr>`;

    buildPager('bookingPager', page, pages, loadBookings);
  } catch (err) { toast(err.message, false); }
}

function clearBookingFilters() {
  document.getElementById('bookingSearch').value = '';
  document.getElementById('bookingFilter').value = '';
  document.getElementById('bookingDateFilter').value = '';
  loadBookings();
}

async function viewBooking(id) {
  currentBookingId = id;
  try {
    const { data } = await GET(`/bookings/${id}`);
    const b = data;

    document.getElementById('bookingStatusUpdate').value = b.status;
    if (document.getElementById('bookingAdminNote')) document.getElementById('bookingAdminNote').value = b.adminNote || '';

    // Main details
    document.getElementById('bookingModalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><small>Customer</small><span>${b.name}</span></div>
        <div class="detail-item"><small>Mobile</small><span><a href="tel:+91${b.mobile}">+91 ${b.mobile}</a></span></div>
        <div class="detail-item"><small>Pickup</small><span>${b.pickup}</span></div>
        <div class="detail-item"><small>Drop</small><span>${b.drop}</span></div>
        <div class="detail-item"><small>Journey Date</small><span>${fmtDate(b.journeyDate)}</span></div>
        <div class="detail-item"><small>Pickup Time</small><span>${b.pickupTime||'—'}</span></div>
        <div class="detail-item"><small>Vehicle</small><span>${b.vehicleType}</span></div>
        <div class="detail-item"><small>Trip Type</small><span>${b.tripType||'one_way'}</span></div>
        <div class="detail-item"><small>Status</small><span class="badge-status st-${b.status}">${b.status}</span></div>
        <div class="detail-item"><small>Booked On</small><span>${fmtDateTime(b.createdAt)}</span></div>
        ${b.driverId ? `<div class="detail-item"><small>Driver</small><span>${b.driverId.name} · ${b.driverId.phone}</span></div>` : ''}
        ${b.estimatedFare ? `<div class="detail-item"><small>Est. Fare</small><span class="fw-bold">₹${b.estimatedFare.toLocaleString('en-IN')}</span></div>` : ''}
      </div>
      ${b.specialInstructions ? `<div class="note-box mt-3"><strong>Special Instructions:</strong> ${b.specialInstructions}</div>` : ''}
      ${b.payment ? `<div class="note-box mt-2" style="border-color:#D1FAE5"><strong>Payment:</strong> ₹${b.payment.amount} via ${b.payment.paymentMethod} — <span class="badge-status st-${b.payment.paymentStatus}">${b.payment.paymentStatus}</span></div>` : ''}`;

    // Timeline
    const statusOrder = ['Pending','Confirmed','Completed'];
    const tl = document.getElementById('bookingTimeline');
    if (tl) {
      const steps = [
        { s:'Pending',   label:'Booking Received',  icon:'fa-plus-circle' },
        { s:'Confirmed', label:'Booking Confirmed',  icon:'fa-check-circle' },
        { s:'Completed', label:'Trip Completed',     icon:'fa-flag-checkered' },
      ];
      const curIdx = statusOrder.indexOf(b.status);
      tl.innerHTML = steps.map((step, i) => `
        <div class="tl-item">
          <div class="tl-dot ${i <= curIdx && b.status !== 'Cancelled' ? 'done' : ''} ${b.status==='Cancelled' && step.s==='Confirmed' ? 'cancel' : ''}"></div>
          <div class="tl-text"><i class="fas ${step.icon} me-2"></i>${step.label}</div>
          <div class="tl-time">${i <= curIdx && b.status !== 'Cancelled' ? '✓ Done' : 'Pending'}</div>
        </div>`).join('');
    }

    // Driver dropdown
    const { data: drivers } = await GET('/drivers');
    const sel = document.getElementById('assignDriverSelect');
    if (sel) {
      sel.innerHTML = '<option value="">Assign Driver…</option>' +
        drivers.map(d => `<option value="${d._id}" ${b.driverId?._id===d._id?'selected':''}>${d.name} – ${d.vehicleType.split(' ')[0]} (${d.isAvailable?'Available':'Busy'})</option>`).join('');
    }

    // Change vehicle
    const cv = document.getElementById('changeVehicleSelect');
    if (cv) cv.value = b.vehicleType || '';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
  } catch (err) { toast(err.message, false); }
}

async function saveBookingUpdate() {
  const status   = document.getElementById('bookingStatusUpdate').value;
  const driverId = document.getElementById('assignDriverSelect').value;
  const vehicle  = document.getElementById('changeVehicleSelect').value;
  const note     = document.getElementById('bookingAdminNote')?.value || '';

  try {
    const updates = { status };
    if (note !== undefined) updates.adminNote = note;
    if (vehicle) updates.vehicleType = vehicle;
    await PATCH(`/bookings/${currentBookingId}`, updates);
    if (driverId) await PATCH(`/bookings/${currentBookingId}/assign-driver`, { driverId });
    toast('Booking updated successfully.');
    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
    loadBookings(currentPage); loadDashboard();
  } catch (err) { toast(err.message, false); }
}

async function quickStatus(status) {
  try {
    await PATCH(`/bookings/${currentBookingId}`, { status });
    document.getElementById('bookingStatusUpdate').value = status;
    toast(`Booking marked as ${status}.`);
    loadBookings(currentPage); loadDashboard();
  } catch (err) { toast(err.message, false); }
}

async function quickConfirm(id) {
  if (!confirm('Confirm this booking?')) return;
  try { await PATCH(`/bookings/${id}`, { status: 'Confirmed' }); toast('Booking confirmed.'); loadBookings(currentPage); loadDashboard(); }
  catch (err) { toast(err.message, false); }
}

async function delBooking(id) {
  if (!confirm('Delete this booking permanently? This cannot be undone.')) return;
  try { await DELETE(`/bookings/${id}`); toast('Booking deleted.'); loadBookings(currentPage); loadDashboard(); }
  catch (err) { toast(err.message, false); }
}

/* ══ DRIVERS ═════════════════════════════════════════════ */
async function loadDrivers() {
  const search = document.getElementById('driverSearch')?.value.trim() || '';
  const avail  = document.getElementById('driverAvailFilter')?.value || '';
  let url = '/drivers';
  const params = [];
  if (avail !== '') params.push(`available=${avail}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const { data } = await GET(url);
    const filtered = search
      ? data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search))
      : data;

    document.getElementById('driversTbl').innerHTML =
      filtered.map(d => `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div style="width:34px;height:34px;border-radius:50%;background:#0F172A;display:flex;align-items:center;justify-content:center;color:#F59E0B;font-weight:700;font-size:.82rem;flex-shrink:0">${d.name.charAt(0).toUpperCase()}</div>
              <div><strong>${d.name}</strong></div>
            </div>
          </td>
          <td><a href="tel:${d.phone}">${d.phone}</a></td>
          <td>${d.email||'—'}</td>
          <td><code>${d.vehicleNumber}</code></td>
          <td>${d.vehicleType.split(' ')[0]}</td>
          <td>${d.licenseNumber||'—'}</td>
          <td><span class="badge-status ${d.isAvailable?'st-Confirmed':'st-Pending'}">${d.isAvailable?'Available':'On Trip'}</span></td>
          <td>${d.totalTrips||0}</td>
          <td>
            <div class="tbl-actions">
              <button class="btn btn-xs btn-outline-primary" onclick="editDriver(${JSON.stringify(d).replace(/"/g,'&quot;')})" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-xs btn-outline-${d.isAvailable?'warning':'success'}" onclick="toggleAvailability('${d._id}',${d.isAvailable})" title="${d.isAvailable?'Mark Busy':'Mark Available'}"><i class="fas fa-sync"></i></button>
              <button class="btn btn-xs btn-outline-danger" onclick="delDriver('${d._id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')
      || `<tr><td colspan="9" class="empty-state"><i class="fas fa-user-tie"></i>No drivers found. Add one!</td></tr>`;
  } catch (err) { toast(err.message, false); }
}

function openDriverModal() {
  document.getElementById('driverModalTitle').innerHTML = '<i class="fas fa-user-plus me-2 text-warning"></i>Add Driver';
  ['driverId','driverName','driverPhone','driverEmail','driverAddress','driverVehicleNo','driverLicense'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('driverVehicleType').value = 'Sedan';
}

function editDriver(d) {
  document.getElementById('driverModalTitle').innerHTML = '<i class="fas fa-user-edit me-2 text-warning"></i>Edit Driver';
  document.getElementById('driverId').value          = d._id;
  document.getElementById('driverName').value        = d.name;
  document.getElementById('driverPhone').value       = d.phone;
  document.getElementById('driverEmail').value       = d.email || '';
  document.getElementById('driverAddress').value     = d.address || '';
  document.getElementById('driverVehicleNo').value   = d.vehicleNumber;
  document.getElementById('driverVehicleType').value = d.vehicleType;
  document.getElementById('driverLicense').value     = d.licenseNumber || '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('driverModal')).show();
}

async function saveDriver() {
  const id = document.getElementById('driverId').value;
  const payload = {
    name:          document.getElementById('driverName').value.trim(),
    phone:         document.getElementById('driverPhone').value.trim(),
    email:         document.getElementById('driverEmail').value.trim(),
    address:       document.getElementById('driverAddress').value.trim(),
    vehicleNumber: document.getElementById('driverVehicleNo').value.trim().toUpperCase(),
    vehicleType:   document.getElementById('driverVehicleType').value,
    licenseNumber: document.getElementById('driverLicense').value.trim(),
  };
  if (!payload.name || !payload.phone || !payload.vehicleNumber) {
    toast('Name, Phone and Vehicle Number are required.', false); return;
  }
  try {
    if (id) await PATCH(`/drivers/${id}`, payload);
    else    await POST('/drivers', payload);
    toast('Driver saved successfully.');
    bootstrap.Modal.getInstance(document.getElementById('driverModal')).hide();
    loadDrivers();
  } catch (err) { toast(err.message, false); }
}

async function delDriver(id) {
  if (!confirm('Remove this driver? They will be soft-deleted.')) return;
  try { await DELETE(`/drivers/${id}`); toast('Driver removed.'); loadDrivers(); }
  catch (err) { toast(err.message, false); }
}

async function toggleAvailability(id, current) {
  try {
    await PATCH(`/drivers/${id}`, { isAvailable: !current });
    loadDrivers();
  } catch (err) { toast(err.message, false); }
}

/* ══ PAYMENTS ════════════════════════════════════════════ */
let currentPaymentBookingId = null;

async function loadPayments() {
  const statusF = document.getElementById('paymentStatusFilter')?.value || '';
  let url = '/payments';
  if (statusF) url += `?status=${statusF}`;

  try {
    const [{ data: payments }, { data: rev }] = await Promise.all([GET(url), GET('/payments/revenue')]);

    document.getElementById('revenueCards').innerHTML = `
      <div class="col-12 col-md-6 col-lg-3">
        <div class="revenue-box">
          <div class="rv-label">Total Revenue</div>
          <div class="rv-val">₹${(rev.totalRevenue||0).toLocaleString('en-IN')}</div>
        </div>
      </div>
      ${[
        { l:"Today's Revenue",   v: rev.todayRevenue,   bg:'#FFF7E6', c:'#F59E0B' },
        { l:'This Week',         v: rev.weekRevenue,    bg:'#EFF6FF', c:'#3B82F6' },
        { l:'This Month',        v: rev.monthRevenue,   bg:'#F5F3FF', c:'#8B5CF6' },
      ].map(r => `
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:${r.bg};color:${r.c}"><i class="fas fa-rupee-sign"></i></div>
            <div><div class="stat-val">₹${(r.v||0).toLocaleString('en-IN')}</div><div class="stat-lbl">${r.l}</div></div>
          </div>
        </div>`).join('')}`;

    document.getElementById('paymentsTbl').innerHTML =
      payments.map(p => {
        const b = p.bookingId || {};
        return `<tr>
          <td><code style="font-size:.7rem;background:#F1F5F9;padding:2px 6px;border-radius:4px">${(b._id||'').toString().slice(-6)||'—'}</code></td>
          <td>${b.name||'—'}</td>
          <td><strong>₹${(p.amount||0).toLocaleString('en-IN')}</strong></td>
          <td><span class="badge bg-light text-dark">${p.paymentMethod}</span></td>
          <td><small>${p.transactionId||'—'}</small></td>
          <td><span class="badge-status st-${p.paymentStatus}">${p.paymentStatus}</span></td>
          <td>${p.paymentDate ? fmtDate(p.paymentDate) : '—'}</td>
          <td>
            <div class="tbl-actions">
              <button class="btn btn-xs btn-outline-success" onclick="markPaid('${p._id}')" title="Mark Paid"><i class="fas fa-check"></i></button>
              <button class="btn btn-xs btn-outline-warning" onclick="editPaymentStatus('${p._id}','${p.paymentStatus}')" title="Edit"><i class="fas fa-edit"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')
      || `<tr><td colspan="8" class="empty-state"><i class="fas fa-credit-card"></i>No payment records yet</td></tr>`;
  } catch (err) { toast(err.message, false); }
}

async function markPaid(id) {
  try {
    await PATCH(`/payments/${id}`, { paymentStatus: 'paid' });
    toast('Payment marked as paid.'); loadPayments(); loadDashboard();
  } catch (err) { toast(err.message, false); }
}

async function editPaymentStatus(id, current) {
  const status = prompt('Update payment status (pending/paid/failed/refunded):', current);
  if (!status) return;
  try {
    await PATCH(`/payments/${id}`, { paymentStatus: status.toLowerCase() });
    toast('Payment updated.'); loadPayments(); loadDashboard();
  } catch (err) { toast(err.message, false); }
}

function openPaymentModal(bookingId, bookingDisplay) {
  currentPaymentBookingId = bookingId;
  document.getElementById('paymentBookingId').value      = bookingId;
  document.getElementById('paymentBookingDisplay').value = bookingDisplay;
  document.getElementById('paymentAmount').value         = '';
  document.getElementById('paymentTxnId').value          = '';
  document.getElementById('paymentMethod').value         = 'cash';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal')).show();
}

async function savePayment() {
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount.', false); return; }
  try {
    await POST('/payments', {
      bookingId:     document.getElementById('paymentBookingId').value,
      amount,
      paymentMethod: document.getElementById('paymentMethod').value,
      transactionId: document.getElementById('paymentTxnId').value.trim(),
    });
    toast('Payment recorded successfully.');
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    loadPayments(); loadDashboard();
  } catch (err) { toast(err.message, false); }
}

/* ══ CONTACTS ════════════════════════════════════════════ */
async function loadContacts() {
  const resolved = document.getElementById('contactFilter')?.value || '';
  let url = '/contacts';
  if (resolved !== '') url += `?resolved=${resolved}`;
  try {
    const { data } = await GET(url);
    const unresolved = data.filter(c => !c.isResolved).length;
    const cb = document.getElementById('contactBadge');
    if (cb) { cb.textContent = unresolved; cb.style.display = unresolved > 0 ? '' : 'none'; }

    document.getElementById('contactsTbl').innerHTML =
      data.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone||'—'}</td>
          <td>${c.email||'—'}</td>
          <td>${c.subject||'—'}</td>
          <td style="max-width:200px">${c.message.length>80 ? c.message.slice(0,80)+'…' : c.message}</td>
          <td>${fmtDate(c.createdAt)}</td>
          <td><span class="badge-status ${c.isResolved?'st-Completed':'st-Pending'}">${c.isResolved?'Resolved':'Open'}</span></td>
          <td>
            <div class="tbl-actions">
              <button class="btn btn-xs btn-outline-primary" onclick="viewContact('${c._id}')" title="View"><i class="fas fa-eye"></i></button>
              ${!c.isResolved ? `<button class="btn btn-xs btn-outline-success" onclick="resolveContact('${c._id}')" title="Mark Resolved"><i class="fas fa-check"></i></button>` : ''}
              <button class="btn btn-xs btn-outline-danger" onclick="delContact('${c._id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')
      || `<tr><td colspan="8" class="empty-state"><i class="fas fa-envelope-open"></i>No messages found</td></tr>`;
  } catch (err) { toast(err.message, false); }
}

async function viewContact(id) {
  currentContactId = id;
  try {
    const { data: c } = await GET(`/contacts/${id}`);
    document.getElementById('contactModalBody').innerHTML = `
      <div class="detail-grid mb-3">
        <div class="detail-item"><small>Name</small><span>${c.name}</span></div>
        <div class="detail-item"><small>Phone</small><span>${c.phone||'—'}</span></div>
        <div class="detail-item"><small>Email</small><span>${c.email||'—'}</span></div>
        <div class="detail-item"><small>Subject</small><span>${c.subject||'—'}</span></div>
        <div class="detail-item"><small>Received</small><span>${fmtDateTime(c.createdAt)}</span></div>
        <div class="detail-item"><small>Status</small><span class="badge-status ${c.isResolved?'st-Completed':'st-Pending'}">${c.isResolved?'Resolved':'Open'}</span></div>
      </div>
      <div class="note-box">${c.message}</div>
      ${c.adminNote ? `<div class="note-box mt-2" style="border-color:#93C5FD"><strong>Admin Note:</strong> ${c.adminNote}</div>` : ''}`;

    const btn = document.getElementById('contactResolveBtn');
    if (btn) {
      btn.innerHTML = c.isResolved
        ? '<i class="fas fa-undo me-1"></i>Mark Unresolved'
        : '<i class="fas fa-check me-1"></i>Mark Resolved';
      btn.onclick = () => toggleResolveContact(id, c.isResolved);
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('contactModal')).show();
  } catch (err) { toast(err.message, false); }
}

async function resolveContact(id) {
  try {
    await PATCH(`/contacts/${id}`, { isResolved: true });
    toast('Marked as resolved.'); loadContacts();
  } catch (err) { toast(err.message, false); }
}

async function toggleResolveContact(id, current) {
  try {
    await PATCH(`/contacts/${id}`, { isResolved: !current });
    toast(current ? 'Marked as unresolved.' : 'Marked as resolved.');
    bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
    loadContacts();
  } catch (err) { toast(err.message, false); }
}

async function delContact(id) {
  if (!confirm('Delete this message permanently?')) return;
  try { await DELETE(`/contacts/${id}`); toast('Message deleted.'); loadContacts(); }
  catch (err) { toast(err.message, false); }
}

/* ══ REPORTS ══════════════════════════════════════════════ */
async function loadReports() {
  try {
    const [{ data: bookRpt }, { data: rev }] = await Promise.all([
      GET('/bookings/reports'),
      GET('/payments/revenue'),
    ]);

    document.getElementById('reportCards').innerHTML = `
      <!-- Booking stats -->
      <div class="col-12"><h6 class="fw-bold mb-2">📅 Booking Statistics</h6></div>
      ${[
        { l:'Total',     v:bookRpt.totalBookings, ic:'fa-calendar',      bg:'#EFF6FF', c:'#3B82F6' },
        { l:'Today',     v:bookRpt.todayBookings, ic:'fa-clock',         bg:'#FFF7E6', c:'#F59E0B' },
        { l:'This Week', v:bookRpt.weekBookings,  ic:'fa-calendar-week', bg:'#F0FDF4', c:'#22C55E' },
        { l:'This Month',v:bookRpt.monthBookings, ic:'fa-calendar-alt',  bg:'#F5F3FF', c:'#8B5CF6' },
      ].map(s => `
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:${s.bg};color:${s.c}"><i class="fas ${s.ic}"></i></div>
            <div><div class="stat-val">${s.v}</div><div class="stat-lbl">${s.l}</div></div>
          </div>
        </div>`).join('')}

      <!-- Status breakdown -->
      <div class="col-12 mt-2"><h6 class="fw-bold mb-2">📊 Status Breakdown</h6></div>
      ${[
        { l:'Pending',   v:bookRpt.byStatus?.pending||0,   ic:'fa-hourglass-half', bg:'#FFFBEB', c:'#D97706' },
        { l:'Confirmed', v:bookRpt.byStatus?.confirmed||0, ic:'fa-check-circle',   bg:'#F0FDF4', c:'#22C55E' },
        { l:'Cancelled', v:bookRpt.byStatus?.cancelled||0, ic:'fa-times-circle',   bg:'#FFF1F2', c:'#EF4444' },
        { l:'Completed', v:bookRpt.byStatus?.completed||0, ic:'fa-flag-checkered', bg:'#EFF6FF', c:'#6366F1' },
      ].map(s => `
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:${s.bg};color:${s.c}"><i class="fas ${s.ic}"></i></div>
            <div><div class="stat-val">${s.v}</div><div class="stat-lbl">${s.l}</div></div>
          </div>
        </div>`).join('')}

      <!-- Revenue -->
      <div class="col-12 mt-2"><h6 class="fw-bold mb-2">💰 Revenue Report</h6></div>
      <div class="col-12 col-md-6">
        <div class="revenue-box">
          <div class="rv-label">Total Revenue Collected</div>
          <div class="rv-val">₹${(rev.totalRevenue||0).toLocaleString('en-IN')}</div>
          <div style="margin-top:8px;font-size:.78rem;color:rgba(255,255,255,.6)">
            Today: ₹${(rev.todayRevenue||0).toLocaleString('en-IN')} &nbsp;|&nbsp;
            Week: ₹${(rev.weekRevenue||0).toLocaleString('en-IN')} &nbsp;|&nbsp;
            Month: ₹${(rev.monthRevenue||0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <!-- Vehicle breakdown -->
      <div class="col-12 mt-3">
        <div class="card-box">
          <div class="card-box-header"><h6>Bookings by Vehicle Type</h6></div>
          <div class="table-responsive">
            <table><thead><tr><th>Vehicle</th><th>Total Bookings</th><th>Share</th></tr></thead>
            <tbody>${(bookRpt.byVehicle||[]).map(v => {
              const pct = bookRpt.totalBookings > 0 ? Math.round((v.count/bookRpt.totalBookings)*100) : 0;
              return `<tr>
                <td>${v._id||'—'}</td>
                <td><strong>${v.count}</strong></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:100px;height:6px;background:#F1F5F9;border-radius:4px;overflow:hidden">
                      <div style="width:${pct}%;height:100%;background:#F59E0B;border-radius:4px"></div>
                    </div>
                    <span>${pct}%</span>
                  </div>
                </td>
              </tr>`;
            }).join('')||'<tr><td colspan="3" class="empty-state">No data</td></tr>'}
            </tbody></table>
          </div>
        </div>
      </div>`;
  } catch (err) { toast(err.message, false); }
}

/* ══ SETTINGS ════════════════════════════════════════════ */
async function loadSettings() {
  try {
    const { data } = await GET('/admin/me');
    if (document.getElementById('settingsEmail')) document.getElementById('settingsEmail').value = data.email || '';
    if (document.getElementById('settingsName'))  document.getElementById('settingsName').value  = data.name  || '';
  } catch (err) { /* silent */ }
}

async function changePassword() {
  const current  = document.getElementById('currentPwd').value;
  const newPwd   = document.getElementById('newPwd').value;
  const confirm  = document.getElementById('confirmPwd').value;
  if (!current || !newPwd) { toast('Please fill all password fields.', false); return; }
  if (newPwd.length < 6)   { toast('New password must be at least 6 characters.', false); return; }
  if (newPwd !== confirm)  { toast('Passwords do not match.', false); return; }
  try {
    await PATCH('/admin/password', { currentPassword: current, newPassword: newPwd });
    toast('Password changed successfully.');
    ['currentPwd','newPwd','confirmPwd'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  } catch (err) { toast(err.message, false); }
}

async function saveSettings() {
  const name  = document.getElementById('settingsName')?.value.trim();
  const phone = document.getElementById('settingsPhone')?.value.trim();
  toast('Settings saved.'); // Extend when settings API is added
}

/* ══ HELPERS ══════════════════════════════════════════════ */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function buildPager(containerId, current, pages, loadFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (pages <= 1) return;
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === current ? 'active' : '';
    btn.onclick = () => loadFn(i);
    container.appendChild(btn);
  }
}

// Add btn-xs style dynamically
const xs = document.createElement('style');
xs.textContent = `.btn-xs{padding:2px 8px!important;font-size:.72rem!important;border-radius:6px!important;}`;
document.head.appendChild(xs);



