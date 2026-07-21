class AutomationPresetManagerBase {
  constructor(config = {}) {
    this.featureKey = config.featureKey || '';
    this.presetLabel = config.presetLabel || 'Preset';
    this.combinationLabel = config.combinationLabel || 'Combination';
    this.useMasterEnabled = config.useMasterEnabled !== false;
    this.useAssignments = config.useAssignments === true;
    this.useCombinations = config.useCombinations === true;
    this.nextTravelKind = config.nextTravelKind || '';
    this.presetCollectionKey = config.presetCollectionKey || '';

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

  getPresetModeValue(value) {
    return value === 'parameterized' ? 'parameterized' : 'regular';
  }

  isParameterizedPreset(preset) {
    return !!preset && this.getPresetModeValue(preset.presetMode) === 'parameterized';
  }

  collectPresetParameterLeafPaths(value, path, outPaths) {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        this.collectPresetParameterLeafPaths(value[index], path.concat(index), outPaths);
      }
      return;
    }
    if (value && value.constructor === Object) {
      const keys = Object.keys(value);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        this.collectPresetParameterLeafPaths(value[key], path.concat(key), outPaths);
      }
      return;
    }
    if (Number.isFinite(value)) {
      outPaths.push(path);
    }
  }

  getPresetParameterInfo(preset) {
    if (!preset || !this.presetCollectionKey) {
      return {
        valid: false,
        itemCount: 0,
        parameterPath: null,
        parameterPaths: [],
        numericPathCount: 0
      };
    }
    const collection = preset[this.presetCollectionKey] || {};
    const itemKeys = Object.keys(collection);
    const numericPaths = [];
    this.collectPresetParameterLeafPaths(collection, [this.presetCollectionKey], numericPaths);
    const eligibleNumericPaths = numericPaths.filter((path) => this.isPresetParameterPathEligible(preset, path));
    return {
      valid: itemKeys.length === 1 && eligibleNumericPaths.length === 1,
      itemCount: itemKeys.length,
      parameterPath: eligibleNumericPaths[0] || null,
      parameterPaths: eligibleNumericPaths,
      numericPathCount: eligibleNumericPaths.length
    };
  }

  isPresetParameterPathEligible() {
    return true;
  }

  setValueAtPresetPath(target, path, value) {
    let current = target;
    for (let index = 0; index < path.length - 1; index += 1) {
      current = current[path[index]];
    }
    current[path[path.length - 1]] = value;
  }

  buildPresetForApplication(preset, parameterValue) {
    if (!this.isParameterizedPreset(preset)) {
      return preset;
    }
    const parameterInfo = this.getPresetParameterInfo(preset);
    if (!parameterInfo.valid) {
      return null;
    }
    const appliedPreset = this.deepClone(preset);
    if (parameterValue !== undefined && parameterValue !== null) {
      for (let index = 0; index < parameterInfo.parameterPaths.length; index += 1) {
        this.setValueAtPresetPath(appliedPreset, parameterInfo.parameterPaths[index], Number(parameterValue));
      }
    }
    return appliedPreset;
  }

  getParameterizedPresetInvalidMessage(preset) {
    if (!this.isParameterizedPreset(preset)) {
      return '';
    }
    const parameterInfo = this.getPresetParameterInfo(preset);
    if (parameterInfo.valid) {
      return '';
    }
    return t(
      'ui.hope.automationCards.parameterizedPresetInvalid',
      {},
      'Invalid parametrized preset: select exactly one building, project, or colony target and keep exactly one numerical row.'
    );
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
    const assignmentsMatch = this.assignments.length === combo.assignments.length
      && this.assignments.every((assignment, index) => (
        assignment.presetId === combo.assignments[index].presetId
        && (assignment.enabled !== false) === (combo.assignments[index].enabled !== false)
      ));
    if (!assignmentsMatch) {
      this.setAssignments(combo.assignments);
    }
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

    this.nextPresetId = this.getNextListId(this.presets, data.nextPresetId);
    if (this.useAssignments) {
      this.nextAssignmentId = this.getNextListId(this.assignments, data.nextAssignmentId);
    }
    if (this.useCombinations) {
      this.nextCombinationId = this.getNextListId(this.combinations, data.nextCombinationId);
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
    this.getSelectedPreset();
    if (this.useCombinations) {
      this.getSelectedCombination();
    }
  }

  getNextListId(items, savedNextId) {
    const list = Array.isArray(items) ? items : [];
    let highestId = 0;
    for (let index = 0; index < list.length; index += 1) {
      const id = Number(list[index].id);
      if (Number.isInteger(id) && id > highestId) {
        highestId = id;
      }
    }
    const saved = Number(savedNextId);
    return Number.isInteger(saved) && saved > highestId ? saved : highestId + 1;
  }

  mergeSettings(baseValue, overridingValue) {
    if (!overridingValue || overridingValue.constructor !== Object) {
      return this.deepClone(overridingValue);
    }
    const merged = baseValue && baseValue.constructor === Object
      ? this.deepClone(baseValue)
      : {};
    for (const key in overridingValue) {
      merged[key] = this.deepClone(overridingValue[key]);
    }
    return merged;
  }

  areSettingsEqual(left, right) {
    if (left === right) {
      return true;
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
    if (!left || !right || left.constructor !== Object || right.constructor !== Object) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (!Object.prototype.hasOwnProperty.call(right, key)
        || !this.areSettingsEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
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

class AutomationTwoBucketPresetManagerBase extends AutomationPresetManagerBase {
  constructor(config = {}) {
    super(config);
    this.bucketKeys = config.bucketKeys.slice();
    this.includeKeys = config.includeKeys.slice();
    this.allowLegacyApplyOnNextTravel = config.allowLegacyApplyOnNextTravel === true;
  }

  createPresetRecord(id, name, source = {}) {
    return {
      id,
      name: name || `${this.presetLabel} ${id}`,
      showInSidebar: source.showInSidebar !== false,
      presetMode: this.getPresetModeValue(source.presetMode),
      [this.includeKeys[0]]: source[this.includeKeys[0]] !== false,
      [this.includeKeys[1]]: source[this.includeKeys[1]] !== false,
      scopeAll: source.scopeAll === true,
      [this.presetCollectionKey]: {}
    };
  }

  normalizePresetTargetId(targetId) {
    return targetId;
  }

  capturePresetEntry() {
    return null;
  }

  normalizePresetCollection(collection = {}) {
    return this.deepClone(collection || {});
  }

  serializePresetCollection(preset) {
    return this.deepClone(preset[this.presetCollectionKey] || {});
  }

  recordPresetTargets() {}

  getAdditionalSaveState() {
    return {};
  }

  loadAdditionalState() {}

  afterLoadState() {}

  mergePresetEntry(collection, targetId, entry) {
    if (!entry || entry.constructor !== Object) {
      return false;
    }
    const normalizedTargetId = this.normalizePresetTargetId(targetId);
    if (!normalizedTargetId) {
      return false;
    }
    const hasExistingEntry = Object.prototype.hasOwnProperty.call(collection, normalizedTargetId);
    const hasBucketSettings = this.bucketKeys.some((bucketKey) => {
      const settings = entry[bucketKey];
      return settings && settings.constructor === Object && Object.keys(settings).length > 0;
    });
    if (!hasExistingEntry && !hasBucketSettings) {
      return false;
    }

    const current = hasExistingEntry ? collection[normalizedTargetId] : {};
    let changed = false;
    for (const key in entry) {
      if (this.bucketKeys.indexOf(key) >= 0) {
        continue;
      }
      if (!this.areSettingsEqual(current[key], entry[key])) {
        current[key] = this.deepClone(entry[key]);
        changed = true;
      }
    }
    for (let index = 0; index < this.bucketKeys.length; index += 1) {
      const bucketKey = this.bucketKeys[index];
      const settings = entry[bucketKey];
      if (!settings || settings.constructor !== Object || Object.keys(settings).length === 0) {
        continue;
      }
      const mergedSettings = this.mergeSettings(current[bucketKey], settings);
      if (!this.areSettingsEqual(current[bucketKey], mergedSettings)) {
        current[bucketKey] = mergedSettings;
        changed = true;
      }
    }
    if (changed) {
      collection[normalizedTargetId] = current;
    }
    return changed;
  }

  addPreset(name, targetIds, options = {}) {
    const shouldCreateEmpty = options.createEmpty === true;
    const preset = this.buildPreset(
      name,
      shouldCreateEmpty ? [] : targetIds,
      shouldCreateEmpty ? { ...options, scopeAll: false } : options
    );
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  updatePreset(id, name, targetIds, options = {}) {
    const numericId = Number(id);
    const index = this.presets.findIndex((preset) => preset.id === numericId);
    if (index < 0) {
      return false;
    }
    this.presets[index] = this.buildPreset(name, targetIds, options, numericId);
    return true;
  }

  exportPreset(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return null;
    }
    const exported = this.createPresetRecord(null, preset.name, preset);
    delete exported.id;
    exported[this.presetCollectionKey] = this.serializePresetCollection(preset);
    return exported;
  }

  importPreset(presetData = {}) {
    const id = this.nextPresetId++;
    const preset = this.createPresetRecord(id, presetData.name, presetData);
    preset[this.presetCollectionKey] = this.normalizePresetCollection(
      presetData[this.presetCollectionKey] || {}
    );
    this.recordPresetTargets(preset);
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  buildPreset(name, targetIds, options = {}, idOverride) {
    const id = idOverride || this.nextPresetId++;
    const preset = this.createPresetRecord(id, name, options);
    const ids = Array.isArray(targetIds) ? targetIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      const targetId = this.normalizePresetTargetId(ids[index]);
      const entry = this.capturePresetEntry(
        targetId,
        preset[this.includeKeys[0]],
        preset[this.includeKeys[1]]
      );
      this.mergePresetEntry(preset[this.presetCollectionKey], targetId, entry);
    }
    this.recordPresetTargets(preset);
    return preset;
  }

  mergeMissingPresetTargets(presetId, targetIds = []) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return false;
    }
    const collection = preset[this.presetCollectionKey];
    const ids = Array.isArray(targetIds) ? targetIds : [];
    let changed = false;
    for (let index = 0; index < ids.length; index += 1) {
      const targetId = this.normalizePresetTargetId(ids[index]);
      if (!targetId || collection[targetId]) {
        continue;
      }
      const entry = this.capturePresetEntry(
        targetId,
        preset[this.includeKeys[0]] !== false,
        preset[this.includeKeys[1]] !== false
      );
      if (this.mergePresetEntry(collection, targetId, entry)) {
        changed = true;
      }
    }
    if (changed) {
      this.recordPresetTargets(preset);
    }
    return changed;
  }

  snapshotPresetTarget(presetId, targetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return false;
    }
    const normalizedTargetId = this.normalizePresetTargetId(targetId);
    const entry = this.capturePresetEntry(
      normalizedTargetId,
      preset[this.includeKeys[0]] !== false,
      preset[this.includeKeys[1]] !== false
    );
    if (!entry) {
      return false;
    }
    const replacement = {};
    if (!this.mergePresetEntry(replacement, normalizedTargetId, entry)) {
      return false;
    }
    preset[this.presetCollectionKey][normalizedTargetId] = replacement[normalizedTargetId];
    this.recordPresetTargets(preset);
    return true;
  }

  collectPresetBuckets(preset) {
    const resolved = {
      [this.bucketKeys[0]]: {},
      [this.bucketKeys[1]]: {}
    };
    const entries = preset[this.presetCollectionKey] || {};
    for (const targetId in entries) {
      const entry = entries[targetId] || {};
      for (let index = 0; index < this.bucketKeys.length; index += 1) {
        if (preset[this.includeKeys[index]] === false) {
          continue;
        }
        const bucketKey = this.bucketKeys[index];
        const settings = entry[bucketKey];
        if (!settings || settings.constructor !== Object || Object.keys(settings).length === 0) {
          continue;
        }
        resolved[bucketKey][targetId] = this.mergeSettings(
          resolved[bucketKey][targetId],
          settings
        );
      }
    }
    return resolved;
  }

  resolveAssignments() {
    const resolved = {
      [this.bucketKeys[0]]: {},
      [this.bucketKeys[1]]: {}
    };
    for (let index = 0; index < this.assignments.length; index += 1) {
      const assignment = this.assignments[index];
      if (!assignment.enabled) {
        continue;
      }
      const preset = this.getPresetById(assignment.presetId);
      if (!preset || (this.isParameterizedPreset(preset) && !this.getPresetParameterInfo(preset).valid)) {
        continue;
      }
      const presetBuckets = this.collectPresetBuckets(preset);
      for (let bucketIndex = 0; bucketIndex < this.bucketKeys.length; bucketIndex += 1) {
        const bucketKey = this.bucketKeys[bucketIndex];
        for (const targetId in presetBuckets[bucketKey]) {
          resolved[bucketKey][targetId] = this.mergeSettings(
            resolved[bucketKey][targetId],
            presetBuckets[bucketKey][targetId]
          );
        }
      }
    }
    return resolved;
  }

  applyPresets() {
    const resolved = this.resolveAssignments();
    this.applyResolvedMaps(resolved[this.bucketKeys[0]], resolved[this.bucketKeys[1]]);
  }

  applyCombinationPresets(id) {
    if (id) {
      this.applyCombination(id);
    }
    this.applyPresets();
  }

  applyPresetOnce(presetId, parameterValue = null) {
    const preset = this.buildPresetForApplication(this.getPresetById(presetId), parameterValue);
    if (!preset) {
      return;
    }
    const resolved = this.collectPresetBuckets(preset);
    this.applyResolvedMaps(resolved[this.bucketKeys[0]], resolved[this.bucketKeys[1]]);
  }

  captureStructureControlSettings(structure) {
    return {
      workerPriority: structure.workerPriority,
      hidden: structure.isHidden === true
    };
  }

  applyStructureControlSettings(structure, control) {
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(control, 'workerPriority')
      && structure.workerPriority !== control.workerPriority) {
      structure.workerPriority = control.workerPriority;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(control, 'hidden')) {
      const shouldHide = control.hidden === true && structure.active <= 0n;
      if (structure.isHidden !== shouldHide) {
        structure.isHidden = shouldHide;
        updateStructureHiddenPreference(structure.name, shouldHide);
        changed = true;
      }
    }
    return changed;
  }

  captureStructureAutomationSettings(structure) {
    return {
      autoBuildEnabled: structure.autoBuildEnabled,
      autoBuildPriority: structure.autoBuildPriority,
      autoBuildBasis: structure.autoBuildBasis === 'initialLand' ? 'geometricLand' : structure.autoBuildBasis,
      autoBuildPercent: structure.autoBuildPercent,
      autoBuildFixed: structure.autoBuildFixed,
      autoBuildFillPercent: structure.autoBuildFillPercent,
      autoBuildFillResourcePrimary: structure.autoBuildFillResourcePrimary,
      autoBuildFillResourceSecondary: structure.autoBuildFillResourceSecondary,
      autoActiveEnabled: structure.autoActiveEnabled,
      autoUpgradeEnabled: structure.autoUpgradeEnabled === true
    };
  }

  applyStructureAutomationSettings(structure, automation) {
    const directKeys = [
      'autoBuildEnabled',
      'autoBuildPriority',
      'autoBuildPercent',
      'autoBuildFixed',
      'autoBuildFillPercent',
      'autoBuildFillResourcePrimary',
      'autoBuildFillResourceSecondary',
      'autoActiveEnabled'
    ];
    let changed = false;
    for (let index = 0; index < directKeys.length; index += 1) {
      const key = directKeys[index];
      if (Object.prototype.hasOwnProperty.call(automation, key)
        && structure[key] !== automation[key]) {
        structure[key] = automation[key];
        changed = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(automation, 'autoBuildBasis')) {
      const basis = automation.autoBuildBasis === 'initialLand'
        ? 'geometricLand'
        : automation.autoBuildBasis;
      if (structure.autoBuildBasis !== basis) {
        structure.autoBuildBasis = basis;
        if (structure.normalizeAutoBuildBasis) {
          structure.normalizeAutoBuildBasis();
        }
        changed = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(automation, 'autoUpgradeEnabled')) {
      const autoUpgradeEnabled = automation.autoUpgradeEnabled === true;
      if (structure.autoUpgradeEnabled !== autoUpgradeEnabled) {
        structure.autoUpgradeEnabled = autoUpgradeEnabled;
        changed = true;
      }
    }
    return changed;
  }

  saveState() {
    return {
      presets: this.presets.map((preset) => {
        const saved = this.createPresetRecord(preset.id, preset.name, preset);
        saved[this.presetCollectionKey] = this.serializePresetCollection(preset);
        return saved;
      }),
      assignments: this.serializeAssignments(),
      combinations: this.serializeCombinations(),
      ...this.getAdditionalSaveState(),
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
    this.presets = Array.isArray(data.presets) ? data.presets.map((savedPreset) => {
      const preset = this.createPresetRecord(savedPreset.id, savedPreset.name || 'Preset', savedPreset);
      preset[this.presetCollectionKey] = this.normalizePresetCollection(
        savedPreset[this.presetCollectionKey] || {}
      );
      return preset;
    }) : [];
    this.loadAssignmentsFromState(data.assignments);
    this.loadCombinationsFromState(data.combinations);
    this.loadAdditionalState(data);
    this.presets.forEach((preset) => this.recordPresetTargets(preset));
    this.loadCommonListState(data, {
      allowLegacyApplyOnNextTravel: this.allowLegacyApplyOnNextTravel
    });
    this.afterLoadState();
  }
}

try {
  module.exports = { AutomationPresetManagerBase, AutomationTwoBucketPresetManagerBase };
} catch (error) {}
