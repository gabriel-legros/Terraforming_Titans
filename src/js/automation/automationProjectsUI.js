const projectAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderType: 'both',
  builderScope: 'all',
  builderShowInSidebar: true,
  builderSelectedProjects: [],
  builderCategoryValue: 'all',
  builderProjectValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: '',
  combinationShowInSidebar: true
};

const PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';

function getProjectAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getProjectAutomationCombinationLabel(combination) {
  return combination.name || getAutomationCardText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function formatProjectAutomationPresetType(preset) {
  if (!preset) {
    return getAutomationCardText('selectPreset', {}, 'Select a preset');
  }
  const includeExpansion = preset.includeExpansion !== false;
  const includeOperations = preset.includeOperations !== false;
  if (includeExpansion && includeOperations) {
    return getAutomationCardText('expansionOperations', {}, 'Expansion + Operations');
  }
  if (includeExpansion) {
    return getAutomationCardText('expansionOnly', {}, 'Expansion only');
  }
  return getAutomationCardText('operationsOnly', {}, 'Operations only');
}

function buildAutomationProjectsUI() {
  const card = automationElements.projectsAutomation || document.getElementById('automation-projects');

  const toggleCollapsed = () => {
    const automation = automationManager.projectsAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('projectsAutomationTitle', {}, 'Projects Automation'),
    toggleCollapsed
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const builderSection = document.createElement('div');
  builderSection.classList.add('project-automation-section', 'building-automation-section');
  const builderHeader = document.createElement('div');
  builderHeader.classList.add('project-automation-section-title', 'building-automation-section-title');
  const builderTitle = document.createElement('span');
  builderTitle.textContent = getAutomationCardText('researchAutomationPresetTitle', {}, 'Preset Builder');
  const builderDirty = document.createElement('span');
  builderDirty.classList.add('project-automation-builder-dirty', 'building-automation-builder-dirty');
  builderDirty.textContent = '*';
  builderDirty.style.display = 'none';
  builderHeader.append(builderTitle, builderDirty);
  builderSection.appendChild(builderHeader);

  const builderRow = document.createElement('div');
  builderRow.classList.add('project-automation-row', 'building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('project-automation-builder-select');
  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  presetMoveUpButton.classList.add('project-automation-builder-move-up');
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  presetMoveDownButton.classList.add('project-automation-builder-move-down');
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetNameInput.classList.add('project-automation-builder-name');
  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  newButton.classList.add('project-automation-builder-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  saveButton.classList.add('project-automation-builder-save', 'building-automation-builder-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deleteButton.classList.add('project-automation-builder-delete');
  const transferButtons = createAutomationPresetTransferButtons('project-automation-builder');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  applyOnceButton.classList.add('project-automation-builder-apply-once');
  const builderShowSidebar = createAutomationShowInSidebarLabel('project-automation-builder');
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
  builderModeRow.classList.add('project-automation-row', 'building-automation-row');
  const typeSelect = document.createElement('select');
  typeSelect.classList.add('project-automation-builder-type');
  const expansionOnlyOption = document.createElement('option');
  expansionOnlyOption.value = 'expansion';
  expansionOnlyOption.textContent = getAutomationCardText('expansionOnly', {}, 'Expansion only');
  const operationsOnlyOption = document.createElement('option');
  operationsOnlyOption.value = 'operations';
  operationsOnlyOption.textContent = getAutomationCardText('operationsOnly', {}, 'Operations only');
  const bothTypesOption = document.createElement('option');
  bothTypesOption.value = 'both';
  bothTypesOption.textContent = getAutomationCardText('expansionOperations', {}, 'Expansion + Operations');
  typeSelect.append(expansionOnlyOption, operationsOnlyOption, bothTypesOption);
  const scopeSelect = document.createElement('select');
  scopeSelect.classList.add('project-automation-builder-scope');
  const allScope = document.createElement('option');
  allScope.value = 'all';
  allScope.textContent = getAutomationCardText('allNonStoryProjects', {}, 'All non-story projects');
  const manualScope = document.createElement('option');
  manualScope.value = 'manual';
  manualScope.textContent = getAutomationCardText('chooseProjects', {}, 'Choose projects');
  scopeSelect.append(allScope, manualScope);
  builderModeRow.append(typeSelect, scopeSelect);
  builderSection.appendChild(builderModeRow);

  const builderHint = document.createElement('div');
  builderHint.classList.add('project-automation-hint', 'building-automation-hint');
  builderHint.textContent = getAutomationCardText('projectsBuilderHint', {}, 'Expansion saves auto start and build scaling settings. Operations saves run-mode and behavior controls.');
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('project-automation-row', 'building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('project-automation-builder-category');
  const projectSelect = document.createElement('select');
  projectSelect.classList.add('project-automation-builder-project');
  const addButton = document.createElement('button');
  addButton.textContent = getAutomationCardText('addProjectButton', {}, '+ Project');
  addButton.classList.add('project-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = getAutomationCardText('addCategoryButton', {}, '+ Category');
  addCategoryButton.classList.add('project-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = getAutomationCardText('clearAllButton', {}, '- All');
  clearButton.classList.add('project-automation-builder-clear');
  pickerRow.append(categorySelect, projectSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('project-automation-builder-list', 'building-automation-builder-list');
  builderSection.appendChild(selectedList);

  const presetJsonDetails = createAutomationPresetJsonDetails('project-automation-preset-json-details');
  builderSection.appendChild(presetJsonDetails);

  body.appendChild(builderSection);

  const applySection = document.createElement('div');
  applySection.classList.add('project-automation-section', 'building-automation-section');
  const applyHeader = document.createElement('div');
  applyHeader.classList.add('project-automation-section-title', 'building-automation-section-title');
  const applyTitle = document.createElement('span');
  applyTitle.textContent = getAutomationCardText('presetCombinationTitle', {}, 'Preset Combination');
  const applyNextTravelLabel = document.createElement('label');
  applyNextTravelLabel.classList.add('project-automation-apply-next-travel-label', 'building-automation-apply-next-travel-label');
  const applyNextTravelText = document.createElement('span');
  applyNextTravelText.textContent = getAutomationCardText('combinationOnNextTravelLabel', {}, 'Combination on Next Travel');
  const applyNextTravelSelect = document.createElement('select');
  applyNextTravelSelect.classList.add('project-automation-next-travel-select', 'building-automation-next-travel-select');
  const applyNextTravelPersistToggle = document.createElement('input');
  applyNextTravelPersistToggle.type = 'checkbox';
  applyNextTravelPersistToggle.classList.add('project-automation-next-travel-persist-toggle');
  const applyNextTravelPersistText = document.createElement('span');
  applyNextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  applyNextTravelPersistText.classList.add('project-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text');
  applyNextTravelLabel.append(
    applyNextTravelText,
    applyNextTravelSelect,
    applyNextTravelPersistToggle,
    applyNextTravelPersistText
  );
  applyHeader.append(applyTitle);
  applySection.appendChild(applyHeader);
  const applyNextTravelRow = document.createElement('div');
  applyNextTravelRow.classList.add('project-automation-next-travel-row', 'building-automation-next-travel-row');
  applyNextTravelRow.append(applyNextTravelLabel);
  applySection.appendChild(applyNextTravelRow);

  const combinationRow = document.createElement('div');
  combinationRow.classList.add('project-automation-row', 'building-automation-row');
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = getAutomationCardText('applyCombinationButton', {}, 'Apply Combination');
  applyCombinationButton.classList.add('project-automation-apply-combination', 'building-automation-apply-combination');
  const combinationSelect = document.createElement('select');
  combinationSelect.classList.add('project-automation-combination-select');
  const combinationMoveButtons = document.createElement('div');
  combinationMoveButtons.classList.add('automation-order-buttons');
  const combinationMoveUpButton = document.createElement('button');
  combinationMoveUpButton.textContent = '↑';
  combinationMoveUpButton.title = getAutomationCardText('moveCombinationUp', {}, 'Move combination up');
  combinationMoveUpButton.classList.add('project-automation-combination-move-up');
  const combinationMoveDownButton = document.createElement('button');
  combinationMoveDownButton.textContent = '↓';
  combinationMoveDownButton.title = getAutomationCardText('moveCombinationDown', {}, 'Move combination down');
  combinationMoveDownButton.classList.add('project-automation-combination-move-down');
  combinationMoveButtons.append(combinationMoveUpButton, combinationMoveDownButton);
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = getAutomationCardText('combinationNamePlaceholder', {}, 'Combination name');
  combinationNameInput.classList.add('project-automation-combination-name');
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = getAutomationCardText('newCombinationButton', {}, 'New');
  combinationNewButton.classList.add('project-automation-combination-new');
  const combinationSaveButton = document.createElement('button');
  combinationSaveButton.textContent = getAutomationCardText('saveCombinationButton', {}, 'Save');
  combinationSaveButton.classList.add('project-automation-combination-save', 'building-automation-combination-save');
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = getAutomationCardText('deleteCombinationButton', {}, 'Delete');
  combinationDeleteButton.classList.add('project-automation-combination-delete');
  const combinationShowSidebar = createAutomationShowInSidebarLabel('project-automation-combination');
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
  applyList.classList.add('project-automation-apply-list', 'building-automation-apply-list');
  applySection.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  addApplyButton.classList.add('project-automation-apply-add', 'building-automation-apply-add');
  applySection.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  applyHint.classList.add('project-automation-apply-hint', 'building-automation-apply-hint');
  applySection.appendChild(applyHint);

  body.appendChild(applySection);

  automationElements.projectsCollapseButton = header.collapse;
  automationElements.projectsPanelBody = body;
  automationElements.projectsBuilderPresetSelect = presetSelect;
  automationElements.projectsBuilderMoveUpButton = presetMoveUpButton;
  automationElements.projectsBuilderMoveDownButton = presetMoveDownButton;
  automationElements.projectsBuilderPresetNameInput = presetNameInput;
  automationElements.projectsBuilderNewButton = newButton;
  automationElements.projectsBuilderSaveButton = saveButton;
  automationElements.projectsBuilderDeleteButton = deleteButton;
  automationElements.projectsBuilderImportButton = transferButtons.importButton;
  automationElements.projectsBuilderExportButton = transferButtons.exportButton;
  automationElements.projectsBuilderApplyOnceButton = applyOnceButton;
  automationElements.projectsBuilderShowInSidebarCheckbox = builderShowSidebar.checkbox;
  automationElements.projectsBuilderDirty = builderDirty;
  automationElements.projectsBuilderTypeSelect = typeSelect;
  automationElements.projectsBuilderScopeSelect = scopeSelect;
  automationElements.projectsBuilderCategorySelect = categorySelect;
  automationElements.projectsBuilderProjectSelect = projectSelect;
  automationElements.projectsBuilderAddButton = addButton;
  automationElements.projectsBuilderAddCategoryButton = addCategoryButton;
  automationElements.projectsBuilderClearButton = clearButton;
  automationElements.projectsBuilderSelectedList = selectedList;
  automationElements.projectsPresetJsonDetails = presetJsonDetails;
  automationElements.projectsApplyCombinationButton = applyCombinationButton;
  automationElements.projectsApplyNextTravelSelect = applyNextTravelSelect;
  automationElements.projectsApplyNextTravelPersistToggle = applyNextTravelPersistToggle;
  automationElements.projectsCombinationSelect = combinationSelect;
  automationElements.projectsCombinationMoveUpButton = combinationMoveUpButton;
  automationElements.projectsCombinationMoveDownButton = combinationMoveDownButton;
  automationElements.projectsCombinationNameInput = combinationNameInput;
  automationElements.projectsCombinationNewButton = combinationNewButton;
  automationElements.projectsCombinationSaveButton = combinationSaveButton;
  automationElements.projectsCombinationDeleteButton = combinationDeleteButton;
  automationElements.projectsCombinationShowInSidebarCheckbox = combinationShowSidebar.checkbox;
  automationElements.projectsApplyList = applyList;
  automationElements.projectsApplyHint = applyHint;
  automationElements.projectsAddApplyButton = addApplyButton;

  attachProjectsAutomationHandlers();
}

function updateProjectsAutomationUI() {
  const {
    projectsAutomation,
    projectsAutomationDescription,
    projectsPanelBody,
    projectsCollapseButton,
    projectsBuilderPresetSelect,
    projectsBuilderMoveUpButton,
    projectsBuilderMoveDownButton,
    projectsBuilderPresetNameInput,
    projectsBuilderNewButton,
    projectsBuilderSaveButton,
    projectsBuilderDeleteButton,
    projectsBuilderImportButton,
    projectsBuilderExportButton,
    projectsBuilderApplyOnceButton,
    projectsBuilderShowInSidebarCheckbox,
    projectsBuilderDirty,
    projectsBuilderTypeSelect,
    projectsBuilderScopeSelect,
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderAddButton,
    projectsBuilderAddCategoryButton,
    projectsBuilderClearButton,
    projectsBuilderSelectedList,
    projectsPresetJsonDetails,
    projectsApplyList,
    projectsApplyHint,
    projectsApplyCombinationButton,
    projectsApplyNextTravelSelect,
    projectsApplyNextTravelPersistToggle,
    projectsAddApplyButton,
    projectsCombinationSelect,
    projectsCombinationMoveUpButton,
    projectsCombinationMoveDownButton,
    projectsCombinationNameInput,
    projectsCombinationNewButton,
    projectsCombinationSaveButton,
    projectsCombinationDeleteButton,
    projectsCombinationShowInSidebarCheckbox
  } = automationElements;
  const manager = automationManager;
  const automation = manager.projectsAutomation;
  const unlocked = manager.hasFeature('automationProjects');
  projectsAutomation.style.display = unlocked ? '' : 'none';
  projectsAutomation.classList.toggle('automation-card-locked', !unlocked);
  projectsAutomationDescription.textContent = unlocked
    ? getAutomationCardText('projectsAutomationDescriptionUnlocked', {}, 'Capture project expansion/operations settings and apply them in ordered presets.')
    : getAutomationCardText('projectsAutomationDescriptionLocked', {}, 'Purchase the Solis Projects Automation upgrade to enable project presets.');
  if (!unlocked) {
    return;
  }

  projectsPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  projectsCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  const presets = automation.presets.slice();
  const combinations = automation.getCombinations();
  const automatableProjects = getAutomatableProjects(projectAutomationUIState.builderSelectedProjects);
  const automatableProjectLookup = {};
  automatableProjects.forEach(project => {
    automatableProjectLookup[project.name] = project;
  });

  if (document.activeElement !== projectsBuilderPresetSelect) {
    projectsBuilderPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newPresetOption', {}, 'New preset');
    projectsBuilderPresetSelect.appendChild(newOption);
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getProjectAutomationPresetLabel(preset);
      projectsBuilderPresetSelect.appendChild(option);
    });
    projectsBuilderPresetSelect.value = automation.getSelectedPresetId() || '';
  }

  const activePresetId = automation.getSelectedPresetId();
  const activePreset = activePresetId ? automation.getPresetById(Number(activePresetId)) : null;
  const activePresetIndex = activePreset
    ? presets.findIndex(preset => preset.id === activePreset.id)
    : -1;
  if (activePreset && projectAutomationUIState.syncedPresetId !== activePresetId) {
    const names = Object.keys(activePreset.projects);
    const includeExpansion = activePreset.includeExpansion !== false;
    const includeOperations = activePreset.includeOperations !== false;
    projectAutomationUIState.builderType = includeExpansion && includeOperations
      ? 'both'
      : includeExpansion
        ? 'expansion'
        : 'operations';
    projectAutomationUIState.builderScope = activePreset.scopeAll ? 'all' : 'manual';
    projectAutomationUIState.builderSelectedProjects = names.slice();
    projectAutomationUIState.builderShowInSidebar = activePreset.showInSidebar !== false;
    projectAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && projectAutomationUIState.syncedPresetId) {
    projectAutomationUIState.syncedPresetId = null;
  }
  updateAutomationPresetJsonDetails(projectsPresetJsonDetails, activePreset);

  if (document.activeElement !== projectsBuilderPresetNameInput) {
    projectsBuilderPresetNameInput.value = activePreset ? activePreset.name : projectAutomationUIState.builderName;
  }
  projectsBuilderShowInSidebarCheckbox.checked = activePreset
    ? activePreset.showInSidebar !== false
    : projectAutomationUIState.builderShowInSidebar;
  if (document.activeElement !== projectsBuilderTypeSelect) {
    projectsBuilderTypeSelect.value = projectAutomationUIState.builderType;
  }
  if (document.activeElement !== projectsBuilderScopeSelect) {
    projectsBuilderScopeSelect.value = projectAutomationUIState.builderScope;
  }

  const showManual = projectAutomationUIState.builderScope === 'manual';
  projectsBuilderCategorySelect.parentElement.style.display = showManual ? 'flex' : 'none';
  projectsBuilderSelectedList.style.display = showManual ? 'flex' : 'none';
  projectsBuilderClearButton.style.display = showManual ? '' : 'none';
  projectsBuilderAddCategoryButton.style.display = showManual ? '' : 'none';

  const categories = getProjectAutomationCategories(automatableProjects);
  if (document.activeElement !== projectsBuilderCategorySelect) {
    projectsBuilderCategorySelect.textContent = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = getAutomationCardText('allCategoriesOption', {}, 'All categories');
    projectsBuilderCategorySelect.appendChild(allOption);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      projectsBuilderCategorySelect.appendChild(option);
    });
    projectsBuilderCategorySelect.value = projectAutomationUIState.builderCategoryValue || 'all';
    if (!projectsBuilderCategorySelect.value) {
      projectsBuilderCategorySelect.value = 'all';
    }
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value;
  }

  const selectedCategory = projectsBuilderCategorySelect.value || projectAutomationUIState.builderCategoryValue || 'all';
  if (document.activeElement !== projectsBuilderProjectSelect) {
    const available = automatableProjects.filter(project => (
      selectedCategory === 'all' || (project.category || 'general') === selectedCategory
    ));
    projectsBuilderProjectSelect.textContent = '';
    if (available.length === 0) {
      const empty = document.createElement('option');
      empty.textContent = getAutomationCardText('noProjectsAvailable', {}, 'No projects available');
      empty.disabled = true;
      empty.selected = true;
      projectsBuilderProjectSelect.appendChild(empty);
    } else {
      available.forEach(project => {
        const option = document.createElement('option');
        option.value = project.name;
        option.textContent = getAutomatableProjectDisplayName(project.name, automatableProjectLookup);
        projectsBuilderProjectSelect.appendChild(option);
      });
      if (projectAutomationUIState.builderProjectValue) {
        projectsBuilderProjectSelect.value = projectAutomationUIState.builderProjectValue;
      }
      if (!projectsBuilderProjectSelect.value) {
        projectsBuilderProjectSelect.value = available[0].name;
      }
    }
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
  }

  projectsBuilderAddButton.disabled = projectsBuilderProjectSelect.options.length === 0
    || projectsBuilderProjectSelect.options[0].disabled;
  projectsBuilderAddCategoryButton.disabled = projectsBuilderCategorySelect.options.length === 0
    || !automatableProjects.length;
  projectsBuilderClearButton.disabled = projectAutomationUIState.builderSelectedProjects.length === 0;
  projectsBuilderDeleteButton.disabled = !activePreset;
  projectsBuilderImportButton.disabled = false;
  projectsBuilderExportButton.disabled = !activePreset;
  projectsBuilderApplyOnceButton.disabled = !activePreset;
  projectsBuilderMoveUpButton.disabled = activePresetIndex <= 0;
  projectsBuilderMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  projectsApplyCombinationButton.disabled = automation.getAssignments().length === 0;
  projectsCombinationSaveButton.disabled = automation.getAssignments().length === 0;

  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;

  if (document.activeElement !== projectsApplyNextTravelSelect) {
    projectsApplyNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    projectsApplyNextTravelSelect.appendChild(noneOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getProjectAutomationCombinationLabel(combo);
      projectsApplyNextTravelSelect.appendChild(option);
    });
    projectsApplyNextTravelSelect.value = automation.nextTravelCombinationId
      ? String(automation.nextTravelCombinationId)
      : '';
  }
  projectsApplyNextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
  projectsApplyNextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;

  if (document.activeElement !== projectsCombinationSelect) {
    projectsCombinationSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newCombinationOption', {}, 'New combination');
    projectsCombinationSelect.appendChild(newOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = getProjectAutomationCombinationLabel(combo);
      projectsCombinationSelect.appendChild(option);
    });
    projectsCombinationSelect.value = automation.getSelectedCombinationId() || '';
  }

  const activeCombinationId = automation.getSelectedCombinationId();
  const activeCombination = activeCombinationId ? automation.getCombinationById(Number(activeCombinationId)) : null;
  const activeCombinationIndex = activeCombination
    ? combinations.findIndex(combo => combo.id === activeCombination.id)
    : -1;
  if (activeCombination && projectAutomationUIState.combinationSyncedId !== activeCombinationId) {
    projectAutomationUIState.combinationName = activeCombination.name;
    projectAutomationUIState.combinationShowInSidebar = activeCombination.showInSidebar !== false;
    projectAutomationUIState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && projectAutomationUIState.combinationSyncedId) {
    projectAutomationUIState.combinationSyncedId = null;
  }

  if (document.activeElement !== projectsCombinationNameInput) {
    projectsCombinationNameInput.value = activeCombination
      ? activeCombination.name
      : projectAutomationUIState.combinationName;
  }
  projectsCombinationShowInSidebarCheckbox.checked = activeCombination
    ? activeCombination.showInSidebar !== false
    : projectAutomationUIState.combinationShowInSidebar;

  projectsCombinationDeleteButton.disabled = !activeCombination;
  projectsCombinationMoveUpButton.disabled = activeCombinationIndex <= 0;
  projectsCombinationMoveDownButton.disabled = activeCombinationIndex < 0 || activeCombinationIndex >= combinations.length - 1;

  const selectedHasFocus = projectsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  if (!selectedHasFocus) {
    projectsBuilderSelectedList.textContent = '';
    projectAutomationUIState.builderSelectedProjects.forEach(name => {
      const pill = document.createElement('div');
      pill.classList.add('project-automation-builder-pill', 'building-automation-builder-pill');
      const label = document.createElement('span');
      label.textContent = getAutomatableProjectDisplayName(name, automatableProjectLookup);
      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = getAutomationCardText('removeProject', {}, 'Remove project');
      remove.addEventListener('click', () => {
        projectAutomationUIState.builderSelectedProjects = projectAutomationUIState.builderSelectedProjects.filter(id => id !== name);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      projectsBuilderSelectedList.appendChild(pill);
    });
  }

  const savedType = activePreset
    ? (activePreset.includeExpansion !== false) && (activePreset.includeOperations !== false)
      ? 'both'
      : (activePreset.includeExpansion !== false)
        ? 'expansion'
        : 'operations'
    : 'both';
  const savedScope = activePreset
    ? activePreset.scopeAll
      ? 'all'
      : 'manual'
    : 'all';
  const savedProjectIds = activePreset ? Object.keys(activePreset.projects) : [];
  const savedProjectSet = new Set(savedProjectIds);
  const manualSelection = projectAutomationUIState.builderScope === 'manual';
  const selectionChanged = manualSelection
    && (projectAutomationUIState.builderSelectedProjects.length !== savedProjectIds.length
      || projectAutomationUIState.builderSelectedProjects.some(id => !savedProjectSet.has(id)));
  const newDirty = !activePreset
    && (
      projectAutomationUIState.builderName.trim() !== ''
      || projectAutomationUIState.builderType !== 'both'
      || projectAutomationUIState.builderScope !== 'all'
      || projectAutomationUIState.builderSelectedProjects.length > 0
    );
  const existingDirty = !!activePreset
    && (
      projectAutomationUIState.builderType !== savedType
      || projectAutomationUIState.builderScope !== savedScope
      || selectionChanged
    );
  projectsBuilderDirty.style.display = newDirty || existingDirty ? '' : 'none';

  const applyHasFocus = projectsApplyList.contains(document.activeElement)
    && document.activeElement.tagName === 'SELECT';
  if (!applyHasFocus) {
    const assignments = automation.getAssignments();
    const applySignature = JSON.stringify({
      presets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeExpansion: preset.includeExpansion !== false,
        includeOperations: preset.includeOperations !== false,
        scopeAll: preset.scopeAll,
        projects: Object.keys(preset.projects)
      })),
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        presetId: assignment.presetId,
        enabled: assignment.enabled
      }))
    });
    if (projectsApplyList._renderSignature !== applySignature) {
      projectsApplyList.textContent = '';
      assignments.forEach((assignment, index) => {
        const row = document.createElement('div');
        row.classList.add('project-automation-apply-row', 'building-automation-apply-row');
        const primary = document.createElement('div');
        primary.classList.add('project-automation-apply-primary', 'building-automation-apply-primary');
        const toggle = createToggleButton({
          onLabel: getAutomationCardText('applyOn', {}, 'Apply On'),
          offLabel: getAutomationCardText('applyOff', {}, 'Apply Off'),
          isOn: assignment.enabled
        });
        toggle.classList.add('project-automation-apply-toggle', 'building-automation-apply-toggle');
        toggle.addEventListener('click', () => {
          automation.setAssignmentEnabled(assignment.id, !assignment.enabled);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        const select = document.createElement('select');
        presets.forEach(preset => {
          const option = document.createElement('option');
          option.value = String(preset.id);
          option.textContent = getProjectAutomationPresetLabel(preset);
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
        detail.classList.add('project-automation-apply-detail', 'building-automation-apply-detail');
          const updateDetail = (presetId) => {
          const preset = automation.getPresetById(presetId);
          if (!preset) {
            detail.textContent = getAutomationCardText('selectPreset', {}, 'Select a preset');
            return;
          }
          const presetType = formatProjectAutomationPresetType(preset);
          const projectList = preset.scopeAll
            ? getAutomationCardText('allNonStoryProjects', {}, 'All non-story projects')
            : Object.keys(preset.projects).map(id => getAutomatableProjectDisplayName(id, automatableProjectLookup)).join(', ');
          detail.textContent = projectList ? `${presetType} / ${projectList}` : presetType;
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
        controls.classList.add('project-automation-apply-controls', 'building-automation-apply-controls');
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
        projectsApplyList.appendChild(row);
      });
      projectsApplyList._renderSignature = applySignature;
    }
  }

  projectsAddApplyButton.disabled = presets.length === 0;
  projectsApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('projectsApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('projectsApplyHintRule', {}, 'Lower presets override higher presets when they target the same project and setting.');
}

function attachProjectsAutomationHandlers() {
  const {
    projectsBuilderPresetSelect,
    projectsBuilderMoveUpButton,
    projectsBuilderMoveDownButton,
    projectsBuilderPresetNameInput,
    projectsBuilderNewButton,
    projectsBuilderSaveButton,
    projectsBuilderDeleteButton,
    projectsBuilderImportButton,
    projectsBuilderExportButton,
    projectsBuilderTypeSelect,
    projectsBuilderScopeSelect,
    projectsBuilderShowInSidebarCheckbox,
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderAddButton,
    projectsBuilderApplyOnceButton,
    projectsBuilderAddCategoryButton,
    projectsBuilderClearButton,
    projectsApplyCombinationButton,
    projectsApplyNextTravelSelect,
    projectsApplyNextTravelPersistToggle,
    projectsCombinationSelect,
    projectsCombinationMoveUpButton,
    projectsCombinationMoveDownButton,
    projectsCombinationNameInput,
    projectsCombinationNewButton,
    projectsCombinationSaveButton,
    projectsCombinationDeleteButton,
    projectsCombinationShowInSidebarCheckbox,
    projectsAddApplyButton
  } = automationElements;

  projectsBuilderPresetSelect.addEventListener('change', (event) => {
    automationManager.projectsAutomation.setSelectedPresetId(event.target.value || null);
    projectAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  projectsBuilderMoveUpButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.projectsAutomation.movePreset(Number(presetId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  projectsBuilderMoveDownButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.projectsAutomation.movePreset(Number(presetId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderPresetNameInput.addEventListener('input', (event) => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      projectAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const preset = automationManager.projectsAutomation.getPresetById(Number(presetId));
    if (!preset) {
      return;
    }
    automationManager.projectsAutomation.renamePreset(preset.id, event.target.value || '');
  });

  projectsBuilderNewButton.addEventListener('click', () => {
    automationManager.projectsAutomation.setSelectedPresetId(null);
    projectAutomationUIState.syncedPresetId = null;
    projectAutomationUIState.builderName = '';
    projectAutomationUIState.builderType = 'both';
    projectAutomationUIState.builderScope = 'all';
    projectAutomationUIState.builderShowInSidebar = true;
    projectAutomationUIState.builderSelectedProjects = [];
    projectAutomationUIState.builderCategoryValue = 'all';
    projectAutomationUIState.builderProjectValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderTypeSelect.addEventListener('change', (event) => {
    projectAutomationUIState.builderType = event.target.value || 'both';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderScopeSelect.addEventListener('change', (event) => {
    projectAutomationUIState.builderScope = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderShowInSidebarCheckbox.addEventListener('change', () => {
    projectAutomationUIState.builderShowInSidebar = projectsBuilderShowInSidebarCheckbox.checked;
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.projectsAutomation.setPresetShowInSidebar(Number(presetId), projectAutomationUIState.builderShowInSidebar);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderCategorySelect.addEventListener('change', () => {
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderProjectSelect.addEventListener('change', () => {
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
  });

  projectsBuilderAddButton.addEventListener('click', () => {
    const projectId = projectsBuilderProjectSelect.value;
    if (!projectId) {
      return;
    }
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = projectId;
    if (!projectAutomationUIState.builderSelectedProjects.includes(projectId)) {
      projectAutomationUIState.builderSelectedProjects.push(projectId);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = projectsBuilderCategorySelect.value || 'all';
    const projects = getAutomatableProjects(projectAutomationUIState.builderSelectedProjects);
    const additions = projects.filter(project => (
      selectedCategory === 'all' || (project.category || 'general') === selectedCategory
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(project => {
      if (!projectAutomationUIState.builderSelectedProjects.includes(project.name)) {
        projectAutomationUIState.builderSelectedProjects.push(project.name);
      }
    });
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderClearButton.addEventListener('click', () => {
    projectAutomationUIState.builderSelectedProjects = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderSaveButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const name = projectsBuilderPresetNameInput.value || projectAutomationUIState.builderName || '';
    const type = projectAutomationUIState.builderType;
    const includeExpansion = type === 'expansion' || type === 'both';
    const includeOperations = type === 'operations' || type === 'both';
    const scopeAll = projectAutomationUIState.builderScope === 'all';
    const showInSidebar = projectAutomationUIState.builderShowInSidebar;
    const projectIds = scopeAll
      ? getAutomatableProjects(projectAutomationUIState.builderSelectedProjects).map(project => project.name)
      : projectAutomationUIState.builderSelectedProjects.slice();
    const presetId = automation.getSelectedPresetId();
    if (presetId) {
      automation.updatePreset(Number(presetId), name, projectIds, { includeExpansion, includeOperations, scopeAll, showInSidebar });
    } else {
      automation.addPreset(name, projectIds, { includeExpansion, includeOperations, scopeAll, showInSidebar });
      projectAutomationUIState.syncedPresetId = null;
      projectAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderDeleteButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    automationManager.projectsAutomation.deletePreset(Number(presetId));
    projectAutomationUIState.syncedPresetId = null;
    projectAutomationUIState.builderName = '';
    projectAutomationUIState.builderSelectedProjects = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderImportButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importProjectsPresetTitle', {}, 'Import Projects Preset'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'projects');
        if (!parsed.ok) {
          return parsed;
        }
        automationManager.projectsAutomation.importPreset(parsed.preset);
        projectAutomationUIState.syncedPresetId = null;
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  projectsBuilderExportButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      return;
    }
    exportAutomationPresetToClipboard(
      'projects',
      automationManager.projectsAutomation.exportPreset(presetId),
      projectsBuilderExportButton
    );
  });

  projectsBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.projectsAutomation.applyPresetOnce(presetId);
    }
  });

  projectsApplyCombinationButton.addEventListener('click', () => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    automationManager.projectsAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
  });

  projectsApplyNextTravelSelect.addEventListener('change', (event) => {
    const comboId = event.target.value;
    automationManager.projectsAutomation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automationManager.projectsAutomation.nextTravelCombinationPersistent = automationManager.projectsAutomation.nextTravelCombinationPersistent
      && !!automationManager.projectsAutomation.nextTravelCombinationId;
    projectsApplyNextTravelPersistToggle.checked = automationManager.projectsAutomation.nextTravelCombinationPersistent;
    projectsApplyNextTravelPersistToggle.disabled = !automationManager.projectsAutomation.nextTravelCombinationId;
  });

  projectsApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    automationManager.projectsAutomation.nextTravelCombinationPersistent = event.target.checked
      && !!automationManager.projectsAutomation.nextTravelCombinationId;
  });

  projectsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.projectsAutomation.setSelectedCombinationId(comboId);
    projectAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.projectsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  projectsCombinationMoveUpButton.addEventListener('click', () => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.projectsAutomation.moveCombination(Number(comboId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  projectsCombinationMoveDownButton.addEventListener('click', () => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.projectsAutomation.moveCombination(Number(comboId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationNameInput.addEventListener('input', (event) => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    if (!comboId) {
      projectAutomationUIState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const combo = automationManager.projectsAutomation.getCombinationById(Number(comboId));
    combo.name = event.target.value || '';
  });

  projectsCombinationNewButton.addEventListener('click', () => {
    automationManager.projectsAutomation.setSelectedCombinationId(null);
    projectAutomationUIState.combinationSyncedId = null;
    projectAutomationUIState.combinationName = '';
    projectAutomationUIState.combinationShowInSidebar = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationShowInSidebarCheckbox.addEventListener('change', () => {
    projectAutomationUIState.combinationShowInSidebar = projectsCombinationShowInSidebarCheckbox.checked;
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    if (comboId) {
      automationManager.projectsAutomation.setCombinationShowInSidebar(Number(comboId), projectAutomationUIState.combinationShowInSidebar);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationSaveButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const name = projectsCombinationNameInput.value || projectAutomationUIState.combinationName || '';
    const snapshot = automation.getAssignments().map(entry => ({
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
      automation.setCombinationShowInSidebar(Number(comboId), projectAutomationUIState.combinationShowInSidebar);
    } else {
      const newComboId = automation.addCombination(name, snapshot);
      automation.setCombinationShowInSidebar(newComboId, projectAutomationUIState.combinationShowInSidebar);
      projectAutomationUIState.combinationSyncedId = null;
      projectAutomationUIState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationDeleteButton.addEventListener('click', () => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automationManager.projectsAutomation.deleteCombination(Number(comboId));
    projectAutomationUIState.combinationSyncedId = null;
    projectAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsAddApplyButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getAutomatableProjects(extraProjectIds = []) {
  const projects = [];
  const seen = {};
  const order = Array.isArray(projectManager.projectOrder)
    ? projectManager.projectOrder
    : Object.keys(projectManager.projects || {});
  const automation = automationManager?.projectsAutomation;

  order.forEach((projectId) => {
    const project = projectManager.projects[projectId];
    if (!project || project.category === 'story') {
      return;
    }
    if (automation && !automation.shouldShowProjectInAutomation(project, extraProjectIds)) {
      return;
    }
    if (project.name === PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID) {
      seen[project.name] = true;
      seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID] = true;
      seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID] = true;
      seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID] = true;
      projects.push({
        name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID,
        displayName: 'Space Storage (Expansion)',
        category: project.category || 'general'
      });
      projects.push({
        name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID,
        displayName: 'Space Storage (Caps and Reserve)',
        category: project.category || 'general'
      });
      projects.push({
        name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID,
        displayName: 'Space Storage (Operations)',
        category: project.category || 'general'
      });
      return;
    }
    seen[project.name] = true;
    projects.push(project);
  });

  for (const projectId in projectManager.projects) {
    const project = projectManager.projects[projectId];
    if (!project || project.category === 'story' || seen[project.name]) {
      continue;
    }
    if (automation && !automation.shouldShowProjectInAutomation(project, extraProjectIds)) {
      continue;
    }
    seen[project.name] = true;
    projects.push(project);
  }

  return projects;
}

function getAutomatableProjectDisplayName(projectId, projectLookup = null) {
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID) {
    return 'Space Storage (Expansion)';
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID) {
    return 'Space Storage (Caps and Reserve)';
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID) {
    return 'Space Storage (Operations)';
  }
  if (projectLookup && projectLookup[projectId]) {
    return projectLookup[projectId].displayName || projectLookup[projectId].name || projectId;
  }
  const project = projectManager.projects[projectId];
  return project?.displayName || project?.name || projectId;
}

function getProjectAutomationCategories(projects) {
  const categorySet = new Set();
  projects.forEach(project => {
    categorySet.add(project.category || 'general');
  });
  return Array.from(categorySet);
}

try {
  module.exports = {
    getAutomatableProjects,
    getAutomatableProjectDisplayName,
    getProjectAutomationCategories
  };
} catch (error) {}
