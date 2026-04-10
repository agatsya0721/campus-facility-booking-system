const API_BASE =
  (window.CAMPUSBOOK_CONFIG && window.CAMPUSBOOK_CONFIG.apiBase) ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5002/api"
    : "https://your-backend-domain.example.com/api");
const TOKEN_KEY = "campusbook_token";
const USER_KEY = "campusbook_user";

const fallbackFacilities = [
  { id: 1, name: "Raman Hall", type: "classroom", emoji: "🏛️", bg: "#0d2035", cap: 120, loc: "Academic Block A", status: "available", usage: 20, features: ["Projector", "AC", "Mic"] },
  { id: 2, name: "Computer Lab 2", type: "lab", emoji: "💻", bg: "#0d2035", cap: 40, loc: "IT Block, F1", status: "partial", usage: 60, features: ["40 PCs", "Fast Internet", "AC"] },
  { id: 3, name: "Basketball Court", type: "sports", emoji: "🏀", bg: "#1a1005", cap: 22, loc: "Sports Complex", status: "occupied", usage: 95, features: ["Floodlights", "Scoreboard"] },
  { id: 4, name: "Sardar Patel Auditorium", type: "event", emoji: "🎭", bg: "#0d0d20", cap: 500, loc: "Central Campus", status: "available", usage: 10, features: ["Stage", "Sound System", "LED"] },
  { id: 5, name: "Naidu Hall", type: "classroom", emoji: "🎓", bg: "#10253c", cap: 100, loc: "Academic Block B", status: "available", usage: 25, features: ["Whiteboard", "AC", "Podium"] },
  { id: 6, name: "Chemistry Lab", type: "lab", emoji: "⚗️", bg: "#0d2035", cap: 30, loc: "Science Block, F1", status: "partial", usage: 50, features: ["Fume Hood", "Safety Kit"] },
  { id: 7, name: "Badminton Court", type: "sports", emoji: "🏸", bg: "#0a1a0a", cap: 8, loc: "Indoor Arena", status: "available", usage: 0, features: ["Indoor Court", "Equipment"] },
  { id: 8, name: "Conference Room B", type: "classroom", emoji: "💼", bg: "#100d20", cap: 20, loc: "Admin Block, F2", status: "available", usage: 30, features: ["Video Conf", "Whiteboard"] },
  { id: 9, name: "Pickleball Court", type: "sports", emoji: "🏓", bg: "#0f1a0f", cap: 4, loc: "Recreation Zone", status: "occupied", usage: 100, features: ["Paddle Storage", "Lights"] },
  { id: 10, name: "Volleyball Court", type: "sports", emoji: "🏐", bg: "#0a1a0a", cap: 12, loc: "Outdoor Courts", status: "available", usage: 15, features: ["Net Setup", "Seating"] },
  { id: 11, name: "Lawn Tennis Court", type: "sports", emoji: "🎾", bg: "#0d2035", cap: 4, loc: "West Ground", status: "partial", usage: 45, features: ["Night Lights", "Equipment"] },
  { id: 12, name: "Football Ground", type: "sports", emoji: "⚽", bg: "#0a150a", cap: 22, loc: "Main Sports Field", status: "available", usage: 5, features: ["Open Field", "Goal Posts", "Floodlights"] }
];

let facilities = [...fallbackFacilities];
let myBookings = [];
let adminBookings = [];
let selectedSlots = [];
let currentFilter = "all";
let facilitySearchQuery = "";
let authMode = "login";
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
let authToken = localStorage.getItem(TOKEN_KEY) || "";
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let adminRefreshTimer = null;

const allSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

const normalizeFacilityType = (type) => {
  if (type === "auditorium" || type === "event") return "event";
  if (type === "room") return "classroom";
  return type;
};

const pickVisual = (type, name) => {
  if (name.toLowerCase().includes("auditorium")) return { emoji: "🎭", bg: "#0d0d20" };
  if (type === "lab") return { emoji: "💻", bg: "#0d2035" };
  if (type === "sports") return { emoji: "🏟️", bg: "#0a1a0a" };
  if (type === "event") return { emoji: "🎪", bg: "#0d0d20" };
  return { emoji: "🏛️", bg: "#10253c" };
};

const sortSlots = (slots) => [...slots].sort((a, b) => allSlots.indexOf(a) - allSlots.indexOf(b));

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

async function loadAnnouncement() {
  try {
    const payload = await apiFetch("/announcements", { headers: {} });
    const announcement = payload.data;
    if (!announcement) return;

    const strip = document.getElementById("eventStrip");
    const link = document.getElementById("eventStripLink");
    const messageText = announcement.message || "";
    const fallbackLinkMatch = messageText.match(/https?:\/\/\S+/i);
    const fallbackLink = fallbackLinkMatch ? fallbackLinkMatch[0] : "";
    const activeLink = announcement.link_url || fallbackLink;
    document.getElementById("eventStripTitle").textContent = announcement.title;
    document.getElementById("eventStripMessage").textContent = announcement.message;
    document.getElementById("eventStripUpdated").textContent = `Updated ${new Date(announcement.updated_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;

    if (activeLink) {
      strip.style.cursor = "pointer";
      strip.onclick = () => window.open(activeLink, "_blank", "noopener");
      link.style.display = "inline-block";
      link.href = activeLink;
      link.textContent = "Open event link";
    } else {
      strip.style.cursor = "default";
      strip.onclick = null;
      link.style.display = "none";
      link.removeAttribute("href");
    }
  } catch (_error) {
    // Keep the fallback strip text if the API is unavailable.
  }
}

function transformFacility(raw) {
  const type = normalizeFacilityType(raw.type);
  const visual = pickVisual(type, raw.name);
  return {
    id: Number(raw.id),
    name: raw.name,
    type,
    emoji: visual.emoji,
    bg: visual.bg,
    cap: raw.capacity,
    loc: raw.location,
    status: raw.is_active ? "available" : "occupied",
    usage: Math.min(95, Math.max(10, Math.round((Number(raw.capacity) || 20) / 5))),
    features: Array.isArray(raw.amenities) && raw.amenities.length ? raw.amenities : ["Bookable"]
  };
}

function populateFacilityOptions() {
  const select = document.getElementById("bookFacility");
  const current = select.value;
  select.innerHTML = ['<option value="">-- Choose a facility --</option>']
    .concat(facilities.map((f) => `<option value="${f.id}">${f.name} (Cap: ${f.cap})</option>`))
    .join("");
  if (facilities.some((f) => String(f.id) === current)) select.value = current;
}

function renderFacilities(filter) {
  const normalizedQuery = facilitySearchQuery.trim().toLowerCase();
  const filtered = facilities.filter((f) => {
    const matchesType = filter === "all" ? true : f.type === filter;
    const matchesSearch = !normalizedQuery
      ? true
      : [f.name, f.type, f.loc].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesType && matchesSearch;
  });
  const grid = document.getElementById("facilitiesGrid");
  const statusLabel = { available: "Available", partial: "Partially Booked", occupied: "Occupied" };
  if (!filtered.length) {
    grid.innerHTML = `<div class="booking-item" style="grid-column:1/-1;"><div class="booking-info"><h4>No venues found</h4><p>Try a different facility name, location, or category.</p></div></div>`;
    return;
  }
  grid.innerHTML = filtered.map((f) => {
    const barClass = f.usage < 40 ? "green" : f.usage < 75 ? "yellow" : "red";
    return `<div class="facility-card" onclick="quickBook(${f.id})">
      <div class="facility-img" style="background:${f.bg};">${f.emoji}</div>
      <div class="facility-body">
        <div class="facility-name">${f.name}</div>
        <div class="facility-meta"><span>👥 Cap: ${f.cap}</span><span>📍 ${f.loc}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${f.features.map((x) => `<span style="background:var(--surface2);border:1px solid var(--border);padding:3px 9px;border-radius:5px;font-size:0.7rem;color:var(--muted)">${x}</span>`).join("")}</div>
        <div class="facility-footer">
          <div class="capacity-bar"><div class="capacity-label">Usage: ${f.usage}%</div><div class="bar-track"><div class="bar-fill ${barClass}" style="width:${f.usage}%"></div></div></div>
          <div class="status-badge ${f.status}"><div class="status-dot"></div>${statusLabel[f.status]}</div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function filterFacilities(type, btn) {
  currentFilter = type;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  btn.classList.add("active");
  renderFacilities(type);
}

function handleFacilitySearch() {
  facilitySearchQuery = document.getElementById("facilitySearch").value;
  renderFacilities(currentFilter);
}

function quickBook(facilityId) {
  document.getElementById("bookFacility").value = String(facilityId);
  updateConfirm();
  scrollToSection("book");
}

function renderSlots() {
  document.getElementById("timeSlots").innerHTML = allSlots.map((slot) => {
    const selected = selectedSlots.includes(slot);
    return `<div class="slot ${selected ? "selected" : "avail"}" onclick="toggleSlot('${slot}', false)">${slot}</div>`;
  }).join("");
}

function toggleSlot(slot) {
  const index = selectedSlots.indexOf(slot);
  if (index > -1) selectedSlots.splice(index, 1);
  else selectedSlots.push(slot);
  renderSlots();
  updateConfirm();
}

function renderCalendar() {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById("calMonthTitle").textContent = `${months[calMonth]} ${calYear}`;
  const selectedDate = document.getElementById("bookDate").value;
  const selectedDay = selectedDate ? Number(selectedDate.split("-")[2]) : null;
  const bookedDays = new Set(myBookings.map((b) => new Date(b.rawStart || b.date).getDate()));
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  let html = days.map((d) => `<div class="cal-day-name">${d}</div>`).join("");
  for (let i = 0; i < firstDay; i += 1) html += '<div class="cal-day empty"></div>';
  for (let day = 1; day <= daysInMonth; day += 1) {
    const today = new Date();
    const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
    html += `<div class="cal-day${isToday ? " today" : ""}${bookedDays.has(day) ? " has-booking" : ""}${selectedDay === day ? " selected" : ""}" onclick="selectCalDay(${day}, event)">${day}</div>`;
  }
  document.getElementById("calGrid").innerHTML = html;
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear += 1; }
  if (calMonth < 0) { calMonth = 11; calYear -= 1; }
  renderCalendar();
}

function selectCalDay(day, ev) {
  document.getElementById("bookDate").value = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  document.querySelectorAll(".cal-day").forEach((node) => node.classList.remove("selected"));
  ev.target.classList.add("selected");
  updateConfirm();
}

function updateConfirm() {
  const facilityId = document.getElementById("bookFacility").value;
  const facility = facilities.find((f) => String(f.id) === facilityId);
  const date = document.getElementById("bookDate").value;
  document.getElementById("cf-facility").textContent = facility ? facility.name : "--";
  document.getElementById("cf-date").textContent = date ? new Date(`${date}T12:00:00`).toDateString() : "--";
  document.getElementById("cf-time").textContent = selectedSlots.length ? sortSlots(selectedSlots).join(", ") : "--";
  document.getElementById("cf-name").textContent = document.getElementById("bookName").value || (currentUser ? currentUser.name : "--");
}

function renderMyBookings() {
  const list = document.getElementById("myBookingsList");
  if (!authToken) {
    list.innerHTML = `<div class="booking-item"><div class="booking-info"><h4>Log in to view your bookings</h4><p>The page is ready to use the live backend once you sign in.</p></div><div class="booking-actions"><button class="btn btn-primary btn-sm" onclick="openModal('login')">Log In</button></div></div>`;
    return;
  }
  if (!myBookings.length) {
    list.innerHTML = `<div class="booking-item"><div class="booking-info"><h4>No bookings yet</h4><p>Your bookings will appear here after you reserve a facility.</p></div></div>`;
    return;
  }
  list.innerHTML = myBookings.map((b) => `<div class="booking-item">
    <div class="booking-icon">${b.emoji}</div>
    <div class="booking-info"><h4>${b.facility} <span style="font-size:0.75rem;color:var(--muted);font-family:'DM Sans',sans-serif;font-weight:400">#${b.id}</span></h4><p>📅 ${b.date} &nbsp;·&nbsp; ⏰ ${b.time} &nbsp;·&nbsp; 👤 ${b.by}</p></div>
    <span class="status-badge ${b.status === "confirmed" ? "available" : "partial"}" style="margin-right:12px"><div class="status-dot"></div>${b.status === "confirmed" ? "Confirmed" : b.status}</span>
    <div class="booking-actions"><button class="btn btn-outline btn-sm" onclick="cancelBooking(${b.id})">Cancel</button></div>
  </div>`).join("");
}

function adminBadgeClass(status) {
  if (status === "confirmed") return "available";
  if (status === "pending") return "pending";
  return "partial";
}

function adminStatusLabel(status) {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function renderAdminDashboard() {
  const adminSection = document.getElementById("admin-dashboard");
  const pendingList = document.getElementById("adminPendingList");
  const allList = document.getElementById("adminAllBookingsList");

  if (!currentUser || currentUser.role !== "admin" || !authToken) {
    adminSection.style.display = "none";
    pendingList.innerHTML = "";
    allList.innerHTML = "";
    return;
  }

  adminSection.style.display = "block";

  const pending = adminBookings.filter((booking) => booking.status === "pending");
  const confirmed = adminBookings.filter((booking) => booking.status === "confirmed");
  const cancelled = adminBookings.filter((booking) => booking.status === "cancelled");

  document.getElementById("adminPendingCount").textContent = pending.length;
  document.getElementById("adminConfirmedCount").textContent = confirmed.length;
  document.getElementById("adminCancelledCount").textContent = cancelled.length;
  document.getElementById("adminLastSync").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  pendingList.innerHTML = pending.length
    ? pending.map((booking) => `<div class="booking-item">
        <div class="booking-icon">${booking.emoji}</div>
        <div class="booking-info">
          <h4>${booking.facility} <span style="font-size:0.75rem;color:var(--muted);font-family:'DM Sans',sans-serif;font-weight:400">#${booking.id}</span></h4>
          <p>📅 ${booking.date} &nbsp;·&nbsp; ⏰ ${booking.time} &nbsp;·&nbsp; 👤 ${booking.by}</p>
        </div>
        <span class="status-badge pending" style="margin-right:12px"><div class="status-dot"></div>Pending</span>
        <div class="booking-actions">
          <button class="btn btn-success btn-sm" onclick="approveBooking(${booking.id})">Approve</button>
          <button class="btn btn-ghost btn-sm" style="border-color:rgba(252,129,129,0.35);color:var(--danger);" onclick="rejectBooking(${booking.id})">Reject</button>
        </div>
      </div>`).join("")
    : `<div class="booking-item"><div class="booking-info"><h4>No pending requests</h4><p>New requests will show up here automatically while you are logged in as admin.</p></div></div>`;

  allList.innerHTML = adminBookings.length
    ? adminBookings.map((booking) => `<div class="booking-item">
        <div class="booking-icon">${booking.emoji}</div>
        <div class="booking-info">
          <h4>${booking.facility} <span style="font-size:0.75rem;color:var(--muted);font-family:'DM Sans',sans-serif;font-weight:400">#${booking.id}</span></h4>
          <p>📅 ${booking.date} &nbsp;·&nbsp; ⏰ ${booking.time} &nbsp;·&nbsp; 👤 ${booking.by}</p>
        </div>
        <span class="status-badge ${adminBadgeClass(booking.status)}" style="margin-right:12px"><div class="status-dot"></div>${adminStatusLabel(booking.status)}</span>
        <div class="booking-actions">
          ${booking.status !== "confirmed" ? `<button class="btn btn-success btn-sm" onclick="approveBooking(${booking.id})">Accept</button>` : ""}
          ${booking.status !== "cancelled" ? `<button class="btn btn-ghost btn-sm" style="border-color:rgba(252,129,129,0.35);color:var(--danger);" onclick="rejectBooking(${booking.id})">Reject</button>` : ""}
          <button class="btn btn-ghost btn-sm" onclick="deleteBookingAdmin(${booking.id})">Delete</button>
        </div>
      </div>`).join("")
    : `<div class="booking-item"><div class="booking-info"><h4>No bookings found</h4><p>Accepted, pending, and cancelled bookings will appear here for admin review.</p></div></div>`;
}

function renderAuthUi() {
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const profileMenu = document.getElementById("profileMenu");
  const profileName = document.getElementById("profileName");
  const profileRole = document.getElementById("profileRole");
  const adminNavLink = document.getElementById("adminNavLink");

  if (currentUser && authToken) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    profileMenu.style.display = "flex";
    profileName.textContent = currentUser.name;
    profileRole.textContent = `${currentUser.role} · ${currentUser.department}`;
    adminNavLink.style.display = "none";
  } else {
    loginBtn.style.display = "inline-flex";
    signupBtn.style.display = "inline-flex";
    profileMenu.style.display = "none";
    profileName.textContent = "User";
    profileRole.textContent = "role";
    adminNavLink.style.display = "none";
  }
}

function toBookingCard(booking) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  return {
    id: booking.id,
    facility: booking.facility_name || "Facility",
    date: start.toDateString(),
    time: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    by: currentUser ? `${currentUser.name} / ${currentUser.department}` : "Current User",
    emoji: booking.status === "confirmed" ? "✅" : "🕒",
    status: booking.status,
    rawStart: booking.start_time
  };
}

async function loadFacilities() {
  try {
    const payload = await apiFetch("/facilities", { headers: {} });
    facilities = payload.data.map(transformFacility);
  } catch (_error) {
    facilities = [...fallbackFacilities];
  }
  populateFacilityOptions();
  renderFacilities(currentFilter);
  updateConfirm();
}

async function loadMyBookings() {
  if (!authToken) {
    myBookings = [];
    adminBookings = [];
    renderMyBookings();
    renderAdminDashboard();
    renderCalendar();
    return;
  }
  try {
    const payload = await apiFetch("/bookings");
    adminBookings = currentUser && currentUser.role === "admin" ? payload.data.map(toBookingCard) : [];
    myBookings = currentUser && currentUser.role === "admin"
      ? payload.data.filter((booking) => booking.user_email === currentUser.email).map(toBookingCard)
      : payload.data.map(toBookingCard);
  } catch (error) {
    myBookings = [];
    adminBookings = [];
    showToast(error.message, "#fc8181");
  }
  renderMyBookings();
  renderAdminDashboard();
  renderCalendar();
}

async function confirmBooking() {
  if (!authToken) {
    showToast("Log in before booking a facility.", "#f6ad55");
    openModal("login");
    return;
  }
  const facilityId = Number(document.getElementById("bookFacility").value);
  const date = document.getElementById("bookDate").value;
  if (!facilityId || !date || !selectedSlots.length) {
    showToast("Please choose a facility, date, and at least one time slot.", "#f6ad55");
    return;
  }
  const slots = sortSlots(selectedSlots);
  const startSlot = slots[0];
  const endIndex = Math.min(allSlots.indexOf(slots[slots.length - 1]) + 1, allSlots.length - 1);
  try {
    await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({
        facilityId,
        startTime: new Date(`${date}T${startSlot}:00`).toISOString(),
        endTime: new Date(`${date}T${allSlots[endIndex]}:00`).toISOString(),
        purpose: document.getElementById("bookPurpose").value.trim() || "Facility booking",
        notes: document.getElementById("bookName").value.trim(),
        requiresApproval: currentUser.role === "student"
      })
    });
    selectedSlots = [];
    document.getElementById("bookPurpose").value = "";
    renderSlots();
    updateConfirm();
    showToast(currentUser.role === "student" ? "Booking request submitted for admin approval." : "Booking confirmed successfully.");
    await loadMyBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function cancelBooking(id) {
  try {
    await apiFetch(`/bookings/${id}`, { method: "DELETE" });
    showToast("Booking cancelled.", "#fc8181");
    await loadMyBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function refreshAdminBookings() {
  return;
}

async function approveBooking(id) {
  return;
}

async function rejectBooking(id) {
  return;
}

async function deleteBookingAdmin(id) {
  return;
}

function renderHeatmap() {
  const hours = ["8-9", "9-10", "10-11", "11-12", "12-13", "13-14", "14-15", "15-16"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 3, 4, 4, 3, 3, 2], [1, 2, 4, 4, 3, 2, 2, 1], [0, 1, 2, 3, 4, 4, 3, 2], [1, 2, 3, 3, 2, 1, 0, 0], [0, 0, 1, 2, 2, 1, 0, 0], [0, 0, 0, 1, 1, 0, 0, 0]];
  let html = "<div></div>" + hours.map((h) => `<div class="heatmap-col-label">${h}</div>`).join("");
  days.forEach((day, index) => {
    html += `<div class="heatmap-label">${day}</div>`;
    html += data[index].map((value) => `<div class="heatmap-cell h${value}" title="${["Low", "Moderate", "High", "Very High", "Peak"][value]}"></div>`).join("");
  });
  document.getElementById("heatmapGrid").innerHTML = html;
}

function clearAuthForm() {
  document.getElementById("authName").value = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
  document.getElementById("authDepartment").value = "";
  document.getElementById("authRole").value = "student";
}

function setSession(user, token) {
  currentUser = user;
  authToken = token;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
  document.getElementById("bookName").value = `${user.name} / ${user.department}`;
  if (adminRefreshTimer) {
    clearInterval(adminRefreshTimer);
    adminRefreshTimer = null;
  }
  renderAuthUi();
  updateConfirm();
}

function logout() {
  currentUser = null;
  authToken = "";
  myBookings = [];
  adminBookings = [];
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById("bookName").value = "";
  if (adminRefreshTimer) {
    clearInterval(adminRefreshTimer);
    adminRefreshTimer = null;
  }
  renderAuthUi();
  renderMyBookings();
  renderAdminDashboard();
  renderCalendar();
  updateConfirm();
  showToast("Logged out.");
}

function openModal(type) {
  authMode = type;
  document.getElementById("modalTitle").textContent = type === "login" ? "Log In" : "Create Account";
  document.getElementById("modalDesc").textContent = type === "login" ? "Access your account to manage bookings and view your schedule." : "Join Unicentri to start reserving facilities instantly.";
  document.getElementById("authNameGroup").style.display = type === "login" ? "none" : "block";
  document.getElementById("authDepartmentGroup").style.display = type === "login" ? "none" : "block";
  document.getElementById("authRoleGroup").style.display = type === "login" ? "none" : "block";
  document.getElementById("authSubmitBtn").textContent = type === "login" ? "Log In" : "Create Account";
  clearAuthForm();
  document.getElementById("modalOverlay").classList.add("active");
}

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  if (!email || !password) {
    showToast("Email and password are required.", "#f6ad55");
    return;
  }
  try {
    const payload = authMode === "login"
      ? await apiFetch("/auth/login", { method: "POST", headers: {}, body: JSON.stringify({ email, password }) })
      : await apiFetch("/auth/register", {
          method: "POST",
          headers: {},
          body: JSON.stringify({
            name: document.getElementById("authName").value.trim(),
            email,
            password,
            department: document.getElementById("authDepartment").value.trim(),
            role: document.getElementById("authRole").value
          })
        });
    setSession(payload.data.user, payload.data.token);
    document.getElementById("modalOverlay").classList.remove("active");
    showToast(authMode === "login" ? "Logged in successfully." : "Account created successfully.");
    if (payload.data.user.role === "admin") {
      window.location.href = "campusbook_admin.html";
      return;
    }
    await loadMyBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

function closeModal(e) {
  if (e.target === document.getElementById("modalOverlay")) {
    document.getElementById("modalOverlay").classList.remove("active");
  }
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(msg, color) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.background = color || "#68d391";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.1 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
document.getElementById("bookDate").min = new Date().toISOString().split("T")[0];

(async function init() {
  if (currentUser && currentUser.role === "admin" && authToken) {
    window.location.href = "campusbook_admin.html";
    return;
  }
  if (currentUser) {
    document.getElementById("bookName").value = `${currentUser.name} / ${currentUser.department}`;
  }
  renderAuthUi();
  populateFacilityOptions();
  renderFacilities("all");
  renderSlots();
  renderMyBookings();
  renderAdminDashboard();
  renderCalendar();
  renderHeatmap();
  await loadAnnouncement();
  await loadFacilities();
  await loadMyBookings();
})();
