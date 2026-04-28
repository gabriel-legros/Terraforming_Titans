const colonyAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderShowInSidebar: true,
  builderSelectedTargets: [],
  builderCategoryValue: 'all',
  builderTargetValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: '',
  combinationShowInSidebar: true
};

function getColonyAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getColonyAutomationCombinationLabel(combination) {
  return combination.name || getAutomationCardText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function buildAutomationColonyUI() {
  const card = automationElements.colonyAutomation || document.getElementById('automation-colony');

  const toggleCollapsed = () => {
    const automation = automationManager.colonyAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('colonyAutomationTitle', {}, 'Colony Automation'),
    toggleCollapsed
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const builderSection = document.createElement('div');
  builderSection.classList.add('colony-automation-section', 'building-automation-section');
  const builderHeader = document.createElement('div');
  builderHeader.classList.add('colony-automation-section-title', 'building-automation-section-title');
  const builderTitle = document.createElement('span');
  builderTitle.textContent = getAutomationCardText('researchAutomationPresetTitle', {}, 'Preset Builder');
  const builderDirty = document.createElement('span');
  builderDirty.classList.add('colony-automation-builder-dirty', 'building-automation-builder-dirty');
  builderDirty.textContent = '*';
  builderDirty.style.display = 'none';
  builderHeader.append(builderTitle, builderDirty);
  builderSection.appendChild(builderHeader);

  const builderRow = document.createElement('div');
  builderRow.classList.add('colony-automation-row', 'building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('colony-automation-builder-select');
  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  presetMoveUpButton.classList.add('colony-automation-builder-move-up');
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  presetMoveDownButton.classList.add('colony-automation-builder-move-down');
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetNameInput.classList.add('colony-automation-builder-name');
  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  newButton.classList.add('colony-automation-builder-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  saveButton.classList.add('colony-automation-builder-save', 'building-automation-builder-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deleteButton.classList.add('colony-automation-builder-delete');
  const transferButtons = createAutomationPresetTransferButtons('colony-automation-builder');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  applyOnceButton.classList.add('colony-automation-builder-apply-once');
  const builderShowSidebar = createAutomationShowInSidebarLabel('colony-automation-builder');
  builderRow.append(
    presetSelect,
    presetMoveButtons,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    transferButtons.importButton,
    transferButtons.exportButton,
    applyOnceButton,
    builderShowSidebar.label
  );
  builderSection.appendChild(builderRow);

  const builderModeRow = document.createElement('div');
  builderModeRow.classList.add('colony-automation-row', 'building-automation-row');
  const typeSelect = document.createElement('select');
  typeSelect.classList.add('colony-automation-builder-type');
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
  scopeSelect.classList.add('colony-automation-builder-scope');
  const allScope = document.createElement('option');
  allScope.value = 'all';
  allScope.textContent = getAutomationCardText('allAvailableTargets', {}, 'All available targets');
  const manualScope = document.createElement('option');
  manualScope.value = 'manual';
  manualScope.textContent = getAutomationCardText('chooseTargets', {}, 'Choose targets');
  scopeSelect.append(allScope, manualScope);
  builderModeRow.append(typeSelect, scopeSelect);
  builderSection.appendChild(builderModeRow);

  const builderHint = document.createElement('div');
  builderHint.classList.add('colony-automation-hint', 'building-automation-hint');
  builderHint.textContent = getAutomationCardText('colonyBuilderHint', {}, 'Colony Buildings capture colony controls and autobuild settings, including aerostat controls. Other categories capture control settings only.');
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('colony-automation-row', 'building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('colony-automation-builder-category');
  const targetSelect = document.createElement('select');
  targetSelect.classList.add('colony-automation-builder-target');
  const addButton = document.createElement('button');
  addButton.textContent = getAutomationCardText('addTargetButton', {}, '+ Target');
  addButton.classList.add('colony-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = getAutomationCardText('addCategoryButton', {}, '+ Category');
  addCategoryButton.classList.add('colony-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = getAutomationCardText('clearAllButton', {}, '- All');
  clearButton.classList.add('colony-automation-builder-clear');
  pickerRow.append(categorySelect, targetSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('colony-automation-builder-list', 'building-automation-builder-list');
  builderSection.appendChild(selectedList);

  const presetJsonDetails = createAutomationPresetJsonDetails('colony-automation-preset-json-details');
  builderSection.appendChild(presetJsonDetails);

  body.appendChild(builderSection);

  const applySection = document.createElement('div');
  applySection.classList.add('colony-automation-section', 'building-automation-section');
  const applyHeader = document.createElement('div');
  applyHeader.classList.add('colony-automation-section-title', 'building-automation-section-title');
  const applyTitle = document.createElement('span');
  applyTitle.textContent = getAutomationCardText('presetCombinationTitle', {}, 'Preset Combination');
  const applyNextTravelLabel = document.createElement('label');
  applyNextTravelLabel.classList.add('colony-automation-apply-next-travel-label', 'building-automation-apply-next-travel-label');
  const applyNextTravelText = document.createElement('span');
  applyNextTravelText.textContent = getAutomationCardText('combinationOnNextTravelLabel', {}, 'Combination on Next Travel');
  const applyNextTravelSelect = document.createElement('select');
  applyNextTravelSelect.classList.add('colony-automation-next-travel-select', 'building-automation-next-travel-select');
  const applyNextTravelPersistToggle = document.createElement('input');
  applyNextTravelPersistToggle.type = 'checkbox';
  applyNextTravelPersistToggle.classList.add('colony-automation-next-travel-persist-toggle');
  const applyNextTravelPersistText = document.createElement('span');
  applyNextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  applyNextTravelPersistText.classList.add('colony-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text');
  applyNextTravelLabel.append(
    applyNextTravelText,
    applyNextTravelSelect,
    applyNextTravelPersistToggle,
    applyNextTravelPersistText
  );
  applyHeader.append(applyTitle);
  applySection.appendChild(applyHeader);
  const applyNextTravelRow = document.createElement('div');
  applyNextTravelRow.classList.add('colony-automation-next-travel-row', 'building-automation-next-travel-row');
  applyNextTravelRow.append(applyNextTravelLabel);
  applySection.appendChild(applyNextTravelRow);

  const combinationRow = document.createElement('div');
  combinationRow.classList.add('colony-automation-row', 'building-automation-row');
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = getAutomationCardText('applyCombinationButton', {}, 'Apply Combination');
  applyCombinationButton.classList.add('colony-automation-apply-combination', 'building-automation-apply-combination');
  const combinationSelect = document.createElement('select');
  combinationSelect.classList.add('colony-automation-combination-select');
  const combinationMoveButtons = document.createElement('div');
  combinationMoveButtons.classList.add('automation-order-buttons');
  const combinationMoveUpButton = document.createElement('button');
  combinationMoveUpButton.textContent = '↑';
  combinationMoveUpButton.title = getAutomationCardText('moveCombinationUp', {}, 'Move combination up');
  combinationMoveUpButton.classList.add('colony-automation-combination-move-up');
  const combinationMoveDownButton = document.createElement('button');
  combinationMoveDownButton.textContent = '↓';
  combinationMoveDownButton.title = getAutomationCardText('moveCombinationDown', {}, 'Move combination down');
  combinationMoveDownButton.classList.add('colony-automation-combination-move-down');
  combinationMoveButtons.append(combinationMoveUpButton, combinationMoveDownButton);
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = getAutomationCardText('combinationNamePlaceholder', {}, 'Combination name');
  combinationNameInput.classList.add('colony-automation-combination-name');
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = getAutomationCardText('newCombinationButton', {}, 'New');
  combinationNewButton.classList.add('colony-automation-combination-new');
  const combinationSaveButton = document.createElement('button');
  combinationSaveButton.textContent = getAutomationCardText('saveCombinationButton', {}, 'Save');
  combinationSaveButton.classList.add('colony-automation-combination-save', 'building-automation-combination-save');
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = getAutomationCardText('deleteCombinationButton', {}, 'Delete');
  combinationDeleteButton.classList.add('colony-automation-combination-delete');
  const combinationShowSidebar = createAutomationShowInSidebarLabel('colony-automation-combination');
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
  applySection.appendChild(combinationRow);

  const applyList = document.createElement('div');
  applyList.classList.add('colony-automation-apply-list', 'building-automation-apply-list');
  applySection.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  addApplyButton.classList.add('colony-automation-apply-add', 'building-automation-apply-add');
  applySection.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  applyHint.classList.add('colony-automation-apply-hint', 'building-automation-apply-hint');
  applySection.appendChild(applyHint);

  body.appendChild(applySection);

  automationElements.colonyCollapseButton = header.collapse;
  automationElements.colonyPanelBody = body;
  automationElements.colonyBuilderPresetSelect = presetSelect;
  automationElements.colonyBuilderMoveUpButton = presetMoveUpButton;
  automationElements.colonyBuilderMoveDownButton = presetMoveDownButton;
  automationElements.colonyBuilderPresetNameInput = presetNameInput;
  automationElements.colonyBuilderNewButton = newButton;
  automationElements.colonyBuilderSaveButton = saveButton;
  automationElements.colonyBuilderDeleteButton = deleteButton;
  automationElements.colonyBuilderImportButton = transferButtons.importButton;
  automationElements.colonyBuilderExportButton = transferButtons.exportButton;
  automationElements.colonyBuilderApplyOnceButton = applyOnceButton;
  automationElements.colonyBuilderShowInSidebarCheckbox = builderShowSidebar.checkbox;
  automationElements.colonyBuilderDirty = builderDirty;
  automationElements.colonyBuilderTypeSelect = typeSelect;
  automationElements.colonyBuilderScopeSelect = scopeSelect;
  automationElements.colonyBuilderCategorySelect = categorySelect;
  automationElements.colonyBuilderTargetSelect = targetSelect;
  automationElements.colonyBuilderAddButton = addButton;
  automationElements.colonyBuilderAddCategoryButton = addCategoryButton;
  automationElements.colonyBuilderClearButton = clearButton;
  automationElements.colonyBuilderSelectedList = selectedList;
  automationElements.colonyPresetJsonDetails = presetJsonDetails;
  automationElements.colonyApplyCombinationButton = applyCombinationButton;
  automationElements.colonyApplyNextTravelSelect = applyNextTravelSelect;
  automationElements.colonyApplyNextTravelPersistToggle = applyNextTravelPersistToggle;
  automationElements.colonyCombinationSelect = combinationSelect;
  automationElements.colonyCombinationMoveUpButton = combinationMoveUpButton;
  automationElements.colonyCombinationMoveDownButton = combinationMoveDownButton;
  automationElements.colonyCombinationNameInput = combinationNameInput;
  automationElements.colonyCombinationNewButton = combinationNewButton;
  automationElements.colonyCombinationSaveButton = combinationSaveButton;
  automationElements.colonyCombinationDeleteButton = combinationDeleteButton;
  automationElements.colonyCombinationShowInSidebarCheckbox = combinationShowSidebar.checkbox;
  automationElements.colonyApplyList = applyList;
  automationElements.colonyApplyHint = applyHint;
  automationElements.colonyAddApplyButton = addApplyButton;

  attachColonyAutomationHandlers();
}

function updateColonyAutomationUI() {
  const {
    colonyAutomation,
    colonyAutomationDescription,
    colonyPanelBody,
    colonyCollapseButton,
    colonyBuilderPresetSelect,
    colonyBuilderMoveUpButton,
    colonyBuilderMoveDownButton,
    colonyBuilderPresetNameInput,
    colonyBuilderNewButton,
    colonyBuilderSaveButton,
    colonyBuilderDeleteButton,
    colonyBuilderImportButton,
    colonyBuilderExportButton,
    colonyBuilderApplyOnceButton,
    colonyBuilderShowInSidebarCheckbox,
    colonyBuilderDirty,
    colonyBuilderTypeSelect,
    colonyBuilderScopeSelect,
    colonyBuilderCategorySelect,
    colonyBuilderTargetSelect,
    colonyBuilderAddButton,
    colonyBuilderAddCategoryButton,
    colonyBuilderClearButton,
    colonyBuilderSelectedList,
    colonyPresetJsonDetails,
    colonyApplyList,
    colonyApplyHint,
    colonyApplyCombinationButton,
    colonyApplyNextTravelSelect,
    colonyApplyNextTravelPersistToggle,
    colonyAddApplyButton,
    colonyCombinationSelect,
    colonyCombinationMoveUpButton,
    colonyCombinationMoveDownButton,
    colonyCombinationNameInput,
    colonyCombinationNewButton,
    colonyCombinationSaveButton,
    colonyCombinationDeleteButton,
    colonyCombinationShowInSidebarCheckbox
  } = automationElements;
  const manager = automationManager;
  const automation = manager.colonyAutomation;
  const unlocked = manager.hasFeature('automationColony');
  colonyAutomation.style.display = unlocked ? '' : 'none';
  colonyAutomation.classList.toggle('automation-card-locked', !unlocked);
  colonyAutomationDescription.textContent = unlocked
    ? getAutomationCardText('colonyAutomationDescriptionUnlocked', {}, 'Capture colony controls, sliders, nanocolony settings, and orbital settings in ordered presets.')
    : getAutomationCardText('colonyAutomationDescriptionLocked', {}, 'Purchase the Solis Colony Automation upgrade to enable colony presets.');
  if (!unlocked) {
    return;
  }

  colonyPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  colonyCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  const presets = automation.presets.slice();
  const combinations = automation.getCombinations();
  const availableTargets = getColonyAutomationTargets();

  if (document.activeElement !== colonyBuilderPresetSelect) {
    colonyBuilderPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newPresetOption', {}, 'New preset');
    colonyBuilderPresetSelect.appendChild(newOption);
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getColonyAutomationPresetLabel(preset);
      colonyBuilderPresetSelect.appendChild(option);
    });
    colonyBuilderPresetSelect.value = automation.getSelectedPresetId() || '';
  }

  const activePresetId = automation.getSelectedPresetId();
  const activePreset = activePresetId ? automation.getPresetById(Number(activePresetId)) : null;
  const activePresetIndex = activePreset
    ? presets.findIndex(preset => preset.id === activePreset.id)
    : -1;
  if (activePreset && colonyAutomationUIState.syncedPresetId !== activePresetId) {
    colonyAutomationUIState.builderScope = activePreset.scopeAll ? 'all' : 'manual';
    colonyAutomationUIState.builderSelectedTargets = Object.keys(activePreset.targets);
    colonyAutomationUIState.builderType = activePreset.includeControl && activePreset.includeAutomation
      ? 'both'
      : activePreset.includeControl
        ? 'control'
        : 'automation';
    colonyAutomationUIState.builderShowInSidebar = activePreset.showInSidebar !== false;
    colonyAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && colonyAutomationUIState.syncedPresetId) {
    colonyAutomationUIState.syncedPresetId = null;
  }
  updateAutomationPresetJsonDetails(colonyPresetJsonDetails, activePreset);

  if (document.activeElement !== colonyBuilderPresetNameInput) {
    colonyBuilderPresetNameInput.value = activePreset ? activePreset.name : colonyAutomationUIState.builderName;
  }
  colonyBuilderShowInSidebarCheckbox.checked = activePreset
    ? activePreset.showInSidebar !== false
    : colonyAutomationUIState.builderShowInSidebar;
  if (document.activeElement !== colonyBuilderTypeSelect) {
    colonyBuilderTypeSelect.value = colonyAutomationUIState.builderType;
  }
  if (document.activeElement !== colonyBuilderScopeSelect) {
    colonyBuilderScopeSelect.value = colonyAutomationUIState.builderScope;
  }

  const showManual = colonyAutomationUIState.builderScope === 'manual';
  colonyBuilderCategorySelect.parentElement.style.display = showManual ? 'flex' : 'none';
  colonyBuilderSelectedList.style.display = showManual ? 'flex' : 'none';
  colonyBuilderClearButton.style.display = showManual ? '' : 'none';
  colonyBuilderAddCategoryButton.style.display = showManual ? '' : 'none';

  const categoryIds = automation.getCategoryIds();
  if (document.activeElement !== colonyBuilderCategorySelect) {
    colonyBuilderCategorySelect.textContent = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = getAutomationCardText('allCategoriesOption', {}, 'All categories');
    colonyBuilderCategorySelect.appendChild(allOption);
    categoryIds.forEach(categoryId => {
      const option = document.createElement('option');
      option.value = categoryId;
      option.textContent = automation.getCategoryLabel(categoryId);
      colonyBuilderCategorySelect.appendChild(option);
    });
    colonyBuilderCategorySelect.value = colonyAutomationUIState.builderCategoryValue || 'all';
    if (!colonyBuilderCategorySelect.value) {
      colonyBuilderCategorySelect.value = 'all';
    }
    colonyAutomationUIState.builderCategoryValue = colonyBuilderCategorySelect.value;
  }

  const selectedCategory = colonyBuilderCategorySelect.value || colonyAutomationUIState.builderCategoryValue || 'all';
  if (document.activeElement !== colonyBuilderTargetSelect) {
    const filteredTargets = availableTargets.filter(target => (
      selectedCategory === 'all' || target.categoryId === selectedCategory
    ));
    colonyBuilderTargetSelect.textContent = '';
    if (!filteredTargets.length) {
      const empty = document.createElement('option');
      empty.textContent = getAutomationCardText('noTargetsAvailable', {}, 'No targets available');
      empty.disabled = true;
      empty.selected = true;
      colonyBuilderTargetSelect.appendChild(empty);
    } else {
      filteredTargets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.id;
        option.textContent = target.label;
        colonyBuilderTargetSelect.appendChild(option);
      });
      if (colonyAutomationUIState.builderTargetValue) {
        colonyBuilderTargetSelect.value = colonyAutomationUIState.builderTargetValue;
      }
      if (!colonyBuilderTargetSelect.value) {
        colonyBuilderTargetSelect.value = filteredTargets[0].id;
      }
    }
    colonyAutomationUIState.builderTargetValue = colonyBuilderTargetSelect.value || '';
  }

  colonyBuilderAddButton.disabled = colonyBuilderTargetSelect.options.length === 0
    || colonyBuilderTargetSelect.options[0].disabled;
  colonyBuilderAddCategoryButton.disabled = colonyBuilderCategorySelect.options.length === 0
    || !availableTargets.length;
  colonyBuilderClearButton.disabled = colonyAutomationUIState.builderSelectedTargets.length === 0;
  colonyBuilderDeleteButton.disabled = !activePreset;
  colonyBuilderImportButton.disabled = false;
  colonyBuilderExportButton.disabled = !activePreset;
  colonyBuilderApplyOnceButton.disabled = !activePreset;
  colonyBuilderMoveUpButton.disabled = activePresetIndex <= 0;
  colonyBuilderMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  colonyApplyCombinationButton.disabled = automation.getAssignments().length === 0;
  colonyCombinationSaveButton.disabled = automation.getAssignments().length === 0;

  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;
  if (document.activeElement !== colonyApplyNextTravelSelect) {
    colonyApplyNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    colonyApplyNextTravelSelect.appendChild(noneOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getColonyAutomationCombinationLabel(combo);
      colonyApplyNextTravelSelect.appendChild(option);
    });
    colonyApplyNextTravelSelect.value = automation.nextTravelCombinationId
      ? String(automation.nextTravelCombinationId)
      : '';
  }
  colonyApplyNextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
  colonyApplyNextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;

  if (document.activeElement !== colonyCombinationSelect) {
    colonyCombinationSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newCombinationOption', {}, 'New combination');
    colonyCombinationSelect.appendChild(newOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getColonyAutomationCombinationLabel(combo);
      colonyCombinationSelect.appendChild(option);
    });
    colonyCombinationSelect.value = automation.getSelectedCombinationId() || '';
  }

  const activeCombinationId = automation.getSelectedCombinationId();
  const activeCombination = activeCombinationId ? automation.getCombinationById(Number(activeCombinationId)) : null;
  const activeCombinationIndex = activeCombination
    ? combinations.findIndex(combo => combo.id === activeCombination.id)
    : -1;
  if (activeCombination && colonyAutomationUIState.combinationSyncedId !== activeCombinationId) {
    colonyAutomationUIState.combinationName = activeCombination.name;
    colonyAutomationUIState.combinationShowInSidebar = activeCombination.showInSidebar !== false;
    colonyAutomationUIState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && colonyAutomationUIState.combinationSyncedId) {
    colonyAutomationUIState.combinationSyncedId = null;
  }

  if (document.activeElement !== colonyCombinationNameInput) {
    colonyCombinationNameInput.value = activeCombination
      ? activeCombination.name
      : colonyAutomationUIState.combinationName;
  }
  colonyCombinationShowInSidebarCheckbox.checked = activeCombination
    ? activeCombination.showInSidebar !== false
    : colonyAutomationUIState.combinationShowInSidebar;

  colonyCombinationDeleteButton.disabled = !activeCombination;
  colonyCombinationMoveUpButton.disabled = activeCombinationIndex <= 0;
  colonyCombinationMoveDownButton.disabled = activeCombinationIndex < 0 || activeCombinationIndex >= combinations.length - 1;

  colonyBuilderSelectedList.textContent = '';
  colonyAutomationUIState.builderSelectedTargets.forEach(targetId => {
    const pill = document.createElement('div');
    pill.classList.add('building-automation-builder-pill');
    const label = document.createElement('span');
    label.textContent = automation.getTargetLabel(targetId);
    const remove = document.createElement('button');
    remove.textContent = '✕';
    remove.title = getAutomationCardText('removeTarget', {}, 'Remove target');
    remove.addEventListener('click', () => {
      colonyAutomationUIState.builderSelectedTargets = colonyAutomationUIState.builderSelectedTargets.filter(id => id !== targetId);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    pill.append(label, remove);
    colonyBuilderSelectedList.appendChild(pill);
  });

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
  const savedTargetIds = activePreset ? Object.keys(activePreset.targets) : [];
  const savedTargetSet = new Set(savedTargetIds);
  const manualSelection = colonyAutomationUIState.builderScope === 'manual';
  const selectionChanged = manualSelection
    && (colonyAutomationUIState.builderSelectedTargets.length !== savedTargetIds.length
      || colonyAutomationUIState.builderSelectedTargets.some(id => !savedTargetSet.has(id)));
  const newDirty = !activePreset
    && (
      colonyAutomationUIState.builderName.trim() !== ''
      || colonyAutomationUIState.builderType !== 'both'
      || colonyAutomationUIState.builderScope !== 'all'
      || colonyAutomationUIState.builderSelectedTargets.length > 0
    );
  const existingDirty = !!activePreset
    && (
      colonyAutomationUIState.builderType !== savedType
      || colonyAutomationUIState.builderScope !== savedScope
      || selectionChanged
    );
  colonyBuilderDirty.style.display = newDirty || existingDirty ? '' : 'none';

  const assignments = automation.getAssignments();
  const applyHasFocus = colonyApplyList.contains(document.activeElement)
    && document.activeElement.tagName === 'SELECT';
  if (!applyHasFocus) {
    colonyApplyList.textContent = '';
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
        option.textContent = getColonyAutomationPresetLabel(preset);
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
        const detailText = preset
          ? formatColonyAutomationPresetType(preset)
          : getAutomationCardText('selectPreset', {}, 'Select a preset');
        const targetList = preset
          ? preset.scopeAll
            ? getAutomationCardText('allAvailableTargets', {}, 'All available targets')
            : Object.keys(preset.targets).map(targetId => automation.getTargetLabel(targetId)).join(', ')
          : '';
        detail.textContent = targetList ? `${detailText} / ${targetList}` : detailText;
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
      colonyApplyList.appendChild(row);
    });
  }

  colonyAddApplyButton.disabled = presets.length === 0;
  colonyApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('colonyApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('colonyApplyHintRule', {}, 'Lower presets override higher presets when they target the same colony setting.');
}

function attachColonyAutomationHandlers() {
  const {
    colonyBuilderPresetSelect,
    colonyBuilderMoveUpButton,
    colonyBuilderMoveDownButton,
    colonyBuilderPresetNameInput,
    colonyBuilderNewButton,
    colonyBuilderSaveButton,
    colonyBuilderDeleteButton,
    colonyBuilderImportButton,
    colonyBuilderExportButton,
    colonyBuilderTypeSelect,
    colonyBuilderScopeSelect,
    colonyBuilderShowInSidebarCheckbox,
    colonyBuilderCategorySelect,
    colonyBuilderTargetSelect,
    colonyBuilderAddButton,
    colonyBuilderApplyOnceButton,
    colonyBuilderAddCategoryButton,
    colonyBuilderClearButton,
    colonyApplyCombinationButton,
    colonyApplyNextTravelSelect,
    colonyApplyNextTravelPersistToggle,
    colonyCombinationSelect,
    colonyCombinationMoveUpButton,
    colonyCombinationMoveDownButton,
    colonyCombinationNameInput,
    colonyCombinationNewButton,
    colonyCombinationSaveButton,
    colonyCombinationDeleteButton,
    colonyCombinationShowInSidebarCheckbox,
    colonyAddApplyButton
  } = automationElements;

  colonyBuilderPresetSelect.addEventListener('change', (event) => {
    automationManager.colonyAutomation.setSelectedPresetId(event.target.value || null);
    colonyAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  colonyBuilderMoveUpButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.colonyAutomation.movePreset(Number(presetId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  colonyBuilderMoveDownButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.colonyAutomation.movePreset(Number(presetId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderPresetNameInput.addEventListener('input', (event) => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      colonyAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const preset = automationManager.colonyAutomation.getPresetById(Number(presetId));
    if (!preset) {
      return;
    }
    automationManager.colonyAutomation.renamePreset(preset.id, event.target.value || '');
  });

  colonyBuilderNewButton.addEventListener('click', () => {
    automationManager.colonyAutomation.setSelectedPresetId(null);
    colonyAutomationUIState.syncedPresetId = null;
    colonyAutomationUIState.builderName = '';
    colonyAutomationUIState.builderScope = 'all';
    colonyAutomationUIState.builderType = 'both';
    colonyAutomationUIState.builderShowInSidebar = true;
    colonyAutomationUIState.builderSelectedTargets = [];
    colonyAutomationUIState.builderCategoryValue = 'all';
    colonyAutomationUIState.builderTargetValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderTypeSelect.addEventListener('change', (event) => {
    colonyAutomationUIState.builderType = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderScopeSelect.addEventListener('change', (event) => {
    colonyAutomationUIState.builderScope = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderShowInSidebarCheckbox.addEventListener('change', () => {
    colonyAutomationUIState.builderShowInSidebar = colonyBuilderShowInSidebarCheckbox.checked;
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.colonyAutomation.setPresetShowInSidebar(Number(presetId), colonyAutomationUIState.builderShowInSidebar);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderCategorySelect.addEventListener('change', () => {
    colonyAutomationUIState.builderCategoryValue = colonyBuilderCategorySelect.value || 'all';
    colonyAutomationUIState.builderTargetValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderTargetSelect.addEventListener('change', () => {
    colonyAutomationUIState.builderTargetValue = colonyBuilderTargetSelect.value || '';
  });

  colonyBuilderAddButton.addEventListener('click', () => {
    const targetId = colonyBuilderTargetSelect.value;
    if (!targetId) {
      return;
    }
    colonyAutomationUIState.builderCategoryValue = colonyBuilderCategorySelect.value || 'all';
    colonyAutomationUIState.builderTargetValue = targetId;
    if (!colonyAutomationUIState.builderSelectedTargets.includes(targetId)) {
      colonyAutomationUIState.builderSelectedTargets.push(targetId);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = colonyBuilderCategorySelect.value || 'all';
    const availableTargets = getColonyAutomationTargets();
    const additions = availableTargets.filter(target => (
      selectedCategory === 'all' || target.categoryId === selectedCategory
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(target => {
      if (!colonyAutomationUIState.builderSelectedTargets.includes(target.id)) {
        colonyAutomationUIState.builderSelectedTargets.push(target.id);
      }
    });
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderClearButton.addEventListener('click', () => {
    colonyAutomationUIState.builderSelectedTargets = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderSaveButton.addEventListener('click', () => {
    const automation = automationManager.colonyAutomation;
    const name = colonyBuilderPresetNameInput.value || colonyAutomationUIState.builderName || '';
    const type = colonyAutomationUIState.builderType;
    const includeControl = type === 'control' || type === 'both';
    const includeAutomation = type === 'automation' || type === 'both';
    const scopeAll = colonyAutomationUIState.builderScope === 'all';
    const showInSidebar = colonyAutomationUIState.builderShowInSidebar;
    const targetIds = scopeAll
      ? getColonyAutomationTargets().map(target => target.id)
      : colonyAutomationUIState.builderSelectedTargets.slice();
    const presetId = automation.getSelectedPresetId();
    if (presetId) {
      automation.updatePreset(Number(presetId), name, targetIds, { includeControl, includeAutomation, scopeAll, showInSidebar });
    } else {
      automation.addPreset(name, targetIds, { includeControl, includeAutomation, scopeAll, showInSidebar });
      colonyAutomationUIState.syncedPresetId = null;
      colonyAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderDeleteButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.colonyAutomation.deletePreset(Number(presetId));
    colonyAutomationUIState.syncedPresetId = null;
    colonyAutomationUIState.builderName = '';
    colonyAutomationUIState.builderSelectedTargets = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderImportButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importColonyPresetTitle', {}, 'Import Colony Preset'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'colony');
        if (!parsed.ok) {
          return parsed;
        }
        automationManager.colonyAutomation.importPreset(parsed.preset);
        colonyAutomationUIState.syncedPresetId = null;
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  colonyBuilderExportButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    exportAutomationPresetToClipboard(
      'colony',
      automationManager.colonyAutomation.exportPreset(presetId),
      colonyBuilderExportButton
    );
  });

  colonyBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.colonyAutomation.applyPresetOnce(presetId);
    }
  });

  colonyApplyCombinationButton.addEventListener('click', () => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    automationManager.colonyAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
  });

  colonyApplyNextTravelSelect.addEventListener('change', (event) => {
    const comboId = event.target.value;
    automationManager.colonyAutomation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automationManager.colonyAutomation.nextTravelCombinationPersistent = automationManager.colonyAutomation.nextTravelCombinationPersistent
      && !!automationManager.colonyAutomation.nextTravelCombinationId;
    colonyApplyNextTravelPersistToggle.checked = automationManager.colonyAutomation.nextTravelCombinationPersistent;
    colonyApplyNextTravelPersistToggle.disabled = !automationManager.colonyAutomation.nextTravelCombinationId;
  });
  colonyApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    automationManager.colonyAutomation.nextTravelCombinationPersistent = event.target.checked
      && !!automationManager.colonyAutomation.nextTravelCombinationId;
  });

  colonyCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.colonyAutomation.setSelectedCombinationId(comboId);
    colonyAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.colonyAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  colonyCombinationMoveUpButton.addEventListener('click', () => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.colonyAutomation.moveCombination(Number(comboId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  colonyCombinationMoveDownButton.addEventListener('click', () => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.colonyAutomation.moveCombination(Number(comboId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyCombinationNameInput.addEventListener('input', (event) => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    if (!comboId) {
      colonyAutomationUIState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const combo = automationManager.colonyAutomation.getCombinationById(Number(comboId));
    combo.name = event.target.value || '';
  });

  colonyCombinationNewButton.addEventListener('click', () => {
    automationManager.colonyAutomation.setSelectedCombinationId(null);
    colonyAutomationUIState.combinationSyncedId = null;
    colonyAutomationUIState.combinationName = '';
    colonyAutomationUIState.combinationShowInSidebar = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyCombinationShowInSidebarCheckbox.addEventListener('change', () => {
    colonyAutomationUIState.combinationShowInSidebar = colonyCombinationShowInSidebarCheckbox.checked;
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    if (comboId) {
      automationManager.colonyAutomation.setCombinationShowInSidebar(Number(comboId), colonyAutomationUIState.combinationShowInSidebar);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyCombinationSaveButton.addEventListener('click', () => {
    const automation = automationManager.colonyAutomation;
    const name = colonyCombinationNameInput.value || colonyAutomationUIState.combinationName || '';
    const snapshot = automation.getAssignments().map(entry => ({
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
      automation.setCombinationShowInSidebar(Number(comboId), colonyAutomationUIState.combinationShowInSidebar);
    } else {
      const newComboId = automation.addCombination(name, snapshot);
      automation.setCombinationShowInSidebar(newComboId, colonyAutomationUIState.combinationShowInSidebar);
      colonyAutomationUIState.combinationSyncedId = null;
      colonyAutomationUIState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyCombinationDeleteButton.addEventListener('click', () => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.colonyAutomation.deleteCombination(Number(comboId));
    colonyAutomationUIState.combinationSyncedId = null;
    colonyAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyAddApplyButton.addEventListener('click', () => {
    const automation = automationManager.colonyAutomation;
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getColonyAutomationTargets() {
  return automationManager?.colonyAutomation?.getAvailableTargets?.() || [];
}

function formatColonyAutomationPresetType(preset) {
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
