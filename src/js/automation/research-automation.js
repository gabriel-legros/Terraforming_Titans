class ResearchAutomation {
  constructor() {
    this.presets = [];
    this.selectedPresetId = null;
    this.currentPresetId = null;
    this.currentHiddenResearchIds = [];
    this.nextTravelPresetId = null;
    this.nextTravelPersistent = false;
    this.collapsed = false;
    this.nextPresetId = 1;

    const presetId = this.addPreset('');
    this.applyPresetOnce(presetId);
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  isActive() {
    return automationManager.enabled && automationManager.hasFeature('automationResearch');
  }

  normalizePriority(priority) {
    const parsed = Number.parseInt(priority, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 4) {
      return parsed;
    }
    return 4;
  }

  normalizeEntry(entry) {
    if (entry && entry.constructor === Object) {
      return {
        enabled: !!entry.enabled,
        priority: this.normalizePriority(entry.priority)
      };
    }

    return {
      enabled: !!entry,
      priority: 4
    };
  }

  populateResearchEntries(target) {
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        target[research.id] = this.normalizeEntry(target[research.id]);
      }
    }
  }

  normalizeHiddenResearchIds(hiddenResearchIds) {
    if (!Array.isArray(hiddenResearchIds)) {
      return [];
    }
    const uniqueIds = new Set();
    for (let index = 0; index < hiddenResearchIds.length; index += 1) {
      const researchId = hiddenResearchIds[index];
      if (researchManager.getResearchById(researchId)) {
        uniqueIds.add(researchId);
      }
    }
    return Array.from(uniqueIds);
  }

  normalizePreset(preset, idOverride) {
    const explicitId = Number.isInteger(idOverride)
      ? idOverride
      : Number.isInteger(preset && preset.id)
        ? preset.id
        : this.nextPresetId;
    const id = Math.max(1, explicitId);
    if (id >= this.nextPresetId) {
      this.nextPresetId = id + 1;
    }

    const presetResearches = preset && preset.researches ? preset.researches : preset;
    const normalized = {
      id,
      name: (preset && preset.name) || `Preset ${id}`,
      showInSidebar: !preset || preset.showInSidebar !== false,
      researches: {},
      hiddenResearchIds: this.normalizeHiddenResearchIds(preset && preset.hiddenResearchIds)
    };

    this.populateResearchEntries(normalized.researches);
    if (presetResearches) {
      for (const researchId in presetResearches) {
        normalized.researches[researchId] = this.normalizeEntry(presetResearches[researchId]);
      }
    }

    return normalized;
  }

  ensurePresetsAreComplete() {
    this.presets = this.presets.map((preset) => this.normalizePreset(preset, preset.id));
  }

  getCurrentStateSnapshot() {
    const state = {};
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        state[research.id] = this.normalizeEntry({
          enabled: researchManager.getAutoResearchEnabled(research.id),
          priority: researchManager.getAutoResearchPriority(research.id)
        });
      }
    }
    return state;
  }

  applyCurrentStateSnapshot(state = {}) {
    const normalized = {};
    this.populateResearchEntries(normalized);
    for (const researchId in state) {
      normalized[researchId] = this.normalizeEntry(state[researchId]);
    }
    for (const researchId in normalized) {
      researchManager.setAutoResearchEnabled(researchId, normalized[researchId].enabled);
      researchManager.setAutoResearchPriority(researchId, normalized[researchId].priority);
    }
  }

  syncHiddenResearchState() {
    this.currentHiddenResearchIds = [];
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        if (research.hiddenByUser) {
          this.currentHiddenResearchIds.push(research.id);
        }
      }
    }
    gameSettings.hiddenResearchIds = this.normalizeHiddenResearchIds(this.currentHiddenResearchIds);
  }

  getPresetById(id) {
    return this.presets.find((preset) => preset.id === Number(id)) || null;
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

  getSelectedPresetId() {
    const preset = this.getSelectedPreset();
    return preset ? preset.id : null;
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

  getCurrentPreset() {
    if (!this.currentPresetId) {
      return null;
    }
    const preset = this.getPresetById(this.currentPresetId);
    if (!preset) {
      this.currentPresetId = null;
      return null;
    }
    return preset;
  }

  getCurrentPresetId() {
    const preset = this.getCurrentPreset();
    return preset ? preset.id : null;
  }

  buildPresetFromCurrentState(name, idOverride) {
    const preset = this.normalizePreset({ name }, idOverride);
    const currentState = this.getCurrentStateSnapshot();
    preset.researches = {};
    for (const researchId in currentState) {
      preset.researches[researchId] = this.normalizeEntry(currentState[researchId]);
    }
    this.syncHiddenResearchState();
    preset.hiddenResearchIds = this.currentHiddenResearchIds.slice();
    return preset;
  }

  addPreset(name, presetData) {
    const preset = presetData
      ? this.normalizePreset(presetData)
      : this.buildPresetFromCurrentState(name);
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  updatePreset(id, name) {
    const index = this.presets.findIndex((preset) => preset.id === Number(id));
    if (index < 0) {
      return false;
    }
    this.presets[index] = this.buildPresetFromCurrentState(name, Number(id));
    this.selectedPresetId = Number(id);
    return true;
  }

  movePreset(id, direction) {
    const index = this.presets.findIndex((preset) => preset.id === Number(id));
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
    preset.name = name || `Preset ${preset.id}`;
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

  deletePreset(id) {
    const numericId = Number(id);
    const index = this.presets.findIndex((preset) => preset.id === numericId);
    if (index < 0) {
      return false;
    }

    this.presets.splice(index, 1);

    if (this.nextTravelPresetId === numericId) {
      this.nextTravelPresetId = null;
      this.nextTravelPersistent = false;
    }

    if (this.presets.length === 0) {
      const replacementId = this.addPreset('');
      this.applyPresetOnce(replacementId);
      return true;
    }

    const fallback = this.presets[Math.max(0, index - 1)] || this.presets[0];
    if (this.selectedPresetId === numericId) {
      this.selectedPresetId = fallback.id;
    }
    if (this.currentPresetId === numericId) {
      this.applyPresetState(fallback, false);
    }
    return true;
  }

  exportPreset(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return null;
    }
    const exportedPreset = {
      name: preset.name,
      showInSidebar: preset.showInSidebar !== false,
      hiddenResearchIds: preset.hiddenResearchIds.slice(),
      researches: {}
    };
    for (const researchId in preset.researches) {
      exportedPreset.researches[researchId] = this.normalizeEntry(preset.researches[researchId]);
    }
    return exportedPreset;
  }

  importPreset(presetData = {}) {
    const preset = this.normalizePreset(presetData);
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  applyPresetState(preset, syncSelected) {
    if (!preset) {
      return false;
    }

    this.currentPresetId = preset.id;
    this.applyCurrentStateSnapshot(preset.researches);
    this.currentHiddenResearchIds = this.normalizeHiddenResearchIds(preset.hiddenResearchIds);
    const hiddenSet = new Set(this.currentHiddenResearchIds);
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        research.hiddenByUser = hiddenSet.has(research.id);
      }
    }
    gameSettings.hiddenResearchIds = this.currentHiddenResearchIds.slice();

    if (syncSelected !== false) {
      this.selectedPresetId = preset.id;
    }

    return true;
  }

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    return this.applyPresetState(preset);
  }

  saveCurrentToSelectedPreset() {
    const preset = this.getSelectedPreset();
    if (!preset) {
      return false;
    }
    return this.updatePreset(preset.id, preset.name);
  }

  applyTravelPreset() {
    const preset = this.getPresetById(this.nextTravelPresetId);
    if (!preset) {
      this.nextTravelPresetId = null;
      this.nextTravelPersistent = false;
      return false;
    }
    this.applyPresetState(preset);
    if (!this.nextTravelPersistent) {
      this.nextTravelPresetId = null;
    }
    return true;
  }

  setResearchHiddenInCurrentState(researchId, hidden) {
    const research = researchManager.getResearchById(researchId);
    if (!research) {
      return false;
    }
    research.hiddenByUser = !!hidden;
    this.syncHiddenResearchState();
    return true;
  }

  isAutoResearchEnabled(researchId) {
    return researchManager.getAutoResearchEnabled(researchId);
  }

  setAutoResearchEnabled(researchId, enabled) {
    return researchManager.setAutoResearchEnabled(researchId, enabled);
  }

  getAutoResearchPriority(researchId) {
    return researchManager.getAutoResearchPriority(researchId);
  }

  setAutoResearchPriority(researchId, priority) {
    return researchManager.setAutoResearchPriority(researchId, priority);
  }

  processAutoResearchQueue() {
    const unlocked = researchManager.autoResearchEnabled || researchManager.isBooleanFlagSet('autoResearchEnabled');
    if (!unlocked) {
      return;
    }

    const candidates = [];
    for (const category in researchManager.researches) {
      if (category === 'advanced') {
        continue;
      }

      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        if (research.isResearched && !research.repeatable) {
          continue;
        }

        const entry = this.normalizeEntry({
          enabled: researchManager.getAutoResearchEnabled(research.id),
          priority: researchManager.getAutoResearchPriority(research.id)
        });
        if (!entry.enabled) {
          continue;
        }
        if (!researchManager.isResearchDisplayable(research)) {
          continue;
        }
        if (!researchManager.isResearchAvailable(research.id)) {
          continue;
        }
        if (!canAffordResearch(research)) {
          continue;
        }

        candidates.push({
          research,
          priority: this.normalizePriority(entry.priority),
          cost: researchManager.calculateResearchTotalCost(research)
        });
      }
    }

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.cost - b.cost;
    });

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (canAffordResearch(candidate.research)) {
        researchManager.completeResearch(candidate.research.id);
      }
    }
  }

  update() {
    this.processAutoResearchQueue();
  }

  saveState() {
    const savedCurrentState = this.getCurrentStateSnapshot();
    this.syncHiddenResearchState();

    return {
      presets: this.presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        showInSidebar: preset.showInSidebar !== false,
        hiddenResearchIds: preset.hiddenResearchIds.slice(),
        researches: Object.fromEntries(
          Object.entries(preset.researches).map(([researchId, entry]) => [
            researchId,
            this.normalizeEntry(entry)
          ])
        )
      })),
      selectedPresetId: this.selectedPresetId,
      currentPresetId: this.currentPresetId,
      currentState: savedCurrentState,
      currentHiddenResearchIds: this.currentHiddenResearchIds.slice(),
      nextTravelPresetId: this.nextTravelPresetId,
      nextTravelPersistent: this.nextTravelPersistent,
      collapsed: this.collapsed,
      nextPresetId: this.nextPresetId
    };
  }

  loadCurrentStateData(data = {}) {
    this.presets = Array.isArray(data.presets)
      ? data.presets.map((preset) => this.normalizePreset(preset, preset.id))
      : [];
    if (this.presets.length === 0) {
      const savedCurrentState = data.currentState || {};
      this.applyCurrentStateSnapshot(savedCurrentState);
      this.currentHiddenResearchIds = this.normalizeHiddenResearchIds(data.currentHiddenResearchIds);
      const hiddenSet = new Set(this.currentHiddenResearchIds);
      for (const category in researchManager.researches) {
        const researches = researchManager.researches[category];
        for (let index = 0; index < researches.length; index += 1) {
          const research = researches[index];
          research.hiddenByUser = hiddenSet.has(research.id);
        }
      }
      gameSettings.hiddenResearchIds = this.currentHiddenResearchIds.slice();
      const presetId = this.addPreset('');
      this.applyPresetOnce(presetId);
      return;
    }

    this.ensurePresetsAreComplete();
    this.collapsed = !!data.collapsed;
    this.nextTravelPresetId = data.nextTravelPresetId ? Number(data.nextTravelPresetId) : null;
    if (!this.getPresetById(this.nextTravelPresetId)) {
      this.nextTravelPresetId = null;
    }
    this.nextTravelPersistent = data.nextTravelPersistent === true && !!this.nextTravelPresetId;
    this.selectedPresetId = data.selectedPresetId ? Number(data.selectedPresetId) : this.presets[0].id;
    if (!this.getPresetById(this.selectedPresetId)) {
      this.selectedPresetId = this.presets[0].id;
    }
    this.currentPresetId = data.currentPresetId ? Number(data.currentPresetId) : this.selectedPresetId;
    if (!this.getPresetById(this.currentPresetId)) {
      this.currentPresetId = this.presets[0].id;
    }
    this.nextPresetId = Math.max(this.nextPresetId, data.nextPresetId || 0, this.presets.length + 1);

    const savedCurrentState = data.currentState || {};
    this.currentHiddenResearchIds = this.normalizeHiddenResearchIds(data.currentHiddenResearchIds);

    if (Object.keys(savedCurrentState).length === 0 && this.currentHiddenResearchIds.length === 0) {
      this.applyPresetState(this.getCurrentPreset(), false);
      return;
    }

    this.applyCurrentStateSnapshot(savedCurrentState);
    const hiddenSet = new Set(this.currentHiddenResearchIds);
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        research.hiddenByUser = hiddenSet.has(research.id);
      }
    }
    gameSettings.hiddenResearchIds = this.currentHiddenResearchIds.slice();
  }

  loadLegacyState(legacyData = {}) {
    this.presets = Array.isArray(legacyData.autoResearchPresets)
      ? legacyData.autoResearchPresets.map((preset) => this.normalizePreset(preset, preset.id))
      : [];
    if (this.presets.length === 0) {
      const savedCurrentState = legacyData.currentAutoResearchState || {};
      this.applyCurrentStateSnapshot(savedCurrentState);
      this.currentHiddenResearchIds = this.normalizeHiddenResearchIds(legacyData.currentAutoResearchHiddenIds);
      const hiddenSet = new Set(this.currentHiddenResearchIds);
      for (const category in researchManager.researches) {
        const researches = researchManager.researches[category];
        for (let index = 0; index < researches.length; index += 1) {
          const research = researches[index];
          research.hiddenByUser = hiddenSet.has(research.id);
        }
      }
      gameSettings.hiddenResearchIds = this.currentHiddenResearchIds.slice();
      const presetId = this.addPreset('');
      this.applyPresetOnce(presetId);
      return;
    }

    this.ensurePresetsAreComplete();
    this.collapsed = !!legacyData.autoResearchAutomationCollapsed;
    this.selectedPresetId = legacyData.currentAutoResearchPreset
      ? Number(legacyData.currentAutoResearchPreset)
      : this.presets[0].id;
    if (!this.getPresetById(this.selectedPresetId)) {
      this.selectedPresetId = this.presets[0].id;
    }
    this.currentPresetId = this.selectedPresetId;
    this.nextTravelPresetId = legacyData.nextTravelAutoResearchPresetId
      ? Number(legacyData.nextTravelAutoResearchPresetId)
      : null;
    if (!this.getPresetById(this.nextTravelPresetId)) {
      this.nextTravelPresetId = null;
    }
    this.nextTravelPersistent = legacyData.nextTravelAutoResearchPresetPersistent === true && !!this.nextTravelPresetId;

    const savedCurrentState = legacyData.currentAutoResearchState || {};
    this.currentHiddenResearchIds = this.normalizeHiddenResearchIds(legacyData.currentAutoResearchHiddenIds);
    this.nextPresetId = Math.max(this.nextPresetId, legacyData.nextAutoResearchPresetId || 0, this.presets.length + 1);

    if (Object.keys(savedCurrentState).length === 0 && this.currentHiddenResearchIds.length === 0) {
      this.applyPresetState(this.getCurrentPreset(), false);
      return;
    }

    this.applyCurrentStateSnapshot(savedCurrentState);
    const hiddenSet = new Set(this.currentHiddenResearchIds);
    for (const category in researchManager.researches) {
      const researches = researchManager.researches[category];
      for (let index = 0; index < researches.length; index += 1) {
        const research = researches[index];
        research.hiddenByUser = hiddenSet.has(research.id);
      }
    }
    gameSettings.hiddenResearchIds = this.currentHiddenResearchIds.slice();
  }

  loadState(data = {}, legacyResearchState = null) {
    this.presets = [];
    this.selectedPresetId = null;
    this.currentPresetId = null;
    this.currentHiddenResearchIds = [];
    this.nextTravelPresetId = null;
    this.nextTravelPersistent = false;
    this.collapsed = false;
    this.nextPresetId = 1;

    const hasCurrentData = data && Array.isArray(data.presets);
    const hasLegacyData = legacyResearchState && (
      Array.isArray(legacyResearchState.autoResearchPresets)
      || !!legacyResearchState.currentAutoResearchState
      || !!legacyResearchState.currentAutoResearchPreset
      || !!legacyResearchState.nextTravelAutoResearchPresetId
      || !!legacyResearchState.autoResearchAutomationCollapsed
    );

    if (hasCurrentData) {
      this.loadCurrentStateData(data);
      return;
    }
    if (hasLegacyData) {
      this.loadLegacyState(legacyResearchState);
      return;
    }

    const presetId = this.addPreset('');
    this.applyPresetOnce(presetId);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResearchAutomation };
}
