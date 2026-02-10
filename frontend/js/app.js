const USE_FAKE_DATA = false; // use backend when available (fallback to local if it fails)

// Frontend is served from the VirtualHost (DocumentRoot = frontend/).
// Backend API is exposed at: http://webprog-video-platform.local/api/...
const API_BASE = window.location.pathname.includes("/webprog-video-platform/")
  ? "/webprog-video-platform/backend/api"
  : "/api";

// ---------- API helpers ----------
async function apiGet(path, params = {}) {
  // prevent accidental leading slashes creating // in URLs
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = new URL(`${API_BASE}/${cleanPath}`, window.location.href);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), { credentials: "include" });

  // If backend returns non-JSON (e.g., HTML error), keep json = {}
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function apiPostForm(path, formObj = {}) {
  const cleanPath = String(path).replace(/^\/+/, "");
  const body = new URLSearchParams();
  Object.entries(formObj).forEach(([k, v]) => body.set(k, v));

  const res = await fetch(`${API_BASE}/${cleanPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "include"
  });

  // If backend returns non-JSON (e.g., PHP fatal -> HTML), keep json = {}
  const json = await res.json().catch(() => ({}));

  // Helpful debug if backend is broken and not returning JSON
  if (!res.ok && (!json || Object.keys(json).length === 0)) {
    try {
      const txt = await res.clone().text();
      console.warn("Non-JSON error response:", res.status, txt.slice(0, 300));
    } catch {}
  }

  return { ok: res.ok, status: res.status, json };
}

async function apiPostMultipart(path, formData) {
  const cleanPath = String(path).replace(/^\/+/, "");
  const res = await fetch(`${API_BASE}/${cleanPath}`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  // If backend returns non-JSON (e.g., PHP fatal -> HTML), keep json = {}
  const json = await res.json().catch(() => ({}));

  if (!res.ok && (!json || Object.keys(json).length === 0)) {
    try {
      const txt = await res.clone().text();
      console.warn("Non-JSON error response:", res.status, txt.slice(0, 500));
    } catch {}
  }

  return { ok: res.ok, status: res.status, json };
}

function normalizeVideoFromBackend(v) {
  if (!v) return null;
  return {
    id: Number(v.id),
    title: v.title ?? "Untitled",
    description: v.description ?? "",
    file_path: v.video_path ?? v.file_path ?? v.video_url ?? v.path ?? "",
    category: v.category_name ?? v.category ?? "Uncategorized",
    thumb_path: v.thumbnail_path ?? v.thumb_path ?? "thumbnails/placeholder.png",
    uploader_username: v.uploader_username ?? v.username ?? ""
  };
}

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
    // Guests/not-logged-in will get 403/401; ignore silently
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
  if (USE_FAKE_DATA) return [];

  // Folder-based listing endpoint (backend scans frontend/videos + frontend/thumbnails)
  const { ok, json } = await apiGet("videos_list.php", { q: query });

  const list = (json && Array.isArray(json.videos) && json.videos) || null;
  if (!ok || !list) return []; // fallback

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

  if (USE_FAKE_DATA) return null;

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

    // Thumbnail path optional -> if missing, we render without a thumbnail src
    const thumbPath = (v && v.thumb_path) ? String(v.thumb_path) : "";
    const thumbSrc = thumbPath
      ? (thumbPath.startsWith("database/") ? "../" + thumbPath : thumbPath)
      : "";

    card.innerHTML = `
      <div class="card__thumbWrap">
        <img
          class="card__thumb"
          ${thumbSrc ? `src="${thumbSrc}"` : ""}
          alt="${escapeHtml(v.title)} thumbnail"
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

// myaccount
async function getMe() {
  const { ok, status, json } = await apiGet("me.php");
  // your me.php returns { logged_in: true/false, user: ... }
  if (!ok) return { ok: false, status, user: null, json };

  const loggedIn = !!json.logged_in;
  return { ok: true, status, loggedIn, user: json.user || null };
}

async function initMyAccountPage() {
  const nameEl = qs("fullName");     // <h2 id="fullName">
  const userEl = qs("username");     // <p id="username">
  const emailEl = qs("email");       // <p id="email">  (add this in HTML)
  if (!nameEl || !userEl) return;    // not on myaccount page

  const res = await getMe();

  if (!res.ok || !res.loggedIn || !res.user) {
    window.location.href = "login.html";
    return;
  }

  const u = res.user;

  // Option B: these should exist in session now
  const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  nameEl.textContent = fullName || "User";
  userEl.textContent = "@" + (u.username || "unknown");

  if (emailEl) emailEl.textContent = u.email || "";

    // Admin Dashboard button (only admins)
    const adminSection = qs("adminSection");
    if (adminSection) {
      const isAdmin = Number(u.is_admin || 0) === 1;
      if (isAdmin) adminSection.classList.remove("hidden");
      else adminSection.classList.add("hidden");
    }
}

async function initAdminPage() {
  const usersTbody = qs("usersTbody");
  const videosTbody = qs("videosTbody");
  const msgEl = qs("adminMsg");
  const emptyEl = qs("adminEmpty");

  // not on admin.html
  if (!usersTbody) return;

  const setMsg = (t) => {
    if (!msgEl) return;
    msgEl.textContent = t || "";
    if (t) msgEl.classList.remove("hidden");
    else msgEl.classList.add("hidden");
  };

  // Gate: must be admin
  const me = await apiGet("me.php");
  if (!me.ok || !me.json || !me.json.logged_in) {
    window.location.href = "login.html";
    return;
  }
  const u = me.json.user || {};
  if (Number(u.is_admin || 0) !== 1) {
    window.location.href = "myaccount.html";
    return;
  }

  // ---- YOU MUST HAVE THESE 2 LIST ENDPOINTS ----
  // If your friend named them differently, change these two lines.
  async function loadUsers() {
    const r = await apiGet("users_list.php");
    if (!r.ok || !r.json || !Array.isArray(r.json.users)) {
      setMsg((r.json && r.json.error) ? r.json.error : `Users load failed (HTTP ${r.status})`);
      usersTbody.innerHTML = "";
      return;
    }

    usersTbody.innerHTML = r.json.users.map(us => `
      <tr>
        <td>@${escapeHtml(us.username || "")}</td>
        <td>${escapeHtml(us.first_name || "")}</td>
        <td>${escapeHtml(us.last_name || "")}</td>
        <td class="table-right">
          <button class="btn btn-danger" data-del-user="${us.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    usersTbody.querySelectorAll("[data-del-user]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.getAttribute("data-del-user");
        if (!confirm("Delete this user? This cannot be undone.")) return;

        const del = await apiPostForm("admin/delete_user.php", { user_id: userId });
        if (del.ok && del.json && del.json.success) {
          setMsg("User deleted.");
          await loadUsers();
          return;
        }
        setMsg((del.json && del.json.error) ? del.json.error : `Delete failed (HTTP ${del.status})`);
      });
    });
  }

  async function loadVideos() {
    const r = await apiGet("videos_list.php");
    if (!r.ok || !r.json || !Array.isArray(r.json.videos)) {
      setMsg((r.json && r.json.error) ? r.json.error : `Videos load failed (HTTP ${r.status})`);
      videosTbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }

    const vids = r.json.videos;
    if (emptyEl) {
      if (vids.length === 0) emptyEl.classList.remove("hidden");
      else emptyEl.classList.add("hidden");
    }

    // NOTE: your current videos_list.php may not return category_name.
    const normalized = vids.map(normalizeVideoFromBackend).filter(Boolean);

    videosTbody.innerHTML = normalized.map(v => `
      <tr>
        <td>${escapeHtml(String(v.id))}</td>
        <td>${escapeHtml(v.title || "")}</td>
        <td>@${escapeHtml(v.uploader_username || "unknown")}</td>
        <td>${escapeHtml(v.category || "Uncategorized")}</td>
        <td class="table-right">
          <button class="btn btn-danger" data-del-video="${v.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    videosTbody.querySelectorAll("[data-del-video]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const videoId = btn.getAttribute("data-del-video");
        if (!confirm("Delete this video? This cannot be undone.")) return;

        const del = await apiPostForm("admin/admin_delete_video.php", { video_id: videoId });
        if (del.ok && del.json && del.json.success) {
          setMsg("Video deleted.");
          await loadVideos();
          return;
        }
        setMsg((del.json && del.json.error) ? del.json.error : `Delete failed (HTTP ${del.status})`);
      });
    });
  }

  setMsg("");
  await loadUsers();
  await loadVideos();
}

//edit profile
async function initEditProfilePage() {
  const form = qs("editProfileForm");
  if (!form) return; // not on editprofile.html

  const firstNameEl = qs("firstName");
  const lastNameEl = qs("lastName");
  const usernameEl = qs("username");
  const emailEl = qs("email");
  const msgEl = qs("editProfileMsg");

  // 1) Prefill form from session
  const me = await apiGet("me.php");
  if (!me.ok || !me.json || !me.json.logged_in || !me.json.user) {
    window.location.href = "login.html";
    return;
  }

  const u = me.json.user;
  if (firstNameEl) firstNameEl.value = u.first_name || "";
  if (lastNameEl) lastNameEl.value = u.last_name || "";
  if (usernameEl) usernameEl.value = u.username || "";
  if (emailEl) emailEl.value = u.email || "";

  // 2) Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      first_name: firstNameEl.value.trim(),
      last_name: lastNameEl.value.trim(),
      username: usernameEl.value.trim(),
      email: emailEl.value.trim()
    };

    if (msgEl) msgEl.textContent = "Saving…";

    const r = await apiPostForm("profile_update.php", payload);

    if (r.ok && r.json && r.json.success) {
      window.location.href = "myaccount.html";
      return;
    }

    const err =
      (r.json && r.json.error) ||
      `Save failed (HTTP ${r.status})`;

    if (msgEl) msgEl.textContent = err;
    else alert(err);
  });
}

//delete account

function initDeleteAccountButton() {
  const openBtn = qs("deleteAccountBtn");
  const box = qs("deleteAccountBox");
  const passEl = qs("deleteAccountPassword");
  const msgEl = qs("deleteAccountMsg");
  const confirmBtn = qs("confirmDeleteAccountBtn");
  const cancelBtn = qs("cancelDeleteAccountBtn");

  if (!openBtn || !box || !passEl || !confirmBtn) return;

  openBtn.addEventListener("click", () => {
    box.classList.remove("hidden");
    if (msgEl) msgEl.textContent = "";
    passEl.value = "";
    passEl.focus();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      box.classList.add("hidden");
      if (msgEl) msgEl.textContent = "";
      passEl.value = "";
    });
  }

  confirmBtn.addEventListener("click", async () => {
    const password = passEl.value.trim();
    if (!password) {
      if (msgEl) msgEl.textContent = "Password is required.";
      return;
    }

    if (msgEl) msgEl.textContent = "Deleting account…";

    const r = await apiPostForm("delete_account.php", { password });

    if (r.ok && r.json && r.json.success) {
      localStorage.clear();
      window.location.href = "welcome.html";
      return;
    }

    const err = (r.json && r.json.error) ? r.json.error : `Delete failed (HTTP ${r.status})`;
    if (msgEl) msgEl.textContent = err;
  });
}

//account dashboard
async function initAccountDashboardPage() {
  const tbody = qs("myVideosTbody"); // <-- make sure your table tbody has this id
  if (!tbody) return;

  // must be logged in
  const me = await apiGet("me.php");
  if (!me.ok || !me.json || !me.json.logged_in) {
    window.location.href = "login.html";
    return;
  }

  const msgEl = qs("accountdashboardMsg"); // <p id="accountdashboardMsg" class="notice hidden">
  const setMsg = (t) => {
    if (!msgEl) return;
    const text = String(t || "").trim();
    msgEl.textContent = text;
    if (text) msgEl.classList.remove("hidden");
    else msgEl.classList.add("hidden");
  };

  // Populate categories dropdown in account dashboard form
  const addCatEl = qs("addCategoryId");
  if (addCatEl) {
    const cats = await apiGet("categories_list.php");
    if (cats.ok && cats.json && Array.isArray(cats.json.categories)) {
      addCatEl.innerHTML =
        '<option value="0">Uncategorized</option>' +
        cats.json.categories.map(c =>
          `<option value="${c.id}">${escapeHtml(c.name)}</option>`
        ).join("");
    }
  }

  // Thumbnail preview for Add Video form
  const addThumbInput = qs("addThumbnail");
  const addImg = qs("addThumbPreviewImg");
  const addEmpty = qs("addThumbPreviewEmpty");

  if (addThumbInput && addImg && addEmpty) {
    addThumbInput.addEventListener("change", () => {
      const file = addThumbInput.files && addThumbInput.files[0];

      if (!file) {
        addImg.src = "";
        addImg.classList.add("hidden");
        addEmpty.classList.remove("hidden");
        addEmpty.textContent = "Preview will appear here.";
        return;
      }

      addImg.src = URL.createObjectURL(file);
      addImg.classList.remove("hidden");
      addEmpty.classList.add("hidden");
    });
  }

  const addForm = qs("addVideoForm");
  // Cancel (Account Dashboard Add Video form)
  const cancelBtn = qs("cancelEditBtn");
  if (cancelBtn && addForm) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Reset form fields
      addForm.reset();

      // Reset category dropdown
      if (addCatEl) addCatEl.value = "0";

      // Reset thumbnail preview
      if (addImg && addEmpty) {
        addImg.src = "";
        addImg.classList.add("hidden");
        addEmpty.classList.remove("hidden");
        addEmpty.textContent = "Preview will appear here.";
      }

      // Clear message
      setMsg("");
    });
  }
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const titleEl = qs("addTitle");
      const descEl = qs("addDescription");

      const title = titleEl ? titleEl.value.trim() : "";
      const description = descEl ? descEl.value.trim() : "";

      const category_id =
        addCatEl ? String(parseInt(addCatEl.value, 10) || 0) : "0";

      if (!title) {
        setMsg("Title is required");
        return;
      }

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("category_id", category_id);

      const thumbFile = addThumbInput && addThumbInput.files && addThumbInput.files[0];
      if (thumbFile) fd.append("thumbnail", thumbFile);

      setMsg("Adding video…");

      const videoInput = qs("addVideoFile");
      const videoFile = videoInput?.files?.[0];

      if (!videoFile) {
        setMsg("Video file is required.");
        return;
      }

      fd.append("video", videoFile); // MUST be named "video" for PHP

      const r = await apiPostMultipart("upload_video.php", fd);

      if (r.ok && r.json && r.json.success) {
        setMsg("Video added.");
        addForm.reset();
        if (addCatEl) addCatEl.value = "0";
        // reset preview UI
        if (addImg && addEmpty) {
          addImg.src = "";
          addImg.classList.add("hidden");
          addEmpty.classList.remove("hidden");
          addEmpty.textContent = "Preview will appear here.";
        }
        await loadMyVideos();
        return;
      }

      setMsg(
        (r.json && r.json.error) || `Add failed (HTTP ${r.status})`
      );
    });
  }

  async function loadMyVideos() {
    // change endpoint name if yours differs
    const r = await apiGet("my_videos_list.php");

    if (!r.ok || !r.json || !Array.isArray(r.json.videos)) {
      setMsg((r.json && r.json.error) ? r.json.error : `Load failed (HTTP ${r.status})`);
      tbody.innerHTML = "";
      return;
    }

    const videos = r.json.videos.map(normalizeVideoFromBackend).filter(Boolean);

    tbody.innerHTML = videos.map(v => `
      <tr>
        <td>${escapeHtml(String(v.id))}</td>
        <td>${escapeHtml(v.title || "")}</td>
        <td>${escapeHtml(v.category || "Uncategorized")}</td>
        <td class="table-right">
          <a class="btn btn-small" href="editvideo.html?id=${encodeURIComponent(v.id)}">Edit</a>
          <a class="btn btn-small" href="video.html?id=${encodeURIComponent(v.id)}">Watch</a>
          <button class="btn btn-danger btn-small" data-del-myvideo="${v.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-del-myvideo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const videoId = btn.getAttribute("data-del-myvideo");
        if (!confirm("Delete this video? This cannot be undone.")) return;

        const del = await apiPostForm("user_delete_video.php", { video_id: videoId });
        if (del.ok && del.json && del.json.success) {
          setMsg("Video deleted.");
          await loadMyVideos();
          return;
        }
        setMsg((del.json && del.json.error) ? del.json.error : `Delete failed (HTTP ${del.status})`);
      });
    });
  }

  await loadMyVideos();
}

// Edit video page
async function initEditVideoPage() {
  const form = qs("videoForm");
  if (!form) return;

  // must be logged in
  const me = await apiGet("me.php");
  if (!me.ok || !me.json || !me.json.logged_in) {
    window.location.href = "login.html";
    return;
  }

  const msgEl = qs("editvideoMsg");
  const setMsg = (t, show = true) => {
    if (!msgEl) return;
    msgEl.textContent = t || "";
    if (show && t) msgEl.classList.remove("hidden");
    else msgEl.classList.add("hidden");
  };

  const id = getQueryParam("id");
  if (!id) {
    setMsg("Missing video id in URL.");
    return;
  }

  // Load details
  const detail = await apiGet("video_detail.php", { id: String(id) });
  const raw = (detail.json && detail.json.video) ? detail.json.video : null;

  if (!detail.ok || !raw) {
    setMsg((detail.json && detail.json.error) ? detail.json.error : `Video load failed (HTTP ${detail.status})`);
    return;
  }

  // Fill fields
  const videoIdEl = qs("videoId");
  const titleEl = qs("title");
  const descEl = qs("description");
  const catIdEl = qs("categoryId");

  if (videoIdEl) videoIdEl.value = String(raw.id ?? id);
  if (titleEl) titleEl.value = raw.title || "";
  if (descEl) descEl.value = raw.description || "";
  if (catIdEl) catIdEl.value = String(raw.category_id || 0);

  // Load categories into dropdown
  if (catIdEl) {
    const cats = await apiGet("categories_list.php");
    if (cats.ok && cats.json && Array.isArray(cats.json.categories)) {
      catIdEl.innerHTML =
        '<option value="0">Uncategorized</option>' +
        cats.json.categories.map(c =>
          `<option value="${c.id}">${escapeHtml(c.name)}</option>`
        ).join("");
    }
  }

  // Thumbnail preview (file)
  const thumbInput = qs("thumbnail");
  const img = qs("thumbPreviewImg");
  const empty = qs("thumbPreviewEmpty");

  if (thumbInput && img && empty) {
    thumbInput.addEventListener("change", () => {
      const file = thumbInput.files && thumbInput.files[0];
      if (!file) {
        img.classList.add("hidden");
        empty.textContent = "Preview will appear here.";
        empty.classList.remove("hidden");
        img.removeAttribute("src");
        return;
      }
      img.src = URL.createObjectURL(file);
      img.classList.remove("hidden");
      empty.classList.add("hidden");
    });
  }

  // Cancel
  const cancelBtn = qs("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "accountdashboard.html";
    });
  }

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const videoId = (videoIdEl && videoIdEl.value) ? videoIdEl.value.trim() : "";
    const title = (titleEl && titleEl.value) ? titleEl.value.trim() : "";
    const description = (descEl && descEl.value) ? descEl.value.trim() : "";
    const category_id = (catIdEl && catIdEl.value) ? String(parseInt(catIdEl.value, 10) || 0) : "0";

    if (!videoId || !title) {
      setMsg("Video ID and Title are required.");
      return;
    }

    setMsg("Saving…");

    const fd = new FormData();
    fd.append("video_id", videoId);
    fd.append("title", title);
    fd.append("description", description);
    fd.append("category_id", category_id);

    if (thumbInput && thumbInput.files && thumbInput.files[0]) {
      fd.append("thumbnail", thumbInput.files[0]);
    }

    const r = await apiPostMultipart("edit_video.php", fd);

    if (r.ok && r.json && r.json.success) {
      setMsg("Saved! Redirecting…");
      window.location.href = "accountdashboard.html";
      return;
    }

    const err = (r.json && r.json.error) ? r.json.error : `Save failed (HTTP ${r.status})`;
    setMsg(err);
  });
}

// ---------- Page init: index.html ----------
async function initIndexPage() {
  const searchInput = qs("searchInput");
  let allVideos = await getVideosList();
  renderVideosGrid(allVideos);

  if (!searchInput) return;

  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim();

    // Always filter via getVideosList(q) (it handles both modes)
    allVideos = await getVideosList(q);
    renderVideosGrid(allVideos);
  });
}

// ---------- Page init: video.html ----------
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

  const uploaderEl = qs("videoUploader");
  if (uploaderEl && video.uploader_username) {
    uploaderEl.textContent = "Posted by @" + video.uploader_username;
  }
  // Real mode: show player, hide placeholder/notice
  if (noticeEl) noticeEl.classList.add("hidden");
  if (placeholderEl) placeholderEl.classList.add("hidden");

  const sourceEl = qs("videoSource");
  if (sourceEl) {
    sourceEl.src = video.file_path.startsWith("database/") ? "../" + video.file_path : video.file_path;
    if (playerEl) playerEl.load();
  } else if (playerEl) {
    playerEl.src = video.file_path.startsWith("database/") ? "../" + video.file_path : video.file_path;
    playerEl.load();
  }
  if (playerEl) playerEl.classList.remove("hidden");

  // Record watch history
  await addToHistory(video);

  await initCommentsForVideoPage(video.id);
}

// ---------- Page init: history.html ----------
async function initHistoryPage() {
  const tbody = qs("historyTbody");
  if (!tbody) return;

  let items = loadHistory();

  if (!USE_FAKE_DATA) {
    const me = await apiGet("me.php");
    const loggedIn = !!(me.ok && me.json && me.json.logged_in);

    if (loggedIn) {
      const r = await apiGet("history_list.php", { limit: String(HISTORY_LIMIT) });
      const rows = (r.json && Array.isArray(r.json.history) && r.json.history) || null;

      if (r.ok && rows) {
        items = rows.map(x => ({
          video_id: Number(x.video_id),
          title: x.title || "Untitled",
          watched_at: x.watched_at
        }));
        saveHistory(items);
      }
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
    tr.innerHTML = `
      <td>${escapeHtml(formatHistoryDate(h.watched_at))}</td>
      <td><a class="link" href="video.html?id=${encodeURIComponent(h.video_id)}">${escapeHtml(h.title || "Untitled")}</a></td>
      <td class="table-right"><a class="btn btn-small" href="video.html?id=${encodeURIComponent(h.video_id)}">Watch</a></td>
    `;
    tbody.appendChild(tr);
  }
}

//clear all history

async function clearHistoryBackend() {
  // optional endpoint; if not implemented, just returns not ok
  return await apiPostForm("history_delete.php", { clear_all: "1" });
}

function initClearHistoryButton() {
  const btn = qs("clearHistoryBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const okConfirm = confirm("Clear your watch history? This cannot be undone.");
    if (!okConfirm) return;

    // 1) Always clear guest/local history
    localStorage.removeItem(HISTORY_KEY);

    // 2) If logged in, also clear DB history
    // Use your existing "me.php" (logged_in true/false)
    const me = await apiGet("me.php");
    const loggedIn = !!(me.ok && me.json && me.json.logged_in);

    if (loggedIn) {
      const r = await clearHistoryBackend();
      if (!r.ok) {
        // Not fatal: local history is already cleared
        console.warn("history_delete failed", r.status, r.json);
      }
    }

    // 3) Re-render the table
    // simplest: just call initHistoryPage again (or call your render function)
    if (typeof initHistoryPage === "function") {
      initHistoryPage();
    } else {
      // fallback: clear table UI directly if needed
      const tbody = qs("historyTbody");
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td>—</td>
            <td class="muted">No history yet.</td>
            <td class="table-right">—</td>
          </tr>`;
      }
    }
  });
}

// -------------------------------
// Comments
// -------------------------------
async function fetchComments(videoId) {
  return await apiGet("comments.php", { video_id: String(videoId) });
}

async function createComment(videoId, content) {
  return await apiPostForm("comment_create.php", {
    video_id: String(videoId),
    content: content
  });
}

function renderComments(listEl, comments) {
  if (!listEl) return;

  if (!Array.isArray(comments) || comments.length === 0) {
    listEl.innerHTML = `<p class="muted" style="margin-top:12px;">No comments yet.</p>`;
    return;
  }

  listEl.innerHTML = comments
    .map((c) => {
      const username = c.username || "user";
      const date = c.created_at || "";
      const text = c.content || "";

      return `
        <div class="comment">
          <div class="comment-header">
            <span class="comment-user">@${escapeHtml(username)}</span>
            <span class="comment-date muted">${escapeHtml(date)}</span>
          </div>
          <p class="comment-text">${escapeHtml(text)}</p>
        </div>
      `;
    })
    .join("");
}

async function initCommentsForVideoPage(videoId) {
  const listEl = qs("commentsList");
  const textEl = qs("commentText");
  const btnEl = qs("postCommentBtn");
  const hintEl = qs("commentHint");

  if (!listEl || !textEl || !btnEl) return;

  // 1) Load comments
  const res = await fetchComments(videoId);
  if (res.ok && res.json && Array.isArray(res.json.comments)) {
    renderComments(listEl, res.json.comments);
  } else {
    console.warn("comments.php failed", res.status, res.json);
    renderComments(listEl, []);
  }

  // 2) Enable comment box only if logged in
  const me = await apiGet("me.php");
  const loggedIn = !!(me.ok && me.json && me.json.logged_in);

  if (!loggedIn) {
    textEl.disabled = true;
    btnEl.disabled = true;
    if (hintEl) hintEl.textContent = "Login required to comment.";
    return;
  }

  textEl.disabled = false;
  btnEl.disabled = false;
  if (hintEl) hintEl.textContent = "";

  // 3) Post comment
  btnEl.addEventListener("click", async () => {
    const content = (textEl.value || "").trim();
    if (!content) {
      if (hintEl) hintEl.textContent = "Write a comment first.";
      return;
    }

    btnEl.disabled = true;
    if (hintEl) hintEl.textContent = "Posting…";

    const r = await createComment(videoId, content);

    if (r.ok && r.json && r.json.success) {
      textEl.value = "";
      if (hintEl) hintEl.textContent = "";

      // reload comments after posting
      const again = await fetchComments(videoId);
      if (again.ok && again.json && Array.isArray(again.json.comments)) {
        renderComments(listEl, again.json.comments);
      }
      btnEl.disabled = false;
      return;
    }

    const err = (r.json && r.json.error) ? r.json.error : `Post failed (HTTP ${r.status})`;
    console.warn("comment_create.php failed", r.status, r.json);
    if (hintEl) hintEl.textContent = err;
    btnEl.disabled = false;
  });
}

// ---------- Page init: login.html ----------
function initLoginPage() {
  // SAFER: only bind if the expected form exists
  const form = qs("loginForm");
  if (!form) return;

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
      if (msg) msg.textContent = "Logged in! Redirecting…";
      // FIX: go to home (or myaccount.html)
      window.location.href = "index.html";
      return;
    }

    const err = (r.json && r.json.error)
      ? r.json.error
      : `Login failed (HTTP ${r.status})`;

    console.warn("login failed", r.status, r.json);

    // FIX: show error to user
    if (msg) msg.textContent = err;
    else alert(err);
  });
}

// ---------- Logout helper ----------
async function doLogout() {
  const r = await apiPostForm("logout.php", {});
  if (r.ok && r.json && r.json.success) {
    // cler guest/local history

    localStorage.removeItem(HISTORY_KEY);

    window.location.href = "welcome.html";
    return;
  }
  console.warn("logout failed", r.status, r.json);
}

function initLogoutBindings() {
  const btn = qs("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
  }

  const link = document.querySelector("[data-logout]");
  if (link) {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await doLogout();
    });
  }
}

// ---------- Register page ----------
function initRegisterPage() {
  // SAFER: only bind if the expected form exists
  const form = qs("registerForm");
  if (!form) return;

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
  initClearHistoryButton();
  if (qs("fullName") && qs("username")) initMyAccountPage();
  initEditProfilePage();
  initDeleteAccountButton();
  if (qs("usersTbody")) initAdminPage();
  if (qs("myVideosTbody")) initAccountDashboardPage();
  if (qs("videoForm") && window.location.pathname.endsWith("/editvideo.html")) initEditVideoPage();

});