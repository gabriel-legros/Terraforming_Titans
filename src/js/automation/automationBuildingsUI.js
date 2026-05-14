const buildingAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderShowInSidebar: true,
  builderSelectedBuildings: [],
  jsonFilterBuildingId: '',
  builderCategoryValue: 'all',
  builderBuildingValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: '',
  combinationShowInSidebar: true
};
let buildingsBuilderPresetSignature = '';
let buildingsBuilderCategorySignature = '';
let buildingsBuilderBuildingSignature = '';
let buildingsBuilderSelectedSignature = '';

function getBuildingAutomationPickerCatalog(selectedCategory) {
  return Object.values(buildings).filter(building => (
    selectedCategory === 'all' || building.category === selectedCategory
  ));
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

function updateBuildingAutomationApplyDetail(detail, automation, presetId) {
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
}

function createBuildingAutomationApplyRow(automation) {
  const row = document.createElement('div');
  row.classList.add('building-automation-apply-row');
  const primary = document.createElement('div');
  primary.classList.add('building-automation-apply-primary');
  const toggle = createToggleButton({
    onLabel: getAutomationCardText('applyOn', {}, 'Apply On'),
    offLabel: getAutomationCardText('applyOff', {}, 'Apply Off'),
    isOn: false
  });
  toggle.classList.add('building-automation-apply-toggle');
  toggle.addEventListener('click', () => {
    const assignmentId = Number(row.dataset.assignmentId);
    const assignment = automation.getAssignments().find(entry => entry.id === assignmentId);
    if (!assignment) {
      return;
    }
    automation.setAssignmentEnabled(assignment.id, !assignment.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const select = document.createElement('select');
  select.addEventListener('change', (event) => {
    const assignmentId = Number(row.dataset.assignmentId);
    const presetId = Number(event.target.value);
    automation.setAssignmentPreset(assignmentId, presetId);
    updateBuildingAutomationApplyDetail(row._refs.detail, automation, presetId);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const detail = document.createElement('span');
  detail.classList.add('building-automation-apply-detail');
  const controls = document.createElement('div');
  controls.classList.add('building-automation-apply-controls');
  const moveUp = document.createElement('button');
  moveUp.textContent = '↑';
  moveUp.title = getAutomationCardText('moveApplyUp', {}, 'Move up');
  moveUp.addEventListener('click', () => {
    automation.moveAssignment(Number(row.dataset.assignmentId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const moveDown = document.createElement('button');
  moveDown.textContent = '↓';
  moveDown.title = getAutomationCardText('moveApplyDown', {}, 'Move down');
  moveDown.addEventListener('click', () => {
    automation.moveAssignment(Number(row.dataset.assignmentId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const remove = document.createElement('button');
  remove.textContent = '✕';
  remove.title = getAutomationCardText('removePresetFromApply', {}, 'Remove preset');
  remove.addEventListener('click', () => {
    automation.removeAssignment(Number(row.dataset.assignmentId));
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  controls.append(moveUp, moveDown, remove);
  primary.append(toggle, select);
  row.append(primary, detail, controls);
  row._refs = { toggle, select, detail, moveUp, moveDown, remove };
  return row;
}

function getBuildingAutomationPresetOptionData(presets) {
  if (presets.length) {
    return presets.map(preset => ({
      value: preset.id,
      label: getDefaultAutomationPresetLabel(preset)
    }));
  }
  return [{ value: '', label: getAutomationCardText('noPresetsSaved', {}, 'No presets saved'), disabled: true }];
}

function prepareBuildingAutomationApplyRow(row, automation, presets, assignment, index, assignmentCount) {
  row.dataset.assignmentId = String(assignment.id);
  row.style.display = '';
  setToggleButtonState(row._refs.toggle, assignment.enabled);
  syncAutomationSelectOptions(
    row._refs.select,
    getBuildingAutomationPresetOptionData(presets),
    presets.length ? assignment.presetId : ''
  );
  updateBuildingAutomationApplyDetail(row._refs.detail, automation, assignment.presetId);
  row._refs.moveUp.disabled = index === 0;
  row._refs.moveDown.disabled = index === assignmentCount - 1;
}

function prepareBuildingAutomationApplySpareRow(row, presets) {
  row.dataset.assignmentId = '';
  row.style.display = 'none';
  setToggleButtonState(row._refs.toggle, false);
  syncAutomationSelectOptions(
    row._refs.select,
    getBuildingAutomationPresetOptionData(presets),
    presets.length ? presets[0].id : ''
  );
  row._refs.detail.textContent = '';
  row._refs.moveUp.disabled = true;
  row._refs.moveDown.disabled = true;
}

function getBuildingAutomationApplyRow(container, automation, assignmentId) {
  let row = container._applyRows.get(assignmentId);
  if (row) {
    return row;
  }

  let reusableKey = null;
  container._applyRows.forEach((candidate, key) => {
    if (reusableKey === null && candidate.style.display === 'none') {
      reusableKey = key;
      row = candidate;
    }
  });
  if (row) {
    container._applyRows.delete(reusableKey);
    container._applyRows.set(assignmentId, row);
    return row;
  }

  row = createBuildingAutomationApplyRow(automation);
  container._applyRows.set(assignmentId, row);
  container.appendChild(row);
  return row;
}

function syncBuildingAutomationApplyRows(container, automation, presets, assignments) {
  container._applyRows ||= new Map();
  const activeIds = new Set();
  assignments.forEach(assignment => activeIds.add(assignment.id));
  container._applyRows.forEach((row, assignmentId) => {
    if (!activeIds.has(assignmentId)) {
      if (String(assignmentId).indexOf('spare-') === 0) {
        container._applyRows.delete(assignmentId);
        if (row.parentNode === container) {
          container.removeChild(row);
        }
        return;
      }
      prepareBuildingAutomationApplySpareRow(row, presets);
    }
  });
  assignments.forEach((assignment, index) => {
    const row = getBuildingAutomationApplyRow(container, automation, assignment.id);
    prepareBuildingAutomationApplyRow(row, automation, presets, assignment, index, assignments.length);
  });
}

function getBuildingAutomationAutoBuildBasisOptions(structure, currentValue) {
  return getAutomationAutoBuildBasisOptions(structure, currentValue);
}

function getBuildingAutomationJsonModeForPath(preset, fieldPath) {
  if (!preset || fieldPath[0] !== 'buildings' || fieldPath[2] !== 'automation') {
    return '';
  }
  const buildingId = fieldPath[1];
  const entry = preset.buildings[buildingId];
  const automation = entry && entry.automation;
  return (automation && automation.autoBuildBasis) || '';
}

function getBuildingAutomationPrioritySelectOptions(fieldPath) {
  if (fieldPath[0] === 'buildings' && fieldPath[2] === 'control' && fieldPath[3] === 'workerPriority') {
    return {
      selectOptions: [
        { value: '-1', label: getAutomationCardText('priorityLow', {}, 'Low (-1)') },
        { value: '0', label: getAutomationCardText('priorityNormal', {}, 'Normal (0)') },
        { value: '1', label: getAutomationCardText('priorityHigh', {}, 'High (1)') }
      ]
    };
  }
  if (fieldPath[0] === 'buildings' && fieldPath[2] === 'automation' && fieldPath[3] === 'autoBuildPriority') {
    return {
      selectOptions: [
        { value: '-2', label: getAutomationCardText('priorityVeryLow', {}, 'Very Low (-2)') },
        { value: '-1', label: getAutomationCardText('priorityLow', {}, 'Low (-1)') },
        { value: '0', label: getAutomationCardText('priorityNormal', {}, 'Normal (0)') },
        { value: '1', label: getAutomationCardText('priorityHigh', {}, 'High (1)') },
        { value: '2', label: getAutomationCardText('priorityVeryHigh', {}, 'Very High (2)') }
      ]
    };
  }
  return null;
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
    toggleCollapsed,
    'buildings'
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

  const builderRowParts = buildAutomationPresetBuilderRow({
    rowClasses: ['building-automation-row'],
    selectClasses: ['building-automation-builder-select'],
    moveUpButtonClasses: ['building-automation-builder-move-up'],
    moveDownButtonClasses: ['building-automation-builder-move-down'],
    nameInputClasses: ['building-automation-builder-name'],
    newButtonClasses: ['building-automation-builder-new'],
    saveButtonClasses: ['building-automation-builder-save'],
    deleteButtonClasses: ['building-automation-builder-delete'],
    transferKey: 'building-automation-builder',
    applyOnceButtonClasses: ['building-automation-builder-apply-once'],
    showSidebarKey: 'building-automation-builder'
  });
  builderSection.appendChild(builderRowParts.row);

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

  const applyParts = buildAutomationCombinationApplySection({
    sectionClasses: ['building-automation-section'],
    headerClasses: ['building-automation-section-title'],
    nextTravelRowClasses: ['building-automation-next-travel-row'],
    nextTravelLabelClasses: ['building-automation-apply-next-travel-label'],
    nextTravelSelectClasses: ['building-automation-next-travel-select'],
    nextTravelPersistToggleClasses: ['building-automation-next-travel-persist-toggle'],
    nextTravelPersistTextClasses: ['building-automation-next-travel-persist-text'],
    rowClasses: ['building-automation-row'],
    applyCombinationButtonClasses: ['building-automation-apply-combination'],
    combinationSelectClasses: ['building-automation-combination-select'],
    combinationMoveUpButtonClasses: ['building-automation-combination-move-up'],
    combinationMoveDownButtonClasses: ['building-automation-combination-move-down'],
    combinationNameInputClasses: ['building-automation-combination-name'],
    combinationNewButtonClasses: ['building-automation-combination-new'],
    combinationSaveButtonClasses: ['building-automation-combination-save'],
    combinationDeleteButtonClasses: ['building-automation-combination-delete'],
    combinationShowSidebarKey: 'building-automation-combination',
    applyListClasses: ['building-automation-apply-list'],
    addApplyButtonClasses: ['building-automation-apply-add'],
    applyHintClasses: ['building-automation-apply-hint']
  });
  body.appendChild(applyParts.section);

  automationElements.buildingsCollapseButton = header.collapse;
  automationElements.buildingsPanelBody = body;
  automationElements.buildingsBuilderPresetSelect = builderRowParts.presetSelect;
  automationElements.buildingsBuilderMoveUpButton = builderRowParts.presetMoveUpButton;
  automationElements.buildingsBuilderMoveDownButton = builderRowParts.presetMoveDownButton;
  automationElements.buildingsBuilderPresetNameInput = builderRowParts.presetNameInput;
  automationElements.buildingsBuilderNewButton = builderRowParts.newButton;
  automationElements.buildingsBuilderSaveButton = builderRowParts.saveButton;
  automationElements.buildingsBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.buildingsBuilderImportButton = builderRowParts.importButton;
  automationElements.buildingsBuilderExportButton = builderRowParts.exportButton;
  automationElements.buildingsBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.buildingsBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
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
  automationElements.buildingsApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.buildingsApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.buildingsApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.buildingsCombinationSelect = applyParts.combinationSelect;
  automationElements.buildingsCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.buildingsCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.buildingsCombinationNameInput = applyParts.combinationNameInput;
  automationElements.buildingsCombinationNewButton = applyParts.combinationNewButton;
  automationElements.buildingsCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.buildingsCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.buildingsCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.buildingsApplyList = applyParts.applyList;
  automationElements.buildingsApplyHint = applyParts.applyHint;
  automationElements.buildingsAddApplyButton = applyParts.addApplyButton;

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
    buildingsBuilderImportButton,
    buildingsBuilderExportButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderShowInSidebarCheckbox,
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
    buildingsCombinationDeleteButton,
    buildingsCombinationShowInSidebarCheckbox
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

  const selectedPresetIdForSignature = automation.getSelectedPresetId() || '';
  const presetSignature = `${selectedPresetIdForSignature}|${presets.map((preset) => `${preset.id}:${preset.name || ''}`).join('|')}`;
  if (document.activeElement !== buildingsBuilderPresetSelect && presetSignature !== buildingsBuilderPresetSignature) {
    buildingsBuilderPresetSignature = presetSignature;
    const selectedPresetId = automation.getSelectedPresetId();
    syncAutomationSelectOptions(
      buildingsBuilderPresetSelect,
      presets.map(preset => ({
        value: preset.id,
        label: getDefaultAutomationPresetLabel(preset)
      })),
      selectedPresetId || ''
    );
    if (!selectedPresetId) {
      buildingsBuilderPresetSelect.selectedIndex = -1;
    }
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
    buildingAutomationUIState.builderShowInSidebar = activePreset.showInSidebar !== false;
    buildingAutomationUIState.jsonFilterBuildingId = '';
    buildingAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && buildingAutomationUIState.syncedPresetId) {
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.jsonFilterBuildingId = '';
  }
  const selectedBuildingIds = activePreset ? Object.keys(activePreset.buildings) : [];
  if (buildingAutomationUIState.jsonFilterBuildingId
    && selectedBuildingIds.indexOf(buildingAutomationUIState.jsonFilterBuildingId) < 0) {
    buildingAutomationUIState.jsonFilterBuildingId = '';
  }
  updateAutomationPresetJsonDetails(buildingsPresetJsonDetails, activePreset, {
    isLeafVisible: (fieldPath, preset) => {
      const selectedBuildingId = buildingAutomationUIState.jsonFilterBuildingId;
      if (selectedBuildingId && fieldPath[0] === 'buildings' && fieldPath[1] !== selectedBuildingId) {
        return false;
      }
      if (fieldPath[0] !== 'buildings' || fieldPath[2] !== 'automation') {
        return true;
      }
      const mode = getBuildingAutomationJsonModeForPath(preset, fieldPath);
      const leafKey = fieldPath[3];
      if (leafKey === 'autoBuildFixed') {
        return mode === 'fixed';
      }
      if (leafKey === 'autoBuildFillPercent' || leafKey === 'autoBuildFillResourcePrimary' || leafKey === 'autoBuildFillResourceSecondary') {
        return mode === 'fill';
      }
      if (leafKey === 'autoBuildPercent') {
        if (mode === 'fixed' || mode === 'fill') {
          return false;
        }
        if (mode !== 'max') {
          return true;
        }
        const building = buildings[fieldPath[1]];
        return building.hasAdjustableAutoBuildMaxTarget();
      }
      return true;
    },
    getFieldOptions: (fieldPath, value, preset) => {
      const priorityOptions = getBuildingAutomationPrioritySelectOptions(fieldPath);
      if (priorityOptions) {
        return priorityOptions;
      }
      if (fieldPath[0] === 'buildings' && fieldPath[2] === 'automation' && fieldPath[3] === 'autoBuildBasis') {
        const buildingId = fieldPath[1];
        const structure = buildings[buildingId];
        return {
          selectOptions: getBuildingAutomationAutoBuildBasisOptions(structure, value)
        };
      }
      return null;
    },
    getFilterOptions: () => selectedBuildingIds.map((buildingId) => {
      const building = buildings[buildingId];
      return {
        value: buildingId,
        label: building ? (building.displayName || buildingId) : buildingId
      };
    }),
    selectedFilterValue: buildingAutomationUIState.jsonFilterBuildingId,
    onFilterChange: (nextValue) => {
      buildingAutomationUIState.jsonFilterBuildingId = nextValue || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onClearFilter: () => {
      if (!buildingAutomationUIState.jsonFilterBuildingId) {
        return;
      }
      buildingAutomationUIState.jsonFilterBuildingId = '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onFieldChange: (fieldPath, nextValue) => {
      if (!activePreset) {
        return;
      }
      applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, {
        normalizeValue: (path, value) => {
          if (path[0] === 'buildings' && path[2] === 'control' && path[3] === 'workerPriority') {
            return Number.parseInt(value, 10);
          }
          if (path[0] === 'buildings' && path[2] === 'automation' && path[3] === 'autoBuildPriority') {
            return Number.parseInt(value, 10);
          }
          return value;
        },
        onApplied: (appliedPath, appliedValue, rootKey) => {
          if (rootKey === 'showInSidebar') {
            buildingAutomationUIState.builderShowInSidebar = appliedValue !== false;
          }
          if (rootKey === 'scopeAll') {
            buildingAutomationUIState.builderScope = appliedValue ? 'all' : 'manual';
          }
          if (rootKey === 'includeControl' || rootKey === 'includeAutomation') {
            buildingAutomationUIState.builderType = activePreset.includeControl && activePreset.includeAutomation
              ? 'both'
              : activePreset.includeControl
                ? 'control'
                : 'automation';
          }
        }
      });
    }
  });

  if (document.activeElement !== buildingsBuilderPresetNameInput) {
    buildingsBuilderPresetNameInput.value = activePreset ? activePreset.name : buildingAutomationUIState.builderName;
  }
  buildingsBuilderShowInSidebarCheckbox.checked = activePreset
    ? activePreset.showInSidebar !== false
    : buildingAutomationUIState.builderShowInSidebar;
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
  const categorySignature = categories.join('|');
  if (document.activeElement !== buildingsBuilderCategorySelect && categorySignature !== buildingsBuilderCategorySignature) {
    syncAutomationSelectOptions(
      buildingsBuilderCategorySelect,
      [{ value: 'all', label: getAutomationCardText('allCategoriesOption', {}, 'All categories') }].concat(categories.map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1)
      }))),
      buildingAutomationUIState.builderCategoryValue || 'all'
    );
    if (!buildingsBuilderCategorySelect.value) {
      buildingsBuilderCategorySelect.value = 'all';
    }
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value;
    buildingsBuilderCategorySignature = categorySignature;
  }

  const selectedCategory = buildingsBuilderCategorySelect.value || buildingAutomationUIState.builderCategoryValue || 'all';
  const available = automatableBuildings.filter(building => (
    selectedCategory === 'all' || building.category === selectedCategory
  ));
  const availableSet = new Set(available.map(building => building.name));
  const buildingCatalog = getBuildingAutomationPickerCatalog(selectedCategory);
  const buildingSignature = `${selectedCategory}|${buildingCatalog.map((building) => `${building.name}:${building.displayName || ''}:${availableSet.has(building.name) ? 1 : 0}`).join('|')}`;
  if (document.activeElement !== buildingsBuilderBuildingSelect && buildingSignature !== buildingsBuilderBuildingSignature) {
    if (available.length === 0) {
      syncAutomationSelectOptions(
        buildingsBuilderBuildingSelect,
        [{ value: '', label: getAutomationCardText('noBuildingsAvailable', {}, 'No buildings available'), disabled: true }]
          .concat(buildingCatalog.map(building => ({
            value: building.name,
            label: building.displayName || building.name,
            disabled: true,
            hidden: true
          }))),
        ''
      );
      buildingsBuilderBuildingSelect.selectedIndex = 0;
    } else {
      syncAutomationSelectOptions(
        buildingsBuilderBuildingSelect,
        buildingCatalog.map(building => ({
          value: building.name,
          label: building.displayName || building.name,
          disabled: !availableSet.has(building.name),
          hidden: !availableSet.has(building.name)
        })),
        buildingAutomationUIState.builderBuildingValue || available[0].name
      );
      if (buildingAutomationUIState.builderBuildingValue) {
        buildingsBuilderBuildingSelect.value = buildingAutomationUIState.builderBuildingValue;
      }
      if (!buildingsBuilderBuildingSelect.value || !availableSet.has(buildingsBuilderBuildingSelect.value)) {
        buildingsBuilderBuildingSelect.value = available[0].name;
      }
    }
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
    buildingsBuilderBuildingSignature = buildingSignature;
  }

  buildingsBuilderAddButton.disabled = available.length === 0;
  buildingsBuilderAddCategoryButton.disabled = buildingsBuilderCategorySelect.options.length === 0
    || !automatableBuildings.length;
  buildingsBuilderClearButton.disabled = buildingAutomationUIState.builderSelectedBuildings.length === 0;
  buildingsBuilderDeleteButton.disabled = !activePreset;
  buildingsBuilderImportButton.disabled = false;
  buildingsBuilderExportButton.disabled = !activePreset;
  buildingsBuilderApplyOnceButton.disabled = !activePreset;
  buildingsBuilderMoveUpButton.disabled = activePresetIndex <= 0;
  buildingsBuilderMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  buildingsApplyCombinationButton.disabled = automation.getAssignments().length === 0;
  buildingsCombinationSaveButton.disabled = automation.getAssignments().length === 0;
  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: buildingsApplyNextTravelSelect,
    persistToggleElement: buildingsApplyNextTravelPersistToggle
  });

  updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: buildingAutomationUIState,
    selectElement: buildingsCombinationSelect,
    nameInputElement: buildingsCombinationNameInput,
    showCheckboxElement: buildingsCombinationShowInSidebarCheckbox,
    moveUpButtonElement: buildingsCombinationMoveUpButton,
    moveDownButtonElement: buildingsCombinationMoveDownButton,
    deleteButtonElement: buildingsCombinationDeleteButton
  });

  const selectedHasFocus = buildingsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  const selectedSignature = buildingAutomationUIState.builderSelectedBuildings.join('|');
  if (!selectedHasFocus && selectedSignature !== buildingsBuilderSelectedSignature) {
    buildingsBuilderSelectedList.textContent = '';
    if (buildingAutomationUIState.builderSelectedBuildings.length === 0) {
      const emptyState = document.createElement('span');
      emptyState.classList.add('automation-empty-selection');
      emptyState.textContent = getAutomationCardText('nothingSelected', {}, 'Nothing selected');
      buildingsBuilderSelectedList.appendChild(emptyState);
    } else {
      buildingAutomationUIState.builderSelectedBuildings.forEach(name => {
        const building = buildings[name];
        const pill = document.createElement('div');
        pill.classList.add('building-automation-builder-pill');
        const label = document.createElement('span');
        label.textContent = building.displayName || name;
        label.style.cursor = 'pointer';
        label.title = getAutomationCardText('filterSelectionOption', {}, 'Filter selection');
        label.addEventListener('click', () => {
          buildingAutomationUIState.jsonFilterBuildingId = name;
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        const remove = document.createElement('button');
        remove.textContent = '✕';
        remove.title = getAutomationCardText('removeBuilding', {}, 'Remove building');
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
        });
        remove.addEventListener('click', () => {
          buildingAutomationUIState.builderSelectedBuildings = buildingAutomationUIState.builderSelectedBuildings.filter(id => id !== name);
          const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
          if (presetId) {
            const preset = automationManager.buildingsAutomation.getPresetById(Number(presetId));
            if (preset && preset.buildings[name]) {
              delete preset.buildings[name];
              buildingAutomationUIState.syncedPresetId = null;
            }
          }
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        pill.append(label, remove);
        buildingsBuilderSelectedList.appendChild(pill);
      });
    }
    buildingsBuilderSelectedSignature = selectedSignature;
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
    syncBuildingAutomationApplyRows(buildingsApplyList, automation, presets, automation.getAssignments());
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
    buildingsBuilderImportButton,
    buildingsBuilderExportButton,
    buildingsBuilderTypeSelect,
    buildingsBuilderScopeSelect,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderShowInSidebarCheckbox,
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
    buildingsCombinationShowInSidebarCheckbox,
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
    const automation = automationManager.buildingsAutomation;
    const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
    const presetId = automation.addPreset(suggestedName, [], {
      createEmpty: true,
      includeControl: true,
      includeAutomation: true,
      scopeAll: false,
      showInSidebar: true
    });
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.builderName = '';
    buildingAutomationUIState.builderScope = 'manual';
    buildingAutomationUIState.builderType = 'both';
    buildingAutomationUIState.builderShowInSidebar = true;
    buildingAutomationUIState.builderSelectedBuildings = [];
    buildingAutomationUIState.builderCategoryValue = 'all';
    buildingAutomationUIState.builderBuildingValue = '';
    if (presetId) {
      resetAutomationPresetJsonDetailsState(automationElements.buildingsPresetJsonDetails, Number(presetId));
    }
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
  buildingsBuilderShowInSidebarCheckbox.addEventListener('change', () => {
    buildingAutomationUIState.builderShowInSidebar = buildingsBuilderShowInSidebarCheckbox.checked;
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.buildingsAutomation.setPresetShowInSidebar(Number(presetId), buildingAutomationUIState.builderShowInSidebar);
    }
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
    let presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      const automation = automationManager.buildingsAutomation;
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeControl: true,
        includeAutomation: true,
        scopeAll: false,
        showInSidebar: buildingAutomationUIState.builderShowInSidebar
      });
      buildingAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.buildingsAutomation.mergeMissingBuildingsIntoPreset(Number(presetId), [buildingId]);
      buildingAutomationUIState.syncedPresetId = null;
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
    let presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      const automation = automationManager.buildingsAutomation;
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeControl: true,
        includeAutomation: true,
        scopeAll: false,
        showInSidebar: buildingAutomationUIState.builderShowInSidebar
      });
      buildingAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.buildingsAutomation.mergeMissingBuildingsIntoPreset(
        Number(presetId),
        additions.map(building => building.name)
      );
      buildingAutomationUIState.syncedPresetId = null;
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderClearButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (presetId) {
      const preset = automationManager.buildingsAutomation.getPresetById(Number(presetId));
      if (preset) {
        const selected = buildingAutomationUIState.builderSelectedBuildings.slice();
        for (let index = 0; index < selected.length; index += 1) {
          delete preset.buildings[selected[index]];
        }
        buildingAutomationUIState.syncedPresetId = null;
      }
    }
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
    const showInSidebar = buildingAutomationUIState.builderShowInSidebar;
    const buildingIds = buildingAutomationUIState.builderScope === 'all'
      ? getAutomatableBuildings().map(building => building.name)
      : buildingAutomationUIState.builderSelectedBuildings.slice();
    const presetId = automation.getSelectedPresetId();
    if (presetId) {
      resetAutomationPresetJsonDetailsState(automationElements.buildingsPresetJsonDetails, Number(presetId));
    }
    if (presetId) {
      automation.updatePreset(Number(presetId), name, buildingIds, { includeControl, includeAutomation, scopeAll, showInSidebar });
    } else {
      automation.addPreset(name, buildingIds, { includeControl, includeAutomation, scopeAll, showInSidebar });
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

  buildingsBuilderImportButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importBuildingsPresetTitle', {}, 'Import Buildings Preset'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'buildings');
        if (!parsed.ok) {
          return parsed;
        }
        automationManager.buildingsAutomation.importPreset(parsed.preset);
        buildingAutomationUIState.syncedPresetId = null;
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  buildingsBuilderExportButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    exportAutomationPresetToClipboard(
      'buildings',
      automationManager.buildingsAutomation.exportPreset(presetId),
      buildingsBuilderExportButton
    );
  });

  buildingsBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.buildingsAutomation.applyPresetOnce(presetId);
    }
  });

  attachAutomationCombinationHandlers({
    getAutomation: () => automationManager.buildingsAutomation,
    uiState: buildingAutomationUIState,
    applyCombinationButton: buildingsApplyCombinationButton,
    nextTravelSelect: buildingsApplyNextTravelSelect,
    nextTravelPersistToggle: buildingsApplyNextTravelPersistToggle,
    combinationSelect: buildingsCombinationSelect,
    combinationMoveUpButton: buildingsCombinationMoveUpButton,
    combinationMoveDownButton: buildingsCombinationMoveDownButton,
    combinationNameInput: buildingsCombinationNameInput,
    combinationNewButton: buildingsCombinationNewButton,
    combinationShowInSidebarCheckbox: buildingsCombinationShowInSidebarCheckbox,
    combinationSaveButton: buildingsCombinationSaveButton,
    combinationDeleteButton: buildingsCombinationDeleteButton,
    addApplyButton: buildingsAddApplyButton
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
