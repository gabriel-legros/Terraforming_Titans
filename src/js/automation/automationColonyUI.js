const colonyAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderPresetMode: 'regular',
  builderPresetModeInvalidMessage: '',
  builderShowInSidebar: true,
  builderSelectedTargets: [],
  jsonFilterTargetId: '',
  builderCategoryValue: 'all',
  builderTargetValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: '',
  combinationShowInSidebar: true
};
let colonyBuilderCategorySignature = '';
let colonyBuilderTargetSignature = '';
let colonyAutomationPresetController;

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

function getColonyAutomationTargetDisplayLabel(automation, targetId) {
  const fallback = String(targetId || '');
  if (automation.isSliderTarget(targetId)) {
    const slider = automation.getSliderTargetConfig(targetId);
    return slider ? slider.label : (automation.getSliderTargetId(targetId) || fallback);
  }
  return automation.getTargetLabel(targetId) || fallback;
}

function getColonyAutomationApplyDetailText(automation, presetId) {
  const preset = automation.getPresetById(presetId);
  const detailText = formatColonyAutomationPresetType(preset);
  const targetList = preset
    ? preset.scopeAll
      ? getAutomationCardText('allAvailableTargets', {}, 'All available targets')
      : Object.keys(preset.targets).map(targetId => getColonyAutomationTargetDisplayLabel(automation, targetId)).join(', ')
    : '';
  return targetList ? `${detailText} / ${targetList}` : detailText;
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

function getColonyAutomationPrioritySelectOptions(fieldPath) {
  if (fieldPath[0] === 'targets' && fieldPath[2] === 'control' && fieldPath[3] === 'workerPriority') {
    return {
      selectOptions: [
        { value: '-1', label: getAutomationCardText('priorityLow', {}, 'Low (-1)') },
        { value: '0', label: getAutomationCardText('priorityNormal', {}, 'Normal (0)') },
        { value: '1', label: getAutomationCardText('priorityHigh', {}, 'High (1)') }
      ]
    };
  }
  if (fieldPath[0] === 'targets' && fieldPath[2] === 'automation' && fieldPath[3] === 'autoBuildPriority') {
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
    duplicateButtonClasses: ['colony-automation-builder-duplicate'],
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
  const presetModeSelect = document.createElement('select');
  presetModeSelect.classList.add('colony-automation-builder-preset-mode');
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
  const presetUsage = createAutomationPresetUsageLine();
  builderSection.appendChild(presetUsage);

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
  automationElements.colonyBuilderDuplicateButton = builderRowParts.duplicateButton;
  automationElements.colonyBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.colonyBuilderImportButton = builderRowParts.importButton;
  automationElements.colonyBuilderExportButton = builderRowParts.exportButton;
  automationElements.colonyBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.colonyBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
  automationElements.colonyBuilderDirty = builderDirty;
  automationElements.colonyBuilderTypeSelect = typeSelect;
  automationElements.colonyBuilderScopeSelect = scopeSelect;
  automationElements.colonyBuilderPresetModeSelect = presetModeSelect;
  automationElements.colonyBuilderPresetModeMessage = presetModeMessage;
  automationElements.colonyBuilderCategorySelect = categorySelect;
  automationElements.colonyBuilderTargetSelect = targetSelect;
  automationElements.colonyBuilderAddButton = addButton;
  automationElements.colonyBuilderAddCategoryButton = addCategoryButton;
  automationElements.colonyBuilderClearButton = clearButton;
  automationElements.colonyBuilderSelectedList = selectedList;
  automationElements.colonyPresetJsonDetails = presetJsonDetails;
  automationElements.colonyPresetUsage = presetUsage;
  automationElements.colonyApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.colonyApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.colonyApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.colonyCombinationSelect = applyParts.combinationSelect;
  automationElements.colonyCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.colonyCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.colonyCombinationNameInput = applyParts.combinationNameInput;
  automationElements.colonyCombinationNewButton = applyParts.combinationNewButton;
  automationElements.colonyCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.colonyCombinationDirtyIndicator = applyParts.combinationDirtyIndicator;
  automationElements.colonyCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.colonyCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.colonyCombinationUsage = applyParts.combinationUsage;
  automationElements.colonyApplyList = applyParts.applyList;
  automationElements.colonyApplyHint = applyParts.applyHint;
  automationElements.colonyAddApplyButton = applyParts.addApplyButton;

  colonyAutomationPresetController = createAutomationTargetPresetController({
    getAutomation: () => automationManager.colonyAutomation,
    isPresetModeAvailable: () => automationManager.hasFeature('automationScripts'),
    uiState: colonyAutomationUIState,
    collectionKey: 'targets',
    selectedIdsKey: 'builderSelectedTargets',
    filterIdKey: 'jsonFilterTargetId',
    pickerValueKey: 'builderTargetValue',
    pillClasses: ['building-automation-builder-pill'],
    getPresetType: (preset) => preset.includeControl && preset.includeAutomation
      ? 'both'
      : preset.includeControl
        ? 'control'
        : 'automation',
    getTargetLabel: (targetId) => getColonyAutomationTargetDisplayLabel(
      automationManager.colonyAutomation,
      targetId
    ),
    getRemoveTitle: () => getAutomationCardText('removeTarget', {}, 'Remove target'),
    transferType: 'colony',
    getImportTitle: () => getAutomationCardText('importColonyPresetTitle', {}, 'Import Colony Preset'),
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
          ? automation.getAvailableTargets().map(target => target.id)
          : state.builderSelectedTargets.slice(),
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

  attachColonyAutomationHandlers();
}

function updateColonyAutomationUI() {
  const {
    colonyAutomation,
    colonyAutomationDescription,
    colonyPanelBody,
    colonyCollapseButton,
    colonyBuilderCategorySelect,
    colonyBuilderTargetSelect,
    colonyBuilderAddButton,
    colonyBuilderAddCategoryButton,
    colonyBuilderClearButton,
    colonyPresetJsonDetails,
    colonyApplyList,
    colonyApplyHint,
    colonyApplyNextTravelSelect,
    colonyApplyNextTravelPersistToggle,
    colonyAddApplyButton,
    colonyCombinationSelect,
    colonyCombinationMoveUpButton,
    colonyCombinationMoveDownButton,
    colonyCombinationNameInput,
    colonyCombinationDirtyIndicator,
    colonyCombinationDeleteButton,
    colonyCombinationShowInSidebarCheckbox,
    colonyCombinationUsage
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
  const availableTargets = automation.getAvailableTargets();
  const presetContext = colonyAutomationPresetController.syncPresetSelection(presets);
  const activePreset = presetContext.activePreset;
  const selectedTargetIds = presetContext.savedTargetIds;
  updateAutomationPresetJsonDetails(colonyPresetJsonDetails, activePreset, {
    rootPath: ['targets'],
    getParameterInputPaths: (preset) => automation.isParameterizedPreset(preset)
      ? automation.getPresetParameterInfo(preset).parameterPaths
      : [],
    showStatus: (text, isError) => showAutomationPresetJsonStatus(automationElements.colonyAutomationStatus, text, isError),
    isLeafVisible: (fieldPath, preset) => {
      const selectedTargetId = colonyAutomationUIState.jsonFilterTargetId;
      if (selectedTargetId && fieldPath[0] === 'targets' && fieldPath[1] !== selectedTargetId) {
        return false;
      }
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
    getFilterOptions: () => selectedTargetIds.map((targetId) => ({
      value: targetId,
      label: getColonyAutomationTargetDisplayLabel(automation, targetId)
    })),
    selectedFilterValue: colonyAutomationUIState.jsonFilterTargetId,
    onFilterChange: (nextValue) => {
      colonyAutomationUIState.jsonFilterTargetId = nextValue || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onClearFilter: () => {
      if (!colonyAutomationUIState.jsonFilterTargetId) {
        return;
      }
      colonyAutomationUIState.jsonFilterTargetId = '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onSnapshotFilter: (targetId) => {
      if (!activePreset) {
        return;
      }
      const changed = automation.snapshotPresetTarget(activePreset.id, targetId);
      if (changed) {
        colonyAutomationUIState.builderSelectedTargets = Object.keys(activePreset.targets);
        showAutomationPresetJsonStatus(
          automationElements.colonyAutomationStatus,
          getAutomationCardText('snapshotPresetJsonSaved', {}, 'Snapshot saved.'),
          false
        );
      } else {
        showAutomationPresetJsonStatus(
          automationElements.colonyAutomationStatus,
          getAutomationCardText('snapshotPresetJsonFailed', {}, 'Could not snapshot that selection.'),
          true
        );
      }
    },
    onRegenerateFilter: (targetId) => {
      if (!activePreset) {
        return null;
      }
      const referencePreset = JSON.parse(JSON.stringify(activePreset));
      const targetIds = targetId ? [targetId] : selectedTargetIds;
      let changed = false;
      for (let index = 0; index < targetIds.length; index += 1) {
        const targetEntryId = targetIds[index];
        const entry = automation.captureTargetSettings(
          targetEntryId,
          activePreset.includeControl !== false,
          activePreset.includeAutomation !== false
        );
        if (!entry.control && !entry.automation) {
          continue;
        }
        referencePreset.targets[targetEntryId] = entry;
        changed = true;
      }
      if (!changed) {
        return null;
      }
      return referencePreset;
    },
    getFieldOptions: (fieldPath, value) => {
      const priorityOptions = getColonyAutomationPrioritySelectOptions(fieldPath);
      if (priorityOptions) {
        return priorityOptions;
      }
      if (fieldPath[0] === 'targets' && fieldPath[2] === 'automation' && fieldPath[3] === 'autoBuildBasis') {
        const targetId = fieldPath[1];
        const structure = automationManager.colonyAutomation.getColonyTarget(targetId);
        return {
          selectOptions: getAutomationAutoBuildBasisOptions(structure, value)
        };
      }
      return null;
    },
    onFieldChange: (fieldPath, nextValue, changeOptions = null) => {
      if (!activePreset) {
        return;
      }
      const applyOptions = {
        normalizeValue: (path, value) => {
          if (path[0] === 'targets' && path[2] === 'control' && path[3] === 'workerPriority') {
            return Number.parseInt(value, 10);
          }
          if (path[0] === 'targets' && path[2] === 'automation' && path[3] === 'autoBuildPriority') {
            return Number.parseInt(value, 10);
          }
          return value;
        },
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
      };
      if (changeOptions && changeOptions.remove) {
        applyAutomationPresetJsonFieldRemoval(activePreset, fieldPath, applyOptions);
      } else {
        applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, applyOptions);
      }
    }
  });
  updateAutomationPresetUsageLine(automationElements.colonyPresetUsage, 'colony', activePreset);
  colonyAutomationPresetController.syncControls(presetContext);

  const categoryIds = automation.getCategoryIds();
  const categorySignature = categoryIds.map((categoryId) => `${categoryId}:${automation.getCategoryLabel(categoryId)}`).join('|');
  if (document.activeElement !== colonyBuilderCategorySelect && categorySignature !== colonyBuilderCategorySignature) {
    syncAutomationSelectOptions(
      colonyBuilderCategorySelect,
      [{ value: 'all', label: getAutomationCardText('allCategoriesOption', {}, 'All categories') }].concat(categoryIds.map(categoryId => ({
        value: categoryId,
        label: automation.getCategoryLabel(categoryId)
      }))),
      colonyAutomationUIState.builderCategoryValue || 'all'
    );
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
  const availableTargetSet = new Set(filteredTargets.map(target => target.id));
  const targetCatalog = availableTargets.filter(target => (
    selectedCategory === 'all' || target.categoryId === selectedCategory
  ));
  const targetSignature = `${selectedCategory}|${targetCatalog.map((target) => `${target.id}:${target.label}:${availableTargetSet.has(target.id) ? 1 : 0}`).join('|')}`;
  if (document.activeElement !== colonyBuilderTargetSelect && targetSignature !== colonyBuilderTargetSignature) {
    if (!targetCatalog.length) {
      syncAutomationSelectOptions(
        colonyBuilderTargetSelect,
        [{ value: '', label: getAutomationCardText('noTargetsAvailable', {}, 'No targets available'), disabled: true }],
        ''
      );
      colonyBuilderTargetSelect.selectedIndex = 0;
    } else {
      syncAutomationSelectOptions(
        colonyBuilderTargetSelect,
        targetCatalog.map(target => ({
          value: target.id,
          label: target.label
        })),
        colonyAutomationUIState.builderTargetValue || targetCatalog[0].id
      );
      if (colonyAutomationUIState.builderTargetValue) {
        colonyBuilderTargetSelect.value = colonyAutomationUIState.builderTargetValue;
      }
      if (!colonyBuilderTargetSelect.value) {
        colonyBuilderTargetSelect.value = targetCatalog[0].id;
      }
    }
    colonyAutomationUIState.builderTargetValue = colonyBuilderTargetSelect.value || '';
    colonyBuilderTargetSignature = targetSignature;
  }

  colonyBuilderAddButton.disabled = targetCatalog.length === 0;
  colonyBuilderAddCategoryButton.disabled = colonyBuilderCategorySelect.options.length === 0
    || !targetCatalog.length;
  colonyBuilderClearButton.disabled = colonyAutomationUIState.builderSelectedTargets.length === 0;

  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: colonyApplyNextTravelSelect,
    persistToggleElement: colonyApplyNextTravelPersistToggle
  });

  const combinationControlState = updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: colonyAutomationUIState,
    selectElement: colonyCombinationSelect,
    nameInputElement: colonyCombinationNameInput,
    showCheckboxElement: colonyCombinationShowInSidebarCheckbox,
    moveUpButtonElement: colonyCombinationMoveUpButton,
    moveDownButtonElement: colonyCombinationMoveDownButton,
    deleteButtonElement: colonyCombinationDeleteButton,
    dirtyIndicatorElement: colonyCombinationDirtyIndicator
  });
  updateAutomationCombinationUsageLine(
    colonyCombinationUsage,
    'colony',
    combinationControlState ? combinationControlState.activeCombination : null
  );

  colonyAutomationPresetController.syncSelection(presetContext);

  const assignments = automation.getAssignments();
  syncAutomationApplyAssignmentRows({
    container: colonyApplyList,
    automation,
    getAutomation: () => automationManager.colonyAutomation,
    presets,
    assignments,
    getDetailText: getColonyAutomationApplyDetailText,
    rowClasses: ['building-automation-apply-row'],
    primaryClasses: ['building-automation-apply-primary'],
    toggleClasses: ['building-automation-apply-toggle'],
    detailClasses: ['building-automation-apply-detail'],
    controlsClasses: ['building-automation-apply-controls']
  });

  colonyAddApplyButton.disabled = presets.length === 0;
  colonyApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('colonyApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('colonyApplyHintRule', {}, 'Lower presets override higher presets when they target the same colony setting.');
}

function attachColonyAutomationHandlers() {
  const {
    colonyBuilderCategorySelect,
    colonyBuilderTargetSelect,
    colonyBuilderAddButton,
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
  colonyAutomationPresetController.attachHandlers();

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
    let presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      const automation = automationManager.colonyAutomation;
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeControl: true,
        includeAutomation: true,
        scopeAll: false,
        showInSidebar: colonyAutomationUIState.builderShowInSidebar
      });
      colonyAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.colonyAutomation.mergeMissingPresetTargets(Number(presetId), [targetId]);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  colonyBuilderAddCategoryButton.addEventListener('click', () => {
    const automation = automationManager.colonyAutomation;
    const selectedCategory = colonyBuilderCategorySelect.value || 'all';
    const additions = automation.getAvailableTargets().filter(target => (
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
    let presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (!presetId) {
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeControl: true,
        includeAutomation: true,
        scopeAll: false,
        showInSidebar: colonyAutomationUIState.builderShowInSidebar
      });
      colonyAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.colonyAutomation.mergeMissingPresetTargets(
        Number(presetId),
        additions.map(target => target.id)
      );
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
      }
    }
    colonyAutomationUIState.builderSelectedTargets = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
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
