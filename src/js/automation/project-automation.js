const PROJECT_AUTOMATION_SPACE_STORAGE_PROJECT_ID = 'spaceStorage';
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID = 'spaceStorageExpansion';
const PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID = 'spaceStorageOperations';
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_CAPS_AND_RESERVE_ID = 'spaceStorageCapsReserve';
const PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_OTHER_ID = 'spaceStorageOther';
const PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_KEYS = new Set([
  'resourceStrategicReserves',
  'resourceCaps'
]);

const PROJECT_AUTOMATION_BASE_EXPANSION_KEYS = new Set([
  'autoStart',
  'autoStartUncheckOnTravel',
  'autoContinuousOperation',
  'autoDeployCollectors'
]);

const PROJECT_AUTOMATION_EXPANSION_KEYS = new Set([
  'buildCount',
  'autoMax',
  'workerCapacityStep',
  'underworldMiningLevel',
  'superchargedMiningLevel',
  'createGeothermalDeposits',
  'undergroundStorage',
  'selectedRadiusMeters',
  'radiusStepMeters',
  'expansionRecipeKey'
]);

const PROJECT_AUTOMATION_PROJECT_EXPANSION_KEYS = {
  satellite: new Set(['step']),
  geo_satellite: new Set(['step'])
};

class ProjectAutomation {
  constructor() {
    this.presets = [];
    this.assignments = [];
    this.combinations = [];
    this.collapsed = false;
    this.masterEnabled = true;
    this.nextTravelCombinationId = null;
    this.nextTravelCombinationPersistent = false;
    this.nextPresetId = 1;
    this.nextAssignmentId = 1;
    this.nextCombinationId = 1;
    this.elapsed = 0;
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  setMasterEnabled(enabled) {
    this.masterEnabled = !!enabled;
  }

  isActive() {
    return automationManager.enabled && automationManager.hasFeature('automationProjects');
  }

  getPresetById(id) {
    return this.presets.find(preset => preset.id === id) || null;
  }

  getAssignments() {
    return this.assignments.slice();
  }

  getCombinations() {
    return this.combinations.slice();
  }

  getCombinationById(id) {
    return this.combinations.find(combo => combo.id === id) || null;
  }

  addAssignment(presetId) {
    const preset = this.getPresetById(presetId) || this.presets[0] || null;
    const assignment = {
      id: this.nextAssignmentId++,
      presetId: preset ? preset.id : null,
      enabled: true
    };
    this.assignments.push(assignment);
    return assignment.id;
  }

  setAssignments(assignments) {
    const next = Array.isArray(assignments) ? assignments : [];
    this.assignments = next.map(entry => ({
      id: this.nextAssignmentId++,
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
  }

  removeAssignment(assignmentId) {
    this.assignments = this.assignments.filter(item => item.id !== assignmentId);
  }

  moveAssignment(assignmentId, direction) {
    const index = this.assignments.findIndex(item => item.id === assignmentId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.assignments.length) {
      return;
    }
    const moved = this.assignments.splice(index, 1)[0];
    this.assignments.splice(nextIndex, 0, moved);
  }

  setAssignmentPreset(assignmentId, presetId) {
    const assignment = this.assignments.find(item => item.id === assignmentId);
    const preset = this.getPresetById(presetId);
    if (!assignment || !preset) {
      return;
    }
    assignment.presetId = preset.id;
  }

  setAssignmentEnabled(assignmentId, enabled) {
    const assignment = this.assignments.find(item => item.id === assignmentId);
    if (!assignment) {
      return;
    }
    assignment.enabled = !!enabled;
  }

  moveCombination(id, direction) {
    const index = this.combinations.findIndex(combo => combo.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.combinations.length) {
      return false;
    }
    const [combo] = this.combinations.splice(index, 1);
    this.combinations.splice(nextIndex, 0, combo);
    return true;
  }

  addCombination(name, assignments) {
    const id = this.nextCombinationId++;
    const combo = {
      id,
      name: name || `Combination ${id}`,
      assignments: (assignments || []).map(entry => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      }))
    };
    this.combinations.push(combo);
    return combo.id;
  }

  updateCombination(id, name, assignments) {
    const index = this.combinations.findIndex(combo => combo.id === id);
    if (index < 0) {
      return false;
    }
    this.combinations[index] = {
      id,
      name: name || `Combination ${id}`,
      assignments: (assignments || []).map(entry => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      }))
    };
    return true;
  }

  deleteCombination(id) {
    this.combinations = this.combinations.filter(combo => combo.id !== id);
    if (this.nextTravelCombinationId === id) {
      this.nextTravelCombinationId = null;
      this.nextTravelCombinationPersistent = false;
    }
  }

  applyCombination(id) {
    const combo = this.getCombinationById(id);
    if (!combo) {
      return;
    }
    this.setAssignments(combo.assignments);
  }

  addPreset(name, projectIds, options = {}) {
    const preset = this.buildPreset(name, projectIds, options);
    this.presets.push(preset);
    return preset.id;
  }

  movePreset(id, direction) {
    const index = this.presets.findIndex(preset => preset.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.presets.length) {
      return false;
    }
    const [preset] = this.presets.splice(index, 1);
    this.presets.splice(nextIndex, 0, preset);
    return true;
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
    this.presets = this.presets.filter(preset => preset.id !== id);
    this.assignments = this.assignments.filter(item => item.presetId !== id);
  }

  renamePreset(id, name) {
    const preset = this.getPresetById(id);
    if (!preset) {
      return;
    }
    preset.name = name;
  }

  buildPreset(name, projectIds, options = {}, idOverride) {
    const includeExpansion = options.includeExpansion !== false;
    const includeOperations = options.includeOperations !== false;
    const scopeAll = options.scopeAll === true;
    const id = idOverride || this.nextPresetId++;
    const preset = {
      id,
      name: name || `Preset ${id}`,
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
    if (project.attributes && project.attributes.canUseDysonOverflow) {
      settings.allowColonyEnergyUse = project.allowColonyEnergyUse === true;
    }
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
    let changed = false;
    const changedProjectIds = new Set();
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

      if (this.applyProjectSettings(project, settings)) {
        changed = true;
        changedProjectIds.add(project.name);
      }
    });

    if (changed) {
      changedProjectIds.forEach(projectId => updateProjectUI(projectId));
      renderProjects();
    }
  }

  isSpaceStorageProxyProjectId(projectId) {
    return projectId === PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID
      || projectId === PROJECT_AUTOMATION_SPACE_STORAGE_EXPANSION_ID
      || projectId === PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID;
  }

  normalizeProjectId(projectId) {
    if (projectId === PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_OTHER_ID) {
      return PROJECT_AUTOMATION_SPACE_STORAGE_OPERATIONS_ID;
    }
    if (projectId === PROJECT_AUTOMATION_LEGACY_SPACE_STORAGE_CAPS_AND_RESERVE_ID) {
      return PROJECT_AUTOMATION_SPACE_STORAGE_CAPS_AND_RESERVE_ID;
    }
    return projectId;
  }

  getProjectForAutomationId(projectId) {
    const normalizedProjectId = this.normalizeProjectId(projectId);
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

  applyFallbackSettings(project, settings = {}) {
    if (Object.prototype.hasOwnProperty.call(settings, 'autoStart')) {
      project.autoStart = settings.autoStart === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'autoStartUncheckOnTravel')) {
      project.autoStartUncheckOnTravel = settings.autoStartUncheckOnTravel === true;
    }
    if (
      project.attributes &&
      project.attributes.canUseDysonOverflow &&
      Object.prototype.hasOwnProperty.call(settings, 'allowColonyEnergyUse')
    ) {
      if (project.setAllowColonyEnergyUse) {
        project.setAllowColonyEnergyUse(settings.allowColonyEnergyUse === true);
      } else {
        project.allowColonyEnergyUse = settings.allowColonyEnergyUse === true;
      }
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
    if (Array.isArray(value)) {
      return value.map(entry => this.deepClone(entry));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const clone = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      clone[key] = this.deepClone(value[key]);
    }
    return clone;
  }

  update(delta) {
    if (!this.isActive()) {
      return;
    }
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeExpansion: preset.includeExpansion !== false,
        includeOperations: preset.includeOperations !== false,
        scopeAll: !!preset.scopeAll,
        projects: this.deepClone(preset.projects || {})
      })),
      assignments: this.assignments.map(item => ({ ...item })),
      combinations: this.combinations.map(combo => ({
        id: combo.id,
        name: combo.name,
        assignments: combo.assignments.map(entry => ({
          presetId: entry.presetId,
          enabled: entry.enabled !== false
        }))
      })),
      collapsed: this.collapsed,
      masterEnabled: this.masterEnabled,
      nextTravelCombinationId: this.nextTravelCombinationId,
      nextTravelCombinationPersistent: this.nextTravelCombinationPersistent,
      nextPresetId: this.nextPresetId,
      nextAssignmentId: this.nextAssignmentId,
      nextCombinationId: this.nextCombinationId
    };
  }

  loadState(data = {}) {
    this.presets = Array.isArray(data.presets) ? data.presets.map(preset => ({
      id: preset.id,
      name: preset.name || 'Preset',
      includeExpansion: preset.includeExpansion !== false,
      includeOperations: preset.includeOperations !== false,
      scopeAll: preset.scopeAll === true,
      projects: this.normalizeLoadedPresetProjects(preset.projects || {})
    })) : [];
    this.assignments = Array.isArray(data.assignments) ? data.assignments.map(item => ({
      id: item.id,
      presetId: item.presetId,
      enabled: item.enabled !== false
    })) : [];
    this.combinations = Array.isArray(data.combinations) ? data.combinations.map(combo => ({
      id: combo.id,
      name: combo.name || 'Combination',
      assignments: Array.isArray(combo.assignments) ? combo.assignments.map(entry => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      })) : []
    })) : [];
    this.collapsed = !!data.collapsed;
    this.masterEnabled = data.masterEnabled !== false;
    this.nextTravelCombinationId = data.nextTravelCombinationId ? Number(data.nextTravelCombinationId) : null;
    this.nextTravelCombinationPersistent = data.nextTravelCombinationPersistent === true && !!this.nextTravelCombinationId;
    if (!this.nextTravelCombinationId && data.applyOnNextTravel) {
      this.nextTravelCombinationId = this.addCombination('Next Travel', this.assignments);
    }
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.nextAssignmentId = data.nextAssignmentId || this.assignments.length + 1;
    this.nextCombinationId = data.nextCombinationId || this.combinations.length + 1;
  }
}

try {
  module.exports = { ProjectAutomation };
} catch (error) {}
