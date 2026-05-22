const PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';
const PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_ID = 'spaceStorageSingleResource';
const PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX = `${PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_ID}:`;
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_OTHER_ID = 'spaceStorageOther';
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_KEYS = new Set([
  'resourceStrategicReserves',
  'resourceCaps',
  'resourceImportLimitRespects'
]);
const PROJECT_AUTOMATION_SPACE_STORAGE_RESOURCE_CATEGORY_BY_KEY = {
  metal: 'colony',
  silicon: 'colony',
  graphite: 'surface',
  glass: 'colony',
  components: 'colony',
  electronics: 'colony',
  superconductors: 'colony',
  superalloys: 'colony',
  liquidWater: 'surface',
  biomass: 'surface',
  carbonDioxide: 'atmospheric',
  inertGas: 'atmospheric',
  oxygen: 'atmospheric',
  atmosphericMethane: 'atmospheric',
  atmosphericAmmonia: 'atmospheric',
  hydrogen: 'atmospheric'
};

const PROJECT_AUTOMATION_BASE_EXPANSION_KEYS = new Set([
  'autoStart',
  'autoStartUncheckOnTravel',
  'autoContinuousOperation',
  'autoDeployCollectors'
]);

const PROJECT_AUTOMATION_EXPANSION_KEYS = new Set([
  'buildCount',
  'autoMax',
  'releaseAndroidsOnComplete',
  'workerCapacityStep',
  'underworldMiningLevel',
  'superchargedMiningLevel',
  'createGeothermalDeposits',
  'undergroundStorage',
  'selectedRadiusMeters',
  'radiusStepMeters',
  'expansionRecipeKey',
  'spaceStorageResourceMode'
]);

const PROJECT_AUTOMATION_PROJECT_EXPANSION_KEYS = {
  satellite: new Set(['step']),
  geo_satellite: new Set(['step'])
};
let ProjectAutomationPresetManagerBaseRef;
try {
  ProjectAutomationPresetManagerBaseRef = AutomationPresetManagerBase;
} catch (error) {}
try {
  ProjectAutomationPresetManagerBaseRef = ProjectAutomationPresetManagerBaseRef
    || require('./automation-preset-manager-base.js').AutomationPresetManagerBase;
} catch (error) {}
const ProjectAutomationPresetManagerBaseClass = ProjectAutomationPresetManagerBaseRef || class ProjectAutomationPresetManagerBaseFallback {};

class ProjectAutomation extends ProjectAutomationPresetManagerBaseClass {
  constructor() {
    super({
      featureKey: 'automationProjects',
      presetLabel: 'Preset',
      combinationLabel: 'Combination',
      useMasterEnabled: true,
      useAssignments: true,
      useCombinations: true,
      nextTravelKind: 'combination'
    });
    this.everEnabledProjects = new Set();
    this.elapsed = 0;
  }

  setCollapsed(collapsed) {
    super.setCollapsed(collapsed);
  }

  setMasterEnabled(enabled) {
    super.setMasterEnabled(enabled);
  }

  isProjectAvailableNow(project) {
    if (!project || project.category === 'story') {
      return false;
    }
    if (project.isPermanentlyDisabled && project.isPermanentlyDisabled()) {
      return false;
    }
    if (projectManager?.isProjectRelevantToCurrentPlanet
      && !projectManager.isProjectRelevantToCurrentPlanet(project)) {
      return false;
    }
    if (project.isVisible) {
      return project.isVisible();
    }
    return project.unlocked;
  }

  recordProjectEnabled(projectId) {
    const normalizedProjectId = this.normalizeProjectId(projectId);
    const project = this.getProjectForAutomationId(normalizedProjectId);
    if (!project || !project.automationRequiresEverEnabled) {
      return false;
    }
    this.everEnabledProjects.add(normalizedProjectId);
    return true;
  }

  hasEverEnabledProject(projectId) {
    return this.everEnabledProjects.has(this.normalizeProjectId(projectId));
  }

  getSeenProjectIdSet(extraProjectIds = []) {
    const seen = new Set();

    this.everEnabledProjects.forEach((projectId) => {
      seen.add(this.normalizeProjectId(projectId));
    });

    this.presets.forEach((preset) => {
      Object.keys(preset.projects || {}).forEach((projectId) => {
        seen.add(this.normalizeProjectId(projectId));
      });
    });

    const extras = Array.isArray(extraProjectIds) ? extraProjectIds : [];
    extras.forEach((projectId) => {
      if (!projectId) {
        return;
      }
      seen.add(this.normalizeProjectId(projectId));
    });

    return seen;
  }

  getSeenProjectIds(extraProjectIds = []) {
    return Array.from(this.getSeenProjectIdSet(extraProjectIds));
  }

  hasSeenProject(projectId, extraProjectIds = []) {
    return this.getSeenProjectIdSet(extraProjectIds).has(this.normalizeProjectId(projectId));
  }

  shouldShowProjectInAutomation(project, extraProjectIds = []) {
    if (!project || project.category === 'story') {
      return false;
    }
    if (!project.automationRequiresEverEnabled) {
      return true;
    }
    if (this.isProjectAvailableNow(project)) {
      this.recordProjectEnabled(project.name);
      return true;
    }
    return this.hasSeenProject(project.name, extraProjectIds);
  }

  recordCurrentlyAvailableProjects() {
    const order = Array.isArray(projectManager?.projectOrder)
      ? projectManager.projectOrder
      : Object.keys(projectManager?.projects || {});

    for (let index = 0; index < order.length; index += 1) {
      const project = projectManager.projects[order[index]];
      if (!project || !project.automationRequiresEverEnabled) {
        continue;
      }
      if (this.isProjectAvailableNow(project)) {
        this.recordProjectEnabled(project.name);
      }
    }
  }

  isActive() {
    return super.isActive();
  }

  getPresetById(id) {
    return super.getPresetById(id);
  }

  getSelectedPresetId() {
    return super.getSelectedPresetId();
  }

  getSelectedPreset() {
    return super.getSelectedPreset();
  }

  setSelectedPresetId(id) {
    return super.setSelectedPresetId(id);
  }

  getAssignments() {
    return super.getAssignments();
  }

  getCombinations() {
    return super.getCombinations();
  }

  getCombinationById(id) {
    return super.getCombinationById(id);
  }

  getSelectedCombinationId() {
    return super.getSelectedCombinationId();
  }

  getSelectedCombination() {
    return super.getSelectedCombination();
  }

  setSelectedCombinationId(id) {
    return super.setSelectedCombinationId(id);
  }

  addAssignment(presetId) {
    return super.addAssignment(presetId);
  }

  setAssignments(assignments) {
    super.setAssignments(assignments);
  }

  removeAssignment(assignmentId) {
    super.removeAssignment(assignmentId);
  }

  moveAssignment(assignmentId, direction) {
    super.moveAssignment(assignmentId, direction);
  }

  setAssignmentPreset(assignmentId, presetId) {
    super.setAssignmentPreset(assignmentId, presetId);
  }

  setAssignmentEnabled(assignmentId, enabled) {
    super.setAssignmentEnabled(assignmentId, enabled);
  }

  moveCombination(id, direction) {
    return super.moveCombination(id, direction);
  }

  addCombination(name, assignments) {
    return super.addCombination(name, assignments);
  }

  updateCombination(id, name, assignments) {
    return super.updateCombination(id, name, assignments);
  }

  deleteCombination(id) {
    super.deleteCombination(id);
  }

  setCombinationShowInSidebar(id, showInSidebar) {
    return super.setCombinationShowInSidebar(id, showInSidebar);
  }

  applyCombination(id) {
    super.applyCombination(id);
  }

  addPreset(name, projectIds, options = {}) {
    const shouldCreateEmpty = options.createEmpty === true;
    const preset = this.buildPreset(
      name,
      shouldCreateEmpty ? [] : projectIds,
      shouldCreateEmpty ? { ...options, scopeAll: false } : options
    );
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  movePreset(id, direction) {
    return super.movePreset(id, direction);
  }

  updatePreset(id, name, projectIds, options = {}) {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index < 0) {
      return false;
    }
    this.presets[index] = this.buildPreset(name, projectIds, options, id);
    return true;
  }

  deletePreset(id) {
    super.deletePreset(id);
  }

  renamePreset(id, name) {
    super.renamePreset(id, name);
  }

  setPresetShowInSidebar(id, showInSidebar) {
    return super.setPresetShowInSidebar(id, showInSidebar);
  }

  exportPreset(presetId) {
    const preset = this.getPresetById(Number(presetId));
    if (!preset) {
      return null;
    }
    return {
      name: preset.name,
      showInSidebar: preset.showInSidebar !== false,
      includeExpansion: preset.includeExpansion !== false,
      includeOperations: preset.includeOperations !== false,
      scopeAll: preset.scopeAll === true,
      projects: this.deepClone(preset.projects || {})
    };
  }

  importPreset(presetData = {}) {
    const id = this.nextPresetId++;
    const importedPreset = {
      id,
      name: presetData.name || `Preset ${id}`,
      showInSidebar: presetData.showInSidebar !== false,
      includeExpansion: presetData.includeExpansion !== false,
      includeOperations: presetData.includeOperations !== false,
      scopeAll: presetData.scopeAll === true,
      projects: this.normalizeLoadedPresetProjects(presetData.projects || {})
    };
    this.presets.push(importedPreset);
    this.selectedPresetId = importedPreset.id;
    return importedPreset.id;
  }

  buildPreset(name, projectIds, options = {}, idOverride) {
    const includeExpansion = options.includeExpansion !== false;
    const includeOperations = options.includeOperations !== false;
    const scopeAll = options.scopeAll === true;
    const id = idOverride || this.nextPresetId++;
    const preset = {
      id,
      name: name || `Preset ${id}`,
      showInSidebar: options.showInSidebar !== false,
      includeExpansion,
      includeOperations,
      scopeAll,
      projects: {}
    };
    const ids = Array.isArray(projectIds) ? projectIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      const projectId = this.normalizeProjectId(ids[index]);
      const entry = this.captureProjectSettingsForId(projectId, includeExpansion, includeOperations);
      this.mergePresetProjectEntry(preset.projects, projectId, entry);
    }
    return preset;
  }

  mergeMissingProjectsIntoPreset(presetId, projectIds = []) {
    const preset = this.getPresetById(Number(presetId));
    if (!preset) {
      return false;
    }
    const ids = Array.isArray(projectIds) ? projectIds : [];
    let changed = false;
    for (let index = 0; index < ids.length; index += 1) {
      const projectId = this.normalizeProjectId(ids[index]);
      if (preset.projects[projectId]) {
        continue;
      }
      const entry = this.captureProjectSettingsForId(
        projectId,
        preset.includeExpansion !== false,
        preset.includeOperations !== false
      );
      if (!entry) {
        continue;
      }
      this.mergePresetProjectEntry(preset.projects, projectId, entry);
      changed = true;
    }
    return changed;
  }

  captureProjectSettingsForId(projectId, includeExpansion = true, includeOperations = true) {
    const project = this.getProjectForAutomationId(projectId);
    if (!project || project.category === 'story') {
      return null;
    }
    const settings = this.captureProjectSettings(project);
    if (!settings) {
      return null;
    }
    const split = this.splitProjectSettings(projectId, settings);
    const entry = {};
    if (includeExpansion && Object.keys(split.expansion).length > 0) {
      entry.expansion = split.expansion;
    }
    if (includeOperations && Object.keys(split.operations).length > 0) {
      entry.operations = split.operations;
    }
    return Object.keys(entry).length > 0 ? entry : null;
  }

  captureProjectSettings(project) {
    if (project.saveAutomationSettings) {
      const settings = project.saveAutomationSettings();
      return settings ? this.deepClone(settings) : null;
    }
    return this.captureFallbackSettings(project);
  }

  captureFallbackSettings(project) {
    const settings = {
      autoStart: project.autoStart === true,
      autoStartUncheckOnTravel: project.autoStartUncheckOnTravel === true
    };
    return settings;
  }

  resolveAssignments() {
    const resolved = {
      expansion: {},
      operations: {}
    };
    for (let index = 0; index < this.assignments.length; index += 1) {
      const assignment = this.assignments[index];
      if (!assignment.enabled) {
        continue;
      }
      const preset = this.getPresetById(assignment.presetId);
      if (!preset) {
        continue;
      }
      const entries = preset.projects || {};
      for (const projectId in entries) {
        const entry = entries[projectId];
        if (preset.includeExpansion !== false && entry.expansion) {
          resolved.expansion[projectId] = this.deepClone(entry.expansion);
        }
        if (preset.includeOperations !== false && entry.operations) {
          resolved.operations[projectId] = this.deepClone(entry.operations);
        }
      }
    }
    return resolved;
  }

  applyPresets() {
    const resolved = this.resolveAssignments();
    this.applyResolvedMaps(resolved.expansion, resolved.operations);
  }

  applyCombinationPresets(id) {
    if (id) {
      this.applyCombination(id);
    }
    this.applyPresets();
  }

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return;
    }
    const expansionMap = {};
    const operationsMap = {};
    const entries = preset.projects || {};
    for (const projectId in entries) {
      const entry = entries[projectId];
      if (preset.includeExpansion !== false && entry.expansion) {
        expansionMap[projectId] = this.deepClone(entry.expansion);
      }
      if (preset.includeOperations !== false && entry.operations) {
        operationsMap[projectId] = this.deepClone(entry.operations);
      }
    }
    this.applyResolvedMaps(expansionMap, operationsMap);
  }

  applyResolvedMaps(expansionMap = {}, operationsMap = {}) {
    const projectIds = new Set([
      ...Object.keys(expansionMap || {}),
      ...Object.keys(operationsMap || {})
    ]);

    projectIds.forEach((projectId) => {
      const project = this.getProjectForAutomationId(projectId);
      if (!project) {
        return;
      }

      const settings = {};
      if (expansionMap[projectId]) {
        const splitExpansion = this.filterSettingsForBucket(projectId, expansionMap[projectId], 'expansion');
        Object.assign(settings, splitExpansion);
      }
      if (operationsMap[projectId]) {
        const splitOperations = this.filterSettingsForBucket(projectId, operationsMap[projectId], 'operations');
        Object.assign(settings, splitOperations);
      }
      if (Object.keys(settings).length === 0) {
        return;
      }

      this.applyProjectSettings(project, settings);
    });
  }

  isSpaceStorageProxyProjectId(projectId) {
    return projectId === PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID
      || projectId === PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID
      || projectId === PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID
      || (projectId && projectId.indexOf(PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX) === 0);
  }

  parseSpaceStorageSingleResourceProjectId(projectId) {
    const normalizedProjectId = this.resolveProjectAutomationId(projectId);
    if (!normalizedProjectId || normalizedProjectId.indexOf(PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX) !== 0) {
      return null;
    }
    const resourceKey = normalizedProjectId.slice(PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX.length);
    return resourceKey || null;
  }

  resolveProjectAutomationId(projectId) {
    if (projectId === PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_OTHER_ID) {
      return PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID;
    }
    if (projectId === PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_CAPS_AND_RESERVE_ID) {
      return PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID;
    }

    const projects = projectManager?.projects || {};
    if (projects[projectId]) {
      return projectId;
    }

    const keys = Object.keys(projects);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const project = projects[key];
      if (!project) {
        continue;
      }
      if (project.name === projectId || project.displayName === projectId) {
        return key;
      }
    }

    return projectId;
  }

  normalizeProjectId(projectId) {
    return this.resolveProjectAutomationId(projectId);
  }

  getProjectForAutomationId(projectId) {
    const normalizedProjectId = this.resolveProjectAutomationId(projectId);
    if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID
      || this.isSpaceStorageProxyProjectId(normalizedProjectId)) {
      return projectManager.projects[PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID] || null;
    }
    return projectManager.projects[normalizedProjectId] || null;
  }

  isPresetProjectEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(value, 'expansion')
      || Object.prototype.hasOwnProperty.call(value, 'operations');
  }

  isExpansionSettingKey(projectId, key) {
    if (projectId === PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID
      || projectId === PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID) {
      return false;
    }
    if (projectId === PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID) {
      return PROJECT_AUTOMATION_BASE_EXPANSION_KEYS.has(key)
        || PROJECT_AUTOMATION_EXPANSION_KEYS.has(key);
    }
    const projectSpecificExpansion = PROJECT_AUTOMATION_PROJECT_EXPANSION_KEYS[projectId];
    if (projectSpecificExpansion && projectSpecificExpansion.has(key)) {
      return true;
    }
    if (PROJECT_AUTOMATION_BASE_EXPANSION_KEYS.has(key)) {
      return true;
    }
    return PROJECT_AUTOMATION_EXPANSION_KEYS.has(key);
  }

  splitProjectSettings(projectId, settings = {}) {
    const source = settings || {};
    const normalizedProjectId = this.normalizeProjectId(projectId);
    const singleResourceKey = this.parseSpaceStorageSingleResourceProjectId(normalizedProjectId);
    if (singleResourceKey) {
      return {
        expansion: {},
        operations: this.filterSpaceStorageSingleResourceSettings(source, singleResourceKey)
      };
    }
    if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID) {
      return {
        expansion: {},
        operations: this.filterSpaceStorageCapsAndReserveSettings(source)
      };
    }
    if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID) {
      return {
        expansion: this.filterSpaceStorageExpansionSettings(source),
        operations: {}
      };
    }
    if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID) {
      return {
        expansion: {},
        operations: this.filterSpaceStorageOperationSettings(source)
      };
    }
    const expansion = {};
    const operations = {};

    for (const key in source) {
      if (this.isExpansionSettingKey(normalizedProjectId, key)) {
        expansion[key] = this.deepClone(source[key]);
      } else {
        operations[key] = this.deepClone(source[key]);
      }
    }

    return { expansion, operations };
  }

  filterSettingsForBucket(projectId, settings = {}, bucket = 'operations') {
    const split = this.splitProjectSettings(projectId, settings || {});
    return bucket === 'expansion' ? split.expansion : split.operations;
  }

  filterSpaceStorageCapsAndReserveSettings(settings = {}) {
    const source = settings || {};
    const filtered = {};
    for (const key in source) {
      if (PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_KEYS.has(key)) {
        filtered[key] = this.deepClone(source[key]);
      }
    }
    return filtered;
  }

  filterSpaceStorageExpansionSettings(settings = {}) {
    const source = settings || {};
    const filtered = {};
    for (const key in source) {
      if (this.isExpansionSettingKey(PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID, key)) {
        filtered[key] = this.deepClone(source[key]);
      }
    }
    return filtered;
  }

  filterSpaceStorageOperationSettings(settings = {}) {
    const source = settings || {};
    const filtered = {};
    for (const key in source) {
      if (PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_KEYS.has(key)) {
        continue;
      }
      if (this.isExpansionSettingKey(PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID, key)) {
        continue;
      }
      filtered[key] = this.deepClone(source[key]);
    }
    return filtered;
  }

  filterSpaceStorageSingleResourceSettings(settings = {}, resourceKey = '') {
    const source = settings || {};
    const filtered = {};
    const resourceCategory = PROJECT_AUTOMATION_SPACE_STORAGE_RESOURCE_CATEGORY_BY_KEY[resourceKey] || 'colony';
    const weightSource = source.resourceTransferWeights || {};
    const importLimitSource = source.resourceImportLimitRespects || {};
    filtered.spaceStorageSingleResourceKey = resourceKey;
    if (Object.prototype.hasOwnProperty.call(source, 'mode')) {
      filtered.mode = source.mode;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceTransferMode')) {
      filtered.mode = source.spaceStorageSingleResourceTransferMode;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'selected')) {
      filtered.selected = source.selected === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceSelected')) {
      filtered.selected = source.spaceStorageSingleResourceSelected === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'category')) {
      filtered.category = source.category;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceCategory')) {
      filtered.category = source.spaceStorageSingleResourceCategory;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceStrategicReserves')) {
      const reserveSource = source.resourceStrategicReserves || {};
      if (Object.prototype.hasOwnProperty.call(reserveSource, resourceKey)) {
        filtered.resourceStrategicReserves = {
          [resourceKey]: this.deepClone(reserveSource[resourceKey])
        };
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceCaps')) {
      const capSource = source.resourceCaps || {};
      if (Object.prototype.hasOwnProperty.call(capSource, resourceKey)) {
        filtered.resourceCaps = {
          [resourceKey]: this.deepClone(capSource[resourceKey])
        };
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceTransferWeights')) {
      if (Object.prototype.hasOwnProperty.call(weightSource, resourceKey)) {
        filtered.resourceTransferWeights = {
          [resourceKey]: this.deepClone(weightSource[resourceKey])
        };
        filtered.transferWeight = this.deepClone(weightSource[resourceKey]);
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'transferWeight')) {
      filtered.transferWeight = source.transferWeight;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceTransferWeight')) {
      filtered.transferWeight = source.spaceStorageSingleResourceTransferWeight;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceImportLimitRespects')) {
      if (Object.prototype.hasOwnProperty.call(importLimitSource, resourceKey)) {
        filtered.resourceImportLimitRespects = {
          [resourceKey]: importLimitSource[resourceKey] === true
        };
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'respectImportProjectLimits')) {
      filtered.resourceImportLimitRespects = {
        [resourceKey]: source.respectImportProjectLimits === true
      };
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceRespectImportProjectLimits')) {
      filtered.resourceImportLimitRespects = {
        [resourceKey]: source.spaceStorageSingleResourceRespectImportProjectLimits === true
      };
    }
    if (!Object.prototype.hasOwnProperty.call(filtered, 'transferWeight')) {
      filtered.transferWeight = Object.prototype.hasOwnProperty.call(weightSource, resourceKey)
        ? this.deepClone(weightSource[resourceKey])
        : 1;
    }
    if (!Object.prototype.hasOwnProperty.call(filtered, 'mode')
      && Object.prototype.hasOwnProperty.call(source, 'resourceTransferModes')) {
      const transferSource = source.resourceTransferModes || {};
      filtered.mode = Object.prototype.hasOwnProperty.call(transferSource, resourceKey)
        ? transferSource[resourceKey]
        : null;
    }
    if (!Object.prototype.hasOwnProperty.call(filtered, 'selected')
      && Object.prototype.hasOwnProperty.call(source, 'selectedResources')) {
      const selectedSource = Array.isArray(source.selectedResources) ? source.selectedResources : [];
      const selectedEntry = selectedSource.find((entry) => entry?.category === resourceCategory && entry?.resource === resourceKey);
      const isSelected = !!selectedEntry;
      filtered.selected = isSelected;
      if (selectedEntry?.category) {
        filtered.category = selectedEntry.category;
      }
    }
    if (!Object.prototype.hasOwnProperty.call(filtered, 'category')) {
      filtered.category = resourceCategory;
    }
    return filtered;
  }

  extractPresetProjectEntrySettings(projectId, rawSettings = {}) {
    const entry = rawSettings || {};
    const combined = {};
    if (Object.prototype.hasOwnProperty.call(entry, 'expansion')) {
      const expansion = this.filterSettingsForBucket(projectId, entry.expansion || {}, 'expansion');
      Object.assign(combined, expansion);
    }
    if (Object.prototype.hasOwnProperty.call(entry, 'operations')) {
      const operations = this.filterSettingsForBucket(projectId, entry.operations || {}, 'operations');
      Object.assign(combined, operations);
    }
    return combined;
  }

  mergeSpaceStorageNormalizedEntries(normalized = {}, settings = {}) {
    const source = settings || {};
    const capsReserveSettings = this.filterSpaceStorageCapsAndReserveSettings(source);
    const expansionSettings = this.filterSpaceStorageExpansionSettings(source);
    const operationSettings = this.filterSpaceStorageOperationSettings(source);
    if (Object.keys(capsReserveSettings).length > 0) {
      this.mergePresetProjectEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID, {
        operations: capsReserveSettings
      });
    }
    if (Object.keys(expansionSettings).length > 0) {
      this.mergePresetProjectEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID, {
        expansion: expansionSettings
      });
    }
    if (Object.keys(operationSettings).length > 0) {
      this.mergePresetProjectEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID, {
        operations: operationSettings
      });
    }
  }

  mergePresetProjectEntry(projects = {}, projectId, entry = null) {
    if (!entry) {
      return;
    }
    const normalizedProjectId = this.normalizeProjectId(projectId);
    const expansion = entry.expansion && Object.keys(entry.expansion).length > 0
      ? this.deepClone(entry.expansion)
      : null;
    const operations = entry.operations && Object.keys(entry.operations).length > 0
      ? this.deepClone(entry.operations)
      : null;
    if (!expansion && !operations) {
      return;
    }

    const current = projects[normalizedProjectId] || {};
    const merged = {};
    if (current.expansion && Object.keys(current.expansion).length > 0) {
      merged.expansion = this.deepClone(current.expansion);
    }
    if (current.operations && Object.keys(current.operations).length > 0) {
      merged.operations = this.deepClone(current.operations);
    }
    if (expansion) {
      merged.expansion = {
        ...(merged.expansion || {}),
        ...expansion
      };
    }
    if (operations) {
      merged.operations = {
        ...(merged.operations || {}),
        ...operations
      };
    }
    projects[normalizedProjectId] = merged;
  }

  normalizeLoadedPresetProjects(projects = {}) {
    const source = projects || {};
    const normalized = {};

    for (const rawProjectId in source) {
      const normalizedProjectId = this.normalizeProjectId(rawProjectId);
      const project = this.getProjectForAutomationId(normalizedProjectId);
      if (!project || project.category === 'story') {
        continue;
      }

      const rawSettings = this.deepClone(source[rawProjectId] || {});
      if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID) {
        const combinedSettings = this.isPresetProjectEntry(rawSettings)
          ? this.extractPresetProjectEntrySettings(normalizedProjectId, rawSettings)
          : this.deepClone(rawSettings);
        this.mergeSpaceStorageNormalizedEntries(normalized, combinedSettings);
        continue;
      }
      if (this.isPresetProjectEntry(rawSettings)) {
        const entry = {};
        if (Object.prototype.hasOwnProperty.call(rawSettings, 'expansion')) {
          const expansion = this.filterSettingsForBucket(normalizedProjectId, rawSettings.expansion || {}, 'expansion');
          if (Object.keys(expansion).length > 0) {
            entry.expansion = expansion;
          }
        }
        if (Object.prototype.hasOwnProperty.call(rawSettings, 'operations')) {
          const operations = this.filterSettingsForBucket(normalizedProjectId, rawSettings.operations || {}, 'operations');
          if (Object.keys(operations).length > 0) {
            entry.operations = operations;
          }
        }
        this.mergePresetProjectEntry(normalized, normalizedProjectId, entry);
        continue;
      }

      const split = this.splitProjectSettings(normalizedProjectId, rawSettings);
      this.mergePresetProjectEntry(normalized, normalizedProjectId, split);
    }

    return normalized;
  }

  applyProjectSettings(project, settings) {
    if (project?.name === PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID
      && Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceKey')) {
      return this.applySpaceStorageSingleResourceSettings(project, settings);
    }
    const savedBefore = project.saveAutomationSettings
      ? project.saveAutomationSettings()
      : this.captureFallbackSettings(project);

    if (project.loadAutomationSettings) {
      project.loadAutomationSettings(this.deepClone(settings));
    } else {
      this.applyFallbackSettings(project, settings);
    }

    const savedAfter = project.saveAutomationSettings
      ? project.saveAutomationSettings()
      : this.captureFallbackSettings(project);

    return !this.areSettingsEqual(savedBefore, savedAfter);
  }

  applySpaceStorageSingleResourceSettings(project, settings = {}) {
    const resourceKey = settings.spaceStorageSingleResourceKey || '';
    if (!resourceKey) {
      return false;
    }
    const capsSource = settings.resourceCaps || {};
    const reserveSource = settings.resourceStrategicReserves || {};
    const weightSource = settings.resourceTransferWeights || {};
    const importLimitSource = settings.resourceImportLimitRespects || {};
    const hasTransferMode = Object.prototype.hasOwnProperty.call(settings, 'mode')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceTransferMode');
    const hasSelectedFlag = Object.prototype.hasOwnProperty.call(settings, 'selected')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceSelected');
    const hasTransferWeight = Object.prototype.hasOwnProperty.call(settings, 'transferWeight')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceTransferWeight');
    const hasRespectImportLimits = Object.prototype.hasOwnProperty.call(settings, 'respectImportProjectLimits')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceRespectImportProjectLimits');
    const capsHasKey = Object.prototype.hasOwnProperty.call(capsSource, resourceKey);
    const reserveHasKey = Object.prototype.hasOwnProperty.call(reserveSource, resourceKey);
    const weightHasKey = Object.prototype.hasOwnProperty.call(weightSource, resourceKey);
    const importLimitHasKey = Object.prototype.hasOwnProperty.call(importLimitSource, resourceKey);
    if (!capsHasKey && !reserveHasKey && !weightHasKey && !importLimitHasKey && !hasTransferWeight && !hasTransferMode && !hasSelectedFlag && !hasRespectImportLimits) {
      return false;
    }

    const beforeCaps = project.resourceCaps?.[resourceKey];
    const beforeReserve = project.resourceStrategicReserves?.[resourceKey];
    const beforeTransfer = project.resourceTransferModes?.[resourceKey];
    const beforeWeight = project.resourceTransferWeights?.[resourceKey];
    const beforeRespectImportLimits = project.resourceImportLimitRespects?.[resourceKey] === true;
    const canonicalCategory = PROJECT_AUTOMATION_SPACE_STORAGE_RESOURCE_CATEGORY_BY_KEY[resourceKey] || 'colony';
    const beforeSelectedResourceCount = Array.isArray(project.selectedResources)
      ? project.selectedResources.filter((entry) => entry?.resource === resourceKey).length
      : 0;
    const beforeSelected = Array.isArray(project.selectedResources)
      ? project.selectedResources.some((entry) => entry?.category === canonicalCategory && entry?.resource === resourceKey)
      : false;
    let changed = false;

    if (capsHasKey) {
      if (!project.resourceCaps) {
        project.resourceCaps = {};
      }
      project.resourceCaps[resourceKey] = this.deepClone(capsSource[resourceKey]);
      project.sanitizeResourceCaps();
      changed = changed || !this.areSettingsEqual(beforeCaps, project.resourceCaps[resourceKey]);
    }
    if (reserveHasKey) {
      if (!project.resourceStrategicReserves) {
        project.resourceStrategicReserves = {};
      }
      project.resourceStrategicReserves[resourceKey] = this.deepClone(reserveSource[resourceKey]);
      project.sanitizeResourceStrategicReserves();
      changed = changed || !this.areSettingsEqual(beforeReserve, project.resourceStrategicReserves[resourceKey]);
    }
    if (weightHasKey) {
      if (!project.resourceTransferWeights) {
        project.resourceTransferWeights = {};
      }
      const parsedWeight = Number(this.deepClone(weightSource[resourceKey]));
      project.resourceTransferWeights[resourceKey] = Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : 1;
      changed = changed || !this.areSettingsEqual(beforeWeight, project.resourceTransferWeights[resourceKey]);
    } else if (hasTransferWeight) {
      const transferWeight = Object.prototype.hasOwnProperty.call(settings, 'transferWeight')
        ? settings.transferWeight
        : settings.spaceStorageSingleResourceTransferWeight;
      if (!project.resourceTransferWeights) {
        project.resourceTransferWeights = {};
      }
      const parsedWeight = Number(this.deepClone(transferWeight));
      project.resourceTransferWeights[resourceKey] = Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : 1;
      changed = changed || !this.areSettingsEqual(beforeWeight, project.resourceTransferWeights[resourceKey]);
    }
    if (hasTransferMode) {
      const transferMode = Object.prototype.hasOwnProperty.call(settings, 'mode')
        ? settings.mode
        : settings.spaceStorageSingleResourceTransferMode;
      if (!project.resourceTransferModes) {
        project.resourceTransferModes = {};
      }
      if (transferMode === 'store' || transferMode === 'withdraw') {
        project.resourceTransferModes[resourceKey] = transferMode;
      } else {
        delete project.resourceTransferModes[resourceKey];
      }
      project.sanitizeTransferModes();
      changed = changed || !this.areSettingsEqual(beforeTransfer, project.resourceTransferModes[resourceKey]);
    }
    if (importLimitHasKey || hasRespectImportLimits) {
      if (!project.resourceImportLimitRespects) {
        project.resourceImportLimitRespects = {};
      }
      const enabled = importLimitHasKey
        ? importLimitSource[resourceKey] === true
        : (Object.prototype.hasOwnProperty.call(settings, 'respectImportProjectLimits')
          ? settings.respectImportProjectLimits === true
          : settings.spaceStorageSingleResourceRespectImportProjectLimits === true);
      project.setRespectImportProjectLimits(resourceKey, enabled);
      changed = changed || beforeRespectImportLimits !== (project.resourceImportLimitRespects?.[resourceKey] === true);
    }
    if (hasSelectedFlag) {
      if (!Array.isArray(project.selectedResources)) {
        project.selectedResources = [];
      }
      const shouldSelect = Object.prototype.hasOwnProperty.call(settings, 'selected')
        ? settings.selected === true
        : settings.spaceStorageSingleResourceSelected === true;
      project.selectedResources = project.selectedResources.filter((entry) => entry?.resource !== resourceKey);
      if (shouldSelect) {
        project.selectedResources.push({ category: canonicalCategory, resource: resourceKey });
      }
      const afterSelectedResourceCount = project.selectedResources.filter((entry) => entry?.resource === resourceKey).length;
      const afterSelected = project.selectedResources.some((entry) => entry?.category === canonicalCategory && entry?.resource === resourceKey);
      changed = changed || beforeSelected !== afterSelected || beforeSelectedResourceCount !== afterSelectedResourceCount;
    }
    return changed;
  }

  applyFallbackSettings(project, settings = {}) {
    if (Object.prototype.hasOwnProperty.call(settings, 'autoStart')) {
      project.autoStart = settings.autoStart === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'autoStartUncheckOnTravel')) {
      project.autoStartUncheckOnTravel = settings.autoStartUncheckOnTravel === true;
    }
  }

  areSettingsEqual(left, right) {
    if (left === right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        return false;
      }
      for (let index = 0; index < left.length; index += 1) {
        if (!this.areSettingsEqual(left[index], right[index])) {
          return false;
        }
      }
      return true;
    }
    if (typeof left !== 'object' || typeof right !== 'object') {
      return left === right;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return false;
      }
      if (!this.areSettingsEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }

  deepClone(value) {
    return super.deepClone(value);
  }

  update(delta) {
    if (!this.isActive()) {
      return;
    }
    this.elapsed += delta || 0;
    if (this.elapsed >= 1000) {
      this.elapsed = 0;
      this.recordCurrentlyAvailableProjects();
    }
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        showInSidebar: preset.showInSidebar !== false,
        includeExpansion: preset.includeExpansion !== false,
        includeOperations: preset.includeOperations !== false,
        scopeAll: !!preset.scopeAll,
        projects: this.deepClone(preset.projects || {})
      })),
      assignments: this.serializeAssignments(),
      combinations: this.serializeCombinations(),
      everEnabledProjects: Array.from(this.everEnabledProjects),
      collapsed: this.collapsed,
      masterEnabled: this.masterEnabled,
      nextTravelCombinationId: this.nextTravelCombinationId,
      nextTravelCombinationPersistent: this.nextTravelCombinationPersistent,
      selectedPresetId: this.selectedPresetId,
      selectedCombinationId: this.selectedCombinationId,
      nextPresetId: this.nextPresetId,
      nextAssignmentId: this.nextAssignmentId,
      nextCombinationId: this.nextCombinationId
    };
  }

  loadState(data = {}) {
    this.presets = Array.isArray(data.presets) ? data.presets.map(preset => ({
      id: preset.id,
      name: preset.name || 'Preset',
      showInSidebar: preset.showInSidebar !== false,
      includeExpansion: preset.includeExpansion !== false,
      includeOperations: preset.includeOperations !== false,
      scopeAll: preset.scopeAll === true,
      projects: this.normalizeLoadedPresetProjects(preset.projects || {})
    })) : [];
    this.loadAssignmentsFromState(data.assignments);
    this.loadCombinationsFromState(data.combinations);
    this.everEnabledProjects = new Set(
      Array.isArray(data.everEnabledProjects)
        ? data.everEnabledProjects.map(projectId => this.normalizeProjectId(projectId))
        : []
    );
    this.loadCommonListState(data, { allowLegacyApplyOnNextTravel: true });
    this.recordCurrentlyAvailableProjects();
  }
}

try {
  module.exports = { ProjectAutomation };
} catch (error) {}
