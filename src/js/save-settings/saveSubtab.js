function getSaveSlotLabel(slot) {
  return getSaveSlotName(slot, readSaveSlotNames());
}

function addSaveSlotRenameListeners() {
  RENAMABLE_SAVE_SLOTS.forEach(slot => {
    const renameButton = document.querySelector(`.save-slot-rename-button[data-slot="${slot}"]`);
    const label = document.getElementById(`${slot}-label`);

    renameButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const cell = renameButton.parentElement;
      if (cell.dataset.editing === 'true') return;
      cell.dataset.editing = 'true';

      const originalName = getSaveSlotLabel(slot);
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'save-slot-name-input';
      input.value = originalName;
      input.setAttribute('aria-label', t('ui.settings.saveSlotNameInputLabel', { slot: originalName }, 'Save slot name'));

      label.replaceWith(input);
      renameButton.disabled = true;
      input.focus();
      input.select();

      input.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter') {
          input.blur();
        }
        if (keyEvent.key === 'Escape') {
          input.value = originalName;
          input.blur();
        }
      });

      input.addEventListener('blur', () => {
        const nextName = normalizeSaveSlotName(slot, input.value);
        saveSaveSlotName(slot, nextName);
        label.textContent = nextName;
        input.replaceWith(label);
        renameButton.disabled = false;
        cell.dataset.editing = '';
      });
    });
  });
}

function addSaveSlotListeners() {
  const saveSlots = GAME_FEATURES.exitSaveSlot
    ? ['autosave', 'exitsave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5']
    : ['autosave', 'pretravel', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

  saveSlots.forEach(slot => {
    const saveButton = document.querySelector(`.save-button[data-slot="${slot}"]`);
    const loadButton = document.querySelector(`.load-button[data-slot="${slot}"]`);
    const deleteButton = document.querySelector(`.delete-button[data-slot="${slot}"]`);

    if (saveButton && slot !== 'pretravel') {
      saveButton.addEventListener('click', () => saveGameToSlot(slot));
    }

    loadButton.addEventListener('click', () => loadGame(`gameState_${slot}`));

    deleteButton.addEventListener('click', () => {
      if (confirm(t('ui.settings.confirmDeleteSlot', { slot: getSaveSlotLabel(slot) }, `Are you sure you want to delete the save file in ${getSaveSlotLabel(slot)}? This action cannot be undone.`))) {
        deleteSaveFileFromSlot(slot);
      }
    });
  });
}

function addSaveLoadListeners() {
  document.getElementById('new-game-button').addEventListener('click', () => {
    if (confirm(t('ui.settings.confirmNewGame', null, 'Are you sure you want to start a new game? Any unsaved progress will be lost.'))) {
      if (typeof startNewGame === 'function') {
        startNewGame();
      } else {
        initializeGameState();
        if (typeof openTerraformingWorldTab === 'function') {
          openTerraformingWorldTab();
        }
      }
    }
  });

  document.getElementById('save-to-file-button').addEventListener('click', saveGameToFile);
  document.getElementById('load-from-file-button').addEventListener('click', () => {
    document.getElementById('load-from-file-input').click();
  });

  const saveClipboardButton = document.getElementById('save-to-clipboard-button');
  if (saveClipboardButton) {
    saveClipboardButton.addEventListener('click', saveGameToClipboard);
  }

  const loadStringButton = document.getElementById('load-from-string-button');
  if (loadStringButton) {
    loadStringButton.addEventListener('click', loadGameFromString);
  }

  document.getElementById('load-from-file-input').addEventListener('change', loadGameFromFile);
}

function initializeSaveSubtab() {
  initializeExitSaveSlot();
  loadSaveSlotNames();
  addSaveSlotRenameListeners();
  addSaveSlotListeners();
  addSaveLoadListeners();
  updateAutosaveText();
}
