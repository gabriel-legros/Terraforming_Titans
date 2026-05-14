function getAutomationAutoBuildBasisOptions(structure, currentValue) {
  const options = [];
  const seen = new Set();
  const addOption = (value, label) => {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    options.push({ value, label });
  };

  if (structure) {
    if (structure.autoBuildFillEnabled) {
      addOption('fill', getStructuresUIText('ui.structures.autoBuild.basis.fill', '% filled'));
    }
    addOption('population', getStructuresUIText('ui.structures.autoBuild.basis.population', '% of pop'));
    addOption('workers', getStructuresUIText('ui.structures.autoBuild.basis.workers', '% of workers'));
    if (structure.requiresWorker > 0) {
      addOption('workerShare', getStructuresUIText('ui.structures.autoBuild.basis.workerShare', '% worker share'));
    }
    if (structure.requiresLand > 0) {
      addOption('landShare', getStructuresUIText('ui.structures.autoBuild.basis.landShare', '% land share'));
    }
    addOption('geometricLand', getStructuresUIText('ui.structures.autoBuild.basis.geometricLand', '% geometric land'));
    addOption('fixed', getStructuresUIText('ui.structures.autoBuild.basis.fixed', 'Fixed'));
    addOption('building:storageDepot', getStructuresUIText('ui.structures.autoBuild.basis.storageDepots', '% of Storage Depots'));

    if (Array.isArray(structure.automationBuildingsDropDown)) {
      for (let index = 0; index < structure.automationBuildingsDropDown.length; index += 1) {
        const buildingId = structure.automationBuildingsDropDown[index];
        const basisValue = `building:${buildingId}`;
        const displayName = (buildings[buildingId] && buildings[buildingId].displayName) || buildingId;
        addOption(
          basisValue,
          getStructuresUIText('ui.structures.autoBuild.basis.percentOf', '% of {name}', { name: displayName })
        );
      }
    }

    if (Array.isArray(structure.automationCustomBasisOptions)) {
      for (let index = 0; index < structure.automationCustomBasisOptions.length; index += 1) {
        const optionData = structure.automationCustomBasisOptions[index];
        addOption(optionData.value, optionData.label);
      }
    }

    if (structure.autoBuildMaxOption) {
      addOption(
        'max',
        structure.getAutoBuildMaxModeLabel
          ? structure.getAutoBuildMaxModeLabel()
          : getStructuresUIText('ui.common.max', 'Max')
      );
    }
  }

  if (currentValue && !seen.has(currentValue)) {
    addOption(currentValue, currentValue);
  }

  return options;
}

function getDefaultAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getDefaultAutomationCombinationLabel(combination) {
  return combination.name || getAutomationCardText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function syncAutomationSelectOptions(select, options, selectedValue) {
  const selectedString = selectedValue !== undefined ? String(selectedValue) : null;
  const optionSignature = options.map(optionData => [
    String(optionData.value),
    optionData.label,
    optionData.disabled ? '1' : '0',
    optionData.hidden ? '1' : '0'
  ].join('|')).join('\u001f');
  if (select._automationOptionsSignature === optionSignature
    && (selectedString === null || select.value === selectedString)) {
    return;
  }

  const existingOptions = Array.from(select.options);
  const available = new Map();
  const desiredValues = new Set(options.map(optionData => String(optionData.value)));
  existingOptions.forEach((option) => {
    if (!available.has(option.value)) {
      available.set(option.value, []);
    }
    available.get(option.value).push(option);
  });

  const usedOptions = new Set();
  options.forEach((optionData) => {
    const value = String(optionData.value);
    const matching = available.get(value);
    const option = matching && matching.length > 0
      ? matching.shift()
      : document.createElement('option');
    usedOptions.add(option);
    const isNewOption = option.parentNode !== select;
    if (isNewOption) {
      select.appendChild(option);
    }
    if (option.value !== value) {
      option.value = value;
    }
    if (option.textContent !== optionData.label) {
      option.textContent = optionData.label;
    }
    option.disabled = !!optionData.disabled;
    option.hidden = !!optionData.hidden;
  });

  existingOptions.forEach((option) => {
    if (!usedOptions.has(option)) {
      if (desiredValues.has(option.value) && option.parentNode === select) {
        select.removeChild(option);
        return;
      }
      option.disabled = true;
      option.hidden = true;
    }
  });

  select._automationOptionsSignature = optionSignature;
  if (selectedString !== null) {
    select.value = selectedString;
  }
}

function buildAutomationPresetBuilderRow(config = {}) {
  const row = document.createElement('div');
  (config.rowClasses || []).forEach(className => row.classList.add(className));

  const presetSelect = document.createElement('select');
  (config.selectClasses || []).forEach(className => presetSelect.classList.add(className));

  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  (config.moveUpButtonClasses || []).forEach(className => presetMoveUpButton.classList.add(className));
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  (config.moveDownButtonClasses || []).forEach(className => presetMoveDownButton.classList.add(className));
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);

  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  (config.nameInputClasses || []).forEach(className => presetNameInput.classList.add(className));

  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  (config.newButtonClasses || []).forEach(className => newButton.classList.add(className));

  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  (config.saveButtonClasses || []).forEach(className => saveButton.classList.add(className));

  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  (config.deleteButtonClasses || []).forEach(className => deleteButton.classList.add(className));

  const transferButtons = createAutomationPresetTransferButtons(config.transferKey || 'automation-preset');

  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  (config.applyOnceButtonClasses || []).forEach(className => applyOnceButton.classList.add(className));

  const showSidebar = createAutomationShowInSidebarLabel(config.showSidebarKey || 'automation-preset');

  row.append(
    presetSelect,
    presetMoveButtons,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    transferButtons.importButton,
    transferButtons.exportButton,
    applyOnceButton,
    showSidebar.label
  );

  return {
    row,
    presetSelect,
    presetMoveUpButton,
    presetMoveDownButton,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    importButton: transferButtons.importButton,
    exportButton: transferButtons.exportButton,
    applyOnceButton,
    showInSidebarCheckbox: showSidebar.checkbox
  };
}

function buildAutomationCombinationApplySection(config = {}) {
  const section = document.createElement('div');
  (config.sectionClasses || []).forEach(className => section.classList.add(className));

  const header = document.createElement('div');
  (config.headerClasses || []).forEach(className => header.classList.add(className));
  const title = document.createElement('span');
  title.textContent = getAutomationCardText('presetCombinationTitle', {}, 'Preset Combination');
  header.append(title);
  section.appendChild(header);

  const nextTravelRow = document.createElement('div');
  (config.nextTravelRowClasses || []).forEach(className => nextTravelRow.classList.add(className));
  const nextTravelLabel = document.createElement('label');
  (config.nextTravelLabelClasses || []).forEach(className => nextTravelLabel.classList.add(className));
  const nextTravelText = document.createElement('span');
  nextTravelText.textContent = getAutomationCardText('combinationOnNextTravelLabel', {}, 'Combination on Next Travel');
  const nextTravelSelect = document.createElement('select');
  (config.nextTravelSelectClasses || []).forEach(className => nextTravelSelect.classList.add(className));
  const nextTravelPersistToggle = document.createElement('input');
  nextTravelPersistToggle.type = 'checkbox';
  (config.nextTravelPersistToggleClasses || []).forEach(className => nextTravelPersistToggle.classList.add(className));
  const nextTravelPersistText = document.createElement('span');
  nextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  (config.nextTravelPersistTextClasses || []).forEach(className => nextTravelPersistText.classList.add(className));
  nextTravelLabel.append(
    nextTravelText,
    nextTravelSelect,
    nextTravelPersistToggle,
    nextTravelPersistText
  );
  nextTravelRow.append(nextTravelLabel);
  section.appendChild(nextTravelRow);

  const combinationRow = document.createElement('div');
  (config.rowClasses || []).forEach(className => combinationRow.classList.add(className));
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = getAutomationCardText('applyCombinationButton', {}, 'Apply Combination');
  (config.applyCombinationButtonClasses || []).forEach(className => applyCombinationButton.classList.add(className));
  const combinationSelect = document.createElement('select');
  (config.combinationSelectClasses || []).forEach(className => combinationSelect.classList.add(className));
  const combinationMoveButtons = document.createElement('div');
  combinationMoveButtons.classList.add('automation-order-buttons');
  const combinationMoveUpButton = document.createElement('button');
  combinationMoveUpButton.textContent = '↑';
  combinationMoveUpButton.title = getAutomationCardText('moveCombinationUp', {}, 'Move combination up');
  (config.combinationMoveUpButtonClasses || []).forEach(className => combinationMoveUpButton.classList.add(className));
  const combinationMoveDownButton = document.createElement('button');
  combinationMoveDownButton.textContent = '↓';
  combinationMoveDownButton.title = getAutomationCardText('moveCombinationDown', {}, 'Move combination down');
  (config.combinationMoveDownButtonClasses || []).forEach(className => combinationMoveDownButton.classList.add(className));
  combinationMoveButtons.append(combinationMoveUpButton, combinationMoveDownButton);
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = getAutomationCardText('combinationNamePlaceholder', {}, 'Combination name');
  (config.combinationNameInputClasses || []).forEach(className => combinationNameInput.classList.add(className));
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = getAutomationCardText('newCombinationButton', {}, 'New');
  (config.combinationNewButtonClasses || []).forEach(className => combinationNewButton.classList.add(className));
  const combinationSaveButton = document.createElement('button');
  combinationSaveButton.textContent = getAutomationCardText('saveCombinationButton', {}, 'Save');
  (config.combinationSaveButtonClasses || []).forEach(className => combinationSaveButton.classList.add(className));
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = getAutomationCardText('deleteCombinationButton', {}, 'Delete');
  (config.combinationDeleteButtonClasses || []).forEach(className => combinationDeleteButton.classList.add(className));
  const combinationShowSidebar = createAutomationShowInSidebarLabel(config.combinationShowSidebarKey || 'automation-combination');
  combinationRow.append(
    combinationSelect,
    combinationMoveButtons,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDeleteButton,
    combinationShowSidebar.label,
    applyCombinationButton
  );
  section.appendChild(combinationRow);

  const applyList = document.createElement('div');
  (config.applyListClasses || []).forEach(className => applyList.classList.add(className));
  section.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  (config.addApplyButtonClasses || []).forEach(className => addApplyButton.classList.add(className));
  section.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  (config.applyHintClasses || []).forEach(className => applyHint.classList.add(className));
  section.appendChild(applyHint);

  return {
    section,
    applyCombinationButton,
    applyNextTravelSelect: nextTravelSelect,
    applyNextTravelPersistToggle: nextTravelPersistToggle,
    combinationSelect,
    combinationMoveUpButton,
    combinationMoveDownButton,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDeleteButton,
    combinationShowInSidebarCheckbox: combinationShowSidebar.checkbox,
    applyList,
    addApplyButton,
    applyHint
  };
}

function updateAutomationNextTravelCombinationControls(config = {}) {
  const automation = config.automation;
  const combinations = Array.isArray(config.combinations) ? config.combinations : [];
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!automation || !select || !persistToggle) {
    return;
  }

  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;

  const optionSignature = JSON.stringify(combinations.map((combo) => [combo.id, combo.name || '']));
  if (document.activeElement !== select && select._optionSignature !== optionSignature) {
    select.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    select.appendChild(noneOption);
    combinations.forEach((combo) => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getDefaultAutomationCombinationLabel(combo);
      select.appendChild(option);
    });
    select._optionSignature = optionSignature;
  }
  if (document.activeElement !== select) {
    select.value = automation.nextTravelCombinationId
      ? String(automation.nextTravelCombinationId)
      : '';
  }

  persistToggle.checked = automation.nextTravelCombinationPersistent;
  persistToggle.disabled = !automation.nextTravelCombinationId;
}

function updateAutomationCombinationControls(config = {}) {
  const automation = config.automation;
  const combinations = Array.isArray(config.combinations) ? config.combinations : [];
  const uiState = config.uiState;
  const select = config.selectElement;
  const nameInput = config.nameInputElement;
  const showCheckbox = config.showCheckboxElement;
  const moveUpButton = config.moveUpButtonElement;
  const moveDownButton = config.moveDownButtonElement;
  const deleteButton = config.deleteButtonElement;
  if (!automation || !uiState || !select || !nameInput || !showCheckbox || !moveUpButton || !moveDownButton || !deleteButton) {
    return null;
  }

  const optionSignature = JSON.stringify(combinations.map((combo) => [combo.id, combo.name || '']));
  if (document.activeElement !== select && select._optionSignature !== optionSignature) {
    select.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newCombinationOption', {}, 'New combination');
    select.appendChild(newOption);
    combinations.forEach((combo) => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getDefaultAutomationCombinationLabel(combo);
      select.appendChild(option);
    });
    select._optionSignature = optionSignature;
  }
  if (document.activeElement !== select) {
    select.value = automation.getSelectedCombinationId() || '';
  }

  const activeCombinationId = automation.getSelectedCombinationId();
  const activeCombination = activeCombinationId ? automation.getCombinationById(Number(activeCombinationId)) : null;
  const activeCombinationIndex = activeCombination
    ? combinations.findIndex((combo) => combo.id === activeCombination.id)
    : -1;
  if (activeCombination && uiState.combinationSyncedId !== activeCombinationId) {
    uiState.combinationName = activeCombination.name;
    uiState.combinationShowInSidebar = activeCombination.showInSidebar !== false;
    uiState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && uiState.combinationSyncedId) {
    uiState.combinationSyncedId = null;
  }

  if (document.activeElement !== nameInput) {
    nameInput.value = activeCombination
      ? activeCombination.name
      : uiState.combinationName;
  }
  showCheckbox.checked = activeCombination
    ? activeCombination.showInSidebar !== false
    : uiState.combinationShowInSidebar;

  deleteButton.disabled = !activeCombination;
  moveUpButton.disabled = activeCombinationIndex <= 0;
  moveDownButton.disabled = activeCombinationIndex < 0 || activeCombinationIndex >= combinations.length - 1;

  return {
    activeCombinationId,
    activeCombination,
    activeCombinationIndex
  };
}

function attachAutomationCombinationHandlers(config = {}) {
  const getAutomation = config.getAutomation;
  const uiState = config.uiState;
  if (!getAutomation || !uiState) {
    return;
  }

  const applyCombinationButton = config.applyCombinationButton;
  const nextTravelSelect = config.nextTravelSelect;
  const nextTravelPersistToggle = config.nextTravelPersistToggle;
  const combinationSelect = config.combinationSelect;
  const combinationMoveUpButton = config.combinationMoveUpButton;
  const combinationMoveDownButton = config.combinationMoveDownButton;
  const combinationNameInput = config.combinationNameInput;
  const combinationNewButton = config.combinationNewButton;
  const combinationShowInSidebarCheckbox = config.combinationShowInSidebarCheckbox;
  const combinationSaveButton = config.combinationSaveButton;
  const combinationDeleteButton = config.combinationDeleteButton;
  const addApplyButton = config.addApplyButton;

  applyCombinationButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    automation.applyCombinationPresets(comboId ? Number(comboId) : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  nextTravelSelect.addEventListener('change', (event) => {
    const automation = getAutomation();
    const comboId = event.target.value;
    automation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent
      && !!automation.nextTravelCombinationId;
    nextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
    nextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;
  });

  nextTravelPersistToggle.addEventListener('change', (event) => {
    const automation = getAutomation();
    automation.nextTravelCombinationPersistent = event.target.checked
      && !!automation.nextTravelCombinationId;
  });

  combinationSelect.addEventListener('change', (event) => {
    const automation = getAutomation();
    const comboId = event.target.value;
    uiState.combinationSyncedId = null;
    if (comboId) {
      automation.applyCombination(Number(comboId));
    } else {
      automation.setSelectedCombinationId(null);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationMoveUpButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.moveCombination(Number(comboId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationMoveDownButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.moveCombination(Number(comboId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationNameInput.addEventListener('input', (event) => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      uiState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const combo = automation.getCombinationById(Number(comboId));
    combo.name = event.target.value || '';
  });

  combinationNewButton.addEventListener('click', () => {
    const automation = getAutomation();
    automation.setSelectedCombinationId(null);
    uiState.combinationSyncedId = null;
    uiState.combinationName = '';
    uiState.combinationShowInSidebar = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationShowInSidebarCheckbox.addEventListener('change', () => {
    const automation = getAutomation();
    uiState.combinationShowInSidebar = combinationShowInSidebarCheckbox.checked;
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.setCombinationShowInSidebar(Number(comboId), uiState.combinationShowInSidebar);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationSaveButton.addEventListener('click', () => {
    const automation = getAutomation();
    const name = combinationNameInput.value || uiState.combinationName || '';
    const snapshot = automation.getAssignments().map((entry) => ({
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
      automation.setCombinationShowInSidebar(Number(comboId), uiState.combinationShowInSidebar);
    } else {
      const newComboId = automation.addCombination(name, snapshot);
      automation.setCombinationShowInSidebar(newComboId, uiState.combinationShowInSidebar);
      uiState.combinationSyncedId = null;
      uiState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationDeleteButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.deleteCombination(Number(comboId));
    uiState.combinationSyncedId = null;
    uiState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  addApplyButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function updateAutomationNextTravelPresetControls(config = {}) {
  const automation = config.automation;
  const presets = Array.isArray(config.presets) ? config.presets : [];
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!automation || !select || !persistToggle) {
    return;
  }

  const nextTravelPresetId = automation.nextTravelPresetId;
  const nextTravelPreset = nextTravelPresetId ? automation.getPresetById(nextTravelPresetId) : null;
  if (nextTravelPresetId && !nextTravelPreset) {
    automation.nextTravelPresetId = null;
    automation.nextTravelPersistent = false;
  }
  automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;

  if (document.activeElement !== select) {
    syncAutomationSelectOptions(
      select,
      [{ value: '', label: getAutomationCardText('noneOption', {}, 'None') }].concat(presets.map((preset) => ({
        value: preset.id,
        label: getDefaultAutomationPresetLabel(preset)
      }))),
      automation.nextTravelPresetId ? String(automation.nextTravelPresetId) : ''
    );
  }

  persistToggle.checked = automation.nextTravelPersistent;
  persistToggle.disabled = !automation.nextTravelPresetId;
}

function attachAutomationNextTravelPresetHandlers(config = {}) {
  const getAutomation = config.getAutomation;
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!getAutomation || !select || !persistToggle) {
    return;
  }

  select.addEventListener('change', (event) => {
    const automation = getAutomation();
    const presetId = event.target.value;
    automation.nextTravelPresetId = presetId ? Number(presetId) : null;
    automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;
    persistToggle.checked = automation.nextTravelPersistent;
    persistToggle.disabled = !automation.nextTravelPresetId;
  });

  persistToggle.addEventListener('change', (event) => {
    const automation = getAutomation();
    automation.nextTravelPersistent = event.target.checked && !!automation.nextTravelPresetId;
  });
}
