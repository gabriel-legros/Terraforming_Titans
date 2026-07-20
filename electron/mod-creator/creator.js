const globalStatus = document.getElementById('global-status');
const refreshButton = document.getElementById('refresh-button');
const localModsButton = document.getElementById('local-mods-button');
const workshopButton = document.getElementById('workshop-button');
const localModSelect = document.getElementById('local-mod-select');
const workshopItemSelect = document.getElementById('workshop-item-select');
const modDetails = document.getElementById('mod-details');
const modValidation = document.getElementById('mod-validation');
const itemDetails = document.getElementById('item-details');
const openModFolderButton = document.getElementById('open-mod-folder-button');
const openItemButton = document.getElementById('open-item-button');
const appIdLabel = document.getElementById('app-id-label');
const publisherForm = document.getElementById('publisher-form');
const editorFields = document.getElementById('editor-fields');
const titleInput = document.getElementById('title-input');
const descriptionInput = document.getElementById('description-input');
const visibilitySelect = document.getElementById('visibility-select');
const tagsInput = document.getElementById('tags-input');
const changeNoteInput = document.getElementById('change-note-input');
const previewName = document.getElementById('preview-name');
const previewHelp = document.getElementById('preview-help');
const choosePreviewButton = document.getElementById('choose-preview-button');
const clearPreviewButton = document.getElementById('clear-preview-button');
const uploadProgress = document.getElementById('upload-progress');
const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const termsButton = document.getElementById('terms-button');
const publishButton = document.getElementById('publish-button');

let creatorState = null;
let selectedInstanceId = '';
let selectedWorkshopId = '';
let operationMessage = '';
let operationError = false;
const localModOptions = new Map();
const workshopItemOptions = new Map();

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function getSelectedMod() {
  return creatorState && creatorState.localMods.find(mod => mod.instanceId === selectedInstanceId);
}

function getSelectedItem() {
  return creatorState && creatorState.publishedItems.find(item => item.workshopId === selectedWorkshopId);
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Unknown date';
}

function renderStatus() {
  let message = operationMessage;
  let isError = operationError;
  if (!message && creatorState) {
    if (creatorState.error) {
      message = creatorState.error;
      isError = true;
    } else if (!creatorState.steamEnabled) {
      message = 'Uploads require a packaged Steam build. Local mod validation is still available.';
    } else if (!creatorState.steamInitialized) {
      message = 'Steamworks is unavailable. Launch this build from the Steam client.';
      isError = true;
    } else if (creatorState.refreshing) {
      message = 'Refreshing your published Workshop items…';
    } else {
      message = 'Ready to publish.';
    }
  }
  setText(globalStatus, message);
  globalStatus.classList.toggle('is-error', isError);
  globalStatus.classList.toggle('is-success', !!operationMessage && !isError);
}

function reconcileLocalModOptions() {
  const activeIds = new Set();
  creatorState.localMods.forEach((mod, index) => {
    activeIds.add(mod.instanceId);
    let option = localModOptions.get(mod.instanceId);
    if (!option) {
      option = document.createElement('option');
      option.value = mod.instanceId;
      localModOptions.set(mod.instanceId, option);
    }
    option.textContent = `${mod.name || mod.folderName}${mod.valid ? '' : ' — Invalid'}`;
    const expected = localModSelect.children[index];
    if (expected !== option) localModSelect.insertBefore(option, expected || null);
  });
  localModOptions.forEach((option, instanceId) => {
    if (!activeIds.has(instanceId)) {
      option.remove();
      localModOptions.delete(instanceId);
    }
  });
  if (!creatorState.localMods.some(mod => mod.instanceId === selectedInstanceId)) {
    selectedInstanceId = creatorState.localMods.length ? creatorState.localMods[0].instanceId : '';
  }
  localModSelect.value = selectedInstanceId;
}

function reconcileWorkshopItemOptions() {
  const activeIds = new Set();
  creatorState.publishedItems.forEach((item, index) => {
    activeIds.add(item.workshopId);
    let option = workshopItemOptions.get(item.workshopId);
    if (!option) {
      option = document.createElement('option');
      option.value = item.workshopId;
      workshopItemOptions.set(item.workshopId, option);
    }
    option.textContent = `${item.title || 'Untitled item'} (${item.workshopId})`;
    const expected = workshopItemSelect.children[index + 1];
    if (expected !== option) workshopItemSelect.insertBefore(option, expected || null);
  });
  workshopItemOptions.forEach((option, workshopId) => {
    if (!activeIds.has(workshopId)) {
      option.remove();
      workshopItemOptions.delete(workshopId);
    }
  });
  if (selectedWorkshopId && !creatorState.publishedItems.some(item => item.workshopId === selectedWorkshopId)) {
    selectedWorkshopId = '';
  }
  workshopItemSelect.value = selectedWorkshopId;
}

function populateEditor() {
  const mod = getSelectedMod();
  const item = getSelectedItem();
  if (!mod) {
    titleInput.value = '';
    descriptionInput.value = '';
    visibilitySelect.value = '0';
    tagsInput.value = '';
    changeNoteInput.value = '';
    return;
  }
  titleInput.value = item ? item.title : mod.name;
  descriptionInput.value = item ? item.description : `${mod.name} for Terraforming Titans.`;
  visibilitySelect.value = item ? String(item.visibility) : '0';
  tagsInput.value = item ? item.tags.join(', ') : '';
  changeNoteInput.value = '';
}

function selectMod(instanceId) {
  selectedInstanceId = instanceId;
  const mod = getSelectedMod();
  selectedWorkshopId = mod && creatorState.publishedItems.some(item => item.workshopId === mod.linkedWorkshopId)
    ? mod.linkedWorkshopId
    : '';
  localModSelect.value = selectedInstanceId;
  workshopItemSelect.value = selectedWorkshopId;
  populateEditor();
  renderSelection();
}

function renderSelection() {
  const mod = getSelectedMod();
  const item = getSelectedItem();
  const busy = creatorState && creatorState.busy;
  if (mod) {
    setText(modDetails, [mod.id, mod.version && `v${mod.version}`, mod.contentHash && mod.contentHash.slice(0, 12)].filter(Boolean).join(' · '));
    setText(modValidation, mod.valid ? 'Manifest and declared content are valid.' : mod.validationError);
    modValidation.classList.toggle('is-valid', mod.valid);
    modValidation.classList.toggle('is-error', !mod.valid);
    setText(previewName, mod.previewName || 'No image selected');
  } else {
    setText(modDetails, 'No local mods were found.');
    setText(modValidation, 'Add a mod to the Local Mods folder, then refresh.');
    modValidation.classList.remove('is-valid');
    modValidation.classList.add('is-error');
    setText(previewName, 'No image selected');
  }
  setText(itemDetails, item
    ? `Updated ${formatDate(item.timeUpdated)} · Workshop ${item.workshopId}${item.banned ? ' · Banned' : ''}`
    : 'A new item ID will be created and linked to this mod after the first upload.');
  setText(previewHelp, item
    ? 'Choose an image smaller than 1 MB only when you want to replace the current Workshop preview.'
    : 'A PNG, JPEG, or GIF smaller than 1 MB is required for a new item.');
  editorFields.disabled = !mod || !mod.valid || busy;
  localModSelect.disabled = busy || !creatorState.localMods.length;
  workshopItemSelect.disabled = busy || !mod;
  openModFolderButton.disabled = !mod || busy;
  openItemButton.disabled = !item || busy;
  choosePreviewButton.disabled = !mod || !mod.valid || busy;
  clearPreviewButton.disabled = !mod || !mod.previewName || busy;
  refreshButton.disabled = creatorState.refreshing || busy;
  publishButton.disabled = !mod || !mod.valid || !creatorState.steamInitialized || busy || (!item && !mod.previewName);
  publishButton.textContent = item ? 'Update Workshop Item' : 'Create & Upload';
}

function applyState(state, resetEditor) {
  const previousInstanceId = selectedInstanceId;
  creatorState = state;
  setText(appIdLabel, `Publishing to Workshop AppID ${state.appId}.`);
  reconcileLocalModOptions();
  reconcileWorkshopItemOptions();
  const selectionChanged = previousInstanceId !== selectedInstanceId;
  if (selectionChanged || resetEditor) {
    const mod = getSelectedMod();
    selectedWorkshopId = mod && state.publishedItems.some(item => item.workshopId === mod.linkedWorkshopId)
      ? mod.linkedWorkshopId
      : selectedWorkshopId;
    workshopItemSelect.value = selectedWorkshopId;
    populateEditor();
  }
  renderStatus();
  renderSelection();
}

function showOperation(message, isError) {
  operationMessage = message;
  operationError = isError;
  renderStatus();
}

function renderProgress(progress) {
  uploadProgress.hidden = false;
  setText(progressLabel, progress.label);
  const processed = BigInt(progress.processed);
  const total = BigInt(progress.total);
  const percent = total > 0n ? Number(processed * 100n / total) : 0;
  setText(progressPercent, total > 0n ? `${percent}%` : '');
  progressFill.style.width = `${percent}%`;
}

localModSelect.addEventListener('change', () => selectMod(localModSelect.value));
workshopItemSelect.addEventListener('change', () => {
  selectedWorkshopId = workshopItemSelect.value;
  populateEditor();
  renderSelection();
});
refreshButton.addEventListener('click', async () => {
  operationMessage = '';
  const result = await window.modCreator.refresh();
  applyState(result, false);
});
localModsButton.addEventListener('click', () => window.modCreator.openModFolder(''));
workshopButton.addEventListener('click', () => window.modCreator.openWorkshop());
openModFolderButton.addEventListener('click', () => window.modCreator.openModFolder(selectedInstanceId));
openItemButton.addEventListener('click', () => window.modCreator.openWorkshopItem(selectedWorkshopId));
termsButton.addEventListener('click', () => window.modCreator.openTerms());
choosePreviewButton.addEventListener('click', async () => {
  const result = await window.modCreator.choosePreview(selectedInstanceId);
  if (!result.success && result.error) showOperation(result.error, true);
  else if (!result.canceled) showOperation('', false);
});
clearPreviewButton.addEventListener('click', () => window.modCreator.clearPreview(selectedInstanceId));

publisherForm.addEventListener('submit', async event => {
  event.preventDefault();
  uploadProgress.hidden = false;
  progressFill.style.width = '0%';
  setText(progressLabel, 'Creating upload request');
  setText(progressPercent, '');
  showOperation('Preparing Workshop upload…', false);
  renderSelection();
  try {
    const result = await window.modCreator.publish({
      instanceId: selectedInstanceId,
      workshopId: selectedWorkshopId,
      title: titleInput.value,
      description: descriptionInput.value,
      visibility: Number(visibilitySelect.value),
      tags: tagsInput.value.split(','),
      changeNote: changeNoteInput.value
    });
    if (!result.success) {
      applyState(result.state, true);
      showOperation(result.error, true);
      renderSelection();
      return;
    }
    selectedWorkshopId = result.workshopId;
    applyState(result.state, true);
    progressFill.style.width = '100%';
    setText(progressPercent, '100%');
    setText(progressLabel, 'Upload complete');
    const agreement = result.needsToAcceptAgreement ? ' Accept the Workshop agreement in the page Steam opened.' : '';
    showOperation(`${result.created ? 'Created' : 'Updated'} Workshop item ${result.workshopId}.${agreement}`, false);
  } catch (error) {
    showOperation(error.message, true);
    renderSelection();
  }
});

window.modCreator.onStateChanged(state => applyState(state, false));
window.modCreator.onProgress(renderProgress);
window.modCreator.getState().then(state => {
  applyState(state, true);
  window.modCreator.refresh().then(refreshed => applyState(refreshed, false));
});
