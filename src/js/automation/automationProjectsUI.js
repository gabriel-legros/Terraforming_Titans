const projectAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderType: 'both',
  builderScope: 'all',
  builderPresetMode: 'regular',
  builderPresetModeInvalidMessage: '',
  builderShowInSidebar: true,
  builderSelectedProjects: [],
  jsonFilterProjectId: '',
  builderCategoryValue: 'all',
  builderProjectValue: '',
  builderSpaceStorageResourceValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: '',
  combinationShowInSidebar: true
};
let projectsBuilderCategorySignature = '';
let projectsBuilderProjectSignature = '';
let projectAutomationPresetController;

const PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_UI_SPACE_ELEVATOR_PROJECT_ID = 'spaceElevator';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID = 'spaceStorageSingleResource';
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX = `${PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID}:`;
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_FLUID_RESOURCE_BY_FIELD = {
  waterWithdrawTarget: 'liquidWater',
  hydrogenTransferTarget: 'hydrogen'
};
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_FLUID_TARGETS = {
  liquidWater: [
    { value: 'colony', labelKey: 'spaceStorageWaterTargetColony', fallback: 'Colony' },
    { value: 'colonyOnly', labelKey: 'spaceStorageWaterTargetColonyOnly', fallback: 'Colony only' },
    { value: 'surface', labelKey: 'spaceStorageWaterTargetSurface', fallback: 'Surface' }
  ],
  hydrogen: [
    { value: 'atmospheric', labelKey: 'spaceStorageHydrogenTargetAtmosphere', fallback: 'Atmosphere' },
    { value: 'colony', labelKey: 'spaceStorageHydrogenTargetColony', fallback: 'Colony' },
    { value: 'colonyOnly', labelKey: 'spaceStorageHydrogenTargetColonyOnly', fallback: 'Colony only' }
  ]
};
const PROJECT_AUTOMATION_UI_SPACE_STORAGE_IMPORT_LIMIT_RESOURCES = new Set([
  'liquidWater',
  'carbonDioxide',
  'inertGas',
  'hydrogen'
]);
const PROJECT_AUTOMATION_UI_ASSIGNMENT_INTEGER_FIELDS = new Set([
  'assignmentStep',
  'lifterAssignments',
  'manufacturingAssignments',
  'yardAssignments',
  'furnaceAssignments'
]);
const SPACE_MINING_WATER_ONLY_FIELDS = new Set([
  'waterImportTarget',
  'disableAboveWaterCoverage',
  'waterCoverageThreshold',
  'includeIceInWaterCoverage',
  'includeVaporInWaterCoverage'
]);
const SPACE_MINING_GAS_ONLY_FIELDS = new Set([
  'gasImportTarget',
  'disableAbovePressure',
  'disablePressureThreshold',
  'disableAboveOxygenPressure',
  'disableOxygenPressureThreshold',
  'disableAboveCo2Coverage',
  'co2CoverageThreshold',
  'co2CoverageDisableMode'
]);

function getSpaceStorageSingleResourceProjectId(resourceKey) {
  return `${PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX}${resourceKey}`;
}

function getSpaceStorageSingleResourceKey(projectId) {
  if (!projectId || projectId.indexOf(PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX) !== 0) {
    return '';
  }
  return projectId.slice(PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX.length);
}

function getSpaceStorageSingleResourceOptions() {
  const options = [];
  const spaceStorageResources = resources?.spaceStorage || {};
  Object.keys(spaceStorageResources).forEach((key) => {
    const resource = spaceStorageResources[key];
    if (!resource) {
      return;
    }
    options.push({
      value: key,
      label: resource.displayName || key
    });
  });
  return options;
}

function getProjectPresetDisposalCategoryOptions(project, currentValue) {
  const categoryMap = {};
  if (project) {
    const disposalGroupData = project.getDisposalGroupData();
    disposalGroupData.groupList.forEach((group) => {
      group.options.forEach((option) => {
        categoryMap[option.category] = true;
      });
    });
  } else {
    Object.keys(resources).forEach((category) => {
      categoryMap[category] = true;
    });
  }
  if (currentValue) {
    categoryMap[currentValue] = true;
  }
  return Object.keys(categoryMap).map((category) => ({
    value: category,
    label: t(`ui.resources.categories.${category}`, null, category)
  }));
}

function getProjectPresetDisposalResourceOptions(project, category, currentValue) {
  const resourceMap = {};
  if (project) {
    const disposalGroupData = project.getDisposalGroupData();
    disposalGroupData.groupList.forEach((group) => {
      group.options.forEach((option) => {
        if (option.category !== category) {
          return;
        }
        resourceMap[option.resource] = option.label || option.resource;
      });
    });
  } else if (resources[category]) {
    Object.keys(resources[category]).forEach((resource) => {
      const resourceData = resources[category][resource];
      resourceMap[resource] = resourceData.displayName || resourceData.name || resource;
    });
  }
  if (currentValue && !resourceMap[currentValue]) {
    resourceMap[currentValue] = currentValue;
  }
  return Object.keys(resourceMap).map((resource) => ({
    value: resource,
    label: resourceMap[resource]
  }));
}

function getProjectPresetJsonFieldOptions(fieldPath, value, preset) {
  if (!Array.isArray(fieldPath) || fieldPath.length < 4) {
    return null;
  }
  if (fieldPath[0] !== 'projects') {
    return null;
  }
  const projectId = fieldPath[1];
  if (!projectId) {
    return null;
  }
  const presetSection = fieldPath[2];
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_ELEVATOR_PROJECT_ID && presetSection === 'expansion') {
    if (fieldPath[3] === 'constructionMode') {
      return {
        selectOptions: [
          { value: 'elevator', label: t('ui.projects.spaceElevator.elevatorMode', null, 'Space Elevator') },
          { value: 'skyhook', label: t('ui.projects.spaceElevator.skyhookMode', null, 'Skyhook Network') }
        ]
      };
    }
    if (fieldPath[3] === 'capacityTargetMode') {
      return {
        selectOptions: [
          { value: 'fixed', label: t('ui.projects.spaceElevator.capacityTargetFixed', null, 'fixed') },
          { value: 'workers', label: t('ui.projects.spaceElevator.capacityTargetWorkers', null, 'x workers') }
        ]
      };
    }
  }
  const isDisposalTargetSelectionPath = presetSection === 'operations'
    && fieldPath[3] === 'disposalTargets'
    && Number.isInteger(fieldPath[4])
    && fieldPath[5] === 'selectedDisposalResource'
    && fieldPath.length === 7;
  if (isDisposalTargetSelectionPath) {
    const project = automationManager.projectsAutomation.getProjectForAutomationId(projectId);
    const disposalProject = project && project.getDisposalGroupData ? project : null;
    const leafKey = fieldPath[6];
    if (leafKey === 'category') {
      return {
        selectOptions: getProjectPresetDisposalCategoryOptions(disposalProject, value)
      };
    }
    if (leafKey === 'resource') {
      const selectionPath = ['projects', projectId, 'operations', 'disposalTargets', fieldPath[4], 'selectedDisposalResource'];
      const selected = getAutomationPresetValueAtPath(
        preset,
        selectionPath
      );
      return {
        selectOptions: getProjectPresetDisposalResourceOptions(disposalProject, selected.category, value)
      };
    }
  }
  if (presetSection !== 'operations') {
    return null;
  }
  if (PROJECT_AUTOMATION_UI_ASSIGNMENT_INTEGER_FIELDS.has(fieldPath[3])) {
    return { projectAssignmentInteger: true };
  }
  if ((projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID || projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID)
    && fieldPath[3] === 'transferMethod') {
    return {
      selectOptions: [
        { value: 'spaceships', label: getAutomationCardText('spaceStorageTransferMethodSpaceships', {}, 'Spaceships') },
        { value: 'teleporters', label: getAutomationCardText('spaceStorageTransferMethodTeleporters', {}, 'Teleporters') }
      ]
    };
  }
  if ((projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID || projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID)
    && fieldPath[3] === 'teleporterTransferRateBasis') {
    return {
      selectOptions: [
        { value: 'fixed', label: getAutomationCardText('spaceStorageTeleporterBasisFixed', {}, 'Fixed') },
        { value: 'workers', label: getAutomationCardText('spaceStorageTeleporterBasisWorkers', {}, 'workers') }
      ]
    };
  }
  const singleResourceKey = getSpaceStorageSingleResourceKey(projectId);
  const isSpaceStorageOperationsProject = projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID
    || projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID;
  const fluidResourceKey = PROJECT_AUTOMATION_UI_SPACE_STORAGE_FLUID_RESOURCE_BY_FIELD[fieldPath[3]];
  if (fluidResourceKey && (isSpaceStorageOperationsProject || singleResourceKey === fluidResourceKey)) {
    return {
      selectOptions: PROJECT_AUTOMATION_UI_SPACE_STORAGE_FLUID_TARGETS[fluidResourceKey].map(target => ({
        value: target.value,
        label: getAutomationCardText(target.labelKey, {}, target.fallback)
      }))
    };
  }
  if (fieldPath[3] === 'resourceImportLimitRespects'
    && (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID || singleResourceKey !== '')
    && PROJECT_AUTOMATION_UI_SPACE_STORAGE_IMPORT_LIMIT_RESOURCES.has(fieldPath[4])) {
    return {
      selectOptions: [
        { value: 'true', label: getAutomationCardText('true', {}, 'True') },
        { value: 'false', label: getAutomationCardText('false', {}, 'False') }
      ]
    };
  }
  if (fieldPath[3] === 'resourceBiomassDensityWithdrawLimits'
    && (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID || singleResourceKey !== '')
    && fieldPath[4] === 'biomass') {
    return {
      selectOptions: [
        { value: 'true', label: getAutomationCardText('true', {}, 'True') },
        { value: 'false', label: getAutomationCardText('false', {}, 'False') }
      ]
    };
  }
  if (singleResourceKey === '') {
    return null;
  }
  if (fieldPath[3] !== 'mode' && fieldPath[3] !== 'spaceStorageSingleResourceTransferMode') {
    return null;
  }
  return {
    selectOptions: [
      { value: 'null', label: getAutomationCardText('spaceStorageSingleResourceModeInherit', {}, 'Inherit global mode') },
      { value: 'store', label: getAutomationCardText('spaceStorageSingleResourceModeStore', {}, 'Store') },
      { value: 'withdraw', label: getAutomationCardText('spaceStorageSingleResourceModeWithdraw', {}, 'Withdraw') }
    ]
  };
}

function isProjectPresetFieldVisible(fieldPath, effectivePreset, automation) {
  if (!Array.isArray(fieldPath) || fieldPath.length < 4) {
    return true;
  }
  if (fieldPath[0] !== 'projects' || fieldPath[2] !== 'operations') {
    return true;
  }

  const projectId = fieldPath[1];
  const settingKey = fieldPath[3];
  const project = automation.getProjectForAutomationId(projectId);
  if (project && Array.isArray(project.disposalTargets)) {
    if (
      settingKey === 'selectedDisposalResource' ||
      settingKey === 'waitForCapacity' ||
      settingKey === 'disableBelowTemperature' ||
      settingKey === 'disableTemperatureThreshold' ||
      settingKey === 'disableBelowPressure' ||
      settingKey === 'disablePressureThreshold' ||
      settingKey === 'disableBelowCoverage' ||
      settingKey === 'disableCoverageThreshold' ||
      settingKey === 'disposalLimitSettings'
    ) {
      return false;
    }
  }
  if (!project || !project.attributes || !project.attributes.spaceMining) {
    return true;
  }

  if (SPACE_MINING_WATER_ONLY_FIELDS.has(settingKey) && !project.attributes.dynamicWaterImport) {
    return false;
  }

  if (SPACE_MINING_GAS_ONLY_FIELDS.has(settingKey)) {
    const gasTarget = project.getTargetAtmosphericResource
      ? project.getTargetAtmosphericResource()
      : null;
    if (!gasTarget) {
      return false;
    }
  }

  if (settingKey === 'disableIfDiskworldHydrogenFillCovered' && project.name !== 'hydrogenSpaceMining') {
    return false;
  }

  if (settingKey === 'materialImportTarget') {
    const materialImportResource = project.getPlanetaryMassImportResource
      ? project.getPlanetaryMassImportResource()
      : null;
    if (!materialImportResource) {
      return false;
    }
  }

  if (settingKey === 'waterCoverageDisableMode') {
    return false;
  }
  if (settingKey === 'co2CoverageDisableMode') {
    const disableEnabled = !!getAutomationPresetValueAtPath(effectivePreset, ['projects', projectId, 'operations', 'disableAboveCo2Coverage']);
    if (!disableEnabled) {
      return false;
    }
  }

  return true;
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
    duplicateButtonClasses: ['project-automation-builder-duplicate'],
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
  const presetModeSelect = document.createElement('select');
  presetModeSelect.classList.add('project-automation-builder-preset-mode');
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
  builderHint.classList.add('project-automation-hint', 'building-automation-hint');
  builderHint.textContent = getAutomationCardText('projectsBuilderHint', {}, 'Expansion saves auto start and build scaling settings. Operations saves run-mode and behavior controls.');
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('project-automation-row', 'building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('project-automation-builder-category');
  const projectSelect = document.createElement('select');
  projectSelect.classList.add('project-automation-builder-project');
  const resourceSelect = document.createElement('select');
  resourceSelect.classList.add('project-automation-builder-resource');
  const addButton = document.createElement('button');
  addButton.textContent = getAutomationCardText('addProjectButton', {}, '+ Project');
  addButton.classList.add('project-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = getAutomationCardText('addCategoryButton', {}, '+ Category');
  addCategoryButton.classList.add('project-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = getAutomationCardText('clearAllButton', {}, '- All');
  clearButton.classList.add('project-automation-builder-clear');
  pickerRow.append(categorySelect, projectSelect, resourceSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('project-automation-builder-list', 'building-automation-builder-list');
  builderSection.appendChild(selectedList);

  const presetJsonDetails = createAutomationPresetJsonDetails('project-automation-preset-json-details');
  builderSection.appendChild(presetJsonDetails);
  const presetUsage = createAutomationPresetUsageLine();
  builderSection.appendChild(presetUsage);

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
  automationElements.projectsBuilderDuplicateButton = builderRowParts.duplicateButton;
  automationElements.projectsBuilderDeleteButton = builderRowParts.deleteButton;
  automationElements.projectsBuilderImportButton = builderRowParts.importButton;
  automationElements.projectsBuilderExportButton = builderRowParts.exportButton;
  automationElements.projectsBuilderApplyOnceButton = builderRowParts.applyOnceButton;
  automationElements.projectsBuilderShowInSidebarCheckbox = builderRowParts.showInSidebarCheckbox;
  automationElements.projectsBuilderDirty = builderDirty;
  automationElements.projectsBuilderTypeSelect = typeSelect;
  automationElements.projectsBuilderScopeSelect = scopeSelect;
  automationElements.projectsBuilderPresetModeSelect = presetModeSelect;
  automationElements.projectsBuilderPresetModeMessage = presetModeMessage;
  automationElements.projectsBuilderCategorySelect = categorySelect;
  automationElements.projectsBuilderProjectSelect = projectSelect;
  automationElements.projectsBuilderResourceSelect = resourceSelect;
  automationElements.projectsBuilderAddButton = addButton;
  automationElements.projectsBuilderAddCategoryButton = addCategoryButton;
  automationElements.projectsBuilderClearButton = clearButton;
  automationElements.projectsBuilderSelectedList = selectedList;
  automationElements.projectsPresetJsonDetails = presetJsonDetails;
  automationElements.projectsPresetUsage = presetUsage;
  automationElements.projectsApplyCombinationButton = applyParts.applyCombinationButton;
  automationElements.projectsApplyNextTravelSelect = applyParts.applyNextTravelSelect;
  automationElements.projectsApplyNextTravelPersistToggle = applyParts.applyNextTravelPersistToggle;
  automationElements.projectsCombinationSelect = applyParts.combinationSelect;
  automationElements.projectsCombinationMoveUpButton = applyParts.combinationMoveUpButton;
  automationElements.projectsCombinationMoveDownButton = applyParts.combinationMoveDownButton;
  automationElements.projectsCombinationNameInput = applyParts.combinationNameInput;
  automationElements.projectsCombinationNewButton = applyParts.combinationNewButton;
  automationElements.projectsCombinationSaveButton = applyParts.combinationSaveButton;
  automationElements.projectsCombinationDirtyIndicator = applyParts.combinationDirtyIndicator;
  automationElements.projectsCombinationDeleteButton = applyParts.combinationDeleteButton;
  automationElements.projectsCombinationShowInSidebarCheckbox = applyParts.combinationShowInSidebarCheckbox;
  automationElements.projectsCombinationUsage = applyParts.combinationUsage;
  automationElements.projectsApplyList = applyParts.applyList;
  automationElements.projectsApplyHint = applyParts.applyHint;
  automationElements.projectsAddApplyButton = applyParts.addApplyButton;

  projectAutomationPresetController = createAutomationTargetPresetController({
    getAutomation: () => automationManager.projectsAutomation,
    isPresetModeAvailable: () => automationManager.hasFeature('automationScripts'),
    uiState: projectAutomationUIState,
    collectionKey: 'projects',
    selectedIdsKey: 'builderSelectedProjects',
    filterIdKey: 'jsonFilterProjectId',
    pickerValueKey: 'builderProjectValue',
    pillClasses: ['project-automation-builder-pill', 'building-automation-builder-pill'],
    getPresetType: (preset) => (preset.includeExpansion !== false) && (preset.includeOperations !== false)
      ? 'both'
      : preset.includeExpansion !== false
        ? 'expansion'
        : 'operations',
    getTargetLabel: (projectId, context) => getAutomatableProjectDisplayName(
      projectId,
      context.projectLookup
    ),
    normalizeTargetId: (automation, projectId) => automation.normalizeProjectId(projectId),
    getRemoveTitle: () => getAutomationCardText('removeProject', {}, 'Remove project'),
    transferType: 'projects',
    getImportTitle: () => getAutomationCardText('importProjectsPresetTitle', {}, 'Import Projects Preset'),
    createEmptyPreset: (automation, name) => automation.addPreset(name, [], {
      createEmpty: true,
      includeExpansion: true,
      includeOperations: true,
      scopeAll: false,
      showInSidebar: true
    }),
    getSaveRequest: (automation, state) => {
      const type = state.builderType;
      const scopeAll = state.builderScope === 'all';
      return {
        targetIds: scopeAll
          ? getAutomatableProjects(state.builderSelectedProjects).map(project => project.name)
          : state.builderSelectedProjects.slice(),
        options: {
          includeExpansion: type === 'expansion' || type === 'both',
          includeOperations: type === 'operations' || type === 'both',
          scopeAll,
          showInSidebar: state.builderShowInSidebar,
          presetMode: state.builderPresetMode
        }
      };
    },
    resetExtraState: (state) => {
      state.builderSpaceStorageResourceValue = '';
    },
    onPresetSynced: ({ targetIds, state }) => {
      for (let index = 0; index < targetIds.length; index += 1) {
        const resourceKey = getSpaceStorageSingleResourceKey(targetIds[index]);
        if (resourceKey) {
          state.builderSpaceStorageResourceValue = resourceKey;
          break;
        }
      }
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

  attachProjectsAutomationHandlers();
}

function getProjectsApplyDetailText(automation, presetId) {
  const preset = automation.getPresetById(presetId);
  if (!preset) {
    return getAutomationCardText('selectPreset', {}, 'Select a preset');
  }
  const presetType = formatProjectAutomationPresetType(preset);
  const projectList = preset.scopeAll
    ? getAutomationCardText('allNonStoryProjects', {}, 'All non-story projects')
    : Object.keys(preset.projects).map(id => getAutomatableProjectDisplayName(id)).join(', ');
  return projectList ? `${presetType} / ${projectList}` : presetType;
}

function updateProjectsAutomationUI() {
  const {
    projectsAutomation,
    projectsAutomationDescription,
    projectsPanelBody,
    projectsCollapseButton,
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderResourceSelect,
    projectsBuilderAddButton,
    projectsBuilderAddCategoryButton,
    projectsBuilderClearButton,
    projectsPresetJsonDetails,
    projectsApplyList,
    projectsApplyHint,
    projectsApplyNextTravelSelect,
    projectsApplyNextTravelPersistToggle,
    projectsAddApplyButton,
    projectsCombinationSelect,
    projectsCombinationMoveUpButton,
    projectsCombinationMoveDownButton,
    projectsCombinationNameInput,
    projectsCombinationDirtyIndicator,
    projectsCombinationDeleteButton,
    projectsCombinationShowInSidebarCheckbox,
    projectsCombinationUsage
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
  const presetContext = projectAutomationPresetController.syncPresetSelection(presets);
  presetContext.projectLookup = automatableProjectLookup;
  const activePreset = presetContext.activePreset;
  const selectedProjectIds = presetContext.savedTargetIds;
  updateAutomationPresetJsonDetails(projectsPresetJsonDetails, activePreset, {
    rootPath: ['projects'],
    getParameterInputPaths: (preset) => automation.isParameterizedPreset(preset)
      ? automation.getPresetParameterInfo(preset).parameterPaths
      : [],
    showStatus: (text, isError) => showAutomationPresetJsonStatus(automationElements.projectsAutomationStatus, text, isError),
    isLeafVisible: (fieldPath, effectivePreset) => {
      const selectedProjectId = projectAutomationUIState.jsonFilterProjectId;
      if (selectedProjectId && fieldPath[0] === 'projects' && fieldPath[1] !== selectedProjectId) {
        return false;
      }
      if (!isProjectPresetFieldVisible(fieldPath, effectivePreset, automation)) {
        return false;
      }
      return true;
    },
    getFilterOptions: () => selectedProjectIds.map((projectId) => ({
      value: projectId,
      label: getAutomatableProjectDisplayName(projectId, automatableProjectLookup)
    })),
    selectedFilterValue: projectAutomationUIState.jsonFilterProjectId,
    onFilterChange: (nextValue) => {
      projectAutomationUIState.jsonFilterProjectId = nextValue || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onClearFilter: () => {
      if (!projectAutomationUIState.jsonFilterProjectId) {
        return;
      }
      projectAutomationUIState.jsonFilterProjectId = '';
      queueAutomationUIRefresh();
      updateAutomationUI();
    },
    onSnapshotFilter: (projectId) => {
      if (!activePreset) {
        return;
      }
      const changed = automation.snapshotPresetTarget(activePreset.id, projectId);
      if (changed) {
        projectAutomationUIState.builderSelectedProjects = Object.keys(activePreset.projects);
        showAutomationPresetJsonStatus(
          automationElements.projectsAutomationStatus,
          getAutomationCardText('snapshotPresetJsonSaved', {}, 'Snapshot saved.'),
          false
        );
      } else {
        showAutomationPresetJsonStatus(
          automationElements.projectsAutomationStatus,
          getAutomationCardText('snapshotPresetJsonFailed', {}, 'Could not snapshot that selection.'),
          true
        );
      }
    },
    onRegenerateFilter: (projectId) => {
      if (!activePreset) {
        return null;
      }
      const referencePreset = JSON.parse(JSON.stringify(activePreset));
      const projectIds = projectId ? [projectId] : selectedProjectIds;
      let changed = false;
      for (let index = 0; index < projectIds.length; index += 1) {
        const targetProjectId = projectIds[index];
        const entry = automation.captureProjectSettingsForId(
          targetProjectId,
          activePreset.includeExpansion !== false,
          activePreset.includeOperations !== false
        );
        if (!entry) {
          continue;
        }
        referencePreset.projects[targetProjectId] = entry;
        changed = true;
      }
      if (!changed) {
        return null;
      }
      return referencePreset;
    },
    getFieldOptions: (fieldPath, value, preset) => getProjectPresetJsonFieldOptions(fieldPath, value, preset),
    onFieldChange: (fieldPath, nextValue, changeOptions = null) => {
      if (!activePreset) {
        return;
      }
      const applyOptions = {
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
      };
      if (changeOptions && changeOptions.remove) {
        applyAutomationPresetJsonFieldRemoval(activePreset, fieldPath, applyOptions);
      } else {
        applyAutomationPresetJsonFieldEdit(activePreset, fieldPath, nextValue, applyOptions);
      }
    }
  });
  updateAutomationPresetUsageLine(automationElements.projectsPresetUsage, 'projects', activePreset);
  projectAutomationPresetController.syncControls(presetContext);

  const categories = getProjectAutomationCategories(automatableProjects);
  const categorySignature = categories.join('|');
  if (document.activeElement !== projectsBuilderCategorySelect && categorySignature !== projectsBuilderCategorySignature) {
    syncAutomationSelectOptions(
      projectsBuilderCategorySelect,
      [{ value: 'all', label: getAutomationCardText('allCategoriesOption', {}, 'All categories') }].concat(categories.map(category => ({
        value: category,
        label: category.charAt(0).toUpperCase() + category.slice(1)
      }))),
      projectAutomationUIState.builderCategoryValue || 'all'
    );
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
  const availableProjectSet = new Set(available.map(project => project.name));
  const projectCatalog = getProjectAutomationCatalog().filter(project => (
    selectedCategory === 'all' || (project.category || 'general') === selectedCategory
  ));
  const projectSignature = `${selectedCategory}|${projectCatalog.map((project) => `${project.name}:${getAutomatableProjectDisplayName(project.name, automatableProjectLookup)}:${availableProjectSet.has(project.name) ? 1 : 0}`).join('|')}`;
  if (document.activeElement !== projectsBuilderProjectSelect && projectSignature !== projectsBuilderProjectSignature) {
    if (available.length === 0) {
      syncAutomationSelectOptions(
        projectsBuilderProjectSelect,
        [{ value: '', label: getAutomationCardText('noProjectsAvailable', {}, 'No projects available'), disabled: true }]
          .concat(projectCatalog.map(project => ({
            value: project.name,
            label: getAutomatableProjectDisplayName(project.name, automatableProjectLookup),
            disabled: true,
            hidden: true
          }))),
        ''
      );
      projectsBuilderProjectSelect.selectedIndex = 0;
    } else {
      syncAutomationSelectOptions(
        projectsBuilderProjectSelect,
        projectCatalog.map(project => ({
          value: project.name,
          label: getAutomatableProjectDisplayName(project.name, automatableProjectLookup),
          disabled: !availableProjectSet.has(project.name),
          hidden: !availableProjectSet.has(project.name)
        })),
        projectAutomationUIState.builderProjectValue || available[0].name
      );
      if (projectAutomationUIState.builderProjectValue) {
        projectsBuilderProjectSelect.value = projectAutomationUIState.builderProjectValue;
      }
      if (!projectsBuilderProjectSelect.value || !availableProjectSet.has(projectsBuilderProjectSelect.value)) {
        projectsBuilderProjectSelect.value = available[0].name;
      }
    }
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
    projectsBuilderProjectSignature = projectSignature;
  }
  const selectedProjectId = projectAutomationUIState.builderProjectValue || projectsBuilderProjectSelect.value || '';
  const needsSpaceStorageResource = selectedProjectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID;
  projectsBuilderResourceSelect.style.display = needsSpaceStorageResource ? '' : 'none';
  if (needsSpaceStorageResource) {
    const resourceOptions = getSpaceStorageSingleResourceOptions();
    const preferredResource = projectAutomationUIState.builderSpaceStorageResourceValue || resourceOptions[0]?.value || '';
    const resourceSignature = resourceOptions.map((entry) => `${entry.value}:${entry.label}`).join('|');
    if (document.activeElement !== projectsBuilderResourceSelect
      || projectsBuilderResourceSelect.dataset.signature !== resourceSignature) {
      syncAutomationSelectOptions(
        projectsBuilderResourceSelect,
        resourceOptions.map((entry) => ({
          value: entry.value,
          label: entry.label
        })),
        preferredResource
      );
      projectsBuilderResourceSelect.dataset.signature = resourceSignature;
    }
    if (!projectsBuilderResourceSelect.value && resourceOptions.length > 0) {
      projectsBuilderResourceSelect.value = resourceOptions[0].value;
    }
    projectAutomationUIState.builderSpaceStorageResourceValue = projectsBuilderResourceSelect.value || '';
  }

  projectsBuilderAddButton.disabled = available.length === 0;
  projectsBuilderAddCategoryButton.disabled = projectsBuilderCategorySelect.options.length === 0
    || !automatableProjects.length;
  projectsBuilderClearButton.disabled = projectAutomationUIState.builderSelectedProjects.length === 0;

  updateAutomationNextTravelCombinationControls({
    automation,
    combinations,
    selectElement: projectsApplyNextTravelSelect,
    persistToggleElement: projectsApplyNextTravelPersistToggle
  });

  const combinationControlState = updateAutomationCombinationControls({
    automation,
    combinations,
    uiState: projectAutomationUIState,
    selectElement: projectsCombinationSelect,
    nameInputElement: projectsCombinationNameInput,
    showCheckboxElement: projectsCombinationShowInSidebarCheckbox,
    moveUpButtonElement: projectsCombinationMoveUpButton,
    moveDownButtonElement: projectsCombinationMoveDownButton,
    deleteButtonElement: projectsCombinationDeleteButton,
    dirtyIndicatorElement: projectsCombinationDirtyIndicator
  });
  updateAutomationCombinationUsageLine(
    projectsCombinationUsage,
    'projects',
    combinationControlState ? combinationControlState.activeCombination : null
  );

  projectAutomationPresetController.syncSelection(presetContext);

  syncAutomationApplyAssignmentRows({
    container: projectsApplyList,
    automation,
    getAutomation: () => automationManager.projectsAutomation,
    presets,
    assignments: automation.getAssignments(),
    getDetailText: getProjectsApplyDetailText,
    rowClasses: ['project-automation-apply-row', 'building-automation-apply-row'],
    primaryClasses: ['project-automation-apply-primary', 'building-automation-apply-primary'],
    toggleClasses: ['project-automation-apply-toggle', 'building-automation-apply-toggle'],
    detailClasses: ['project-automation-apply-detail', 'building-automation-apply-detail'],
    controlsClasses: ['project-automation-apply-controls', 'building-automation-apply-controls']
  });

  projectsAddApplyButton.disabled = presets.length === 0;
  projectsApplyHint.textContent = presets.length === 0
    ? getAutomationCardText('projectsApplyHintEmpty', {}, 'Save a preset above to enable the Apply list.')
    : getAutomationCardText('projectsApplyHintRule', {}, 'Lower presets override higher presets when they target the same project and setting.');
}

function attachProjectsAutomationHandlers() {
  const {
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderResourceSelect,
    projectsBuilderAddButton,
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
  projectAutomationPresetController.attachHandlers();

  projectsBuilderCategorySelect.addEventListener('change', () => {
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderProjectSelect.addEventListener('change', () => {
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
    if (projectAutomationUIState.builderProjectValue !== PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID) {
      projectAutomationUIState.builderSpaceStorageResourceValue = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderResourceSelect.addEventListener('change', () => {
    projectAutomationUIState.builderSpaceStorageResourceValue = projectsBuilderResourceSelect.value || '';
  });

  projectsBuilderAddButton.addEventListener('click', () => {
    const projectId = projectsBuilderProjectSelect.value;
    if (!projectId) {
      return;
    }
    let selectedProjectId = projectId;
    if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID) {
      const resourceKey = projectsBuilderResourceSelect.value || projectAutomationUIState.builderSpaceStorageResourceValue || '';
      if (!resourceKey) {
        return;
      }
      selectedProjectId = getSpaceStorageSingleResourceProjectId(resourceKey);
      projectAutomationUIState.builderSpaceStorageResourceValue = resourceKey;
    }
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = projectId;
    if (!projectAutomationUIState.builderSelectedProjects.includes(selectedProjectId)) {
      projectAutomationUIState.builderSelectedProjects.push(selectedProjectId);
    }
    let presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      const automation = automationManager.projectsAutomation;
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeExpansion: true,
        includeOperations: true,
        scopeAll: false,
        showInSidebar: projectAutomationUIState.builderShowInSidebar
      });
      projectAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.projectsAutomation.mergeMissingPresetTargets(Number(presetId), [selectedProjectId]);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = projectsBuilderCategorySelect.value || 'all';
    const projects = getAutomatableProjects(projectAutomationUIState.builderSelectedProjects);
    const additions = projects.filter(project => (
      (selectedCategory === 'all' || (project.category || 'general') === selectedCategory)
      && project.name !== PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(project => {
      if (!projectAutomationUIState.builderSelectedProjects.includes(project.name)) {
        projectAutomationUIState.builderSelectedProjects.push(project.name);
      }
    });
    let presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (!presetId) {
      const automation = automationManager.projectsAutomation;
      const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
      presetId = automation.addPreset(suggestedName, [], {
        createEmpty: true,
        includeExpansion: true,
        includeOperations: true,
        scopeAll: false,
        showInSidebar: projectAutomationUIState.builderShowInSidebar
      });
      projectAutomationUIState.syncedPresetId = null;
    }
    if (presetId) {
      automationManager.projectsAutomation.mergeMissingPresetTargets(
        Number(presetId),
        additions.map(project => project.name)
      );
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
      }
    }
    projectAutomationUIState.builderSelectedProjects = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
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

function addProjectAutomationCatalogEntry(catalog, seen, project) {
  if (!project || project.category === 'story' || seen[project.name]) {
    return;
  }
  if (project.name === PROJECT_AUTOMATION_UI_SPACE_STORAGE_PROJECT_ID) {
    seen[project.name] = true;
    seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID] = true;
    seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID] = true;
    seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID] = true;
    seen[PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID] = true;
    catalog.push({
      name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID,
      displayName: getAutomationCardText('spaceStorageExpansionPreset', {}, 'Space Storage (Expansion)'),
      category: project.category || 'general'
    });
    catalog.push({
      name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID,
      displayName: getAutomationCardText('spaceStorageCapsAndReservePreset', {}, 'Space Storage (Caps and Reserve)'),
      category: project.category || 'general'
    });
    catalog.push({
      name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID,
      displayName: getAutomationCardText('spaceStorageOperationsPreset', {}, 'Space Storage (Operations)'),
      category: project.category || 'general'
    });
    catalog.push({
      name: PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID,
      displayName: getAutomationCardText('spaceStorageSingleResourcePreset', {}, 'Space Storage (Single Resource)'),
      category: project.category || 'general'
    });
    return;
  }
  seen[project.name] = true;
  catalog.push(project);
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
    addProjectAutomationCatalogEntry(projects, seen, project);
  });

  for (const projectId in projectManager.projects) {
    const project = projectManager.projects[projectId];
    if (!project || project.category === 'story' || seen[project.name]) {
      continue;
    }
    if (automation && !automation.shouldShowProjectInAutomation(project, extraProjectIds)) {
      continue;
    }
    addProjectAutomationCatalogEntry(projects, seen, project);
  }

  return projects;
}

function getProjectAutomationCatalog() {
  const projects = [];
  const seen = {};
  const order = Array.isArray(projectManager.projectOrder)
    ? projectManager.projectOrder
    : Object.keys(projectManager.projects || {});

  order.forEach((projectId) => {
    addProjectAutomationCatalogEntry(projects, seen, projectManager.projects[projectId]);
  });

  for (const projectId in projectManager.projects) {
    addProjectAutomationCatalogEntry(projects, seen, projectManager.projects[projectId]);
  }

  return projects;
}

function getAutomatableProjectDisplayName(projectId, projectLookup = null) {
  const singleResourceKey = getSpaceStorageSingleResourceKey(projectId);
  if (singleResourceKey) {
    const resourceName = resources?.spaceStorage?.[singleResourceKey]?.displayName || singleResourceKey;
    return getAutomationCardText(
      'spaceStorageSingleResourcePresetWithResource',
      { resource: resourceName },
      `Space Storage (Single Resource): ${resourceName}`
    );
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_SINGLE_RESOURCE_ID) {
    return getAutomationCardText('spaceStorageSingleResourcePreset', {}, 'Space Storage (Single Resource)');
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_EXPANSION_ID) {
    return getAutomationCardText('spaceStorageExpansionPreset', {}, 'Space Storage (Expansion)');
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_CAPS_AND_RESERVE_ID) {
    return getAutomationCardText('spaceStorageCapsAndReservePreset', {}, 'Space Storage (Caps and Reserve)');
  }
  if (projectId === PROJECT_AUTOMATION_UI_SPACE_STORAGE_OPERATIONS_ID) {
    return getAutomationCardText('spaceStorageOperationsPreset', {}, 'Space Storage (Operations)');
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
