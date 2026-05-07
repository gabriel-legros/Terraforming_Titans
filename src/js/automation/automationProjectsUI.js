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
let projectsBuilderPresetSignature = '';
let projectsBuilderCategorySignature = '';
let projectsBuilderProjectSignature = '';
let projectsBuilderSelectedSignature = '';

const PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';

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
    toggleCollapsed,
    'projects'
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

  const builderRowParts = buildAutomationPresetBuilderRow({
    rowClasses: ['project-automation-row', 'building-automation-row'],
    selectClasses: ['project-automation-builder-select'],
    moveUpButtonClasses: ['project-automation-builder-move-up'],
    moveDownButtonClasses: ['project-automation-builder-move-down'],
    nameInputClasses: ['project-automation-builder-name'],
    newButtonClasses: ['project-automation-builder-new'],
    saveButtonClasses: ['project-automation-builder-save', 'building-automation-builder-save'],
    deleteButtonClasses: ['project-automation-builder-delete'],
    transferKey: 'project-automation-builder',
    applyOnceButtonClasses: ['project-automation-builder-apply-once'],
    showSidebarKey: 'project-automation-builder'
  });
  builderSection.appendChild(builderRowParts.row);

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

  const applyParts = buildAutomationCombinationApplySection({
    sectionClasses: ['project-automation-section', 'building-automation-section'],
    headerClasses: ['project-automation-section-title', 'building-automation-section-title'],
    nextTravelRowClasses: ['project-automation-next-travel-row', 'building-automation-next-travel-row'],
    nextTravelLabelClasses: ['project-automation-apply-next-travel-label', 'building-automation-apply-next-travel-label'],
    nextTravelSelectClasses: ['project-automation-next-travel-select', 'building-automation-next-travel-select'],
    nextTravelPersistToggleClasses: ['project-automation-next-travel-persist-toggle'],
    nextTravelPersistTextClasses: ['project-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text'],
    rowClasses: ['project-automation-row', 'building-automation-row'],
    applyCombinationButtonClasses: ['project-automation-apply-combination', 'building-automation-apply-combination'],
    combinationSelectClasses: ['project-automation-combination-select'],
    combinationMoveUpButtonClasses: ['project-automation-combination-move-up'],
    combinationMoveDownButtonClasses: ['project-automation-combination-move-down'],
    combinationNameInputClasses: ['project-automation-combination-name'],
    combinationNewButtonClasses: ['project-automation-combination-new'],
    combinationSaveButtonClasses: ['project-automation-combination-save', 'building-automation-combination-save'],
    combinationDeleteButtonClasses: ['project-automation-combination-delete'],
    combinationShowSidebarKey: 'project-automation-combination',
    applyListClasses: ['project-automation-apply-list', 'building-automation-apply-list'],
    addApplyButtonClasses: ['project-automation-apply-add', 'building-automation-apply-add'],
    applyHintClasses: ['project-automation-apply-hint', 'building-automation-apply-hint']
  });
  body.appendChild(applyParts.section);

  automationElements.projectsCollapseButton = header.collapse;
  automationElements.projectsPanelBody = body;
  automationElements.projectsBuilderPresetSelect = builderRowParts.presetSelect;
  automationElements.projectsBuilderMoveUpButton = builderRowParts.presetMoveUpButton;
  automationElements.projectsBuilderMoveDownButton = builderRowParts.presetMoveDownButton;
  automationElements.projectsBuilderPresetNameInput = builderRowParts.presetNameInput;
  automationElements.projectsBuilderNewButton = builderRowParts.newButton;
  automationElements.projectsBuilderSaveButton = builderRowParts.saveButton;
  automationElements.projectsBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.projectsBuilderImportButton = builderRowParts.importButton;
  automationElements.projectsBuilderExportButton = builderRowParts.exportButton;
  automationElements.projectsBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.projectsBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
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
  automationElements.projectsApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.projectsApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.projectsApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.projectsCombinationSelect = applyParts.combinationSelect;
  automationElements.projectsCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.projectsCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.projectsCombinationNameInput = applyParts.combinationNameInput;
  automationElements.projectsCombinationNewButton = applyParts.combinationNewButton;
  automationElements.projectsCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.projectsCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.projectsCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.projectsApplyList = applyParts.applyList;
  automationElements.projectsApplyHint = applyParts.applyHint;
  automationElements.projectsAddApplyButton = applyParts.addApplyButton;

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

  const presetSignature = presets.map((preset) => `${preset.id}:${preset.name || ''}`).join('|');
  if (document.activeElement !== projectsBuilderPresetSelect && presetSignature !== projectsBuilderPresetSignature) {
    projectsBuilderPresetSelect.textContent = '';
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getDefaultAutomationPresetLabel(preset);
      projectsBuilderPresetSelect.appendChild(option);
    });
    projectsBuilderPresetSignature = presetSignature;
    const selectedPresetId = automation.getSelectedPresetId();
    if (selectedPresetId) {
      projectsBuilderPresetSelect.value = String(selectedPresetId);
    } else {
      projectsBuilderPresetSelect.selectedIndex = -1;
    }
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
  updateAutomationPresetJsonDetails(projectsPresetJsonDetails, activePreset, {
    onFieldChange: (fieldPath, nextValue) => {
      if (!activePreset) {
        return;
      }
      applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, {
        onApplied: (appliedPath, appliedValue, rootKey) => {
          if (rootKey === 'showInSidebar') {
            projectAutomationUIState.builderShowInSidebar = appliedValue !== false;
          }
          if (rootKey === 'scopeAll') {
            projectAutomationUIState.builderScope = appliedValue ? 'all' : 'manual';
          }
          if (rootKey === 'includeExpansion' || rootKey === 'includeOperations') {
            const includeExpansion = activePreset.includeExpansion !== false;
            const includeOperations = activePreset.includeOperations !== false;
            projectAutomationUIState.builderType = includeExpansion && includeOperations
              ? 'both'
              : includeExpansion
                ? 'expansion'
                : 'operations';
          }
        }
      });
    }
  });

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
  const categorySignature = categories.join('|');
  if (document.activeElement !== projectsBuilderCategorySelect && categorySignature !== projectsBuilderCategorySignature) {
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
    projectsBuilderCategorySignature = categorySignature;
  }

  const selectedCategory = projectsBuilderCategorySelect.value || projectAutomationUIState.builderCategoryValue || 'all';
  const available = automatableProjects.filter(project => (
    selectedCategory === 'all' || (project.category || 'general') === selectedCategory
  ));
  const projectSignature = `${selectedCategory}|${available.map((project) => `${project.name}:${getAutomatableProjectDisplayName(project.name, automatableProjectLookup)}`).join('|')}`;
  if (document.activeElement !== projectsBuilderProjectSelect && projectSignature !== projectsBuilderProjectSignature) {
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
    projectsBuilderProjectSignature = projectSignature;
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

  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: projectsApplyNextTravelSelect,
    persistToggleElement: projectsApplyNextTravelPersistToggle
  });

  updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: projectAutomationUIState,
    selectElement: projectsCombinationSelect,
    nameInputElement: projectsCombinationNameInput,
    showCheckboxElement: projectsCombinationShowInSidebarCheckbox,
    moveUpButtonElement: projectsCombinationMoveUpButton,
    moveDownButtonElement: projectsCombinationMoveDownButton,
    deleteButtonElement: projectsCombinationDeleteButton
  });

  const selectedHasFocus = projectsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  const selectedSignature = projectAutomationUIState.builderSelectedProjects.join('|');
  if (!selectedHasFocus && selectedSignature !== projectsBuilderSelectedSignature) {
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
        const presetId = automationManager.projectsAutomation.getSelectedPresetId();
        if (presetId) {
          const normalizedProjectId = automationManager.projectsAutomation.normalizeProjectId(name);
          const preset = automationManager.projectsAutomation.getPresetById(Number(presetId));
          if (preset && preset.projects[normalizedProjectId]) {
            delete preset.projects[normalizedProjectId];
            projectAutomationUIState.syncedPresetId = null;
          }
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      projectsBuilderSelectedList.appendChild(pill);
    });
    projectsBuilderSelectedSignature = selectedSignature;
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
    const automation = automationManager.projectsAutomation;
    const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
    automation.setSelectedPresetId(null);
    projectAutomationUIState.syncedPresetId = null;
    projectAutomationUIState.builderName = suggestedName;
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
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.projectsAutomation.mergeMissingProjectsIntoPreset(Number(presetId), [projectId]);
      projectAutomationUIState.syncedPresetId = null;
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
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.projectsAutomation.mergeMissingProjectsIntoPreset(
        Number(presetId),
        additions.map(project => project.name)
      );
      projectAutomationUIState.syncedPresetId = null;
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderClearButton.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      const preset = automationManager.projectsAutomation.getPresetById(Number(presetId));
      if (preset) {
        const selected = projectAutomationUIState.builderSelectedProjects.slice();
        for (let index = 0; index < selected.length; index += 1) {
          const normalizedProjectId = automationManager.projectsAutomation.normalizeProjectId(selected[index]);
          delete preset.projects[normalizedProjectId];
        }
        projectAutomationUIState.syncedPresetId = null;
      }
    }
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
      resetAutomationPresetJsonDetailsState(automationElements.projectsPresetJsonDetails, Number(presetId));
    }
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

  attachAutomationCombinationHandlers({
    getAutomation: () => automationManager.projectsAutomation,
    uiState: projectAutomationUIState,
    applyCombinationButton: projectsApplyCombinationButton,
    nextTravelSelect: projectsApplyNextTravelSelect,
    nextTravelPersistToggle: projectsApplyNextTravelPersistToggle,
    combinationSelect: projectsCombinationSelect,
    combinationMoveUpButton: projectsCombinationMoveUpButton,
    combinationMoveDownButton: projectsCombinationMoveDownButton,
    combinationNameInput: projectsCombinationNameInput,
    combinationNewButton: projectsCombinationNewButton,
    combinationShowInSidebarCheckbox: projectsCombinationShowInSidebarCheckbox,
    combinationSaveButton: projectsCombinationSaveButton,
    combinationDeleteButton: projectsCombinationDeleteButton,
    addApplyButton: projectsAddApplyButton
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
