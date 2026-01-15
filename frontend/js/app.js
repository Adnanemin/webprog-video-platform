const USE_FAKE_DATA = true;
const API_BASE = "../backend/api";

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
  if (USE_FAKE_DATA) return VIDEOS;
  return [];
}

async function getVideoDetailById(id) {
  const vid = Number(id);
  if (!Number.isFinite(vid)) return null;
  if (USE_FAKE_DATA) return VIDEOS.find((v) => v.id === vid) || null;
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
}

window.addEventListener("DOMContentLoaded", () => {
  if (qs("videosGrid")) initIndexPage();
  if (qs("videoPlayer") || qs("demoPlaceholder")) initVideoPage();
});
