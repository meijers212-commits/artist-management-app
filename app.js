const STORAGE_KEY = "artist_manager_data_v2";

const state = loadState();

const artistForm = document.getElementById("artist-form");
const artistNameInput = document.getElementById("artist-name");
const artistGenreInput = document.getElementById("artist-genre");
const artistContactInput = document.getElementById("artist-contact");
const artistLinkedToAgentInput = document.getElementById("artist-linked-to-agent");
const artistSearchInput = document.getElementById("artist-search");
const totalArtistsEl = document.getElementById("total-artists");
const totalArtistEventsEl = document.getElementById("total-artist-events");
const totalAgentEventsEl = document.getElementById("total-agent-events");

const artistListEl = document.getElementById("artist-list");
const artistCalendarTitleEl = document.getElementById("artist-calendar-title");
const artistEventForm = document.getElementById("artist-event-form");
const artistEventDateInput = document.getElementById("artist-event-date");
const artistEventTimeInput = document.getElementById("artist-event-time");
const artistEventLocationInput = document.getElementById("artist-event-location");
const artistEventNotesInput = document.getElementById("artist-event-notes");
const artistEventsEl = document.getElementById("artist-events");

const agentEventForm = document.getElementById("agent-event-form");
const agentEventDateInput = document.getElementById("agent-event-date");
const agentEventTimeInput = document.getElementById("agent-event-time");
const agentEventTitleInput = document.getElementById("agent-event-title");
const agentEventDetailsInput = document.getElementById("agent-event-details");
const agentEventsEl = document.getElementById("agent-events");

const agentProfileForm = document.getElementById("agent-profile-form");
const agentNameInput = document.getElementById("agent-name");
const agentEmailInput = document.getElementById("agent-email");
const agentPhoneInput = document.getElementById("agent-phone");
const agentBioInput = document.getElementById("agent-bio");

const localLoginForm = document.getElementById("local-login-form");
const localLoginNameInput = document.getElementById("local-login-name");
const authStatusEl = document.getElementById("auth-status");
const googleLoginBtn = document.getElementById("google-login-btn");
const logoutBtn = document.getElementById("logout-btn");

const tabs = Array.from(document.querySelectorAll(".tab"));
const artistCalendarTabPanel = document.getElementById("artist-calendar-tab");
const agentScheduleTabPanel = document.getElementById("agent-schedule-tab");

let artistSearch = "";

artistForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const artist = {
    id: createId(),
    name: artistNameInput.value.trim(),
    genre: artistGenreInput.value.trim(),
    contact: artistContactInput.value.trim(),
    linkedToAgent: artistLinkedToAgentInput.checked,
    events: [],
  };
  if (!artist.name || !artist.genre) return;
  state.artists.push(artist);
  state.selectedArtistId = artist.id;
  artistForm.reset();
  artistLinkedToAgentInput.checked = true;
  saveAndRender();
});

artistSearchInput.addEventListener("input", () => {
  artistSearch = artistSearchInput.value.trim().toLowerCase();
  renderArtists();
});

artistEventForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const selected = getSelectedArtist();
  if (!selected) return;

  const event = {
    id: createId(),
    date: artistEventDateInput.value,
    time: artistEventTimeInput.value,
    location: artistEventLocationInput.value.trim(),
    notes: artistEventNotesInput.value.trim(),
  };

  if (!event.date || !event.time || !event.location) return;
  selected.events.push(event);

  if (selected.linkedToAgent) {
    syncArtistEventToAgent(selected, event);
  }

  artistEventForm.reset();
  saveAndRender();
});

agentEventForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const event = {
    id: createId(),
    date: agentEventDateInput.value,
    time: agentEventTimeInput.value,
    title: agentEventTitleInput.value.trim(),
    details: agentEventDetailsInput.value.trim(),
    sourceType: "manual",
  };
  if (!event.date || !event.time || !event.title) return;
  state.agentEvents.push(event);
  agentEventForm.reset();
  saveAndRender();
});

agentProfileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.agentProfile = {
    name: agentNameInput.value.trim(),
    email: agentEmailInput.value.trim(),
    phone: agentPhoneInput.value.trim(),
    bio: agentBioInput.value.trim(),
  };
  if (!state.agentProfile.name) return;
  saveAndRender();
});

localLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = localLoginNameInput.value.trim();
  if (!name) return;
  state.session = {
    isLoggedIn: true,
    provider: "local",
    userName: name,
  };
  if (!state.agentProfile.name) {
    state.agentProfile.name = name;
  }
  localLoginForm.reset();
  saveAndRender();
});

googleLoginBtn.addEventListener("click", () => {
  alert("Google Login יופעל בחיבור Backend (Firebase/Auth0/NextAuth). כרגע פעילה כניסה מקומית.");
});

logoutBtn.addEventListener("click", () => {
  state.session = { isLoggedIn: false, provider: null, userName: "" };
  saveAndRender();
});

artistListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "select") {
    state.selectedArtistId = id;
    setActiveTab("artist-calendar");
  }

  if (btn.dataset.action === "toggle-link") {
    const artist = state.artists.find((a) => a.id === id);
    if (artist) {
      artist.linkedToAgent = !artist.linkedToAgent;
      if (!artist.linkedToAgent) {
        removeSyncedEventsForArtist(artist.id);
      } else {
        artist.events.forEach((event) => syncArtistEventToAgent(artist, event));
      }
    }
  }

  if (btn.dataset.action === "delete-artist") {
    removeSyncedEventsForArtist(id);
    state.artists = state.artists.filter((a) => a.id !== id);
    if (state.selectedArtistId === id) state.selectedArtistId = null;
  }

  saveAndRender();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(tab.dataset.tab);
  });
});

artistEventsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || btn.dataset.action !== "delete-artist-event") return;
  const selected = getSelectedArtist();
  if (!selected) return;

  selected.events = selected.events.filter((event) => event.id !== btn.dataset.id);
  state.agentEvents = state.agentEvents.filter(
    (event) => !(event.sourceType === "artist" && event.sourceArtistId === selected.id && event.sourceArtistEventId === btn.dataset.id),
  );
  saveAndRender();
});

agentEventsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || btn.dataset.action !== "delete-agent-event") return;
  state.agentEvents = state.agentEvents.filter((event) => event.id !== btn.dataset.id);
  saveAndRender();
});

function requireLogin() {
  if (state.session.isLoggedIn) return true;
  alert("יש להתחבר קודם (כניסה מקומית למעלה).");
  return false;
}

function syncArtistEventToAgent(artist, artistEvent) {
  const existing = state.agentEvents.find(
    (event) =>
      event.sourceType === "artist" &&
      event.sourceArtistId === artist.id &&
      event.sourceArtistEventId === artistEvent.id,
  );
  if (existing) return;

  state.agentEvents.push({
    id: createId(),
    date: artistEvent.date,
    time: artistEvent.time,
    title: `הופעה: ${artist.name}`,
    details: `${artistEvent.location}${artistEvent.notes ? ` | ${artistEvent.notes}` : ""}`,
    sourceType: "artist",
    sourceArtistId: artist.id,
    sourceArtistEventId: artistEvent.id,
  });
}

function removeSyncedEventsForArtist(artistId) {
  state.agentEvents = state.agentEvents.filter(
    (event) => !(event.sourceType === "artist" && event.sourceArtistId === artistId),
  );
}

function renderArtists() {
  artistListEl.innerHTML = "";
  const artists = [...state.artists]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((artist) => {
      if (!artistSearch) return true;
      const text = `${artist.name} ${artist.genre}`.toLowerCase();
      return text.includes(artistSearch);
    });

  if (artists.length === 0) {
    artistListEl.innerHTML =
      state.artists.length === 0
        ? '<p class="meta">אין עדיין אומנים. הוסף אומן ראשון למערכת.</p>'
        : '<p class="meta">לא נמצאו תוצאות לחיפוש.</p>';
    return;
  }

  artists.forEach((artist) => {
    const card = document.createElement("div");
    card.className = `card ${artist.id === state.selectedArtistId ? "selected" : ""}`;
    card.innerHTML = `
      <p class="card-title">${escapeHtml(artist.name)}</p>
      <p class="meta">${escapeHtml(artist.genre)} | ${escapeHtml(artist.contact || "ללא איש קשר")}</p>
      <p class="meta">${artist.linkedToAgent ? "מחובר לסוכן" : "לא מחובר לסוכן"}</p>
      <div class="row">
        <button data-action="select" data-id="${artist.id}">פתח לוח אומן</button>
        <button class="secondary" data-action="toggle-link" data-id="${artist.id}">
          ${artist.linkedToAgent ? "נתק מסוכן" : "חבר לסוכן"}
        </button>
        <button class="danger" data-action="delete-artist" data-id="${artist.id}">מחק אומן</button>
      </div>
    `;
    artistListEl.appendChild(card);
  });
}

function renderSelectedArtistEvents() {
  const selected = getSelectedArtist();
  artistEventsEl.innerHTML = "";
  if (!selected) {
    artistCalendarTitleEl.textContent = "בחר אומן כדי לראות את הלוח שלו";
    artistEventsEl.innerHTML = '<p class="meta">לא נבחר אומן.</p>';
    return;
  }

  artistCalendarTitleEl.textContent = `לוח אירועים עבור: ${selected.name}`;

  if (selected.events.length === 0) {
    artistEventsEl.innerHTML = '<p class="meta">אין אירועים לאומן הזה עדיין.</p>';
    return;
  }

  const events = [...selected.events].sort(sortByDateTime);
  events.forEach((event) => {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `
      <p class="event-title">${event.date} ${event.time} | ${escapeHtml(event.location)}</p>
      <p class="meta">${escapeHtml(event.notes || "ללא הערות")}</p>
      <button class="danger" data-action="delete-artist-event" data-id="${event.id}">מחק אירוע</button>
    `;
    artistEventsEl.appendChild(div);
  });
}

function renderAgentEvents() {
  agentEventsEl.innerHTML = "";
  if (state.agentEvents.length === 0) {
    agentEventsEl.innerHTML = '<p class="meta">אין אירועי סוכן עדיין.</p>';
    return;
  }

  const events = [...state.agentEvents].sort(sortByDateTime);
  events.forEach((event) => {
    const syncedBadge = event.sourceType === "artist" ? " (מסונכרן מאומן)" : "";
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `
      <p class="event-title">${event.date} ${event.time} | ${escapeHtml(event.title)}${syncedBadge}</p>
      <p class="meta">${escapeHtml(event.details || "ללא פרטים נוספים")}</p>
      ${
        event.sourceType === "manual"
          ? `<button class="danger" data-action="delete-agent-event" data-id="${event.id}">מחק אירוע</button>`
          : `<p class="meta">אירוע זה מנוהל דרך כרטיס האומן.</p>`
      }
    `;
    agentEventsEl.appendChild(div);
  });
}

function renderProfile() {
  agentNameInput.value = state.agentProfile.name || "";
  agentEmailInput.value = state.agentProfile.email || "";
  agentPhoneInput.value = state.agentProfile.phone || "";
  agentBioInput.value = state.agentProfile.bio || "";
}

function renderAuth() {
  if (state.session.isLoggedIn) {
    authStatusEl.textContent = `מחובר כ: ${state.session.userName} (${state.session.provider})`;
    logoutBtn.classList.remove("hidden");
  } else {
    authStatusEl.textContent = "לא מחובר";
    logoutBtn.classList.add("hidden");
  }
}

function getSelectedArtist() {
  return state.artists.find((artist) => artist.id === state.selectedArtistId) || null;
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAuth();
  renderProfile();
  renderStats();
  renderArtists();
  renderSelectedArtistEvents();
  renderAgentEvents();
}

function renderStats() {
  totalArtistsEl.textContent = String(state.artists.length);
  totalArtistEventsEl.textContent = String(state.artists.reduce((sum, artist) => sum + artist.events.length, 0));
  totalAgentEventsEl.textContent = String(state.agentEvents.length);
}

function migrateLegacyState(raw) {
  return {
    artists: Array.isArray(raw.artists)
      ? raw.artists.map((artist) => ({
          ...artist,
          linkedToAgent: artist.linkedToAgent !== false,
          events: Array.isArray(artist.events) ? artist.events : [],
        }))
      : [],
    selectedArtistId: raw.selectedArtistId || null,
    agentEvents: Array.isArray(raw.agentEvents)
      ? raw.agentEvents.map((event) => ({ sourceType: event.sourceType || "manual", ...event }))
      : [],
    agentProfile: raw.agentProfile || { name: "", email: "", phone: "", bio: "" },
    session: raw.session || { isLoggedIn: false, provider: null, userName: "" },
  };
}

function loadState() {
  const savedV2 = localStorage.getItem(STORAGE_KEY);
  if (savedV2) {
    try {
      return migrateLegacyState(JSON.parse(savedV2));
    } catch {
      return createDefaultState();
    }
  }

  const old = localStorage.getItem("artist_manager_data_v1");
  if (!old) return createDefaultState();
  try {
    return migrateLegacyState(JSON.parse(old));
  } catch {
    return createDefaultState();
  }
}

function createDefaultState() {
  return {
    artists: [],
    selectedArtistId: null,
    agentEvents: [],
    agentProfile: { name: "", email: "", phone: "", bio: "" },
    session: { isLoggedIn: false, provider: null, userName: "" },
  };
}

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sortByDateTime(a, b) {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setActiveTab(tabId) {
  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === tabId);
  });
  artistCalendarTabPanel.classList.toggle("hidden", tabId !== "artist-calendar");
  agentScheduleTabPanel.classList.toggle("hidden", tabId !== "agent-schedule");
}

saveAndRender();
