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
    const scopeAll = options.scopeAll === true;
    const id = idOverride || this.nextPresetId++;
    const preset = {
      id,
      name: name || `Preset ${id}`,
      scopeAll,
      projects: {}
    };
    const ids = Array.isArray(projectIds) ? projectIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      const projectId = ids[index];
      const project = projectManager.projects[projectId];
      if (!project || project.category === 'story') {
        continue;
      }
      const settings = this.captureProjectSettings(project);
      if (settings && Object.keys(settings).length > 0) {
        preset.projects[projectId] = settings;
      }
    }
    return preset;
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
    const resolved = {};
    for (let index = 0; index < this.assignments.length; index += 1) {
      const assignment = this.assignments[index];
      if (!assignment.enabled) {
        continue;
      }
      const preset = this.getPresetById(assignment.presetId);
      if (!preset) {
        continue;
      }
      const entries = preset.projects;
      for (const projectId in entries) {
        resolved[projectId] = this.deepClone(entries[projectId]);
      }
    }
    return resolved;
  }

  applyPresets() {
    const resolved = this.resolveAssignments();
    this.applyResolvedMap(resolved);
  }

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return;
    }
    this.applyResolvedMap(this.deepClone(preset.projects || {}));
  }

  applyResolvedMap(settingsMap) {
    let changed = false;
    for (const projectId in settingsMap) {
      const project = projectManager.projects[projectId];
      if (!project) {
        continue;
      }
      if (this.applyProjectSettings(project, settingsMap[projectId])) {
        changed = true;
      }
    }
    if (changed) {
      for (const projectId in settingsMap) {
        if (projectManager.projects[projectId]) {
          updateProjectUI(projectId);
        }
      }
      renderProjects();
    }
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
      scopeAll: preset.scopeAll === true,
      projects: preset.projects || {}
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
