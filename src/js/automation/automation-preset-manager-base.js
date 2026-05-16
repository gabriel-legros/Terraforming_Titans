class AutomationPresetManagerBase {
  constructor(config = {}) {
    this.featureKey = config.featureKey || '';
    this.presetLabel = config.presetLabel || 'Preset';
    this.combinationLabel = config.combinationLabel || 'Combination';
    this.useMasterEnabled = config.useMasterEnabled !== false;
    this.useAssignments = config.useAssignments === true;
    this.useCombinations = config.useCombinations === true;
    this.nextTravelKind = config.nextTravelKind || '';

    this.presets = [];
    this.selectedPresetId = null;
    this.collapsed = false;
    this.nextPresetId = 1;

    if (this.useMasterEnabled) {
      this.masterEnabled = true;
    }
    if (this.useAssignments) {
      this.assignments = [];
      this.nextAssignmentId = 1;
    }
    if (this.useCombinations) {
      this.combinations = [];
      this.selectedCombinationId = null;
      this.nextCombinationId = 1;
      if (this.nextTravelKind === 'combination') {
        this.nextTravelCombinationId = null;
        this.nextTravelCombinationPersistent = false;
      }
    }
    if (this.nextTravelKind === 'preset') {
      this.nextTravelPresetId = null;
      this.nextTravelPersistent = false;
    }
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  setMasterEnabled(enabled) {
    if (!this.useMasterEnabled) {
      return;
    }
    this.masterEnabled = !!enabled;
  }

  isActive() {
    return automationManager.enabled && automationManager.hasFeature(this.featureKey);
  }

  getPresetById(id) {
    const numericId = Number(id);
    return this.presets.find((preset) => preset.id === numericId) || null;
  }

  getSelectedPresetId() {
    const preset = this.getSelectedPreset();
    return preset ? preset.id : null;
  }

  getSelectedPreset() {
    if (!this.selectedPresetId) {
      return null;
    }
    const preset = this.getPresetById(this.selectedPresetId);
    if (!preset) {
      this.selectedPresetId = null;
      return null;
    }
    return preset;
  }

  setSelectedPresetId(id) {
    if (id === null || id === undefined || id === '') {
      this.selectedPresetId = null;
      return null;
    }
    const preset = this.getPresetById(id);
    this.selectedPresetId = preset ? preset.id : null;
    return preset;
  }

  movePreset(id, direction) {
    const numericId = Number(id);
    const index = this.presets.findIndex((preset) => preset.id === numericId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.presets.length) {
      return false;
    }
    const moved = this.presets.splice(index, 1)[0];
    this.presets.splice(nextIndex, 0, moved);
    return true;
  }

  renamePreset(id, name) {
    const preset = this.getPresetById(id);
    if (!preset) {
      return false;
    }
    preset.name = name || `${this.presetLabel} ${preset.id}`;
    return true;
  }

  setPresetShowInSidebar(id, showInSidebar) {
    const preset = this.getPresetById(id);
    if (!preset) {
      return false;
    }
    preset.showInSidebar = showInSidebar !== false;
    return true;
  }

  duplicatePreset(id) {
    const source = this.getPresetById(id);
    if (!source) {
      return null;
    }
    const copyId = this.nextPresetId++;
    const duplicate = this.deepClone(source);
    duplicate.id = copyId;
    duplicate.name = `${source.name || this.presetLabel} Copy`;
    this.presets.push(duplicate);
    this.selectedPresetId = copyId;
    return copyId;
  }

  getScriptAutomationType() {
    if (this.featureKey === 'automationBuildings') return 'buildings';
    if (this.featureKey === 'automationProjects') return 'projects';
    if (this.featureKey === 'automationColony') return 'colony';
    if (this.featureKey === 'automationResearch') return 'research';
    return null;
  }

  clearDeletedScriptReferences(targetKind, targetId) {
    const automationType = this.getScriptAutomationType();
    const scriptAutomation = automationManager?.scriptAutomation;
    if (!automationType || !scriptAutomation) {
      return false;
    }
    return scriptAutomation.clearDeletedAutomationTargetReference(automationType, targetKind, targetId);
  }

  deletePreset(id) {
    const numericId = Number(id);
    this.presets = this.presets.filter((preset) => preset.id !== numericId);
    this.clearDeletedScriptReferences('preset', numericId);
    if (this.useAssignments) {
      this.assignments = this.assignments.filter((item) => item.presetId !== numericId);
    }
    if (this.selectedPresetId === numericId) {
      this.selectedPresetId = null;
    }
    return true;
  }

  getAssignments() {
    return this.useAssignments ? this.assignments.slice() : [];
  }

  addAssignment(presetId) {
    if (!this.useAssignments) {
      return null;
    }
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
    if (!this.useAssignments) {
      return;
    }
    const next = Array.isArray(assignments) ? assignments : [];
    this.assignments = next.map((entry) => ({
      id: this.nextAssignmentId++,
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
  }

  removeAssignment(assignmentId) {
    if (!this.useAssignments) {
      return;
    }
    this.assignments = this.assignments.filter((item) => item.id !== assignmentId);
  }

  moveAssignment(assignmentId, direction) {
    if (!this.useAssignments) {
      return;
    }
    const index = this.assignments.findIndex((item) => item.id === assignmentId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.assignments.length) {
      return;
    }
    const moved = this.assignments.splice(index, 1)[0];
    this.assignments.splice(nextIndex, 0, moved);
  }

  setAssignmentPreset(assignmentId, presetId) {
    if (!this.useAssignments) {
      return;
    }
    const assignment = this.assignments.find((item) => item.id === assignmentId);
    const preset = this.getPresetById(presetId);
    if (!assignment || !preset) {
      return;
    }
    assignment.presetId = preset.id;
  }

  setAssignmentEnabled(assignmentId, enabled) {
    if (!this.useAssignments) {
      return;
    }
    const assignment = this.assignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      return;
    }
    assignment.enabled = !!enabled;
  }

  getCombinations() {
    return this.useCombinations ? this.combinations.slice() : [];
  }

  getCombinationById(id) {
    if (!this.useCombinations) {
      return null;
    }
    const numericId = Number(id);
    return this.combinations.find((combo) => combo.id === numericId) || null;
  }

  getSelectedCombinationId() {
    const combo = this.getSelectedCombination();
    return combo ? combo.id : null;
  }

  getSelectedCombination() {
    if (!this.useCombinations || !this.selectedCombinationId) {
      return null;
    }
    const combo = this.getCombinationById(this.selectedCombinationId);
    if (!combo) {
      this.selectedCombinationId = null;
      return null;
    }
    return combo;
  }

  setSelectedCombinationId(id) {
    if (!this.useCombinations) {
      return null;
    }
    if (id === null || id === undefined || id === '') {
      this.selectedCombinationId = null;
      return null;
    }
    const combo = this.getCombinationById(id);
    this.selectedCombinationId = combo ? combo.id : null;
    return combo;
  }

  moveCombination(id, direction) {
    if (!this.useCombinations) {
      return false;
    }
    const numericId = Number(id);
    const index = this.combinations.findIndex((combo) => combo.id === numericId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.combinations.length) {
      return false;
    }
    const moved = this.combinations.splice(index, 1)[0];
    this.combinations.splice(nextIndex, 0, moved);
    return true;
  }

  addCombination(name, assignments) {
    if (!this.useCombinations) {
      return null;
    }
    const id = this.nextCombinationId++;
    const combo = {
      id,
      name: name || `${this.combinationLabel} ${id}`,
      showInSidebar: true,
      assignments: (assignments || []).map((entry) => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      }))
    };
    this.combinations.push(combo);
    this.selectedCombinationId = combo.id;
    return combo.id;
  }

  updateCombination(id, name, assignments) {
    if (!this.useCombinations) {
      return false;
    }
    const numericId = Number(id);
    const index = this.combinations.findIndex((combo) => combo.id === numericId);
    if (index < 0) {
      return false;
    }
    const existing = this.combinations[index];
    this.combinations[index] = {
      id: numericId,
      name: name || `${this.combinationLabel} ${numericId}`,
      showInSidebar: existing.showInSidebar !== false,
      assignments: (assignments || []).map((entry) => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      }))
    };
    return true;
  }

  deleteCombination(id) {
    if (!this.useCombinations) {
      return;
    }
    const numericId = Number(id);
    this.combinations = this.combinations.filter((combo) => combo.id !== numericId);
    this.clearDeletedScriptReferences('combination', numericId);
    if (this.selectedCombinationId === numericId) {
      this.selectedCombinationId = null;
    }
    if (this.nextTravelKind === 'combination' && this.nextTravelCombinationId === numericId) {
      this.nextTravelCombinationId = null;
      this.nextTravelCombinationPersistent = false;
    }
  }

  setCombinationShowInSidebar(id, showInSidebar) {
    const combo = this.getCombinationById(id);
    if (!combo) {
      return false;
    }
    combo.showInSidebar = showInSidebar !== false;
    return true;
  }

  applyCombination(id) {
    const combo = this.getCombinationById(id);
    if (!combo) {
      return;
    }
    this.selectedCombinationId = combo.id;
    this.setAssignments(combo.assignments);
  }

  serializeAssignments() {
    if (!this.useAssignments) {
      return [];
    }
    return this.assignments.map((item) => ({
      id: item.id,
      presetId: item.presetId,
      enabled: item.enabled !== false
    }));
  }

  loadAssignmentsFromState(assignments) {
    if (!this.useAssignments) {
      return;
    }
    this.assignments = Array.isArray(assignments) ? assignments.map((item) => ({
      id: item.id,
      presetId: item.presetId,
      enabled: item.enabled !== false
    })) : [];
  }

  serializeCombinations() {
    if (!this.useCombinations) {
      return [];
    }
    return this.combinations.map((combo) => ({
      id: combo.id,
      name: combo.name,
      showInSidebar: combo.showInSidebar !== false,
      assignments: Array.isArray(combo.assignments) ? combo.assignments.map((entry) => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      })) : []
    }));
  }

  loadCombinationsFromState(combinations) {
    if (!this.useCombinations) {
      return;
    }
    this.combinations = Array.isArray(combinations) ? combinations.map((combo) => ({
      id: combo.id,
      name: combo.name || this.combinationLabel,
      showInSidebar: combo.showInSidebar !== false,
      assignments: Array.isArray(combo.assignments) ? combo.assignments.map((entry) => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      })) : []
    })) : [];
  }

  loadCommonListState(data = {}, options = {}) {
    const hasSelectedPresetId = Object.prototype.hasOwnProperty.call(data, 'selectedPresetId');
    const hasSelectedCombinationId = Object.prototype.hasOwnProperty.call(data, 'selectedCombinationId');
    this.collapsed = !!data.collapsed;
    if (this.useMasterEnabled) {
      this.masterEnabled = data.masterEnabled !== false;
    }

    if (this.nextTravelKind === 'combination') {
      this.nextTravelCombinationId = data.nextTravelCombinationId ? Number(data.nextTravelCombinationId) : null;
      this.nextTravelCombinationPersistent = data.nextTravelCombinationPersistent === true && !!this.nextTravelCombinationId;
      if (options.allowLegacyApplyOnNextTravel && !this.nextTravelCombinationId && data.applyOnNextTravel) {
        this.nextTravelCombinationId = this.addCombination('Next Travel', this.assignments);
      }
    }
    if (this.nextTravelKind === 'preset') {
      this.nextTravelPresetId = data.nextTravelPresetId ? Number(data.nextTravelPresetId) : null;
      this.nextTravelPersistent = data.nextTravelPersistent === true && !!this.nextTravelPresetId;
    }

    this.selectedPresetId = hasSelectedPresetId
      ? (data.selectedPresetId ? Number(data.selectedPresetId) : null)
      : (this.presets[0] ? this.presets[0].id : null);
    if (this.useCombinations) {
      this.selectedCombinationId = hasSelectedCombinationId
        ? (data.selectedCombinationId ? Number(data.selectedCombinationId) : null)
        : (this.combinations[0] ? this.combinations[0].id : null);
    }

    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    if (this.useAssignments) {
      this.nextAssignmentId = data.nextAssignmentId || this.assignments.length + 1;
    }
    if (this.useCombinations) {
      this.nextCombinationId = data.nextCombinationId || this.combinations.length + 1;
    }
    this.getSelectedPreset();
    if (this.useCombinations) {
      this.getSelectedCombination();
    }
  }

  deepClone(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.deepClone(item));
    }
    if (!value || value.constructor !== Object) {
      return value;
    }
    const clone = {};
    for (const key in value) {
      clone[key] = this.deepClone(value[key]);
    }
    return clone;
  }
}

try {
  module.exports = { AutomationPresetManagerBase };
} catch (error) {}
