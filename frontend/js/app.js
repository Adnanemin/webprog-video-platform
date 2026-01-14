// frontend/js/app.js

const USE_FAKE_DATA = true;
const API_BASE = "../backend/api";

const fakeVideos = [
  {
    id: 1,
    title: "Big Buck Bunny",
    description: "Test video for the UI and player page.",
    file_path: "media/bunny.mp4",
    category: "General"
  },
  {
    id: 2,
    title: "Sintel (Trailer)",
    description: "Second test video, used to validate search and grid layout.",
    file_path: "media/sintel.mp4",
    category: "Trailer"
  },
  {
    id: 3,
    title: "Demo Lecture Clip",
    description: "A placeholder video entry for styling and navigation.",
    file_path: "media/demo.mp4",
    category: "Education"
  }
];

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
async function getVideosList() {
  if (USE_FAKE_DATA) return fakeVideos;
  return [];
}

async function getVideoDetailById(id) {
  const vid = Number(id);
  if (!Number.isFinite(vid)) return null;
  if (USE_FAKE_DATA) return fakeVideos.find((v) => v.id === vid) || null;
  return null;
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
  const allVideos = await getVideosList();
  renderVideosGrid(allVideos);

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allVideos.filter(
      (v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q) ||
        (v.category || "").toLowerCase().includes(q)
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

  // Demo mode: hide real player, show placeholder
  if (playerEl) playerEl.classList.add("hidden");
  if (placeholderEl) placeholderEl.classList.remove("hidden");

  if (noticeEl) {
    noticeEl.classList.remove("hidden");
    noticeEl.textContent = "Demo mode: the player area is shown as a placeholder until we add real MP4 files.";
  }
}
