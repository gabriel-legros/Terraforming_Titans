const buildingAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderSelectedBuildings: [],
  builderCategoryValue: 'all',
  builderBuildingValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: ''
};

function getAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getAutomationCombinationLabel(combination) {
  return combination.name || getAutomationCardText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function formatBuildingAutomationPresetType(preset) {
  if (!preset) {
    return getAutomationCardText('selectPreset', {}, 'Select a preset');
  }
  if (preset.includeControl && preset.includeAutomation) {
    return getAutomationCardText('controlAutobuild', {}, 'Control + Autobuild');
  }
  if (preset.includeControl) {
    return getAutomationCardText('controlOnly', {}, 'Control only');
  }
  return getAutomationCardText('autobuildOnly', {}, 'Autobuild only');
}

function buildAutomationBuildingsUI() {
  const card = automationElements.buildingsAutomation || document.getElementById('automation-buildings');

  const toggleCollapsed = () => {
    const automation = automationManager.buildingsAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('buildingsAutomationTitle', {}, 'Buildings Automation'),
    toggleCollapsed
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const builderSection = document.createElement('div');
  builderSection.classList.add('building-automation-section');
  const builderHeader = document.createElement('div');
  builderHeader.classList.add('building-automation-section-title');
  const builderTitle = document.createElement('span');
  builderTitle.textContent = getAutomationCardText('researchAutomationPresetTitle', {}, 'Preset Builder');
  const builderDirty = document.createElement('span');
  builderDirty.classList.add('building-automation-builder-dirty');
  builderDirty.textContent = '*';
  builderDirty.style.display = 'none';
  builderHeader.append(builderTitle, builderDirty);
  builderSection.appendChild(builderHeader);

  const builderRow = document.createElement('div');
  builderRow.classList.add('building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('building-automation-builder-select');
  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  presetMoveUpButton.classList.add('building-automation-builder-move-up');
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  presetMoveDownButton.classList.add('building-automation-builder-move-down');
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetNameInput.classList.add('building-automation-builder-name');
  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  newButton.classList.add('building-automation-builder-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  saveButton.classList.add('building-automation-builder-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deleteButton.classList.add('building-automation-builder-delete');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  applyOnceButton.classList.add('building-automation-builder-apply-once');
  builderRow.append(presetSelect, presetMoveButtons, presetNameInput, newButton, saveButton, deleteButton, applyOnceButton);
  builderSection.appendChild(builderRow);

  const builderModeRow = document.createElement('div');
  builderModeRow.classList.add('building-automation-row');
  const typeSelect = document.createElement('select');
  typeSelect.classList.add('building-automation-builder-type');
  const controlOpt = document.createElement('option');
  controlOpt.value = 'control';
  controlOpt.textContent = getAutomationCardText('controlOnly', {}, 'Control only');
  const automationOpt = document.createElement('option');
  automationOpt.value = 'automation';
  automationOpt.textContent = getAutomationCardText('autobuildOnly', {}, 'Autobuild only');
  const bothOpt = document.createElement('option');
  bothOpt.value = 'both';
  bothOpt.textContent = getAutomationCardText('controlAutobuild', {}, 'Control + Autobuild');
  typeSelect.append(controlOpt, automationOpt, bothOpt);
  const scopeSelect = document.createElement('select');
  scopeSelect.classList.add('building-automation-builder-scope');
  const allScope = document.createElement('option');
  allScope.value = 'all';
  allScope.textContent = getAutomationCardText('allAvailableBuildings', {}, 'All available buildings');
  const manualScope = document.createElement('option');
  manualScope.value = 'manual';
  manualScope.textContent = getAutomationCardText('chooseBuildings', {}, 'Choose buildings');
  scopeSelect.append(allScope, manualScope);
  builderModeRow.append(typeSelect, scopeSelect);
  builderSection.appendChild(builderModeRow);

  const builderHint = document.createElement('div');
  builderHint.classList.add('building-automation-hint');
  builderHint.textContent = getAutomationCardText('buildingsBuilderHint', {}, 'Control saves worker priority, hidden state, recipe selections, and building controls (Disable if / Target albedo). Autobuild saves auto-build mode, target value, Auto-build toggle, Prioritize, Set active to target, and fill filters.');
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('building-automation-builder-category');
  const buildingSelect = document.createElement('select');
  buildingSelect.classList.add('building-automation-builder-building');
  const addButton = document.createElement('button');
  addButton.textContent = getAutomationCardText('addBuildingButton', {}, '+ Building');
  addButton.classList.add('building-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = getAutomationCardText('addCategoryButton', {}, '+ Category');
  addCategoryButton.classList.add('building-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = getAutomationCardText('clearAllButton', {}, '- All');
  clearButton.classList.add('building-automation-builder-clear');
  pickerRow.append(categorySelect, buildingSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('building-automation-builder-list');
  builderSection.appendChild(selectedList);

  const presetJsonDetails = createAutomationPresetJsonDetails('building-automation-preset-json-details');
  builderSection.appendChild(presetJsonDetails);

  body.appendChild(builderSection);

  const applySection = document.createElement('div');
  applySection.classList.add('building-automation-section');
  const applyHeader = document.createElement('div');
  applyHeader.classList.add('building-automation-section-title');
  const applyTitle = document.createElement('span');
  applyTitle.textContent = getAutomationCardText('presetCombinationTitle', {}, 'Preset Combination');
  const applyNextTravelLabel = document.createElement('label');
  applyNextTravelLabel.classList.add('building-automation-apply-next-travel-label');
  const applyNextTravelText = document.createElement('span');
  applyNextTravelText.textContent = getAutomationCardText('combinationOnNextTravelLabel', {}, 'Combination on Next Travel');
  const applyNextTravelSelect = document.createElement('select');
  applyNextTravelSelect.classList.add('building-automation-next-travel-select');
  const applyNextTravelPersistToggle = document.createElement('input');
  applyNextTravelPersistToggle.type = 'checkbox';
  applyNextTravelPersistToggle.classList.add('building-automation-next-travel-persist-toggle');
  const applyNextTravelPersistText = document.createElement('span');
  applyNextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  applyNextTravelPersistText.classList.add('building-automation-next-travel-persist-text');
  applyNextTravelLabel.append(
    applyNextTravelText,
    applyNextTravelSelect,
    applyNextTravelPersistToggle,
    applyNextTravelPersistText
  );
  applyHeader.append(applyTitle);
  applySection.appendChild(applyHeader);
  const applyNextTravelRow = document.createElement('div');
  applyNextTravelRow.classList.add('building-automation-next-travel-row');
  applyNextTravelRow.append(applyNextTravelLabel);
  applySection.appendChild(applyNextTravelRow);

  const combinationRow = document.createElement('div');
  combinationRow.classList.add('building-automation-row');
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = getAutomationCardText('applyCombinationButton', {}, 'Apply Combination');
  applyCombinationButton.classList.add('building-automation-apply-combination');
  const combinationSelect = document.createElement('select');
  combinationSelect.classList.add('building-automation-combination-select');
  const combinationMoveButtons = document.createElement('div');
  combinationMoveButtons.classList.add('automation-order-buttons');
  const combinationMoveUpButton = document.createElement('button');
  combinationMoveUpButton.textContent = '↑';
  combinationMoveUpButton.title = getAutomationCardText('moveCombinationUp', {}, 'Move combination up');
  combinationMoveUpButton.classList.add('building-automation-combination-move-up');
  const combinationMoveDownButton = document.createElement('button');
  combinationMoveDownButton.textContent = '↓';
  combinationMoveDownButton.title = getAutomationCardText('moveCombinationDown', {}, 'Move combination down');
  combinationMoveDownButton.classList.add('building-automation-combination-move-down');
  combinationMoveButtons.append(combinationMoveUpButton, combinationMoveDownButton);
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = getAutomationCardText('combinationNamePlaceholder', {}, 'Combination name');
  combinationNameInput.classList.add('building-automation-combination-name');
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = getAutomationCardText('newCombinationButton', {}, 'New');
  combinationNewButton.classList.add('building-automation-combination-new');
  const combinationSaveButton = document.createElement('button');
  combinationSaveButton.textContent = getAutomationCardText('saveCombinationButton', {}, 'Save');
  combinationSaveButton.classList.add('building-automation-combination-save');
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = getAutomationCardText('deleteCombinationButton', {}, 'Delete');
  combinationDeleteButton.classList.add('building-automation-combination-delete');
  combinationRow.append(
    combinationSelect,
    combinationMoveButtons,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDeleteButton,
    applyCombinationButton
  );
  applySection.appendChild(combinationRow);

  const applyList = document.createElement('div');
  applyList.classList.add('building-automation-apply-list');
  applySection.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  addApplyButton.classList.add('building-automation-apply-add');
  applySection.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  applyHint.classList.add('building-automation-apply-hint');
  applySection.appendChild(applyHint);

  body.appendChild(applySection);

  automationElements.buildingsCollapseButton = header.collapse;
  automationElements.buildingsPanelBody = body;
  automationElements.buildingsBuilderPresetSelect = presetSelect;
  automationElements.buildingsBuilderMoveUpButton = presetMoveUpButton;
  automationElements.buildingsBuilderMoveDownButton = presetMoveDownButton;
  automationElements.buildingsBuilderPresetNameInput = presetNameInput;
  automationElements.buildingsBuilderNewButton = newButton;
  automationElements.buildingsBuilderSaveButton = saveButton;
  automationElements.buildingsBuilderDeleteButton = deleteButton;
  automationElements.buildingsBuilderApplyOnceButton = applyOnceButton;
  automationElements.buildingsBuilderDirty = builderDirty;
  automationElements.buildingsBuilderTypeSelect = typeSelect;
  automationElements.buildingsBuilderScopeSelect = scopeSelect;
  automationElements.buildingsBuilderCategorySelect = categorySelect;
  automationElements.buildingsBuilderBuildingSelect = buildingSelect;
  automationElements.buildingsBuilderAddButton = addButton;
  automationElements.buildingsBuilderAddCategoryButton = addCategoryButton;
  automationElements.buildingsBuilderClearButton = clearButton;
  automationElements.buildingsBuilderSelectedList = selectedList;
  automationElements.buildingsPresetJsonDetails = presetJsonDetails;
  automationElements.buildingsApplyCombinationButton = applyCombinationButton;
  automationElements.buildingsApplyNextTravelSelect = applyNextTravelSelect;
  automationElements.buildingsApplyNextTravelPersistToggle = applyNextTravelPersistToggle;
  automationElements.buildingsCombinationSelect = combinationSelect;
  automationElements.buildingsCombinationMoveUpButton = combinationMoveUpButton;
  automationElements.buildingsCombinationMoveDownButton = combinationMoveDownButton;
  automationElements.buildingsCombinationNameInput = combinationNameInput;
  automationElements.buildingsCombinationNewButton = combinationNewButton;
  automationElements.buildingsCombinationSaveButton = combinationSaveButton;
  automationElements.buildingsCombinationDeleteButton = combinationDeleteButton;
  automationElements.buildingsApplyList = applyList;
  automationElements.buildingsApplyHint = applyHint;
  automationElements.buildingsAddApplyButton = addApplyButton;

  attachBuildingsAutomationHandlers();
}

function updateBuildingsAutomationUI() {
  const {
    buildingsAutomation,
    buildingsAutomationDescription,
    buildingsPanelBody,
    buildingsCollapseButton,
    buildingsBuilderPresetSelect,
    buildingsBuilderMoveUpButton,
    buildingsBuilderMoveDownButton,
    buildingsBuilderPresetNameInput,
    buildingsBuilderNewButton,
    buildingsBuilderSaveButton,
    buildingsBuilderDeleteButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderDirty,
    buildingsBuilderTypeSelect,
    buildingsBuilderScopeSelect,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderAddCategoryButton,
    buildingsBuilderClearButton,
    buildingsBuilderSelectedList,
    buildingsPresetJsonDetails,
    buildingsApplyList,
    buildingsApplyHint,
    buildingsApplyCombinationButton,
    buildingsApplyNextTravelSelect,
    buildingsApplyNextTravelPersistToggle,
    buildingsAddApplyButton,
    buildingsCombinationSelect,
    buildingsCombinationMoveUpButton,
    buildingsCombinationMoveDownButton,
    buildingsCombinationNameInput,
    buildingsCombinationNewButton,
    buildingsCombinationSaveButton,
    buildingsCombinationDeleteButton
  } = automationElements;
  const manager = automationManager;
  const automation = manager.buildingsAutomation;
  const unlocked = manager.hasFeature('automationBuildings');
  buildingsAutomation.style.display = unlocked ? '' : 'none';
  buildingsAutomation.classList.toggle('automation-card-locked', !unlocked);
  buildingsAutomationDescription.textContent = unlocked
    ? getAutomationCardText('buildingsAutomationDescriptionUnlocked', {}, 'Capture building control/autobuild settings and apply them in ordered presets.')
    : getAutomationCardText('buildingsAutomationDescriptionLocked', {}, 'Purchase the Solis Buildings Automation upgrade to enable building presets.');
  if (!unlocked) {
    return;
  }

  buildingsPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  buildingsCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  const presets = automation.presets.slice();
  const combinations = automation.getCombinations();
  const automatableBuildings = getAutomatableBuildings();

  if (document.activeElement !== buildingsBuilderPresetSelect) {
    buildingsBuilderPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newPresetOption', {}, 'New preset');
    buildingsBuilderPresetSelect.appendChild(newOption);
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getAutomationPresetLabel(preset);
      buildingsBuilderPresetSelect.appendChild(option);
    });
    buildingsBuilderPresetSelect.value = automation.getSelectedPresetId() || '';
  }

  const activePresetId = automation.getSelectedPresetId();
  const activePreset = activePresetId ? automation.getPresetById(Number(activePresetId)) : null;
  const activePresetIndex = activePreset
    ? presets.findIndex(preset => preset.id === activePreset.id)
    : -1;
  if (activePreset && buildingAutomationUIState.syncedPresetId !== activePresetId) {
    const names = Object.keys(activePreset.buildings);
    buildingAutomationUIState.builderScope = activePreset.scopeAll ? 'all' : 'manual';
    buildingAutomationUIState.builderSelectedBuildings = names.slice();
    buildingAutomationUIState.builderType = activePreset.includeControl && activePreset.includeAutomation
        ? 'both'
        : activePreset.includeControl
          ? 'control'
          : 'automation';
    buildingAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && buildingAutomationUIState.syncedPresetId) {
    buildingAutomationUIState.syncedPresetId = null;
  }
  updateAutomationPresetJsonDetails(buildingsPresetJsonDetails, activePreset);

  if (document.activeElement !== buildingsBuilderPresetNameInput) {
    buildingsBuilderPresetNameInput.value = activePreset ? activePreset.name : buildingAutomationUIState.builderName;
  }
  if (document.activeElement !== buildingsBuilderTypeSelect) {
    buildingsBuilderTypeSelect.value = buildingAutomationUIState.builderType;
  }
  if (document.activeElement !== buildingsBuilderScopeSelect) {
    buildingsBuilderScopeSelect.value = buildingAutomationUIState.builderScope;
  }

  const showManual = buildingAutomationUIState.builderScope === 'manual';
  buildingsBuilderCategorySelect.parentElement.style.display = showManual ? 'flex' : 'none';
  buildingsBuilderSelectedList.style.display = showManual ? 'flex' : 'none';
  buildingsBuilderClearButton.style.display = showManual ? '' : 'none';
  buildingsBuilderAddCategoryButton.style.display = showManual ? '' : 'none';

  const categories = getBuildingCategories();
  if (document.activeElement !== buildingsBuilderCategorySelect) {
    buildingsBuilderCategorySelect.textContent = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = getAutomationCardText('allCategoriesOption', {}, 'All categories');
    buildingsBuilderCategorySelect.appendChild(allOption);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      buildingsBuilderCategorySelect.appendChild(option);
    });
    buildingsBuilderCategorySelect.value = buildingAutomationUIState.builderCategoryValue || 'all';
    if (!buildingsBuilderCategorySelect.value) {
      buildingsBuilderCategorySelect.value = 'all';
    }
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value;
  }

  const selectedCategory = buildingsBuilderCategorySelect.value || buildingAutomationUIState.builderCategoryValue || 'all';
  if (document.activeElement !== buildingsBuilderBuildingSelect) {
    const available = automatableBuildings.filter(building => (
      selectedCategory === 'all' || building.category === selectedCategory
    ));
    buildingsBuilderBuildingSelect.textContent = '';
    if (available.length === 0) {
      const empty = document.createElement('option');
      empty.textContent = getAutomationCardText('noBuildingsAvailable', {}, 'No buildings available');
      empty.disabled = true;
      empty.selected = true;
      buildingsBuilderBuildingSelect.appendChild(empty);
    } else {
      available.forEach(building => {
        const option = document.createElement('option');
        option.value = building.name;
        option.textContent = building.displayName || building.name;
        buildingsBuilderBuildingSelect.appendChild(option);
      });
      if (buildingAutomationUIState.builderBuildingValue) {
        buildingsBuilderBuildingSelect.value = buildingAutomationUIState.builderBuildingValue;
      }
      if (!buildingsBuilderBuildingSelect.value) {
        buildingsBuilderBuildingSelect.value = available[0].name;
      }
    }
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
  }

  buildingsBuilderAddButton.disabled = buildingsBuilderBuildingSelect.options.length === 0
    || buildingsBuilderBuildingSelect.options[0].disabled;
  buildingsBuilderAddCategoryButton.disabled = buildingsBuilderCategorySelect.options.length === 0
    || !automatableBuildings.length;
  buildingsBuilderClearButton.disabled = buildingAutomationUIState.builderSelectedBuildings.length === 0;
  buildingsBuilderDeleteButton.disabled = !activePreset;
  buildingsBuilderApplyOnceButton.disabled = !activePreset;
  buildingsBuilderMoveUpButton.disabled = activePresetIndex <= 0;
  buildingsBuilderMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  buildingsApplyCombinationButton.disabled = automation.getAssignments().length === 0;
  buildingsCombinationSaveButton.disabled = automation.getAssignments().length === 0;
  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;
  if (document.activeElement !== buildingsApplyNextTravelSelect) {
    buildingsApplyNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    buildingsApplyNextTravelSelect.appendChild(noneOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getAutomationCombinationLabel(combo);
      buildingsApplyNextTravelSelect.appendChild(option);
    });
    buildingsApplyNextTravelSelect.value = automation.nextTravelCombinationId
      ? String(automation.nextTravelCombinationId)
      : '';
  }
  buildingsApplyNextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
  buildingsApplyNextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;

  if (document.activeElement !== buildingsCombinationSelect) {
    buildingsCombinationSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newCombinationOption', {}, 'New combination');
    buildingsCombinationSelect.appendChild(newOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getAutomationCombinationLabel(combo);
      buildingsCombinationSelect.appendChild(option);
    });
    buildingsCombinationSelect.value = automation.getSelectedCombinationId() || '';
  }

  const activeCombinationId = automation.getSelectedCombinationId();
  const activeCombination = activeCombinationId ? automation.getCombinationById(Number(activeCombinationId)) : null;
  const activeCombinationIndex = activeCombination
    ? combinations.findIndex(combo => combo.id === activeCombination.id)
    : -1;
  if (activeCombination && buildingAutomationUIState.combinationSyncedId !== activeCombinationId) {
    buildingAutomationUIState.combinationName = activeCombination.name;
    buildingAutomationUIState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && buildingAutomationUIState.combinationSyncedId) {
    buildingAutomationUIState.combinationSyncedId = null;
  }

  if (document.activeElement !== buildingsCombinationNameInput) {
    buildingsCombinationNameInput.value = activeCombination
      ? activeCombination.name
      : buildingAutomationUIState.combinationName;
  }

  buildingsCombinationDeleteButton.disabled = !activeCombination;
  buildingsCombinationMoveUpButton.disabled = activeCombinationIndex <= 0;
  buildingsCombinationMoveDownButton.disabled = activeCombinationIndex < 0 || activeCombinationIndex >= combinations.length - 1;

  const selectedHasFocus = buildingsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  if (!selectedHasFocus) {
    buildingsBuilderSelectedList.textContent = '';
    buildingAutomationUIState.builderSelectedBuildings.forEach(name => {
      const building = buildings[name];
      const pill = document.createElement('div');
      pill.classList.add('building-automation-builder-pill');
      const label = document.createElement('span');
      label.textContent = building.displayName || name;
      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = getAutomationCardText('removeBuilding', {}, 'Remove building');
      remove.addEventListener('click', () => {
        buildingAutomationUIState.builderSelectedBuildings = buildingAutomationUIState.builderSelectedBuildings.filter(id => id !== name);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      buildingsBuilderSelectedList.appendChild(pill);
    });
  }

  const savedType = activePreset
    ? activePreset.includeControl && activePreset.includeAutomation
      ? 'both'
      : activePreset.includeControl
        ? 'control'
        : 'automation'
    : 'both';
  const savedScope = activePreset
    ? activePreset.scopeAll
      ? 'all'
      : 'manual'
    : 'all';
  const savedBuildingIds = activePreset ? Object.keys(activePreset.buildings) : [];
  const savedBuildingSet = new Set(savedBuildingIds);
  const manualSelection = buildingAutomationUIState.builderScope === 'manual';
  const selectionChanged = manualSelection
    && (buildingAutomationUIState.builderSelectedBuildings.length !== savedBuildingIds.length
      || buildingAutomationUIState.builderSelectedBuildings.some(id => !savedBuildingSet.has(id)));
  const newDirty = !activePreset
    && (
      buildingAutomationUIState.builderName.trim() !== ''
      || buildingAutomationUIState.builderType !== 'both'
      || buildingAutomationUIState.builderScope !== 'all'
      || buildingAutomationUIState.builderSelectedBuildings.length > 0
    );
  const existingDirty = !!activePreset
    && (
      buildingAutomationUIState.builderType !== savedType
      || buildingAutomationUIState.builderScope !== savedScope
      || selectionChanged
    );
  buildingsBuilderDirty.style.display = newDirty || existingDirty ? '' : 'none';

  const applyHasFocus = buildingsApplyList.contains(document.activeElement)
    && document.activeElement.tagName === 'SELECT';
  if (!applyHasFocus) {
    const assignments = automation.getAssignments();
    const applySignature = JSON.stringify({
      presets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeControl: preset.includeControl,
        includeAutomation: preset.includeAutomation,
        scopeAll: preset.scopeAll,
        buildings: Object.keys(preset.buildings)
      })),
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        presetId: assignment.presetId,
        enabled: assignment.enabled
      }))
    });
    if (buildingsApplyList._renderSignature !== applySignature) {
      buildingsApplyList.textContent = '';
      assignments.forEach((assignment, index) => {
        const row = document.createElement('div');
        row.classList.add('building-automation-apply-row');
        const primary = document.createElement('div');
        primary.classList.add('building-automation-apply-primary');
        const toggle = createToggleButton({
          onLabel: getAutomationCardText('applyOn', {}, 'Apply On'),
          offLabel: getAutomationCardText('applyOff', {}, 'Apply Off'),
          isOn: assignment.enabled
        });
        toggle.classList.add('building-automation-apply-toggle');
        toggle.addEventListener('click', () => {
          automation.setAssignmentEnabled(assignment.id, !assignment.enabled);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        const select = document.createElement('select');
        presets.forEach(preset => {
          const option = document.createElement('option');
          option.value = String(preset.id);
          option.textContent = getAutomationPresetLabel(preset);
          if (assignment.presetId === preset.id) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        if (!presets.length) {
          const empty = document.createElement('option');
          empty.textContent = getAutomationCardText('noPresetsSaved', {}, 'No presets saved');
          empty.disabled = true;
          empty.selected = true;
          select.appendChild(empty);
        }
        const detail = document.createElement('span');
        detail.classList.add('building-automation-apply-detail');
        const updateDetail = (presetId) => {
          const preset = automation.getPresetById(presetId);
          const detailText = formatBuildingAutomationPresetType(preset);
          const buildingList = preset
            ? preset.scopeAll
              ? getAutomationCardText('allAvailableBuildings', {}, 'All available buildings')
              : Object.keys(preset.buildings).map(id => {
                  const building = buildings[id];
                  return building.displayName || id;
                }).join(', ')
            : '';
          detail.textContent = buildingList ? `${detailText} / ${buildingList}` : detailText;
        };
        updateDetail(assignment.presetId);
        select.addEventListener('change', (event) => {
          const presetId = Number(event.target.value);
          automation.setAssignmentPreset(assignment.id, presetId);
          updateDetail(presetId);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });

        const controls = document.createElement('div');
        controls.classList.add('building-automation-apply-controls');
        const moveUp = document.createElement('button');
        moveUp.textContent = '↑';
        moveUp.title = getAutomationCardText('moveApplyUp', {}, 'Move up');
        moveUp.disabled = index === 0;
        moveUp.addEventListener('click', () => {
          automation.moveAssignment(assignment.id, -1);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        const moveDown = document.createElement('button');
        moveDown.textContent = '↓';
        moveDown.title = getAutomationCardText('moveApplyDown', {}, 'Move down');
        moveDown.disabled = index === assignments.length - 1;
        moveDown.addEventListener('click', () => {
          automation.moveAssignment(assignment.id, 1);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        const remove = document.createElement('button');
        remove.textContent = '✕';
        remove.title = getAutomationCardText('removePresetFromApply', {}, 'Remove preset');
        remove.addEventListener('click', () => {
          automation.removeAssignment(assignment.id);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        controls.append(moveUp, moveDown, remove);
        primary.append(toggle, select);
        row.append(primary, detail, controls);
        buildingsApplyList.appendChild(row);
      });
      buildingsApplyList._renderSignature = applySignature;
    }
  }

  buildingsAddApplyButton.disabled = presets.length === 0;
  buildingsApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('buildingsApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('buildingsApplyHintRule', {}, 'Lower presets override higher presets when they target the same building and setting type.');
}

function attachBuildingsAutomationHandlers() {
  const {
    buildingsBuilderPresetSelect,
    buildingsBuilderMoveUpButton,
    buildingsBuilderMoveDownButton,
    buildingsBuilderPresetNameInput,
    buildingsBuilderNewButton,
    buildingsBuilderSaveButton,
    buildingsBuilderDeleteButton,
    buildingsBuilderTypeSelect,
    buildingsBuilderScopeSelect,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderAddCategoryButton,
    buildingsBuilderClearButton,
    buildingsApplyCombinationButton,
    buildingsApplyNextTravelSelect,
    buildingsApplyNextTravelPersistToggle,
    buildingsCombinationSelect,
    buildingsCombinationMoveUpButton,
    buildingsCombinationMoveDownButton,
    buildingsCombinationNameInput,
    buildingsCombinationNewButton,
    buildingsCombinationSaveButton,
    buildingsCombinationDeleteButton,
    buildingsAddApplyButton
  } = automationElements;

  buildingsBuilderPresetSelect.addEventListener('change', (event) => {
    automationManager.buildingsAutomation.setSelectedPresetId(event.target.value || null);
    buildingAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  buildingsBuilderMoveUpButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.buildingsAutomation.movePreset(Number(presetId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  buildingsBuilderMoveDownButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.buildingsAutomation.movePreset(Number(presetId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderPresetNameInput.addEventListener('input', (event) => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      buildingAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const preset = automationManager.buildingsAutomation.getPresetById(Number(presetId));
    if (!preset) {
      return;
    }
    automationManager.buildingsAutomation.renamePreset(preset.id, event.target.value || '');
  });

  buildingsBuilderNewButton.addEventListener('click', () => {
    automationManager.buildingsAutomation.setSelectedPresetId(null);
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.builderName = '';
    buildingAutomationUIState.builderScope = 'all';
    buildingAutomationUIState.builderType = 'both';
    buildingAutomationUIState.builderSelectedBuildings = [];
    buildingAutomationUIState.builderCategoryValue = 'all';
    buildingAutomationUIState.builderBuildingValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderTypeSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderType = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderScopeSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderScope = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderCategorySelect.addEventListener('change', () => {
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value || 'all';
    buildingAutomationUIState.builderBuildingValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderBuildingSelect.addEventListener('change', () => {
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
  });

  buildingsBuilderAddButton.addEventListener('click', () => {
    const buildingId = buildingsBuilderBuildingSelect.value;
    if (!buildingId) {
      return;
    }
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value || 'all';
    buildingAutomationUIState.builderBuildingValue = buildingId;
    if (!buildingAutomationUIState.builderSelectedBuildings.includes(buildingId)) {
      buildingAutomationUIState.builderSelectedBuildings.push(buildingId);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = buildingsBuilderCategorySelect.value || 'all';
    const automatableBuildings = getAutomatableBuildings();
    const additions = automatableBuildings.filter(building => (
      selectedCategory === 'all' || building.category === selectedCategory
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(building => {
      if (!buildingAutomationUIState.builderSelectedBuildings.includes(building.name)) {
        buildingAutomationUIState.builderSelectedBuildings.push(building.name);
      }
    });
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderClearButton.addEventListener('click', () => {
    buildingAutomationUIState.builderSelectedBuildings = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderSaveButton.addEventListener('click', () => {
    const automation = automationManager.buildingsAutomation;
    const name = buildingsBuilderPresetNameInput.value || buildingAutomationUIState.builderName || '';
    const type = buildingAutomationUIState.builderType;
    const includeControl = type === 'control' || type === 'both';
    const includeAutomation = type === 'automation' || type === 'both';
    const scopeAll = buildingAutomationUIState.builderScope === 'all';
    const buildingIds = buildingAutomationUIState.builderScope === 'all'
      ? getAutomatableBuildings().map(building => building.name)
      : buildingAutomationUIState.builderSelectedBuildings.slice();
    const presetId = automation.getSelectedPresetId();
    if (presetId) {
      automation.updatePreset(Number(presetId), name, buildingIds, { includeControl, includeAutomation, scopeAll });
    } else {
      automation.addPreset(name, buildingIds, { includeControl, includeAutomation, scopeAll });
      buildingAutomationUIState.syncedPresetId = null;
      buildingAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderDeleteButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.buildingsAutomation.deletePreset(Number(presetId));
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.builderName = '';
    buildingAutomationUIState.builderSelectedBuildings = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.buildingsAutomation.applyPresetOnce(presetId);
    }
  });

  buildingsApplyCombinationButton.addEventListener('click', () => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    automationManager.buildingsAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
  });

  buildingsApplyNextTravelSelect.addEventListener('change', (event) => {
    const comboId = event.target.value;
    automationManager.buildingsAutomation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automationManager.buildingsAutomation.nextTravelCombinationPersistent = automationManager.buildingsAutomation.nextTravelCombinationPersistent
      && !!automationManager.buildingsAutomation.nextTravelCombinationId;
    buildingsApplyNextTravelPersistToggle.checked = automationManager.buildingsAutomation.nextTravelCombinationPersistent;
    buildingsApplyNextTravelPersistToggle.disabled = !automationManager.buildingsAutomation.nextTravelCombinationId;
  });
  buildingsApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    automationManager.buildingsAutomation.nextTravelCombinationPersistent = event.target.checked
      && !!automationManager.buildingsAutomation.nextTravelCombinationId;
  });

  buildingsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.buildingsAutomation.setSelectedCombinationId(comboId);
    buildingAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.buildingsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  buildingsCombinationMoveUpButton.addEventListener('click', () => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.buildingsAutomation.moveCombination(Number(comboId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  buildingsCombinationMoveDownButton.addEventListener('click', () => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.buildingsAutomation.moveCombination(Number(comboId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsCombinationNameInput.addEventListener('input', (event) => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    if (!comboId) {
      buildingAutomationUIState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const combo = automationManager.buildingsAutomation.getCombinationById(Number(comboId));
    combo.name = event.target.value || '';
  });

  buildingsCombinationNewButton.addEventListener('click', () => {
    automationManager.buildingsAutomation.setSelectedCombinationId(null);
    buildingAutomationUIState.combinationSyncedId = null;
    buildingAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsCombinationSaveButton.addEventListener('click', () => {
    const automation = automationManager.buildingsAutomation;
    const name = buildingsCombinationNameInput.value || buildingAutomationUIState.combinationName || '';
    const snapshot = automation.getAssignments().map(entry => ({
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
    } else {
      automation.addCombination(name, snapshot);
      buildingAutomationUIState.combinationSyncedId = null;
      buildingAutomationUIState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsCombinationDeleteButton.addEventListener('click', () => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.buildingsAutomation.deleteCombination(Number(comboId));
    buildingAutomationUIState.combinationSyncedId = null;
    buildingAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsAddApplyButton.addEventListener('click', () => {
    const automation = automationManager.buildingsAutomation;
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getAutomatableBuildings() {
  const automation = automationManager?.buildingsAutomation;
  return Object.values(buildings).filter((building) => {
    if (!automation) {
      return building.unlocked;
    }
    return automation.shouldShowBuildingInAutomation(building);
  });
}
