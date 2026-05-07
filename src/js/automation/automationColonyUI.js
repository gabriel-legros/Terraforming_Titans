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
let colonyBuilderPresetSignature = '';
let colonyBuilderCategorySignature = '';
let colonyBuilderTargetSignature = '';
let colonyBuilderSelectedSignature = '';
let colonyApplyRenderSignature = '';

function getColonyAutomationAutoBuildBasisOptions(structure, currentValue) {
  return getAutomationAutoBuildBasisOptions(structure, currentValue);
}

function getColonyAutomationJsonModeForPath(preset, fieldPath) {
  if (!preset || fieldPath[0] !== 'targets' || fieldPath[2] !== 'automation') {
    return '';
  }
  const targetId = fieldPath[1];
  const entry = preset.targets[targetId];
  const automation = entry && entry.automation;
  return (automation && automation.autoBuildBasis) || '';
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
    toggleCollapsed,
    'colony'
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

  const builderRowParts = buildAutomationPresetBuilderRow({
    rowClasses: ['colony-automation-row', 'building-automation-row'],
    selectClasses: ['colony-automation-builder-select'],
    moveUpButtonClasses: ['colony-automation-builder-move-up'],
    moveDownButtonClasses: ['colony-automation-builder-move-down'],
    nameInputClasses: ['colony-automation-builder-name'],
    newButtonClasses: ['colony-automation-builder-new'],
    saveButtonClasses: ['colony-automation-builder-save', 'building-automation-builder-save'],
    deleteButtonClasses: ['colony-automation-builder-delete'],
    transferKey: 'colony-automation-builder',
    applyOnceButtonClasses: ['colony-automation-builder-apply-once'],
    showSidebarKey: 'colony-automation-builder'
  });
  builderSection.appendChild(builderRowParts.row);

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

  const applyParts = buildAutomationCombinationApplySection({
    sectionClasses: ['colony-automation-section', 'building-automation-section'],
    headerClasses: ['colony-automation-section-title', 'building-automation-section-title'],
    nextTravelRowClasses: ['colony-automation-next-travel-row', 'building-automation-next-travel-row'],
    nextTravelLabelClasses: ['colony-automation-apply-next-travel-label', 'building-automation-apply-next-travel-label'],
    nextTravelSelectClasses: ['colony-automation-next-travel-select', 'building-automation-next-travel-select'],
    nextTravelPersistToggleClasses: ['colony-automation-next-travel-persist-toggle'],
    nextTravelPersistTextClasses: ['colony-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text'],
    rowClasses: ['colony-automation-row', 'building-automation-row'],
    applyCombinationButtonClasses: ['colony-automation-apply-combination', 'building-automation-apply-combination'],
    combinationSelectClasses: ['colony-automation-combination-select'],
    combinationMoveUpButtonClasses: ['colony-automation-combination-move-up'],
    combinationMoveDownButtonClasses: ['colony-automation-combination-move-down'],
    combinationNameInputClasses: ['colony-automation-combination-name'],
    combinationNewButtonClasses: ['colony-automation-combination-new'],
    combinationSaveButtonClasses: ['colony-automation-combination-save', 'building-automation-combination-save'],
    combinationDeleteButtonClasses: ['colony-automation-combination-delete'],
    combinationShowSidebarKey: 'colony-automation-combination',
    applyListClasses: ['colony-automation-apply-list', 'building-automation-apply-list'],
    addApplyButtonClasses: ['colony-automation-apply-add', 'building-automation-apply-add'],
    applyHintClasses: ['colony-automation-apply-hint', 'building-automation-apply-hint']
  });
  body.appendChild(applyParts.section);

  automationElements.colonyCollapseButton = header.collapse;
  automationElements.colonyPanelBody = body;
  automationElements.colonyBuilderPresetSelect = builderRowParts.presetSelect;
  automationElements.colonyBuilderMoveUpButton = builderRowParts.presetMoveUpButton;
  automationElements.colonyBuilderMoveDownButton = builderRowParts.presetMoveDownButton;
  automationElements.colonyBuilderPresetNameInput = builderRowParts.presetNameInput;
  automationElements.colonyBuilderNewButton = builderRowParts.newButton;
  automationElements.colonyBuilderSaveButton = builderRowParts.saveButton;
  automationElements.colonyBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.colonyBuilderImportButton = builderRowParts.importButton;
  automationElements.colonyBuilderExportButton = builderRowParts.exportButton;
  automationElements.colonyBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.colonyBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
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
  automationElements.colonyApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.colonyApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.colonyApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.colonyCombinationSelect = applyParts.combinationSelect;
  automationElements.colonyCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.colonyCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.colonyCombinationNameInput = applyParts.combinationNameInput;
  automationElements.colonyCombinationNewButton = applyParts.combinationNewButton;
  automationElements.colonyCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.colonyCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.colonyCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.colonyApplyList = applyParts.applyList;
  automationElements.colonyApplyHint = applyParts.applyHint;
  automationElements.colonyAddApplyButton = applyParts.addApplyButton;

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

  const presetSignature = presets.map((preset) => `${preset.id}:${preset.name || ''}`).join('|');
  if (document.activeElement !== colonyBuilderPresetSelect && presetSignature !== colonyBuilderPresetSignature) {
    colonyBuilderPresetSelect.textContent = '';
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getDefaultAutomationPresetLabel(preset);
      colonyBuilderPresetSelect.appendChild(option);
    });
    colonyBuilderPresetSignature = presetSignature;
    const selectedPresetId = automation.getSelectedPresetId();
    if (selectedPresetId) {
      colonyBuilderPresetSelect.value = String(selectedPresetId);
    } else {
      colonyBuilderPresetSelect.selectedIndex = -1;
    }
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
  updateAutomationPresetJsonDetails(colonyPresetJsonDetails, activePreset, {
    isLeafVisible: (fieldPath, preset) => {
      if (fieldPath[0] !== 'targets' || fieldPath[2] !== 'automation') {
        return true;
      }
      const mode = getColonyAutomationJsonModeForPath(preset, fieldPath);
      const leafKey = fieldPath[3];
      if (leafKey === 'autoBuildFixed') {
        return mode === 'fixed';
      }
      if (leafKey === 'autoBuildFillPercent' || leafKey === 'autoBuildFillResourcePrimary' || leafKey === 'autoBuildFillResourceSecondary') {
        return mode === 'fill';
      }
      if (leafKey === 'autoBuildPercent') {
        return mode !== 'fixed' && mode !== 'fill' && mode !== 'max';
      }
      return true;
    },
    getFieldOptions: (fieldPath, value) => {
      if (fieldPath[0] === 'targets' && fieldPath[2] === 'automation' && fieldPath[3] === 'autoBuildBasis') {
        const targetId = fieldPath[1];
        const structure = automationManager.colonyAutomation.getColonyTarget(targetId);
        return {
          selectOptions: getColonyAutomationAutoBuildBasisOptions(structure, value)
        };
      }
      return null;
    },
    onFieldChange: (fieldPath, nextValue) => {
      if (!activePreset) {
        return;
      }
      applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, {
        onApplied: (appliedPath, appliedValue, rootKey) => {
          if (rootKey === 'showInSidebar') {
            colonyAutomationUIState.builderShowInSidebar = appliedValue !== false;
          }
          if (rootKey === 'scopeAll') {
            colonyAutomationUIState.builderScope = appliedValue ? 'all' : 'manual';
          }
          if (rootKey === 'includeControl' || rootKey === 'includeAutomation') {
            colonyAutomationUIState.builderType = activePreset.includeControl && activePreset.includeAutomation
              ? 'both'
              : activePreset.includeControl
                ? 'control'
                : 'automation';
          }
        }
      });
    }
  });

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
  const categorySignature = categoryIds.map((categoryId) => `${categoryId}:${automation.getCategoryLabel(categoryId)}`).join('|');
  if (document.activeElement !== colonyBuilderCategorySelect && categorySignature !== colonyBuilderCategorySignature) {
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
    colonyBuilderCategorySignature = categorySignature;
  }

  const selectedCategory = colonyBuilderCategorySelect.value || colonyAutomationUIState.builderCategoryValue || 'all';
  const filteredTargets = availableTargets.filter(target => (
    selectedCategory === 'all' || target.categoryId === selectedCategory
  ));
  const targetSignature = `${selectedCategory}|${filteredTargets.map((target) => `${target.id}:${target.label}`).join('|')}`;
  if (document.activeElement !== colonyBuilderTargetSelect && targetSignature !== colonyBuilderTargetSignature) {
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
    colonyBuilderTargetSignature = targetSignature;
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

  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: colonyApplyNextTravelSelect,
    persistToggleElement: colonyApplyNextTravelPersistToggle
  });

  updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: colonyAutomationUIState,
    selectElement: colonyCombinationSelect,
    nameInputElement: colonyCombinationNameInput,
    showCheckboxElement: colonyCombinationShowInSidebarCheckbox,
    moveUpButtonElement: colonyCombinationMoveUpButton,
    moveDownButtonElement: colonyCombinationMoveDownButton,
    deleteButtonElement: colonyCombinationDeleteButton
  });

  const selectedSignature = colonyAutomationUIState.builderSelectedTargets.join('|');
  if (selectedSignature !== colonyBuilderSelectedSignature) {
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
        const presetId = automationManager.colonyAutomation.getSelectedPresetId();
        if (presetId) {
          const preset = automationManager.colonyAutomation.getPresetById(Number(presetId));
          if (preset && preset.targets[targetId]) {
            delete preset.targets[targetId];
            colonyAutomationUIState.syncedPresetId = null;
          }
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      colonyBuilderSelectedList.appendChild(pill);
    });
    colonyBuilderSelectedSignature = selectedSignature;
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
    const applySignature = JSON.stringify({
      presets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeControl: preset.includeControl,
        includeAutomation: preset.includeAutomation,
        scopeAll: preset.scopeAll,
        targets: Object.keys(preset.targets)
      })),
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        presetId: assignment.presetId,
        enabled: assignment.enabled
      }))
    });
    if (applySignature === colonyApplyRenderSignature) {
      // Keep existing rows and listeners when nothing changed.
    } else {
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
        option.textContent = getDefaultAutomationPresetLabel(preset);
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
      colonyApplyRenderSignature = applySignature;
    }
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
    const automation = automationManager.colonyAutomation;
    const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
    automation.setSelectedPresetId(null);
    colonyAutomationUIState.syncedPresetId = null;
    colonyAutomationUIState.builderName = suggestedName;
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
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.colonyAutomation.mergeMissingTargetsIntoPreset(Number(presetId), [targetId]);
      colonyAutomationUIState.syncedPresetId = null;
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
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.colonyAutomation.mergeMissingTargetsIntoPreset(
        Number(presetId),
        additions.map(target => target.id)
      );
      colonyAutomationUIState.syncedPresetId = null;
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderClearButton.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      const preset = automationManager.colonyAutomation.getPresetById(Number(presetId));
      if (preset) {
        const selected = colonyAutomationUIState.builderSelectedTargets.slice();
        for (let index = 0; index < selected.length; index += 1) {
          delete preset.targets[selected[index]];
        }
        colonyAutomationUIState.syncedPresetId = null;
      }
    }
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
      resetAutomationPresetJsonDetailsState(automationElements.colonyPresetJsonDetails, Number(presetId));
    }
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

  attachAutomationCombinationHandlers({
    getAutomation: () => automationManager.colonyAutomation,
    uiState: colonyAutomationUIState,
    applyCombinationButton: colonyApplyCombinationButton,
    nextTravelSelect: colonyApplyNextTravelSelect,
    nextTravelPersistToggle: colonyApplyNextTravelPersistToggle,
    combinationSelect: colonyCombinationSelect,
    combinationMoveUpButton: colonyCombinationMoveUpButton,
    combinationMoveDownButton: colonyCombinationMoveDownButton,
    combinationNameInput: colonyCombinationNameInput,
    combinationNewButton: colonyCombinationNewButton,
    combinationShowInSidebarCheckbox: colonyCombinationShowInSidebarCheckbox,
    combinationSaveButton: colonyCombinationSaveButton,
    combinationDeleteButton: colonyCombinationDeleteButton,
    addApplyButton: colonyAddApplyButton
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
