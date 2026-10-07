const CATALOG_API = "/api/catalog";
const INTERACTIONS_API = "/api/interactions";

const state = {
  games: [],
  genres: [],
  platforms: [],
  favoriteCounts: {},
  favoriteIds: new Set(),
  editingId: null,
  deletingId: null,
  searchTimer: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindEvents();
  await Promise.allSettled([loadOptions(), registerVisit()]);
  await loadGames();
  await loadInteractionState();
});

function cacheElements() {
  Object.assign(elements, {
    grid: document.querySelector("#game-grid"),
    loading: document.querySelector("#loading"),
    empty: document.querySelector("#empty-state"),
    resultCount: document.querySelector("#result-count"),
    search: document.querySelector("#search"),
    genreFilter: document.querySelector("#genre-filter"),
    platformFilter: document.querySelector("#platform-filter"),
    statusFilter: document.querySelector("#status-filter"),
    modal: document.querySelector("#game-modal"),
    form: document.querySelector("#game-form"),
    modalTitle: document.querySelector("#modal-title"),
    saveButton: document.querySelector("#save-game"),
    confirmModal: document.querySelector("#confirm-modal"),
    confirmMessage: document.querySelector("#confirm-message"),
    toastRegion: document.querySelector("#toast-region"),
    metricGames: document.querySelector("#metric-games"),
    metricFavorites: document.querySelector("#metric-favorites"),
    metricVisits: document.querySelector("#metric-visits"),
  });
}

function bindEvents() {
  ["#open-create", "#hero-create", "#empty-create"].forEach((selector) => {
    document.querySelector(selector).addEventListener("click", () => openForm());
  });
  ["#close-modal", "#cancel-modal"].forEach((selector) => {
    document.querySelector(selector).addEventListener("click", closeForm);
  });
  document.querySelector("#cancel-delete").addEventListener("click", () => elements.confirmModal.close());
  document.querySelector("#confirm-delete").addEventListener("click", confirmDelete);
  document.querySelector("#clear-filters").addEventListener("click", clearFilters);
  elements.form.addEventListener("submit", saveGame);
  elements.grid.addEventListener("click", handleCardAction);
  elements.search.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadGames, 320);
  });
  elements.genreFilter.addEventListener("change", loadGames);
  elements.platformFilter.addEventListener("change", loadGames);
  elements.statusFilter.addEventListener("change", loadGames);
  elements.modal.addEventListener("click", closeDialogFromBackdrop);
  elements.confirmModal.addEventListener("click", closeDialogFromBackdrop);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = {};
  try { data = await response.json(); } catch (_error) { data = {}; }
  if (!response.ok) {
    const error = new Error(data.error || "No fue posible completar la solicitud.");
    error.details = data.details || {};
    error.status = response.status;
    throw error;
  }
  return data;
}

async function loadOptions() {
  try {
    const data = await apiFetch(`${CATALOG_API}/games/options`);
    state.genres = data.genres;
    state.platforms = data.platforms;
    populateSelect(elements.genreFilter, state.genres);
    populateSelect(document.querySelector("#game-genre"), state.genres);
    populateSelect(elements.platformFilter, state.platforms);
    populateSelect(document.querySelector("#game-platform"), state.platforms);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function populateSelect(select, values) {
  const firstOption = select.options[0];
  select.replaceChildren(firstOption);
  values.forEach((value) => select.add(new Option(value, value)));
}

async function loadGames() {
  setLoading(true);
  const params = new URLSearchParams();
  if (elements.search.value.trim()) params.set("q", elements.search.value.trim());
  if (elements.genreFilter.value) params.set("genre", elements.genreFilter.value);
  if (elements.platformFilter.value) params.set("platform", elements.platformFilter.value);
  if (elements.statusFilter.value) params.set("status", elements.statusFilter.value);

  try {
    const query = params.toString() ? `?${params}` : "";
    const data = await apiFetch(`${CATALOG_API}/games${query}`);
    state.games = data.items;
    renderGames();
  } catch (error) {
    state.games = [];
    renderGames();
    showToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function renderGames() {
  elements.grid.replaceChildren();
  elements.resultCount.textContent = `${state.games.length} ${state.games.length === 1 ? "resultado" : "resultados"}`;
  elements.metricGames.textContent = state.games.length;
  elements.empty.hidden = state.games.length > 0;

  state.games.forEach((game) => {
    const article = document.createElement("article");
    article.className = "game-card";
    const isFavorite = state.favoriteIds.has(game.id);
    const favoriteCount = state.favoriteCounts[game.id] || 0;
    const stockClass = game.stock === 0 ? "out" : "";
    article.innerHTML = `
      <div class="cover" data-genre="${escapeHtml(game.genre)}">
        <span class="cover-symbol">${initials(game.title)}</span>
        ${game.featured ? '<span class="featured-badge">★ Destacado</span>' : ""}
      </div>
      <div class="card-body">
        <div class="card-top">
          <span class="genre-chip">${escapeHtml(game.genre)}</span>
          <span class="status-chip ${game.status}">${statusLabel(game.status)}</span>
        </div>
        <h3>${escapeHtml(game.title)}</h3>
        <span class="developer">${escapeHtml(game.developer)}</span>
        <p class="description">${escapeHtml(game.description)}</p>
        <div class="game-details">
          <span>▰ ${escapeHtml(game.platform)}</span>
          <span>◷ ${formatDate(game.release_date)}</span>
        </div>
        <div class="card-top"><strong class="price">$${Number(game.price).toFixed(2)}</strong><span class="stock ${stockClass}">${game.stock ? `${game.stock} disponibles` : "Sin existencias"}</span></div>
        <div class="card-actions">
          <button class="button" data-action="edit" data-id="${game.id}" type="button">Editar</button>
          <button class="button" data-action="delete" data-id="${game.id}" type="button">Eliminar</button>
          <button class="button favorite-button ${isFavorite ? "active" : ""}" data-action="favorite" data-id="${game.id}" type="button" aria-pressed="${isFavorite}">
            ${isFavorite ? "♥" : "♡"} <span>${favoriteCount}</span>
          </button>
        </div>
      </div>`;
    elements.grid.appendChild(article);
  });
}

async function registerVisit() {
  try {
    const data = await apiFetch(`${INTERACTIONS_API}/visits`, { method: "POST", body: "{}" });
    elements.metricVisits.textContent = data.visits;
  } catch (_error) {
    elements.metricVisits.textContent = "—";
  }
}

async function loadInteractionState() {
  try {
    const [counts, stats] = await Promise.all([
      apiFetch(`${INTERACTIONS_API}/games/favorites`),
      apiFetch(`${INTERACTIONS_API}/stats`),
    ]);
    state.favoriteCounts = Object.fromEntries(
      Object.entries(counts.items).map(([id, value]) => [Number(id), value])
    );
    elements.metricFavorites.textContent = stats.favorites;
    elements.metricVisits.textContent = stats.visits;

    const clientId = getClientId();
    const results = await Promise.allSettled(
      state.games.map((game) => apiFetch(`${INTERACTIONS_API}/games/${game.id}/favorite?client_id=${encodeURIComponent(clientId)}`))
    );
    state.favoriteIds.clear();
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.favorite) state.favoriteIds.add(state.games[index].id);
    });
    renderGames();
  } catch (_error) {
    elements.metricFavorites.textContent = "—";
  }
}

async function handleCardAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") {
    const selected = state.games.find((item) => item.id === id);
    if (selected) openForm(selected);
  } else if (button.dataset.action === "delete") {
    openDeleteConfirmation(id);
  } else if (button.dataset.action === "favorite") {
    await toggleFavorite(id, button);
  }
}

function openForm(game = null) {
  clearFormErrors();
  elements.form.reset();
  state.editingId = game?.id || null;
  elements.modalTitle.textContent = game ? "Editar videojuego" : "Nuevo videojuego";
  elements.saveButton.textContent = game ? "Guardar cambios" : "Guardar videojuego";
  if (game) {
    Object.entries({
      title: game.title,
      description: game.description,
      genre: game.genre,
      platform: game.platform,
      release_date: game.release_date,
      developer: game.developer,
      price: game.price,
      stock: game.stock,
    }).forEach(([name, value]) => { elements.form.elements[name].value = value; });
    elements.form.elements.featured.checked = game.featured;
  }
  elements.modal.showModal();
  document.querySelector("#game-title").focus();
}

function closeForm() {
  if (elements.modal.open) elements.modal.close();
}

async function saveGame(event) {
  event.preventDefault();
  clearFormErrors();
  if (!elements.form.reportValidity()) return;

  const payload = Object.fromEntries(new FormData(elements.form).entries());
  payload.price = Number(payload.price);
  payload.stock = Number(payload.stock);
  payload.featured = elements.form.elements.featured.checked;

  const isEditing = Boolean(state.editingId);
  const url = isEditing ? `${CATALOG_API}/games/${state.editingId}` : `${CATALOG_API}/games`;
  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Guardando...";
  try {
    await apiFetch(url, { method: isEditing ? "PUT" : "POST", body: JSON.stringify(payload) });
    closeForm();
    showToast(isEditing ? "Videojuego actualizado correctamente." : "Videojuego creado correctamente.");
    await loadGames();
    await loadInteractionState();
  } catch (error) {
    if (Object.keys(error.details).length) showFormErrors(error.details);
    showToast(error.message, "error");
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = isEditing ? "Guardar cambios" : "Guardar videojuego";
  }
}

function openDeleteConfirmation(id) {
  const selected = state.games.find((game) => game.id === id);
  if (!selected) return;
  state.deletingId = id;
  elements.confirmMessage.textContent = `Se eliminará “${selected.title}” de forma permanente.`;
  elements.confirmModal.showModal();
}

async function confirmDelete() {
  if (!state.deletingId) return;
  const button = document.querySelector("#confirm-delete");
  button.disabled = true;
  try {
    await apiFetch(`${CATALOG_API}/games/${state.deletingId}`, { method: "DELETE" });
    elements.confirmModal.close();
    showToast("Videojuego eliminado correctamente.");
    await loadGames();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    state.deletingId = null;
  }
}

async function toggleFavorite(id, button) {
  button.disabled = true;
  try {
    const data = await apiFetch(`${INTERACTIONS_API}/games/${id}/favorite`, {
      method: "POST",
      body: JSON.stringify({ client_id: getClientId() }),
    });
    state.favoriteCounts[id] = data.favorites;
    data.favorite ? state.favoriteIds.add(id) : state.favoriteIds.delete(id);
    renderGames();
    const stats = await apiFetch(`${INTERACTIONS_API}/stats`);
    elements.metricFavorites.textContent = stats.favorites;
    showToast(data.message);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function getClientId() {
  let clientId = localStorage.getItem("gamevault_client_id");
  if (!clientId) {
    clientId = `gv_${crypto.randomUUID().replaceAll("-", "")}`;
    localStorage.setItem("gamevault_client_id", clientId);
  }
  return clientId;
}

function clearFilters() {
  elements.search.value = "";
  elements.genreFilter.value = "";
  elements.platformFilter.value = "";
  elements.statusFilter.value = "";
  loadGames();
}

function setLoading(active) {
  elements.loading.hidden = !active;
  elements.grid.hidden = active;
  if (active) elements.empty.hidden = true;
}

function showFormErrors(details) {
  Object.entries(details).forEach(([name, message]) => {
    const field = elements.form.elements[name];
    if (!field) return;
    field.closest(".field")?.classList.add("has-error");
    const error = elements.form.querySelector(`[data-error="${name}"]`);
    if (error) error.textContent = message;
  });
}

function clearFormErrors() {
  elements.form.querySelectorAll(".has-error").forEach((field) => field.classList.remove("has-error"));
  elements.form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function closeDialogFromBackdrop(event) {
  if (event.target === event.currentTarget) event.currentTarget.close();
}

function initials(title) {
  return escapeHtml(title.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase());
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function statusLabel(status) {
  return { nuevo: "Nuevo", clasico: "Clásico", proximamente: "Próximamente" }[status] || status;
}

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}
