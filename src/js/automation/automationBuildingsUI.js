const buildingAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderPresetMode: 'regular',
  builderPresetModeInvalidMessage: '',
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
let buildingsBuilderCategorySignature = '';
let buildingsBuilderBuildingSignature = '';
let buildingAutomationPresetController;

function getBuildingAutomationPickerCatalog(selectedCategory) {
  return getAutomatableBuildings().filter(building => (
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

function getBuildingAutomationApplyDetailText(automation, presetId) {
  const preset = automation.getPresetById(presetId);
  const detailText = formatBuildingAutomationPresetType(preset);
  const buildingList = preset
    ? preset.scopeAll
      ? getAutomationCardText('allAvailableBuildings', {}, 'All available buildings')
      : Object.keys(preset.buildings).map(id => {
          const building = buildings[id];
          return building ? (building.displayName || id) : id;
        }).join(', ')
    : '';
  return buildingList ? `${detailText} / ${buildingList}` : detailText;
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
    duplicateButtonClasses: ['building-automation-builder-duplicate'],
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
  const presetModeSelect = document.createElement('select');
  presetModeSelect.classList.add('building-automation-builder-preset-mode');
  const regularModeOption = document.createElement('option');
  regularModeOption.value = 'regular';
  regularModeOption.textContent = getAutomationCardText('regularPresetMode', {}, 'Regular preset');
  const parameterizedModeOption = document.createElement('option');
  parameterizedModeOption.value = 'parameterized';
  parameterizedModeOption.textContent = getAutomationCardText('parameterizedPresetMode', {}, 'Parametrized preset');
  presetModeSelect.append(regularModeOption, parameterizedModeOption);
  builderModeRow.append(typeSelect, scopeSelect, presetModeSelect);
  builderSection.appendChild(builderModeRow);

  const presetModeMessage = document.createElement('div');
  presetModeMessage.classList.add('automation-parameterized-preset-message');
  presetModeMessage.style.display = 'none';
  builderSection.appendChild(presetModeMessage);

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
  const presetUsage = createAutomationPresetUsageLine();
  builderSection.appendChild(presetUsage);

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
  automationElements.buildingsBuilderDuplicateButton = builderRowParts.duplicateButton;
  automationElements.buildingsBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.buildingsBuilderImportButton = builderRowParts.importButton;
  automationElements.buildingsBuilderExportButton = builderRowParts.exportButton;
  automationElements.buildingsBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.buildingsBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
  automationElements.buildingsBuilderDirty = builderDirty;
  automationElements.buildingsBuilderTypeSelect = typeSelect;
  automationElements.buildingsBuilderScopeSelect = scopeSelect;
  automationElements.buildingsBuilderPresetModeSelect = presetModeSelect;
  automationElements.buildingsBuilderPresetModeMessage = presetModeMessage;
  automationElements.buildingsBuilderCategorySelect = categorySelect;
  automationElements.buildingsBuilderBuildingSelect = buildingSelect;
  automationElements.buildingsBuilderAddButton = addButton;
  automationElements.buildingsBuilderAddCategoryButton = addCategoryButton;
  automationElements.buildingsBuilderClearButton = clearButton;
  automationElements.buildingsBuilderSelectedList = selectedList;
  automationElements.buildingsPresetJsonDetails = presetJsonDetails;
  automationElements.buildingsPresetUsage = presetUsage;
  automationElements.buildingsApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.buildingsApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.buildingsApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.buildingsCombinationSelect = applyParts.combinationSelect;
  automationElements.buildingsCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.buildingsCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.buildingsCombinationNameInput = applyParts.combinationNameInput;
  automationElements.buildingsCombinationNewButton = applyParts.combinationNewButton;
  automationElements.buildingsCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.buildingsCombinationDirtyIndicator = applyParts.combinationDirtyIndicator;
  automationElements.buildingsCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.buildingsCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.buildingsCombinationUsage = applyParts.combinationUsage;
  automationElements.buildingsApplyList = applyParts.applyList;
  automationElements.buildingsApplyHint = applyParts.applyHint;
  automationElements.buildingsAddApplyButton = applyParts.addApplyButton;

  buildingAutomationPresetController = createAutomationTargetPresetController({
    getAutomation: () => automationManager.buildingsAutomation,
    isPresetModeAvailable: () => automationManager.hasFeature('automationScripts'),
    uiState: buildingAutomationUIState,
    collectionKey: 'buildings',
    selectedIdsKey: 'builderSelectedBuildings',
    filterIdKey: 'jsonFilterBuildingId',
    pickerValueKey: 'builderBuildingValue',
    pillClasses: ['building-automation-builder-pill'],
    getPresetType: (preset) => preset.includeControl && preset.includeAutomation
      ? 'both'
      : preset.includeControl
        ? 'control'
        : 'automation',
    presetTypeOptionKeys: ['includeControl', 'includeAutomation'],
    getTargetLabel: (buildingId) => {
      const building = buildings[buildingId];
      return building ? (building.displayName || buildingId) : buildingId;
    },
    getRemoveTitle: () => getAutomationCardText('removeBuilding', {}, 'Remove building'),
    transferType: 'buildings',
    getImportTitle: () => getAutomationCardText('importBuildingsPresetTitle', {}, 'Import Buildings Preset'),
    createEmptyPreset: (automation, name) => automation.addPreset(name, [], {
      createEmpty: true,
      includeControl: true,
      includeAutomation: true,
      scopeAll: false,
      showInSidebar: true
    }),
    getSaveRequest: (automation, state) => {
      const type = state.builderType;
      const scopeAll = state.builderScope === 'all';
      return {
        targetIds: scopeAll
          ? getAutomatableBuildings().map(building => building.name)
          : state.builderSelectedBuildings.slice(),
        options: {
          includeControl: type === 'control' || type === 'both',
          includeAutomation: type === 'automation' || type === 'both',
          scopeAll,
          showInSidebar: state.builderShowInSidebar,
          presetMode: state.builderPresetMode
        }
      };
    },
    refs: {
      presetSelect: builderRowParts.presetSelect,
      moveUpButton: builderRowParts.presetMoveUpButton,
      moveDownButton: builderRowParts.presetMoveDownButton,
      presetNameInput: builderRowParts.presetNameInput,
      newButton: builderRowParts.newButton,
      saveButton: builderRowParts.saveButton,
      duplicateButton: builderRowParts.duplicateButton,
      deleteButton: builderRowParts.deleteButton,
      importButton: builderRowParts.importButton,
      exportButton: builderRowParts.exportButton,
      applyOnceButton: builderRowParts.applyOnceButton,
      showInSidebarCheckbox: builderRowParts.showInSidebarCheckbox,
      typeSelect,
      scopeSelect,
      presetModeSelect,
      presetModeMessage,
      dirtyIndicator: builderDirty,
      categorySelect,
      clearButton,
      addCategoryButton,
      selectedList,
      presetJsonDetails,
      applyCombinationButton: applyParts.applyCombinationButton,
      combinationSaveButton: applyParts.combinationSaveButton
    }
  });

  attachBuildingsAutomationHandlers();
}

function updateBuildingsAutomationUI() {
  const {
    buildingsAutomation,
    buildingsAutomationDescription,
    buildingsPanelBody,
    buildingsCollapseButton,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderAddCategoryButton,
    buildingsBuilderClearButton,
    buildingsPresetJsonDetails,
    buildingsApplyList,
    buildingsApplyHint,
    buildingsApplyNextTravelSelect,
    buildingsApplyNextTravelPersistToggle,
    buildingsAddApplyButton,
    buildingsCombinationSelect,
    buildingsCombinationMoveUpButton,
    buildingsCombinationMoveDownButton,
    buildingsCombinationNameInput,
    buildingsCombinationDirtyIndicator,
    buildingsCombinationDeleteButton,
    buildingsCombinationShowInSidebarCheckbox,
    buildingsCombinationUsage
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
  const presetContext = buildingAutomationPresetController.syncPresetSelection(presets);
  const activePreset = presetContext.activePreset;
  const selectedBuildingIds = presetContext.savedTargetIds;
  updateAutomationPresetJsonDetails(buildingsPresetJsonDetails, activePreset, {
    rootPath: ['buildings'],
    bucketIncludeKeys: {
      control: 'includeControl',
      automation: 'includeAutomation'
    },
    getParameterInputPaths: (preset) => automation.isParameterizedPreset(preset)
      ? automation.getPresetParameterInfo(preset).parameterPaths
      : [],
    showStatus: (text, isError) => showAutomationPresetJsonStatus(automationElements.buildingsAutomationStatus, text, isError),
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
        return mode !== 'fixed' && mode !== 'fill' && mode !== 'max';
      }
      if (leafKey === 'autoBuildMaxPercent') {
        const building = buildings[fieldPath[1]];
        return mode === 'max' && building && building.hasAdjustableAutoBuildMaxTarget();
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
          selectOptions: getAutomationAutoBuildBasisOptions(structure, value)
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
    onSnapshotFilter: (buildingId) => {
      if (!activePreset) {
        return;
      }
      const changed = automation.snapshotPresetTarget(activePreset.id, buildingId);
      if (changed) {
        buildingAutomationUIState.builderSelectedBuildings = Object.keys(activePreset.buildings);
        showAutomationPresetJsonStatus(
          automationElements.buildingsAutomationStatus,
          getAutomationCardText('snapshotPresetJsonSaved', {}, 'Snapshot saved.'),
          false
        );
      } else {
        showAutomationPresetJsonStatus(
          automationElements.buildingsAutomationStatus,
          getAutomationCardText('snapshotPresetJsonFailed', {}, 'Could not snapshot that selection.'),
          true
        );
      }
    },
    onRegenerateFilter: (buildingId) => {
      if (!activePreset) {
        return null;
      }
      const referencePreset = JSON.parse(JSON.stringify(activePreset));
      const buildingIds = buildingId ? [buildingId] : selectedBuildingIds;
      let changed = false;
      for (let index = 0; index < buildingIds.length; index += 1) {
        const targetBuildingId = buildingIds[index];
        const building = buildings[targetBuildingId];
        if (!building) {
          continue;
        }
        const entry = automation.captureBuildingSettings(
          building,
          activePreset.includeControl !== false,
          activePreset.includeAutomation !== false
        );
        if (!entry.control) {
          delete entry.control;
        }
        if (!entry.automation) {
          delete entry.automation;
        }
        if (!entry.control && !entry.automation) {
          continue;
        }
        referencePreset.buildings[targetBuildingId] = entry;
        changed = true;
      }
      if (!changed) {
        return null;
      }
      return referencePreset;
    },
    onFieldChange: (fieldPath, nextValue, changeOptions = null) => {
      if (!activePreset) {
        return;
      }
      const applyOptions = {
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
      };
      if (changeOptions && changeOptions.remove) {
        applyAutomationPresetJsonFieldRemoval(activePreset, fieldPath, applyOptions);
      } else {
        applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, applyOptions);
      }
    }
  });
  updateAutomationPresetUsageLine(automationElements.buildingsPresetUsage, 'buildings', activePreset);
  buildingAutomationPresetController.syncControls(presetContext);

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
    if (buildingCatalog.length === 0) {
      syncAutomationSelectOptions(
        buildingsBuilderBuildingSelect,
        [{ value: '', label: getAutomationCardText('noBuildingsAvailable', {}, 'No buildings available'), disabled: true }],
        ''
      );
      buildingsBuilderBuildingSelect.selectedIndex = 0;
    } else {
      syncAutomationSelectOptions(
        buildingsBuilderBuildingSelect,
        buildingCatalog.map(building => ({
          value: building.name,
          label: building.displayName || building.name
        })),
        buildingAutomationUIState.builderBuildingValue || buildingCatalog[0].name
      );
      if (buildingAutomationUIState.builderBuildingValue) {
        buildingsBuilderBuildingSelect.value = buildingAutomationUIState.builderBuildingValue;
      }
      if (!buildingsBuilderBuildingSelect.value) {
        buildingsBuilderBuildingSelect.value = buildingCatalog[0].name;
      }
    }
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
    buildingsBuilderBuildingSignature = buildingSignature;
  }

  buildingsBuilderAddButton.disabled = buildingCatalog.length === 0;
  buildingsBuilderAddCategoryButton.disabled = buildingsBuilderCategorySelect.options.length === 0
    || !buildingCatalog.length;
  buildingsBuilderClearButton.disabled = buildingAutomationUIState.builderSelectedBuildings.length === 0;
  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: buildingsApplyNextTravelSelect,
    persistToggleElement: buildingsApplyNextTravelPersistToggle
  });

  const combinationControlState = updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: buildingAutomationUIState,
    selectElement: buildingsCombinationSelect,
    nameInputElement: buildingsCombinationNameInput,
    showCheckboxElement: buildingsCombinationShowInSidebarCheckbox,
    moveUpButtonElement: buildingsCombinationMoveUpButton,
    moveDownButtonElement: buildingsCombinationMoveDownButton,
    deleteButtonElement: buildingsCombinationDeleteButton,
    dirtyIndicatorElement: buildingsCombinationDirtyIndicator
  });
  updateAutomationCombinationUsageLine(
    buildingsCombinationUsage,
    'buildings',
    combinationControlState ? combinationControlState.activeCombination : null
  );

  buildingAutomationPresetController.syncSelection(presetContext);

  syncAutomationApplyAssignmentRows({
    container: buildingsApplyList,
    automation,
    getAutomation: () => automationManager.buildingsAutomation,
    presets,
    assignments: automation.getAssignments(),
    getDetailText: getBuildingAutomationApplyDetailText,
    rowClasses: ['building-automation-apply-row'],
    primaryClasses: ['building-automation-apply-primary'],
    toggleClasses: ['building-automation-apply-toggle'],
    detailClasses: ['building-automation-apply-detail'],
    controlsClasses: ['building-automation-apply-controls']
  });

  buildingsAddApplyButton.disabled = presets.length === 0;
  buildingsApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('buildingsApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('buildingsApplyHintRule', {}, 'Lower presets override higher presets when they target the same building and setting type.');
}

function attachBuildingsAutomationHandlers() {
  const {
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
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
  buildingAutomationPresetController.attachHandlers();

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
      automationManager.buildingsAutomation.mergeMissingPresetTargets(Number(presetId), [buildingId]);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = buildingsBuilderCategorySelect.value || 'all';
    const additions = getBuildingAutomationPickerCatalog(selectedCategory);
    const additionsByName = {};
    additions.forEach((building) => {
      additionsByName[building.name] = building;
    });
    const uniqueAdditions = Object.values(additionsByName);
    const additionsFiltered = uniqueAdditions.filter(building => (
      selectedCategory === 'all' || building.category === selectedCategory
    ));
    if (!additionsFiltered.length) {
      return;
    }
    additionsFiltered.forEach(building => {
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
      automationManager.buildingsAutomation.mergeMissingPresetTargets(
        Number(presetId),
        additionsFiltered.map(building => building.name)
      );
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
      }
    }
    buildingAutomationUIState.builderSelectedBuildings = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
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
