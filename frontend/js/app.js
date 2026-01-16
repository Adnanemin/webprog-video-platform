const USE_FAKE_DATA = false; // use backend when available (fallback to local if it fails)

// Frontend is served from the VirtualHost (DocumentRoot = frontend/).
// Backend API is exposed at: http://webprog-video-platform.local/api/...
const API_BASE = window.location.pathname.includes("/webprog-video-platform/")
  ? "/webprog-video-platform/backend/api"
  : "/api";

// ---------- API helpers ----------
async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}/${path}`, window.location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function apiPostForm(path, formObj = {}) {
  const body = new URLSearchParams();
  Object.entries(formObj).forEach(([k, v]) => body.set(k, v));

  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "include"
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function normalizeVideoFromBackend(v) {
  if (!v) return null;
  return {
    id: Number(v.id),
    title: v.title ?? "Untitled",
    description: v.description ?? "",
    file_path: v.video_path ?? v.file_path ?? "",
    category: v.category_name ?? v.category ?? "Uncategorized",
    thumb_path: v.thumbnail_path ?? v.thumb_path ?? "thumbnails/placeholder.png"
  };
}

const VIDEOS = [
  {
    id: 1,
    title: "Bird",
    description: "Bird sitting on a branch.",
    file_path: "videos/bird.mp4",
    category: "Nature",
    thumb_path: "thumbnails/bird.png"
  },
  {
    id: 2,
    title: "Calming Nature Video",
    description: "Video of a calming river flowing.",
    file_path: "videos/nature.mp4",
    category: "Nature",
    thumb_path: "thumbnails/nature.png"
  },
  {
    id: 3,
    title: "Ocean",
    description: ".",
    file_path: "videos/ocean.mp4",
    category: "Nature",
    thumb_path: "thumbnails/ocean.png"
  },
  {
    id: 4,
    title: "Snowy Landscape",
    description: "Video of a snowy landscape.",
    file_path: "videos/snow.mp4",
    category: "Nature",
    thumb_path: "thumbnails/snow.png"
  },
  {
    id: 5,
    title: "Solar System",
    description: "A solar system visualization.",
    file_path: "videos/space.mp4",
    category: "Science",
    thumb_path: "thumbnails/space.png"
  },
  {
    id: 6,
    title: "Cute Turtle",
    description: "Cute turtle swimming.",
    file_path: "videos/turtle.mp4",
    category: "Nature",
    thumb_path: "thumbnails/turtle.png"
  },
  {
    id: 7,
    title: "Waves",
    description: ".",
    file_path: "videos/waves.mp4",
    category: "Nature",
    thumb_path: "thumbnails/waves.png"
  }
];

// ---------- Watch history (frontend demo using localStorage) ----------
const HISTORY_KEY = "wetube_watch_history";
const HISTORY_LIMIT = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

async function addToHistory(video) {
  if (!video || video.id == null) return;

  const now = new Date();
  const entry = {
    video_id: video.id,
    title: video.title || "Untitled",
    watched_at: now.toISOString()
  };

  // Dedupe by video_id: keep newest at the top
  const prev = loadHistory().filter(h => h.video_id !== entry.video_id);
  const next = [entry, ...prev].slice(0, HISTORY_LIMIT);
  saveHistory(next);

  // Backend logging (requires login; guests will get 403)
  if (!USE_FAKE_DATA) {
    const r = await apiPostForm("history_add.php", { video_id: String(video.id) });
    // Guests/not-logged-in will get 403; ignore that silently
    if (!r.ok && r.status !== 403 && r.status !== 401) {
      console.warn("history_add failed", r.status, r.json);
    }
  }
}

function formatHistoryDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Utilities ----------
function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(str, max = 90) {
  const s = String(str ?? "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ---------- Data layer ----------
async function getVideosList(query = "") {
  if (USE_FAKE_DATA) return VIDEOS;

  // Folder-based listing endpoint (backend scans frontend/videos + frontend/thumbnails)
  const { ok, json } = await apiGet("media_list.php");

  const list = (json && Array.isArray(json.videos) && json.videos) || null;
  if (!ok || !list) return VIDEOS; // fallback

  const normalized = list.map(normalizeVideoFromBackend).filter(Boolean);
  const q = String(query || "").trim().toLowerCase();
  if (!q) return normalized;

  // Simple client-side search over the returned list
  return normalized.filter(v =>
    (v.title || "").toLowerCase().includes(q) ||
    (v.description || "").toLowerCase().includes(q) ||
    (v.category || "").toLowerCase().includes(q)
  );
}

async function getVideoDetailById(id) {
  const vid = Number(id);
  if (!Number.isFinite(vid)) return null;

  if (USE_FAKE_DATA) return VIDEOS.find((v) => v.id === vid) || null;

  // Try backend detail endpoint
  const { ok, json } = await apiGet("video_detail.php", { id: String(vid) });

  const raw =
    (json && json.video && typeof json.video === "object" && json.video) ||
    (json && json.data && typeof json.data === "object" && json.data) ||
    null;

  if (ok && raw) return normalizeVideoFromBackend(raw);

  // Fallback: ask list and find
  const all = await getVideosList();
  return all.find((v) => v.id === vid) || null;
}

// ---------- Rendering ----------
function renderVideosGrid(videos) {
  const grid = qs("videosGrid");
  const empty = qs("emptyState");
  if (!grid) return;

  grid.innerHTML = "";

  if (!videos || videos.length === 0) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  for (const v of videos) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card__thumbWrap">
        <img
          class="card__thumb"
          src="${v.thumb_path || 'thumbnails/placeholder.png'}"
          alt="${escapeHtml(v.title)} thumbnail"
          onerror="this.src='thumbnails/placeholder.png';"
        />
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(v.title)}</h3>
        <p class="card__desc">${escapeHtml(truncate(v.description, 120))}</p>
      </div>
      <div class="card__footer">
        <span class="badge">${escapeHtml(v.category || "Uncategorized")}</span>
        <a class="btn" href="video.html?id=${encodeURIComponent(v.id)}">Watch</a>
      </div>
    `;
    grid.appendChild(card);
  }
}

// ---------- Page init: index.html ----------
async function initIndexPage() {
  const searchInput = qs("searchInput");
  let allVideos = await getVideosList();
  renderVideosGrid(allVideos);

  if (!searchInput) return;

  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim();

    if (!USE_FAKE_DATA) {
      allVideos = await getVideosList(q);
      renderVideosGrid(allVideos);
      return;
    }

    const qLower = q.toLowerCase();
    const filtered = allVideos.filter(
      (v) =>
        (v.title || "").toLowerCase().includes(qLower) ||
        (v.description || "").toLowerCase().includes(qLower) ||
        (v.category || "").toLowerCase().includes(qLower)
    );
    renderVideosGrid(filtered);
  });
}

// ---------- Page init: video.html (Option A demo mode) ----------
async function initVideoPage() {
  const id = getQueryParam("id");

  const titleEl = qs("videoTitle");
  const descEl = qs("videoDesc");
  const playerEl = qs("videoPlayer");
  const noticeEl = qs("demoNotice");
  const placeholderEl = qs("demoPlaceholder");

  const video = await getVideoDetailById(id);

  if (!video) {
    if (titleEl) titleEl.textContent = "Video not found";
    if (descEl) descEl.textContent = "The requested video does not exist.";

    if (playerEl) playerEl.classList.add("hidden");
    if (placeholderEl) placeholderEl.classList.add("hidden");

    if (noticeEl) {
      noticeEl.classList.remove("hidden");
      noticeEl.textContent = "Demo mode: no video available for this id.";
    }
    return;
  }

  if (titleEl) titleEl.textContent = video.title || "Untitled";
  if (descEl) descEl.textContent = video.description || "";

  // Real mode: show player, hide placeholder/notice
  if (noticeEl) noticeEl.classList.add("hidden");
  if (placeholderEl) placeholderEl.classList.add("hidden");

  const sourceEl = qs("videoSource");
  if (sourceEl) {
    sourceEl.src = video.file_path;
    if (playerEl) playerEl.load();
  } else if (playerEl){
    playerEl.src =video.file_path;
    playerEl.load();
  }
  if (playerEl) playerEl.classList.remove("hidden");

  // Record watch history (demo)
  await addToHistory(video);
}

// ---------- Page init: history.html ----------
async function initHistoryPage() {
  const tbody = qs("historyTbody");
  if (!tbody) return;

  // Prefer backend history when available
  let items = loadHistory();
  if (!USE_FAKE_DATA) {
    const { ok, status, json } = await apiGet("history_list.php", { limit: String(HISTORY_LIMIT) });
    const rows = (json && Array.isArray(json.history) && json.history) || null;

    if (ok && rows) {
      items = rows.map(r => ({
        video_id: Number(r.video_id),
        title: r.title || "Untitled",
        watched_at: r.watched_at
      }));

      // cache locally too
      saveHistory(items);
    } else if (status !== 403 && status !== 401) {
      console.warn("history_list failed", status, json);
    }
  }

  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td>—</td>
        <td class="muted">No history yet.</td>
        <td class="table-right">—</td>
      </tr>
    `;
    return;
  }

  for (const h of items) {
    const tr = document.createElement("tr");
    const title = escapeHtml(h.title || "Untitled");
    const date = escapeHtml(formatHistoryDate(h.watched_at));

    tr.innerHTML = `
      <td>${date}</td>
      <td>
        <a class="link" href="video.html?id=${encodeURIComponent(h.video_id)}">${title}</a>
      </td>
      <td class="table-right">
        <a class="btn btn-small" href="video.html?id=${encodeURIComponent(h.video_id)}">Watch</a>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

// ---------- Page init: login.html ----------
function initLoginPage() {
  // Prefer a specific form id, but fall back to a form that has inputs named login/password
  const form = qs("loginForm") || document.querySelector("form");
  if (!form) return;

  // Accept both naming styles from the frontend: login or username
  const loginInput =
    form.querySelector("input[name='login']") ||
    form.querySelector("input[name='username']") ||
    form.querySelector("#login") ||
    form.querySelector("#username");

  const passInput =
    form.querySelector("input[name='password']") ||
    form.querySelector("#password");

  if (!loginInput || !passInput) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const login = loginInput.value.trim();
    const password = passInput.value;

    const msg = qs("loginMsg");
    if (msg) {
      msg.classList.remove("hidden");
      msg.textContent = "Logging in…";
    }

    const r = await apiPostForm("login.php", { login, password });

    if (r.ok && r.json && r.json.success) {
      if (msg) {
        msg.textContent = "Logged in! Redirecting…";
      }
      // Go back to home (or you can change to myaccount.html)
      window.location.href = "index.html";
      return;
    }

    const err = (r.json && r.json.error)
      ? r.json.error
      : `Login failed (HTTP ${r.status})`;

    // Helpful debug info during development
    console.warn("login failed", r.status, r.json);

    if (msg) {
      msg.textContent = err;
    } else {
      alert(err);
    }
  });
}

// ---------- Logout helper (used by navbar button/link if present) ----------
async function doLogout() {
  const r = await apiPostForm("logout.php", {});
  if (r.ok && r.json && r.json.success) {
    // Keep local history; just redirect
    window.location.href = "welcome.html";
    return;
  }
  console.warn("logout failed", r.status, r.json);
}

function initLogoutBindings() {
  // If you have a logout button/link with id="logoutBtn", wire it.
  const btn = qs("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
  }

  // If you use an <a href="#" data-logout>Logout</a>, wire that too.
  const link = document.querySelector("[data-logout]");
  if (link) {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
  }
}

// Register page

function initRegisterPage() {
  const form = qs("registerForm") || document.querySelector("form");
  if (!form) return;

  // MUST match register.php
  const firstNameInput =
    form.querySelector("input[name='first_name']") ||
    form.querySelector("input[name='name']");

  const lastNameInput =
    form.querySelector("input[name='last_name']") ||
    form.querySelector("input[name='surname']");

  const userInput = form.querySelector("input[name='username']");
  const emailInput = form.querySelector("input[name='email']");
  const passInput = form.querySelector("input[name='password']");
  const confirmInput =
    form.querySelector("input[name='confirm_password']") ||
    form.querySelector("input[name='confirmPassword']") ||
    form.querySelector("input[name='confirm']");

  // If required fields are missing, don't attach handler
  if (!firstNameInput || !lastNameInput || !userInput || !emailInput || !passInput || !confirmInput) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      first_name: firstNameInput.value.trim(),
      last_name: lastNameInput.value.trim(),
      username: userInput.value.trim(),
      email: emailInput.value.trim(),
      password: passInput.value,
      confirm_password: confirmInput.value
    };

    const msg = qs("registerMsg");
    if (msg) {
      msg.classList.remove("hidden");
      msg.textContent = "Creating account…";
    }

    const r = await apiPostForm("register.php", payload);

    if (r.ok && r.json && r.json.success) {
      if (msg) msg.textContent = "Account created! Redirecting to login…";
      window.location.href = "login.html";
      return;
    }

    const err = (r.json && r.json.error) ? r.json.error : `Register failed (HTTP ${r.status})`;
    console.warn("register failed", r.status, r.json);
    if (msg) msg.textContent = err;
    else alert(err);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  if (qs("videosGrid")) initIndexPage();
  if (qs("videoPlayer") || qs("demoPlaceholder")) initVideoPage();
  if (qs("historyTbody")) initHistoryPage();

  // Auth pages / buttons
  initLoginPage();
  initLogoutBindings();
  initRegisterPage();
});

