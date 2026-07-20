const modList = document.getElementById('mod-list');
const modEmpty = document.getElementById('mod-empty');
const saveList = document.getElementById('save-list');
const globalStatus = document.getElementById('global-status');
const workshopStatusList = document.getElementById('workshop-status-list');
const launchSummary = document.getElementById('launch-summary');
const refreshButton = document.getElementById('refresh-button');
const resetOrderButton = document.getElementById('reset-order-button');
const playButton = document.getElementById('play-button');
const localModsButton = document.getElementById('local-mods-button');
const workshopButton = document.getElementById('workshop-button');

let launcherState = null;
let orderedMods = [];
let enabledMods = new Set();
let selectedSave = 'new';
let draggedModId = '';
const modRows = new Map();
const saveRows = new Map();
const workshopRows = new Map();

function formatBytes(bytes) {
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const hours = Math.floor(Number(seconds) / 3600);
  return hours > 0 ? `${hours.toLocaleString()}h played` : 'Less than 1h played';
}

function moveMod(instanceId, direction) {
  const index = orderedMods.findIndex(mod => mod.instanceId === instanceId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= orderedMods.length) return;
  const moved = orderedMods[index];
  orderedMods[index] = orderedMods[target];
  orderedMods[target] = moved;
  renderMods();
}

function createModRow() {
  const row = document.createElement('div');
  row.className = 'mod-row';
  row.draggable = true;

  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.textContent = '⋮⋮';
  handle.title = 'Drag to reorder';

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'mod-toggle';
  toggle.addEventListener('change', () => {
    const instanceId = row.dataset.instanceId;
    if (toggle.checked) enabledMods.add(instanceId);
    else enabledMods.delete(instanceId);
    renderMods();
  });

  const copy = document.createElement('div');
  copy.className = 'mod-copy';
  const titleLine = document.createElement('div');
  titleLine.className = 'mod-title-line';
  const name = document.createElement('span');
  name.className = 'mod-name';
  const sourceBadge = document.createElement('span');
  sourceBadge.className = 'badge';
  const warningBadge = document.createElement('span');
  warningBadge.className = 'badge warning';
  warningBadge.hidden = true;
  titleLine.append(name, sourceBadge, warningBadge);
  const meta = document.createElement('div');
  meta.className = 'mod-meta';
  const message = document.createElement('div');
  message.className = 'mod-message';
  copy.append(titleLine, meta, message);

  const orderButtons = document.createElement('div');
  orderButtons.className = 'order-buttons';
  const up = document.createElement('button');
  up.type = 'button';
  up.textContent = '▲';
  up.title = 'Move earlier';
  up.addEventListener('click', () => moveMod(row.dataset.instanceId, -1));
  const down = document.createElement('button');
  down.type = 'button';
  down.textContent = '▼';
  down.title = 'Move later';
  down.addEventListener('click', () => moveMod(row.dataset.instanceId, 1));
  orderButtons.append(up, down);

  row.append(handle, toggle, copy, orderButtons);
  row._refs = { toggle, name, sourceBadge, warningBadge, meta, message, up, down };
  row.addEventListener('dragstart', event => {
    draggedModId = row.dataset.instanceId;
    row.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
  });
  row.addEventListener('dragend', () => {
    draggedModId = '';
    row.classList.remove('is-dragging');
  });
  row.addEventListener('dragover', event => event.preventDefault());
  row.addEventListener('drop', event => {
    event.preventDefault();
    const targetId = row.dataset.instanceId;
    if (!draggedModId || draggedModId === targetId) return;
    const from = orderedMods.findIndex(mod => mod.instanceId === draggedModId);
    const to = orderedMods.findIndex(mod => mod.instanceId === targetId);
    const [moved] = orderedMods.splice(from, 1);
    orderedMods.splice(to, 0, moved);
    renderMods();
  });
  return row;
}

function getOverlapCounts() {
  const replacementOwners = new Map();
  const patchOwners = new Map();
  const counts = new Map();
  orderedMods.filter(mod => enabledMods.has(mod.instanceId) && mod.valid).forEach(mod => {
    mod.replacementPaths.forEach(gamePath => {
      const previous = replacementOwners.get(gamePath);
      if (previous) {
        counts.set(previous, (counts.get(previous) || 0) + 1);
        counts.set(mod.instanceId, (counts.get(mod.instanceId) || 0) + 1);
      }
      replacementOwners.set(gamePath, mod.instanceId);
    });
    mod.patchTargets.forEach(target => {
      const previous = patchOwners.get(target);
      if (previous) {
        counts.set(previous, (counts.get(previous) || 0) + 1);
        counts.set(mod.instanceId, (counts.get(mod.instanceId) || 0) + 1);
      }
      patchOwners.set(target, mod.instanceId);
    });
  });
  return counts;
}

function findDuplicateEnabledIds() {
  const owners = new Map();
  const duplicates = new Set();
  orderedMods.filter(mod => enabledMods.has(mod.instanceId) && mod.valid).forEach(mod => {
    if (owners.has(mod.id)) {
      duplicates.add(owners.get(mod.id));
      duplicates.add(mod.instanceId);
    } else {
      owners.set(mod.id, mod.instanceId);
    }
  });
  return duplicates;
}

function renderMods() {
  const overlaps = getOverlapCounts();
  const duplicates = findDuplicateEnabledIds();
  const activeIds = new Set();
  orderedMods.forEach((mod, index) => {
    activeIds.add(mod.instanceId);
    let row = modRows.get(mod.instanceId);
    if (!row) {
      row = createModRow();
      modRows.set(mod.instanceId, row);
    }
    row.dataset.instanceId = mod.instanceId;
    const refs = row._refs;
    const enabled = enabledMods.has(mod.instanceId) && mod.valid;
    refs.toggle.checked = enabled;
    refs.toggle.disabled = !mod.valid || launcherState.refreshing;
    refs.name.textContent = mod.name || mod.folderName;
    refs.sourceBadge.textContent = mod.source === 'workshop' ? 'Workshop' : 'Local';
    refs.sourceBadge.className = `badge${mod.source === 'workshop' ? ' workshop' : ''}`;
    const overlapCount = overlaps.get(mod.instanceId) || 0;
    const duplicate = duplicates.has(mod.instanceId);
    refs.warningBadge.hidden = !overlapCount && !duplicate;
    refs.warningBadge.textContent = duplicate ? 'Duplicate ID' : `${overlapCount} overlap${overlapCount === 1 ? '' : 's'}`;
    const identity = mod.source === 'workshop' ? `Workshop ${mod.workshopId}` : mod.id;
    refs.meta.textContent = [mod.version && `v${mod.version}`, identity].filter(Boolean).join(' · ');
    refs.message.textContent = mod.validationError || (duplicate ? 'Disable one mod with this manifest id before launching.' : '');
    refs.up.disabled = index === 0 || launcherState.refreshing;
    refs.down.disabled = index === orderedMods.length - 1 || launcherState.refreshing;
    row.draggable = !launcherState.refreshing;
    row.classList.toggle('is-invalid', !mod.valid || duplicate);
    row.classList.toggle('is-disabled', !enabled);
    const expected = modList.children[index];
    if (expected !== row) modList.insertBefore(row, expected || null);
  });
  modRows.forEach((row, instanceId) => {
    if (!activeIds.has(instanceId)) {
      row.remove();
      modRows.delete(instanceId);
    }
  });
  modEmpty.hidden = orderedMods.length > 0;
  const activeCount = orderedMods.filter(mod => enabledMods.has(mod.instanceId) && mod.valid).length;
  const save = launcherState.saves.find(item => item.selectionId === selectedSave);
  const saveName = selectedSave === 'new' ? 'New Game' : (save ? save.label : 'Unknown save');
  launchSummary.textContent = `${activeCount} mod${activeCount === 1 ? '' : 's'} enabled · ${saveName}`;
  playButton.disabled = launcherState.refreshing || duplicates.size > 0;
  resetOrderButton.disabled = launcherState.refreshing || orderedMods.length < 2;
}

function createSaveRow(save) {
  const label = document.createElement('label');
  label.className = 'save-row';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'starting-save';
  const radio = document.createElement('span');
  radio.className = 'save-radio';
  const body = document.createElement('span');
  body.className = 'save-body';
  const title = document.createElement('span');
  title.className = 'save-title';
  const detail = document.createElement('span');
  detail.className = 'save-detail';
  body.append(title, detail);
  label.append(input, radio, body);
  label._refs = { input, title, detail };
  input.addEventListener('change', () => {
    if (input.checked) {
      selectedSave = input.value;
      renderMods();
    }
  });
  return label;
}

function renderSaves() {
  const newGameInput = saveList.querySelector('input[value="new"]');
  newGameInput.checked = selectedSave === 'new';
  newGameInput.disabled = launcherState.refreshing;
  const activeIds = new Set();
  launcherState.saves.forEach((save, index) => {
    activeIds.add(save.selectionId);
    let row = saveRows.get(save.selectionId);
    if (!row) {
      row = createSaveRow(save);
      saveRows.set(save.selectionId, row);
    }
    const refs = row._refs;
    refs.input.value = save.selectionId;
    refs.input.checked = selectedSave === save.selectionId;
    refs.input.disabled = !save.valid || launcherState.refreshing;
    refs.title.textContent = save.label;
    const timestamp = new Date(save.timestamp).toLocaleString();
    refs.detail.textContent = save.valid
      ? `${timestamp} · ${save.world} · ${formatDuration(save.playTimeSeconds)} · ${formatBytes(save.size)}${save.gameCompleted ? ' · Completed' : ''}`
      : `${timestamp} · ${save.error}`;
    refs.detail.classList.toggle('save-error', !save.valid);
    const expected = saveList.children[index + 1];
    if (expected !== row) saveList.insertBefore(row, expected || null);
  });
  saveRows.forEach((row, selectionId) => {
    if (!activeIds.has(selectionId)) {
      row.remove();
      saveRows.delete(selectionId);
    }
  });
}

function renderWorkshop(workshop) {
  const activeIds = new Set();
  workshop.items.filter(item => item.status !== 'installed').forEach(item => {
    activeIds.add(item.workshopId);
    let row = workshopRows.get(item.workshopId);
    if (!row) {
      row = document.createElement('div');
      row.className = 'workshop-download';
      workshopRows.set(item.workshopId, row);
      workshopStatusList.appendChild(row);
    }
    const progress = item.download && Number(item.download.total) > 0
      ? ` · ${formatBytes(item.download.current)} / ${formatBytes(item.download.total)}`
      : '';
    const text = `Workshop ${item.workshopId}: ${item.status}${progress}${item.message ? ` · ${item.message}` : ''}`;
    if (row.textContent !== text) row.textContent = text;
  });
  workshopRows.forEach((row, workshopId) => {
    if (!activeIds.has(workshopId)) {
      row.remove();
      workshopRows.delete(workshopId);
    }
  });
}

function applyState(state) {
  launcherState = state;
  orderedMods = state.mods.slice();
  enabledMods = new Set(state.mods.filter(mod => mod.enabled).map(mod => mod.instanceId));
  selectedSave = state.selectedSave;
  const statusText = state.error || (state.refreshing ? 'Checking Steam Workshop and validating mods…' : '');
  globalStatus.textContent = statusText;
  globalStatus.hidden = !statusText;
  globalStatus.classList.toggle('is-error', !!state.error);
  refreshButton.disabled = state.refreshing;
  renderWorkshop(state.workshop);
  renderSaves();
  renderMods();
}

async function launch() {
  globalStatus.textContent = 'Preparing game session…';
  globalStatus.hidden = false;
  playButton.disabled = true;
  try {
    const result = await window.modLauncher.launch({
      order: orderedMods.map(mod => mod.instanceId),
      disabled: orderedMods.filter(mod => !enabledMods.has(mod.instanceId)).map(mod => mod.instanceId),
      saveSelection: selectedSave
    });
    if (!result.success) {
      globalStatus.textContent = result.error;
      globalStatus.hidden = false;
      globalStatus.classList.add('is-error');
      renderMods();
    }
  } catch (error) {
    globalStatus.textContent = error.message;
    globalStatus.hidden = false;
    globalStatus.classList.add('is-error');
    renderMods();
  }
}

refreshButton.addEventListener('click', () => window.modLauncher.refresh());
localModsButton.addEventListener('click', () => window.modLauncher.openLocalMods());
workshopButton.addEventListener('click', () => window.modLauncher.openWorkshop());
resetOrderButton.addEventListener('click', () => {
  orderedMods.sort((a, b) => a.loadOrder - b.loadOrder || a.id.localeCompare(b.id));
  renderMods();
});
playButton.addEventListener('click', launch);
saveList.querySelector('input[value="new"]').addEventListener('change', event => {
  if (event.target.checked) {
    selectedSave = 'new';
    renderMods();
  }
});

window.modLauncher.onStateChanged(applyState);
window.modLauncher.onWorkshopChanged(workshop => {
  if (launcherState) {
    launcherState.workshop = workshop;
    renderWorkshop(workshop);
  }
});
window.modLauncher.getState().then(applyState);
