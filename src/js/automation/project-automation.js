const PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_SPACE_MIRROR_FACILITY_ID = 'spaceMirrorFacility';
const PROJECT_AUTOMATION_SPACE_MIRROR_OVERSIGHT_SETTINGS_KEY = 'mirrorOversightSettings';
const PROJECT_AUTOMATION_SPACE_MIRROR_PROJECTED_STATE_KEY = 'lastProjectedTemperatureState';
const PROJECT_AUTOMATION_SPACE_MIRROR_LAST_SOLUTION_KEY = 'lastSolution';
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';
const PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_ID = 'spaceStorageSingleResource';
const PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_PREFIX = `${PROJECT_AUTOMATION_SPACE_STORAGE_SINGLE_RESOURCE_ID}:`;
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_OTHER_ID = 'spaceStorageOther';
const PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY = 'ignoreSpaceStorageReserveExpansion';
const PROJECT_AUTOMATION_SPACE_STORAGE_FLUID_TARGETS = {
  liquidWater: { defaultTarget: 'colony', allowedTargets: new Set(['colony', 'colonyOnly', 'surface']) },
  hydrogen: { defaultTarget: 'atmospheric', allowedTargets: new Set(['atmospheric', 'colony', 'colonyOnly']) }
};

function normalizeProjectAutomationSpaceStorageFluidTarget(resourceKey, target) {
  const config = PROJECT_AUTOMATION_SPACE_STORAGE_FLUID_TARGETS[resourceKey];
  return config.allowedTargets.has(target) ? target : config.defaultTarget;
}
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_KEYS = new Set([
  'resourceStrategicReserves',
  'resourceCaps',
  'resourceTransferWeights',
  'resourceImportLimitRespects',
  'resourceBiomassDensityWithdrawLimits',
  'resourcePressureWithdrawLimits',
  'resourceAmountWithdrawLimits'
]);
const PROJECT_AUTOMATION_SPACE_STORAGE_OPERATION_KEYS = new Set([
  'transferMethod',
  'teleporterRun',
  'teleporterTransferRate',
  'teleporterTransferRateBasis'
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
  'autoDeployCollectors',
  PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY
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
const PROJECT_AUTOMATION_DISPOSAL_LEGACY_SETTING_KEYS = new Set([
  'selectedDisposalResource',
  'waitForCapacity',
  'disableBelowTemperature',
  'disableTemperatureThreshold',
  'disableBelowPressure',
  'disablePressureThreshold',
  'disableBelowCoverage',
  'disableCoverageThreshold',
  'disposalLimitSettings'
]);

const PROJECT_AUTOMATION_PROJECT_EXPANSION_KEYS = {
  satellite: new Set(['step']),
  geo_satellite: new Set(['step'])
};
let ProjectAutomationPresetManagerBaseRef;
try {
  ProjectAutomationPresetManagerBaseRef = AutomationTwoBucketPresetManagerBase;
} catch (error) {}
try {
  ProjectAutomationPresetManagerBaseRef = ProjectAutomationPresetManagerBaseRef
    || require('./automation-preset-manager-base.js').AutomationTwoBucketPresetManagerBase;
} catch (error) {}
const ProjectAutomationPresetManagerBaseClass = ProjectAutomationPresetManagerBaseRef || class ProjectAutomationPresetManagerBaseFallback {};

class ProjectAutomation extends ProjectAutomationPresetManagerBaseClass {
  constructor(encounteredTargets = null) {
    super({
      featureKey: 'automationProjects',
      presetLabel: 'Preset',
      combinationLabel: 'Combination',
      useMasterEnabled: true,
      useAssignments: true,
      useCombinations: true,
      nextTravelKind: 'combination',
      presetCollectionKey: 'projects',
      bucketKeys: ['expansion', 'operations'],
      includeKeys: ['includeExpansion', 'includeOperations'],
      allowLegacyApplyOnNextTravel: true
    });
    this.encounteredTargets = encounteredTargets;
    this.everEnabledProjects = new Set();
    this.elapsed = 0;
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
    if (!project || project.category === 'story') {
      return false;
    }
    this.everEnabledProjects.add(normalizedProjectId);
    if (this.encounteredTargets) {
      this.encounteredTargets.record('projects', normalizedProjectId);
    }
    return true;
  }

  hasEverEnabledProject(projectId) {
    const normalizedProjectId = this.normalizeProjectId(projectId);
    return this.everEnabledProjects.has(normalizedProjectId)
      || (this.encounteredTargets && this.encounteredTargets.has('projects', normalizedProjectId));
  }

  getSeenProjectIdSet(extraProjectIds = []) {
    const seen = new Set();

    this.everEnabledProjects.forEach((projectId) => {
      seen.add(this.normalizeProjectId(projectId));
    });
    if (this.encounteredTargets) {
      this.encounteredTargets.getIds('projects').forEach((projectId) => {
        seen.add(this.normalizeProjectId(projectId));
      });
    }

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
    const normalizedProjectId = this.normalizeProjectId(projectId);
    const seenProjectIds = this.getSeenProjectIdSet(extraProjectIds);
    if (seenProjectIds.has(normalizedProjectId)) {
      return true;
    }
    if (normalizedProjectId !== PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID) {
      return false;
    }
    for (const seenProjectId of seenProjectIds) {
      if (this.isSpaceStorageProxyProjectId(seenProjectId)) {
        return true;
      }
    }
    return false;
  }

  shouldShowProjectInAutomation(project, extraProjectIds = []) {
    if (!project || project.category === 'story') {
      return false;
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
      if (!project || project.category === 'story') {
        continue;
      }
      if (this.isProjectAvailableNow(project)) {
        this.recordProjectEnabled(project.name);
      }
    }
  }

  normalizePresetTargetId(projectId) {
    return this.normalizeProjectId(projectId);
  }

  capturePresetEntry(projectId, includeExpansion, includeOperations) {
    return this.captureProjectSettingsForId(projectId, includeExpansion, includeOperations);
  }

  recordPresetTargets(preset) {
    const projectIds = Object.keys(preset.projects || {});
    for (let index = 0; index < projectIds.length; index += 1) {
      const projectId = this.normalizeProjectId(projectIds[index]);
      this.everEnabledProjects.add(projectId);
      if (this.encounteredTargets) {
        this.encounteredTargets.record('projects', projectId);
      }
    }
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
    if (!value || value.constructor !== Object) {
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
    let source = settings || {};
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
    const project = this.getProjectForAutomationId(normalizedProjectId);
    if (project && Array.isArray(project.disposalTargets)) {
      const migratedSource = {};
      const hasDisposalTargets = Array.isArray(source.disposalTargets) && source.disposalTargets.length > 0;
      for (const key in source) {
        if (PROJECT_AUTOMATION_DISPOSAL_LEGACY_SETTING_KEYS.has(key)) {
          continue;
        }
        migratedSource[key] = this.deepClone(source[key]);
      }
      if (!hasDisposalTargets && source.selectedDisposalResource?.category && source.selectedDisposalResource?.resource) {
        migratedSource.disposalTargets = [{
          id: 1,
          selectedDisposalResource: this.deepClone(source.selectedDisposalResource),
          autoStart: source.autoStart === true,
          disableBelowTemperature: source.disableBelowTemperature === true,
          disableTemperatureThreshold: source.disableTemperatureThreshold ?? 303.15,
          disableBelowPressure: source.disableBelowPressure === true,
          disablePressureThreshold: source.disablePressureThreshold ?? 0,
          disableBelowCoverage: source.disableBelowCoverage === true,
          disableCoverageThreshold: source.disableCoverageThreshold ?? 0
        }];
      }
      source = migratedSource;
    }
    const expansion = {};
    const operations = {};

    for (const key in source) {
      const value = this.deepClone(source[key]);
      if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_MIRROR_FACILITY_ID
        && key === PROJECT_AUTOMATION_SPACE_MIRROR_OVERSIGHT_SETTINGS_KEY
        && value) {
        delete value[PROJECT_AUTOMATION_SPACE_MIRROR_PROJECTED_STATE_KEY];
        delete value[PROJECT_AUTOMATION_SPACE_MIRROR_LAST_SOLUTION_KEY];
      }
      if (this.isExpansionSettingKey(normalizedProjectId, key)) {
        expansion[key] = value;
      } else {
        operations[key] = value;
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
      if (PROJECT_AUTOMATION_SPACE_STORAGE_OPERATION_KEYS.has(key)) {
        filtered[key] = this.deepClone(source[key]);
        continue;
      }
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
    const biomassDensityLimitSource = source.resourceBiomassDensityWithdrawLimits || {};
    const pressureLimitSource = source.resourcePressureWithdrawLimits || {};
    const amountLimitSource = source.resourceAmountWithdrawLimits || {};
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
        const reserveSetting = reserveSource[resourceKey] || {};
        if (reserveSetting.mode === 'amount' || reserveSetting.mode === 'percentCap' || reserveSetting.mode === 'percentTotal') {
          filtered.strategicReserve = this.deepClone(reserveSetting);
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'strategicReserve')) {
      const reserveSetting = source.strategicReserve || {};
      if (reserveSetting.mode === 'amount' || reserveSetting.mode === 'percentCap' || reserveSetting.mode === 'percentTotal') {
        filtered.strategicReserve = this.deepClone(reserveSetting);
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceCaps')) {
      const capSource = source.resourceCaps || {};
      if (Object.prototype.hasOwnProperty.call(capSource, resourceKey)) {
        const capSetting = capSource[resourceKey] || {};
        if (capSetting.mode === 'amount' || capSetting.mode === 'percent' || capSetting.mode === 'weight' || capSetting.mode === 'remaining') {
          filtered.cap = this.deepClone(capSetting);
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'cap')) {
      const capSetting = source.cap || {};
      if (capSetting.mode === 'amount' || capSetting.mode === 'percent' || capSetting.mode === 'weight' || capSetting.mode === 'remaining') {
        filtered.cap = this.deepClone(capSetting);
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceTransferWeights')) {
      if (Object.prototype.hasOwnProperty.call(weightSource, resourceKey)) {
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
        filtered.respectImportProjectLimits = importLimitSource[resourceKey] === true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceBiomassDensityWithdrawLimits')) {
      if (Object.prototype.hasOwnProperty.call(biomassDensityLimitSource, resourceKey)) {
        filtered.limitWithdrawalsToMaxBiomassDensity = biomassDensityLimitSource[resourceKey] === true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourcePressureWithdrawLimits')) {
      if (Object.prototype.hasOwnProperty.call(pressureLimitSource, resourceKey)) {
        filtered.pressureWithdrawLimitPa = this.deepClone(pressureLimitSource[resourceKey]);
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'resourceAmountWithdrawLimits')) {
      if (Object.prototype.hasOwnProperty.call(amountLimitSource, resourceKey)) {
        filtered.amountWithdrawLimit = this.deepClone(amountLimitSource[resourceKey]);
      }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'respectImportProjectLimits')) {
      filtered.respectImportProjectLimits = source.respectImportProjectLimits === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceRespectImportProjectLimits')) {
      filtered.respectImportProjectLimits = source.spaceStorageSingleResourceRespectImportProjectLimits === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'limitWithdrawalsToMaxBiomassDensity')) {
      filtered.limitWithdrawalsToMaxBiomassDensity = source.limitWithdrawalsToMaxBiomassDensity === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceLimitWithdrawalsToMaxBiomassDensity')) {
      filtered.limitWithdrawalsToMaxBiomassDensity = source.spaceStorageSingleResourceLimitWithdrawalsToMaxBiomassDensity === true;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'pressureWithdrawLimitPa')) {
      filtered.pressureWithdrawLimitPa = source.pressureWithdrawLimitPa;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourcePressureWithdrawLimitPa')) {
      filtered.pressureWithdrawLimitPa = source.spaceStorageSingleResourcePressureWithdrawLimitPa;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'amountWithdrawLimit')) {
      filtered.amountWithdrawLimit = source.amountWithdrawLimit;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'spaceStorageSingleResourceAmountWithdrawLimit')) {
      filtered.amountWithdrawLimit = source.spaceStorageSingleResourceAmountWithdrawLimit;
    }
    if (resourceKey === 'liquidWater' && Object.prototype.hasOwnProperty.call(source, 'waterWithdrawTarget')) {
      filtered.waterWithdrawTarget = normalizeProjectAutomationSpaceStorageFluidTarget(
        resourceKey,
        source.waterWithdrawTarget
      );
    }
    if (resourceKey === 'hydrogen' && Object.prototype.hasOwnProperty.call(source, 'hydrogenTransferTarget')) {
      filtered.hydrogenTransferTarget = normalizeProjectAutomationSpaceStorageFluidTarget(
        resourceKey,
        source.hydrogenTransferTarget
      );
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
    const split = this.splitPresetProjectEntrySettings(projectId, rawSettings);
    return this.mergeSettings(split.operations, split.expansion);
  }

  splitPresetProjectEntrySettings(projectId, rawSettings = {}) {
    const entry = rawSettings || {};
    const expansionSource = Object.prototype.hasOwnProperty.call(entry, 'expansion')
      ? entry.expansion || {}
      : {};
    const operationsSource = Object.prototype.hasOwnProperty.call(entry, 'operations')
      ? entry.operations || {}
      : {};
    const expansionSplit = this.splitProjectSettings(projectId, expansionSource);
    const operationsSplit = this.splitProjectSettings(projectId, operationsSource);
    return {
      expansion: this.mergeSettings(operationsSplit.expansion, expansionSplit.expansion),
      operations: this.mergeSettings(expansionSplit.operations, operationsSplit.operations)
    };
  }

  extractLegacySpaceStorageReserveExpansion(projectId, rawSettings = {}) {
    if (this.isSpaceStorageProxyProjectId(projectId)
      && projectId !== PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID) {
      return { found: false, value: false };
    }
    if (this.isPresetProjectEntry(rawSettings)) {
      const operations = rawSettings.operations || {};
      if (Object.prototype.hasOwnProperty.call(operations, PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY)) {
        const value = operations[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
        delete operations[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
        return { found: true, value };
      }
      return { found: false, value: false };
    }
    if (Object.prototype.hasOwnProperty.call(rawSettings, PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY)) {
      const value = rawSettings[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
      delete rawSettings[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
      return { found: true, value };
    }
    return { found: false, value: false };
  }

  mergeSpaceStorageNormalizedEntries(normalized = {}, settings = {}) {
    const source = settings || {};
    const capsReserveSettings = this.filterSpaceStorageCapsAndReserveSettings(source);
    const expansionSettings = this.filterSpaceStorageExpansionSettings(source);
    const operationSettings = this.filterSpaceStorageOperationSettings(source);
    if (Object.keys(capsReserveSettings).length > 0) {
      this.mergePresetEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID, {
        operations: capsReserveSettings
      });
    }
    if (Object.keys(expansionSettings).length > 0) {
      this.mergePresetEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID, {
        expansion: expansionSettings
      });
    }
    if (Object.keys(operationSettings).length > 0) {
      this.mergePresetEntry(normalized, PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID, {
        operations: operationSettings
      });
    }
  }

  normalizePresetCollection(projects = {}) {
    const source = projects || {};
    const normalized = {};

    for (const rawProjectId in source) {
      const normalizedProjectId = this.normalizeProjectId(rawProjectId);
      const project = this.getProjectForAutomationId(normalizedProjectId);
      if (!project || project.category === 'story') {
        continue;
      }

      const rawSettings = this.deepClone(source[rawProjectId] || {});
      const legacyReserveExpansion = this.extractLegacySpaceStorageReserveExpansion(
        normalizedProjectId,
        rawSettings
      );
      if (normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID) {
        const combinedSettings = this.isPresetProjectEntry(rawSettings)
          ? this.extractPresetProjectEntrySettings(normalizedProjectId, rawSettings)
          : this.deepClone(rawSettings);
        this.mergeSpaceStorageNormalizedEntries(normalized, combinedSettings);
      } else if (this.isPresetProjectEntry(rawSettings)) {
        const entry = this.splitPresetProjectEntrySettings(normalizedProjectId, rawSettings);
        this.mergePresetEntry(normalized, normalizedProjectId, entry);
      } else {
        const split = this.splitProjectSettings(normalizedProjectId, rawSettings);
        this.mergePresetEntry(normalized, normalizedProjectId, split);
      }

      if (legacyReserveExpansion.found) {
        const legacyTargetId = normalizedProjectId === PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID
          ? PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID
          : normalizedProjectId;
        this.mergePresetEntry(normalized, legacyTargetId, {
          operations: {
            [PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY]: this.deepClone(
              legacyReserveExpansion.value
            )
          }
        });
      }
    }

    return normalized;
  }

  collectPresetBuckets(preset) {
    const resolved = super.collectPresetBuckets(preset);
    for (const projectId in resolved.operations) {
      const legacyOperations = resolved.operations[projectId];
      if (!Object.prototype.hasOwnProperty.call(
        legacyOperations,
        PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY
      )) {
        continue;
      }
      const legacyValue = legacyOperations[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
      delete legacyOperations[PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY];
      if (Object.keys(legacyOperations).length === 0) {
        delete resolved.operations[projectId];
      }
      const expansionProjectId = projectId === PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID
        ? PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID
        : projectId;
      const canonicalExpansion = resolved.expansion[expansionProjectId] || {};
      if (Object.prototype.hasOwnProperty.call(
        canonicalExpansion,
        PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY
      )) {
        continue;
      }
      resolved.expansion[expansionProjectId] = this.mergeSettings(
        canonicalExpansion,
        {
          [PROJECT_AUTOMATION_SPACE_STORAGE_RESERVE_EXPANSION_KEY]: legacyValue
        }
      );
    }

    return resolved;
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
      project.loadAutomationSettings(this.deepClone(settings), { isPresetApplication: true });
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
    const biomassDensityLimitSource = settings.resourceBiomassDensityWithdrawLimits || {};
    const pressureLimitSource = settings.resourcePressureWithdrawLimits || {};
    const amountLimitSource = settings.resourceAmountWithdrawLimits || {};
    const hasTransferMode = Object.prototype.hasOwnProperty.call(settings, 'mode')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceTransferMode');
    const hasSelectedFlag = Object.prototype.hasOwnProperty.call(settings, 'selected')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceSelected');
    const hasCap = Object.prototype.hasOwnProperty.call(settings, 'cap');
    const hasStrategicReserve = Object.prototype.hasOwnProperty.call(settings, 'strategicReserve');
    const hasTransferWeight = Object.prototype.hasOwnProperty.call(settings, 'transferWeight')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceTransferWeight');
    const hasRespectImportLimits = Object.prototype.hasOwnProperty.call(settings, 'respectImportProjectLimits')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceRespectImportProjectLimits');
    const hasBiomassDensityLimit = Object.prototype.hasOwnProperty.call(settings, 'limitWithdrawalsToMaxBiomassDensity')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceLimitWithdrawalsToMaxBiomassDensity');
    const hasPressureLimit = Object.prototype.hasOwnProperty.call(settings, 'pressureWithdrawLimitPa')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourcePressureWithdrawLimitPa');
    const hasAmountLimit = Object.prototype.hasOwnProperty.call(settings, 'amountWithdrawLimit')
      || Object.prototype.hasOwnProperty.call(settings, 'spaceStorageSingleResourceAmountWithdrawLimit');
    const hasWaterWithdrawTarget = resourceKey === 'liquidWater'
      && Object.prototype.hasOwnProperty.call(settings, 'waterWithdrawTarget');
    const hasHydrogenTransferTarget = resourceKey === 'hydrogen'
      && Object.prototype.hasOwnProperty.call(settings, 'hydrogenTransferTarget');
    const capSetting = hasCap ? settings.cap || {} : capsSource[resourceKey] || {};
    const reserveSetting = hasStrategicReserve ? settings.strategicReserve || {} : reserveSource[resourceKey] || {};
    const capsHasKey = (hasCap || Object.prototype.hasOwnProperty.call(capsSource, resourceKey))
      && (capSetting.mode === 'amount' || capSetting.mode === 'percent' || capSetting.mode === 'weight' || capSetting.mode === 'remaining');
    const reserveHasKey = (hasStrategicReserve || Object.prototype.hasOwnProperty.call(reserveSource, resourceKey))
      && (reserveSetting.mode === 'amount' || reserveSetting.mode === 'percentCap' || reserveSetting.mode === 'percentTotal');
    const weightHasKey = Object.prototype.hasOwnProperty.call(weightSource, resourceKey);
    const importLimitHasKey = Object.prototype.hasOwnProperty.call(importLimitSource, resourceKey);
    const biomassDensityLimitHasKey = Object.prototype.hasOwnProperty.call(biomassDensityLimitSource, resourceKey);
    const pressureLimitHasKey = Object.prototype.hasOwnProperty.call(pressureLimitSource, resourceKey);
    const amountLimitHasKey = Object.prototype.hasOwnProperty.call(amountLimitSource, resourceKey);
    if (!capsHasKey && !reserveHasKey && !weightHasKey && !importLimitHasKey && !biomassDensityLimitHasKey && !pressureLimitHasKey && !amountLimitHasKey && !hasTransferWeight && !hasTransferMode && !hasSelectedFlag && !hasRespectImportLimits && !hasBiomassDensityLimit && !hasPressureLimit && !hasAmountLimit && !hasWaterWithdrawTarget && !hasHydrogenTransferTarget) {
      return false;
    }

    const beforeCaps = project.resourceCaps?.[resourceKey];
    const beforeReserve = project.resourceStrategicReserves?.[resourceKey];
    const beforeTransfer = project.resourceTransferModes?.[resourceKey];
    const beforeWeight = project.resourceTransferWeights?.[resourceKey];
    const beforeRespectImportLimits = project.resourceImportLimitRespects?.[resourceKey] === true;
    const beforeBiomassDensityLimit = project.resourceBiomassDensityWithdrawLimits?.[resourceKey] === true;
    const beforePressureLimit = project.resourcePressureWithdrawLimits?.[resourceKey];
    const beforeAmountLimit = project.resourceAmountWithdrawLimits?.[resourceKey];
    const beforeWaterWithdrawTarget = project.waterWithdrawTarget;
    const beforeHydrogenTransferTarget = project.hydrogenTransferTarget;
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
      project.resourceCaps[resourceKey] = this.deepClone(capSetting);
      project.sanitizeResourceCaps();
      changed = changed || !this.areSettingsEqual(beforeCaps, project.resourceCaps[resourceKey]);
    }
    if (reserveHasKey) {
      if (!project.resourceStrategicReserves) {
        project.resourceStrategicReserves = {};
      }
      project.resourceStrategicReserves[resourceKey] = this.deepClone(reserveSetting);
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
    if (biomassDensityLimitHasKey || hasBiomassDensityLimit) {
      if (!project.resourceBiomassDensityWithdrawLimits) {
        project.resourceBiomassDensityWithdrawLimits = {};
      }
      const enabled = biomassDensityLimitHasKey
        ? biomassDensityLimitSource[resourceKey] === true
        : (Object.prototype.hasOwnProperty.call(settings, 'limitWithdrawalsToMaxBiomassDensity')
          ? settings.limitWithdrawalsToMaxBiomassDensity === true
          : settings.spaceStorageSingleResourceLimitWithdrawalsToMaxBiomassDensity === true);
      project.setLimitWithdrawalsToMaxBiomassDensity(resourceKey, enabled);
      changed = changed || beforeBiomassDensityLimit !== (project.resourceBiomassDensityWithdrawLimits?.[resourceKey] === true);
    }
    if (pressureLimitHasKey || hasPressureLimit) {
      if (!project.resourcePressureWithdrawLimits) {
        project.resourcePressureWithdrawLimits = {};
      }
      const pressureLimit = pressureLimitHasKey
        ? pressureLimitSource[resourceKey]
        : (Object.prototype.hasOwnProperty.call(settings, 'pressureWithdrawLimitPa')
          ? settings.pressureWithdrawLimitPa
          : settings.spaceStorageSingleResourcePressureWithdrawLimitPa);
      project.setPressureWithdrawLimitPa(resourceKey, pressureLimit);
      changed = changed || !this.areSettingsEqual(beforePressureLimit, project.resourcePressureWithdrawLimits?.[resourceKey]);
    }
    if (amountLimitHasKey || hasAmountLimit) {
      if (!project.resourceAmountWithdrawLimits) {
        project.resourceAmountWithdrawLimits = {};
      }
      const amountLimit = amountLimitHasKey
        ? amountLimitSource[resourceKey]
        : (Object.prototype.hasOwnProperty.call(settings, 'amountWithdrawLimit')
          ? settings.amountWithdrawLimit
          : settings.spaceStorageSingleResourceAmountWithdrawLimit);
      project.setAmountWithdrawLimit(resourceKey, amountLimit);
      changed = changed || !this.areSettingsEqual(beforeAmountLimit, project.resourceAmountWithdrawLimits?.[resourceKey]);
    }
    if (hasWaterWithdrawTarget) {
      project.waterWithdrawTarget = normalizeProjectAutomationSpaceStorageFluidTarget(
        resourceKey,
        settings.waterWithdrawTarget
      );
      changed = changed || beforeWaterWithdrawTarget !== project.waterWithdrawTarget;
    }
    if (hasHydrogenTransferTarget) {
      project.hydrogenTransferTarget = normalizeProjectAutomationSpaceStorageFluidTarget(
        resourceKey,
        settings.hydrogenTransferTarget
      );
      changed = changed || beforeHydrogenTransferTarget !== project.hydrogenTransferTarget;
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
    if (hasTransferMode || hasSelectedFlag) {
      const resourceKeys = Object.keys(PROJECT_AUTOMATION_SPACE_STORAGE_RESOURCE_CATEGORY_BY_KEY)
        .filter((key) => project.isResourceUnlocked(key));
      project.updateShipTransferModeFromResources(resourceKeys);
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

  getAdditionalSaveState() {
    return {
      everEnabledProjects: Array.from(this.everEnabledProjects)
    };
  }

  loadAdditionalState(data = {}) {
    this.everEnabledProjects = new Set(
      Array.isArray(data.everEnabledProjects)
        ? data.everEnabledProjects.map(projectId => this.normalizeProjectId(projectId))
        : []
    );
    this.everEnabledProjects.forEach(projectId => {
      if (this.encounteredTargets) {
        this.encounteredTargets.record('projects', projectId);
      }
    });
  }

  afterLoadState() {
    this.recordCurrentlyAvailableProjects();
  }
}

try {
  module.exports = { ProjectAutomation };
} catch (error) {}
