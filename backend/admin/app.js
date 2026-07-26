/**
 * backend/admin/app.js
 * Sundara Travels Admin Dashboard – Frontend Logic
 */

'use strict';

const API = '/api';
let TOKEN = localStorage.getItem('st_admin_token') || '';
let currentBookingId = null;
let currentPage = 1;

/* ── HTTP helpers ── */
const req = async (method, url, body) => {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const GET    = url       => req('GET',    url);
const POST   = (url, b)  => req('POST',   url, b);
const PATCH  = (url, b)  => req('PATCH',  url, b);
const DELETE = url       => req('DELETE', url);

/* ── Toast ── */
const bsToast = () => bootstrap.Toast.getOrCreateInstance(document.getElementById('toastEl'), { delay: 3500 });
const toast = (msg, ok = true) => {
  const el = document.getElementById('toastEl');
  el.className = `toast align-items-center text-white border-0 bg-${ok ? 'success' : 'danger'}`;
  document.getElementById('toastMsg').textContent = msg;
  bsToast().show();
};

/* ════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════ */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  try {
    const { token, data } = await POST('/admin/login', {
      email:    document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });
    TOKEN = token;
    localStorage.setItem('st_admin_token', token);
    document.getElementById('adminName').textContent = data.name || data.email;
    showDash();
  } catch (err) {
    const errEl = document.getElementById('authError');
    errEl.textContent = err.message; errEl.classList.remove('d-none');
  } finally { btn.textContent = 'Login to Dashboard'; btn.disabled = false; }
});

document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  TOKEN = ''; localStorage.removeItem('st_admin_token');
  document.getElementById('dashPage').style.display = 'none';
  document.getElementById('authPage').style.display  = 'flex';
});

function showDash() {
  document.getElementById('authPage').style.display  = 'none';
  document.getElementById('dashPage').style.display  = 'block';
  loadDashboard();
}

// Auto-login if token stored
if (TOKEN) {
  GET('/admin/me').then(r => {
    document.getElementById('adminName').textContent = r.data?.name || 'Admin';
    showDash();
  }).catch(() => { TOKEN = ''; localStorage.removeItem('st_admin_token'); });
}

/* ════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════ */
document.querySelectorAll('[data-sec]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchSection(a.dataset.sec); });
});

function switchSection(sec) {
  document.querySelectorAll('[data-sec]').forEach(a => a.classList.remove('active'));
  document.querySelector(`[data-sec="${sec}"]`)?.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${sec}`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = sec.charAt(0).toUpperCase() + sec.slice(1);

  if (sec === 'bookings') loadBookings();
  if (sec === 'drivers')  loadDrivers();
  if (sec === 'payments') loadPayments();
  if (sec === 'contacts') loadContacts();
  if (sec === 'reports')  loadReports();
}

// Mobile sidebar
document.getElementById('menuBtn')?.addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('open')
);

/* ════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const { data } = await GET('/admin/dashboard');
    const { bookings, drivers, contacts, revenue, recentBookings } = data;

    const stats = [
      { label: 'Total Bookings',  val: bookings.total,     icon: 'fa-calendar-check', bg: '#FFF7E6', ic: '#F59E0B' },
      { label: "Today's Bookings",val: bookings.today,     icon: 'fa-clock',           bg: '#EFF6FF', ic: '#3B82F6' },
      { label: 'Pending',         val: bookings.pending,   icon: 'fa-hourglass-half',  bg: '#FFFBEB', ic: '#D97706' },
      { label: 'Confirmed',       val: bookings.confirmed, icon: 'fa-check-circle',    bg: '#F0FDF4', ic: '#22C55E' },
      { label: 'Cancelled',       val: bookings.cancelled, icon: 'fa-times-circle',    bg: '#FFF1F2', ic: '#EF4444' },
      { label: 'Completed',       val: bookings.completed, icon: 'fa-flag-checkered',  bg: '#EFF6FF', ic: '#6366F1' },
      { label: 'Active Drivers',  val: drivers.available,  icon: 'fa-user-tie',        bg: '#F0FDF4', ic: '#22C55E' },
      { label: 'Total Revenue',   val: '₹' + (revenue.total).toLocaleString('en-IN'), icon: 'fa-rupee-sign', bg: '#F0FDF4', ic: '#16A34A' },
    ];

    document.getElementById('statCards').innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:${s.bg};color:${s.ic}"><i class="fas ${s.icon}"></i></div>
          <div><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.label}</div></div>
        </div>
      </div>`).join('');

    document.getElementById('recentBookingsTbl').innerHTML = (recentBookings || []).map(b => `
      <tr>
        <td><strong>${b.name}</strong></td>
        <td>${b.mobile}</td>
        <td>${b.pickup} → ${b.drop}</td>
        <td>${new Date(b.journeyDate).toLocaleDateString('en-IN')}</td>
        <td>${b.vehicleType.split(' ')[0]}</td>
        <td><span class="badge-status st-${b.status}">${b.status}</span></td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted py-3">No bookings yet</td></tr>';

  } catch (err) { toast(err.message, false); }
}

/* ════════════════════════════════════════════
   BOOKINGS
   ════════════════════════════════════════════ */
async function loadBookings(page = 1) {
  currentPage = page;
  const search = document.getElementById('bookingSearch').value;
  const status = document.getElementById('bookingFilter').value;
  let url = `/bookings?page=${page}&limit=15`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${status}`;

  try {
    const { data, total, pages } = await GET(url);
    document.getElementById('bookingCount').textContent = total;

    document.getElementById('bookingsTbl').innerHTML = data.map(b => `
      <tr>
        <td><small class="text-muted">${b._id.slice(-6)}</small></td>
        <td>${b.name}</td>
        <td>${b.mobile}</td>
        <td style="max-width:160px">${b.pickup} → ${b.drop}</td>
        <td>${new Date(b.journeyDate).toLocaleDateString('en-IN')}</td>
        <td>${b.vehicleType.split(' ')[0]}</td>
        <td><span class="badge-status st-${b.status}">${b.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="viewBooking('${b._id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2 ms-1" onclick="delBooking('${b._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center py-3 text-muted">No bookings found</td></tr>';

    // Pager
    const pager = document.getElementById('bookingPager');
    pager.innerHTML = '';
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = `btn btn-sm ${i === page ? 'btn-warning' : 'btn-outline-secondary'}`;
      btn.textContent = i;
      btn.onclick = () => loadBookings(i);
      pager.appendChild(btn);
    }
  } catch (err) { toast(err.message, false); }
}

async function viewBooking(id) {
  currentBookingId = id;
  try {
    const { data } = await GET(`/bookings/${id}`);
    const b = data;
    document.getElementById('bookingStatusUpdate').value = b.status;

    document.getElementById('bookingModalBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-6"><small class="text-muted d-block">Customer</small><strong>${b.name}</strong></div>
        <div class="col-md-6"><small class="text-muted d-block">Mobile</small>${b.mobile}</div>
        <div class="col-md-6"><small class="text-muted d-block">Pickup</small>${b.pickup}</div>
        <div class="col-md-6"><small class="text-muted d-block">Drop</small>${b.drop}</div>
        <div class="col-md-4"><small class="text-muted d-block">Date</small>${new Date(b.journeyDate).toLocaleDateString('en-IN')}</div>
        <div class="col-md-4"><small class="text-muted d-block">Time</small>${b.pickupTime}</div>
        <div class="col-md-4"><small class="text-muted d-block">Vehicle</small>${b.vehicleType.split(' ')[0]}</div>
        <div class="col-md-4"><small class="text-muted d-block">Trip Type</small>${b.tripType}</div>
        <div class="col-md-8"><small class="text-muted d-block">Special Instructions</small>${b.specialInstructions || '—'}</div>
        ${b.driverId ? `<div class="col-12"><small class="text-muted d-block">Assigned Driver</small><strong>${b.driverId.name}</strong> · ${b.driverId.phone} · ${b.driverId.vehicleNumber}</div>` : ''}
        ${b.adminNote ? `<div class="col-12"><small class="text-muted d-block">Admin Note</small>${b.adminNote}</div>` : ''}
      </div>`;

    // Populate drivers dropdown
    const { data: drivers } = await GET('/drivers?available=true');
    const sel = document.getElementById('assignDriverSelect');
    sel.innerHTML = '<option value="">Assign Driver…</option>' +
      drivers.map(d => `<option value="${d._id}">${d.name} – ${d.vehicleType.split(' ')[0]}</option>`).join('');

    bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
  } catch (err) { toast(err.message, false); }
}

async function saveBookingUpdate() {
  const status   = document.getElementById('bookingStatusUpdate').value;
  const driverId = document.getElementById('assignDriverSelect').value;
  try {
    await PATCH(`/bookings/${currentBookingId}`, { status });
    if (driverId) await PATCH(`/bookings/${currentBookingId}/assign-driver`, { driverId });
    toast('Booking updated successfully.');
    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
    loadBookings(currentPage);
    loadDashboard();
  } catch (err) { toast(err.message, false); }
}

async function delBooking(id) {
  if (!confirm('Delete this booking permanently?')) return;
  try {
    await DELETE(`/bookings/${id}`);
    toast('Booking deleted.'); loadBookings(currentPage);
  } catch (err) { toast(err.message, false); }
}

/* ════════════════════════════════════════════
   DRIVERS
   ════════════════════════════════════════════ */
async function loadDrivers() {
  try {
    const { data } = await GET('/drivers');
    document.getElementById('driversTbl').innerHTML = data.map(d => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.phone}</td>
        <td>${d.vehicleNumber}</td>
        <td>${d.vehicleType.split(' ')[0]}</td>
        <td><span class="badge-status ${d.isAvailable ? 'st-Confirmed' : 'st-Cancelled'}">${d.isAvailable ? 'Available' : 'On Trip'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="editDriver('${d._id}','${d.name}','${d.phone}','${d.vehicleNumber}','${d.vehicleType}','${d.licenseNumber||''}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2 ms-1" onclick="delDriver('${d._id}')"><i class="fas fa-trash"></i></button>
          <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" onclick="toggleAvailability('${d._id}',${d.isAvailable})"><i class="fas fa-sync"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center py-3 text-muted">No drivers added</td></tr>';
  } catch (err) { toast(err.message, false); }
}

function openDriverModal() {
  document.getElementById('driverModalTitle').textContent = 'Add Driver';
  ['driverId','driverName','driverPhone','driverVehicleNo','driverLicense'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('driverVehicleType').value = 'Sedan (Toyota Etios / Dzire)';
}

function editDriver(id, name, phone, vno, vtype, lic) {
  document.getElementById('driverModalTitle').textContent = 'Edit Driver';
  document.getElementById('driverId').value         = id;
  document.getElementById('driverName').value       = name;
  document.getElementById('driverPhone').value      = phone;
  document.getElementById('driverVehicleNo').value  = vno;
  document.getElementById('driverVehicleType').value = vtype;
  document.getElementById('driverLicense').value    = lic;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('driverModal')).show();
}

async function saveDriver() {
  const id      = document.getElementById('driverId').value;
  const payload = {
    name:          document.getElementById('driverName').value.trim(),
    phone:         document.getElementById('driverPhone').value.trim(),
    vehicleNumber: document.getElementById('driverVehicleNo').value.trim(),
    vehicleType:   document.getElementById('driverVehicleType').value,
    licenseNumber: document.getElementById('driverLicense').value.trim(),
  };
  try {
    if (id) await PATCH(`/drivers/${id}`, payload);
    else    await POST('/drivers', payload);
    toast('Driver saved successfully.');
    bootstrap.Modal.getInstance(document.getElementById('driverModal')).hide();
    loadDrivers();
  } catch (err) { toast(err.message, false); }
}

async function delDriver(id) {
  if (!confirm('Remove this driver?')) return;
  try { await DELETE(`/drivers/${id}`); toast('Driver removed.'); loadDrivers(); }
  catch (err) { toast(err.message, false); }
}

async function toggleAvailability(id, current) {
  try { await PATCH(`/drivers/${id}`, { isAvailable: !current }); loadDrivers(); }
  catch (err) { toast(err.message, false); }
}

/* ════════════════════════════════════════════
   PAYMENTS
   ════════════════════════════════════════════ */
async function loadPayments() {
  try {
    const [{ data: payments }, { data: rev }] = await Promise.all([GET('/payments'), GET('/payments/revenue')]);

    document.getElementById('revenueCards').innerHTML = [
      { l: 'Total Revenue',   v: rev.totalRevenue,   bg: '#F0FDF4', c: '#16A34A' },
      { l: "Today's Revenue", v: rev.todayRevenue,   bg: '#FFF7E6', c: '#F59E0B' },
      { l: 'This Week',       v: rev.weekRevenue,    bg: '#EFF6FF', c: '#3B82F6' },
      { l: 'This Month',      v: rev.monthRevenue,   bg: '#F5F3FF', c: '#8B5CF6' },
    ].map(r => `
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:${r.bg};color:${r.c}"><i class="fas fa-rupee-sign"></i></div>
          <div><div class="stat-val">₹${(r.v||0).toLocaleString('en-IN')}</div><div class="stat-lbl">${r.l}</div></div>
        </div>
      </div>`).join('');

    document.getElementById('paymentsTbl').innerHTML = payments.map(p => {
      const b = p.bookingId || {};
      return `<tr>
        <td><small class="text-muted">${(b._id||'').toString().slice(-6)||'—'}</small></td>
        <td>${b.name||'—'}</td>
        <td><strong>₹${(p.amount||0).toLocaleString('en-IN')}</strong></td>
        <td>${p.paymentMethod}</td>
        <td><span class="badge-status st-${p.paymentStatus}">${p.paymentStatus}</span></td>
        <td>${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center py-3 text-muted">No payments yet</td></tr>';
  } catch (err) { toast(err.message, false); }
}

/* ════════════════════════════════════════════
   CONTACTS
   ════════════════════════════════════════════ */
async function loadContacts() {
  const resolved = document.getElementById('contactFilter').value;
  let url = '/contacts';
  if (resolved !== '') url += `?resolved=${resolved}`;
  try {
    const { data } = await GET(url);
    document.getElementById('contactsTbl').innerHTML = data.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone||'—'}</td>
        <td>${c.subject||'—'}</td>
        <td style="max-width:200px">${c.message.slice(0,80)}${c.message.length>80?'…':''}</td>
        <td>${new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
        <td><span class="badge-status ${c.isResolved?'st-Completed':'st-Pending'}">${c.isResolved?'Resolved':'Open'}</span></td>
        <td>
          ${!c.isResolved ? `<button class="btn btn-sm btn-outline-success py-0 px-2" onclick="resolveContact('${c._id}')"><i class="fas fa-check"></i></button>` : ''}
          <button class="btn btn-sm btn-outline-danger py-0 px-2 ms-1" onclick="delContact('${c._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="text-center py-3 text-muted">No messages</td></tr>';
  } catch (err) { toast(err.message, false); }
}

async function resolveContact(id) {
  try { await PATCH(`/contacts/${id}`, { isResolved: true }); toast('Marked as resolved.'); loadContacts(); }
  catch (err) { toast(err.message, false); }
}

async function delContact(id) {
  if (!confirm('Delete this message?')) return;
  try { await DELETE(`/contacts/${id}`); toast('Message deleted.'); loadContacts(); }
  catch (err) { toast(err.message, false); }
}

/* ════════════════════════════════════════════
   REPORTS
   ════════════════════════════════════════════ */
async function loadReports() {
  try {
    const { data } = await GET('/bookings/reports');
    document.getElementById('reportCards').innerHTML = `
      <div class="col-12"><h6 class="fw-bold mb-3">Booking Statistics</h6></div>
      ${[
        {l:'Total Bookings',  v:data.totalBookings,  ic:'fa-calendar'},
        {l:'Today',           v:data.todayBookings,  ic:'fa-clock'},
        {l:'This Week',       v:data.weekBookings,   ic:'fa-calendar-week'},
        {l:'This Month',      v:data.monthBookings,  ic:'fa-calendar-alt'},
        {l:'Pending',         v:data.byStatus?.pending||0,   ic:'fa-hourglass-half'},
        {l:'Confirmed',       v:data.byStatus?.confirmed||0, ic:'fa-check-circle'},
        {l:'Cancelled',       v:data.byStatus?.cancelled||0, ic:'fa-times-circle'},
        {l:'Completed',       v:data.byStatus?.completed||0, ic:'fa-flag-checkered'},
      ].map(s=>`
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#F8FAFC;color:#6366F1"><i class="fas ${s.ic}"></i></div>
            <div><div class="stat-val">${s.v}</div><div class="stat-lbl">${s.l}</div></div>
          </div>
        </div>`).join('')}
      <div class="col-12 mt-3"><div class="card-box">
        <div class="card-box-header"><h6>Bookings by Vehicle Type</h6></div>
        <div class="table-responsive"><table><thead><tr><th>Vehicle</th><th>Bookings</th></tr></thead>
        <tbody>${(data.byVehicle||[]).map(v=>`<tr><td>${v._id||'—'}</td><td><strong>${v.count}</strong></td></tr>`).join('')||'<tr><td colspan="2" class="text-center text-muted py-3">No data</td></tr>'}</tbody>
        </table></div>
      </div></div>`;
  } catch (err) { toast(err.message, false); }
}
