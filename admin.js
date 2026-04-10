const ADMIN_API_BASE =
  (window.CAMPUSBOOK_CONFIG && window.CAMPUSBOOK_CONFIG.apiBase) ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5002/api"
    : "https://your-backend-domain.example.com/api");

const TOKEN_KEY = "campusbook_token";
const USER_KEY = "campusbook_user";

let authToken = localStorage.getItem(TOKEN_KEY) || "";
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
let adminBookings = [];
let refreshTimer = null;

async function loadAnnouncementEditor() {
  try {
    const payload = await apiFetch("/announcements");
    const announcement = payload.data;
    if (!announcement) return;
    document.getElementById("announcementTitle").value = announcement.title || "";
    document.getElementById("announcementMessage").value = announcement.message || "";
    document.getElementById("announcementLink").value = announcement.link_url || "";
  } catch (_error) {
    // Keep editor empty if the fetch fails.
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${ADMIN_API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

function bookingEmoji(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("auditorium")) return "🎭";
  if (lower.includes("hall")) return "🏛️";
  if (lower.includes("lab")) return "💻";
  if (lower.includes("court")) return "🏟️";
  if (lower.includes("ground")) return "⚽";
  return "📍";
}

function formatBooking(booking) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  return {
    id: booking.id,
    facility: booking.facility_name || "Facility",
    by: booking.user_name || booking.user_email || "User",
    dept: booking.user_email || "",
    date: start.toDateString(),
    time: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    purpose: booking.purpose || "No purpose provided.",
    status: booking.status,
    emoji: bookingEmoji(booking.facility_name || "")
  };
}

function showToast(message, color) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = color || "#68d391";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function updateStats() {
  const pending = adminBookings.filter((booking) => booking.status === "pending").length;
  const approved = adminBookings.filter((booking) => booking.status === "confirmed").length;
  const rejected = adminBookings.filter((booking) => booking.status === "cancelled").length;

  document.getElementById("statPending").textContent = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statRejected").textContent = rejected;
  document.getElementById("adminLastSync").textContent = `Last synced at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function renderAdminBookings() {
  const list = document.getElementById("adminRequestsList");

  if (!adminBookings.length) {
    list.innerHTML = `<div class="empty-state">No requests found yet.</div>`;
    updateStats();
    return;
  }

  const ordered = [
    ...adminBookings.filter((booking) => booking.status === "pending"),
    ...adminBookings.filter((booking) => booking.status !== "pending")
  ];

  list.innerHTML = ordered.map((booking) => {
    const statusClass = booking.status === "confirmed" ? "approved" : booking.status === "cancelled" ? "rejected" : "pending";
    const statusLabel = booking.status === "confirmed" ? "Approved" : booking.status === "cancelled" ? "Rejected" : "Pending";
    return `<div class="request-card ${statusClass}">
      <div class="request-top">
        <div>
          <h4>${booking.emoji} ${booking.facility} <span style="font-size:0.72rem;color:var(--muted);font-family:'DM Sans',sans-serif;font-weight:400">#${booking.id}</span></h4>
          <div class="request-sub">Requested by <strong style="color:var(--text)">${booking.by}</strong> ${booking.dept ? `· ${booking.dept}` : ""}</div>
          <div class="request-meta">
            <span>📅 ${booking.date}</span>
            <span>⏰ ${booking.time}</span>
          </div>
        </div>
        <span class="status-badge ${statusClass}"><span class="status-dot"></span>${statusLabel}</span>
      </div>
      <div class="request-purpose">📝 <strong>Purpose:</strong> ${booking.purpose}</div>
      <div class="request-actions">
        ${booking.status !== "confirmed" ? `<button class="btn btn-success btn-sm" onclick="approveRequest(${booking.id})">Approve</button>` : ""}
        ${booking.status !== "cancelled" ? `<button class="btn btn-danger btn-sm" onclick="rejectRequest(${booking.id})">Reject</button>` : ""}
        <button class="btn btn-ghost btn-sm" onclick="deleteRequest(${booking.id})">Delete</button>
      </div>
    </div>`;
  }).join("");

  updateStats();
}

async function loadAdminBookings() {
  try {
    const payload = await apiFetch("/bookings");
    adminBookings = payload.data.map(formatBooking);
    renderAdminBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function approveRequest(id) {
  try {
    await apiFetch(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed" })
    });
    showToast("Request approved.");
    await loadAdminBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function rejectRequest(id) {
  try {
    await apiFetch(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" })
    });
    showToast("Request rejected.", "#fc8181");
    await loadAdminBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function deleteRequest(id) {
  try {
    await apiFetch(`/bookings/${id}`, { method: "DELETE" });
    showToast("Request deleted.", "#fc8181");
    await loadAdminBookings();
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

async function saveAnnouncement() {
  const title = document.getElementById("announcementTitle").value.trim();
  const message = document.getElementById("announcementMessage").value.trim();
  const rawLink = document.getElementById("announcementLink").value.trim();
  const inlineLinkMatch = message.match(/https?:\/\/\S+/i);
  const linkUrl = rawLink || (inlineLinkMatch ? inlineLinkMatch[0] : "");

  if (!title || !message) {
    showToast("Title and message are required.", "#fc8181");
    return;
  }

  try {
    await apiFetch("/announcements", {
      method: "PUT",
      body: JSON.stringify({
        title,
        message,
        linkUrl,
        isActive: true
      })
    });
    showToast("Student event strip updated.");
  } catch (error) {
    showToast(error.message, "#fc8181");
  }
}

function returnToHome() {
  window.location.href = "index.html";
}

function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "index.html";
}

(async function initAdmin() {
  if (!currentUser || !authToken || currentUser.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("adminProfileName").textContent = currentUser.name;
  document.getElementById("adminProfileMeta").textContent = `${currentUser.role} · ${currentUser.department}`;

  await loadAnnouncementEditor();
  await loadAdminBookings();
  refreshTimer = setInterval(() => {
    loadAdminBookings().catch(() => {});
  }, 8000);

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
  });
})();
