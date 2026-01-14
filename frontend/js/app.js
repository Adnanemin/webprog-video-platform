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

function qs(id){ return document.getElementById(id); }

function escapeHtml(str){
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function truncate(str,  max=90){
    const s = String(str ?? "");
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

async function getVideosList(){
    if (USE_FAKE_DATA) return fakeVideos;
    return [];
}

function renderVideosGrid(videos){
    const grid = qs("videosGrid");
    const empty = qs("emptyState");
    grid.innerHTML = "";

    if (!videos || videos.length === 0){
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

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

async function initIndexPage(){
    const searchInput = qs("searchInput");

    let allVideos = await getVideosList();
    renderVideosGrid(allVideos);

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        const filtered = allVideos.filter(v =>
          (v.title || "").toLowerCase().includes(q) ||
          (v.description || "").toLowerCase().includes(q) ||
          (v.category || "").toLowerCase().includes(q)
        );
        renderVideosGrid(filtered);
    });
}
