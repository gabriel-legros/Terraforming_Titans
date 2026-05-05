class AutoTravelAutomation {
  constructor() {
    this.enabled = false;
    this.collapsed = false;
    this.presets = [];
    this.selectedPresetId = null;
    this.nextPresetId = 1;
    this._cooldownMs = 0;
    this._travelInProgress = false;
    this.ensureDefaultPreset();
  }

  ensureDefaultPreset() {
    if (this.presets.length > 0) {
      if (!this.selectedPresetId) {
        this.selectedPresetId = this.presets[0].id;
      }
      return;
    }
    const id = this.nextPresetId;
    this.nextPresetId += 1;
    this.presets.push({
      id,
      name: `Preset ${id}`,
      target: 'random',
      type: 'random',
      orbitPreset: 'random',
      dominion: 'random',
      hazards: [],
      autoCompleteTerraforming: true,
      waitForSpecialization: false,
      skipEquilibration: false,
      skipWorldVisualizerInitialization: false,
      blockIfNoStoredFromArtificial: true
    });
    this.selectedPresetId = id;
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  getSelectedPreset() {
    this.ensureDefaultPreset();
    const id = Number(this.selectedPresetId);
    return this.presets.find((preset) => preset.id === id) || this.presets[0] || null;
  }

  setSelectedPresetId(id) {
    const numericId = Number(id);
    const preset = this.presets.find((entry) => entry.id === numericId);
    if (!preset) {
      return false;
    }
    this.selectedPresetId = numericId;
    return true;
  }

  _buildDefaultPreset(id, name = '') {
    return {
      id,
      name: name || `Preset ${id}`,
      target: 'random',
      type: 'random',
      orbitPreset: 'random',
      dominion: 'random',
      hazards: [],
      autoCompleteTerraforming: true,
      waitForSpecialization: false,
      skipEquilibration: false,
      skipWorldVisualizerInitialization: false,
      blockIfNoStoredFromArtificial: true
    };
  }

  _normalizePreset(rawPreset = {}, idOverride = null) {
    const id = Number(idOverride || rawPreset.id || this.nextPresetId);
    return {
      id,
      name: rawPreset.name || `Preset ${id}`,
      target: rawPreset.target || 'random',
      type: rawPreset.type || 'random',
      orbitPreset: rawPreset.orbitPreset || 'random',
      dominion: rawPreset.dominion || 'random',
      hazards: this._normalizeHazards(rawPreset.hazards),
      autoCompleteTerraforming: rawPreset.autoCompleteTerraforming !== false,
      waitForSpecialization: !!rawPreset.waitForSpecialization,
      skipEquilibration: !!rawPreset.skipEquilibration,
      skipWorldVisualizerInitialization: !!rawPreset.skipWorldVisualizerInitialization,
      blockIfNoStoredFromArtificial: rawPreset.blockIfNoStoredFromArtificial !== false
    };
  }

  addPreset(name = '') {
    const id = this.nextPresetId;
    this.nextPresetId += 1;
    const preset = this._buildDefaultPreset(id, name);
    this.presets.push(preset);
    this.selectedPresetId = id;
    return preset;
  }

  deletePreset(id) {
    if (this.presets.length <= 1) {
      return false;
    }
    const numericId = Number(id);
    const index = this.presets.findIndex((preset) => preset.id === numericId);
    if (index < 0) {
      return false;
    }
    this.presets.splice(index, 1);
    if (!this.presets.find((preset) => preset.id === Number(this.selectedPresetId))) {
      this.selectedPresetId = this.presets[Math.max(0, index - 1)].id;
    }
    return true;
  }

  exportPreset(id) {
    const numericId = Number(id);
    const preset = this.presets.find((entry) => entry.id === numericId);
    if (!preset) {
      return null;
    }
    return this._normalizePreset(preset, preset.id);
  }

  importPreset(presetData = {}) {
    const id = this.nextPresetId;
    this.nextPresetId += 1;
    const preset = this._normalizePreset(presetData, id);
    this.presets.push(preset);
    this.selectedPresetId = id;
    return id;
  }

  renameSelectedPreset(name) {
    const preset = this.getSelectedPreset();
    if (!preset) {
      return;
    }
    preset.name = String(name || '').trim();
  }

  _resolveRandomWorldSelection(value, fallback) {
    return value === 'random' ? fallback : value;
  }

  _normalizeHazards(hazards) {
    const list = Array.isArray(hazards) ? hazards : [];
    const seen = new Set();
    const normalized = [];
    for (let index = 0; index < list.length; index += 1) {
      const hazardId = String(list[index] || '').trim();
      if (!hazardId || seen.has(hazardId)) {
        continue;
      }
      seen.add(hazardId);
      normalized.push(hazardId);
    }
    return normalized;
  }

  _getSkipEquilibrationUnlocked() {
    return Number(fastestTerraformRealSeconds) > 0 && Number(fastestTerraformRealSeconds) < 60;
  }

  _isCurrentWorldTerraformed() {
    if (!spaceManager || typeof spaceManager.isCurrentWorldTerraformed !== 'function') {
      return false;
    }
    return !!spaceManager.isCurrentWorldTerraformed();
  }

  _attemptAutoCompleteTerraforming() {
    return completeTerraformingNow();
  }

  _hasSomeSpecialization() {
    const projects = projectManager?.projects;
    if (!projects) {
      return false;
    }
    if (projects.bioworld && (projects.bioworld.isCompleted || projects.bioworld.isActive)) {
      return true;
    }
    if (projects.manufacturingWorld && (projects.manufacturingWorld.isCompleted || projects.manufacturingWorld.isActive)) {
      return true;
    }
    if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
      return true;
    }
    if (projects.foundryWorld && (projects.foundryWorld.isCompleted || projects.foundryWorld.isActive)) {
      return true;
    }
    return false;
  }

  _getOldestStoredArtificialSeed() {
    const statuses = spaceManager?.artificialWorldStatuses;
    if (!statuses) {
      return null;
    }
    let chosenSeed = null;
    let chosenArrivedAt = Infinity;
    for (const seed in statuses) {
      const status = statuses[seed];
      if (!status || !status.stored) {
        continue;
      }
      const arrivedAt = Number(status.arrivedAt) || 0;
      if (!chosenSeed || arrivedAt < chosenArrivedAt) {
        chosenSeed = seed;
        chosenArrivedAt = arrivedAt;
      }
    }
    return chosenSeed;
  }

  _isCurrentWorldArtificial() {
    return spaceManager && spaceManager.currentArtificialKey !== null;
  }

  _captureCurrentTabState() {
    const activeMainTab = document.querySelector('.tab.active');
    const mainTabId = activeMainTab?.dataset?.tab || '';
    const getActiveSubtabId = (selector) => {
      const node = document.querySelector(`${selector}.active`);
      return node?.dataset?.subtab || '';
    };
    const getActiveContentId = (selector) => {
      const node = document.querySelector(`${selector}.active`);
      return node?.id || '';
    };
    return {
      mainTabId,
      hopeSubtabId: getActiveSubtabId('.hope-subtab'),
      spaceSubtabId: getActiveSubtabId('.space-subtab'),
      terraformingSubtabId: getActiveSubtabId('.terraforming-subtab'),
      colonySubtabId: getActiveSubtabId('.colony-subtab'),
      settingsSubtabId: getActiveSubtabId('.settings-subtab') || getActiveContentId('.settings-subtab-content')
    };
  }

  _applyDominionSelection(res, dominionSetting) {
    const special = { ...(res.override?.specialAttributes || {}) };
    const dominions = rwgManager.getAvailableDominions();
    const selection = dominionSetting === 'random'
      ? dominions[Math.floor(Math.random() * dominions.length)]
      : dominionSetting;
    special.terraformingRequirementId = selection;
    const override = res.override || {};
    override.specialAttributes = special;
    res.override = override;
    res.merged.specialAttributes = {
      ...(res.merged.specialAttributes || {}),
      ...special
    };
    res.dominionId = selection;
  }

  _travelToStoredArtificialWorld(preset) {
    if (preset.target !== 'storedArtificial') {
      return false;
    }
    const seed = this._getOldestStoredArtificialSeed();
    if (!seed) {
      return false;
    }
    autoTravelContext = {
      active: true,
      skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
      suppressTabSwitch: true,
      restoreTabState: this._captureCurrentTabState()
    };
    const traveled = artificialManager && artificialManager.travelToStoredWorld
      ? artificialManager.travelToStoredWorld(seed)
      : false;
    if (!traveled) {
      autoTravelContext.active = false;
      return false;
    }
    return true;
  }

  _buildRandomWorldResult(preset) {
    const randomSeed = String((Math.random() * 1e9) >>> 0);
    const options = {
      target: this._resolveRandomWorldSelection(preset.target, 'auto'),
      orbitPreset: this._resolveRandomWorldSelection(preset.orbitPreset, 'auto'),
      type: this._resolveRandomWorldSelection(preset.type, 'auto'),
      hazards: this._normalizeHazards(preset.hazards)
    };
    const res = generateRandomPlanet(randomSeed, options);
    if (!res || !res.merged) {
      return null;
    }
    this._applyDominionSelection(res, preset.dominion);
    return res;
  }

  _travelToRandomWorldPreset(preset) {
    const canSkipEquilibration = this._getSkipEquilibrationUnlocked();
    if (preset.skipEquilibration && !canSkipEquilibration) {
      return false;
    }
    const res = this._buildRandomWorldResult(preset);
    if (!res) {
      return false;
    }
    if (preset.skipEquilibration && canSkipEquilibration) {
      const override = res.override || (res.override = {});
      const special = override.specialAttributes || (override.specialAttributes = {});
      const hazards = this._normalizeHazards(res.hazards || res.override?.rwgMeta?.selectedHazards || []);
      if (hazards.includes('hazardousBiomass')) {
        special.deferHazardousBiomassTravelTuning = true;
      }
      if (hazards.includes('hazardousMachinery')) {
        special.deferHazardousMachineryTravelTuning = true;
      }
      res.merged = deepMerge(defaultPlanetParameters, override);
    }
    autoTravelContext = {
      active: true,
      skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
      suppressTabSwitch: true,
      restoreTabState: this._captureCurrentTabState()
    };
    const travelSeed = String(res.seedString || res.original?.seedString || res.original?.seed || '');
    const traveled = spaceManager && spaceManager.travelToRandomWorld
      ? spaceManager.travelToRandomWorld(res, travelSeed)
      : false;
    if (!traveled) {
      autoTravelContext.active = false;
      return false;
    }
    return true;
  }

  tryAutoTravel() {
    const preset = this.getSelectedPreset();
    if (!preset) {
      return false;
    }
    if (preset.autoCompleteTerraforming && !this._isCurrentWorldTerraformed()) {
      this._attemptAutoCompleteTerraforming();
    }
    if (!this._isCurrentWorldTerraformed()) {
      return false;
    }
    if (preset.waitForSpecialization && !this._hasSomeSpecialization()) {
      return false;
    }
    if (preset.target === 'storedArtificial') {
      return this._travelToStoredArtificialWorld(preset);
    }
    if (preset.blockIfNoStoredFromArtificial && this._isCurrentWorldArtificial() && !this._getOldestStoredArtificialSeed()) {
      return false;
    }
    return this._travelToRandomWorldPreset(preset);
  }

  update(delta) {
    if (!automationManager?.enabled || !automationManager.hasFeature('automationAutoTravel')) {
      return;
    }
    if (!this.enabled) {
      return;
    }
    if (globalGameIsTraveling || globalGameIsLoadingFromSave || isEquilibrating) {
      return;
    }
    if (this._travelInProgress) {
      return;
    }
    this._cooldownMs = Math.max(0, this._cooldownMs - (delta || 0));
    if (this._cooldownMs > 0) {
      return;
    }
    this._travelInProgress = true;
    try {
      const didTravel = this.tryAutoTravel();
      this._cooldownMs = didTravel ? 1000 : 500;
    } finally {
      this._travelInProgress = false;
      queueAutomationUIRefresh();
    }
  }

  saveState() {
    return {
      enabled: !!this.enabled,
      collapsed: !!this.collapsed,
      selectedPresetId: this.selectedPresetId,
      nextPresetId: this.nextPresetId,
      presets: this.presets.map((preset) => ({
        id: preset.id,
        name: preset.name || '',
        target: preset.target || 'random',
        type: preset.type || 'random',
        orbitPreset: preset.orbitPreset || 'random',
        dominion: preset.dominion || 'random',
        hazards: this._normalizeHazards(preset.hazards),
        autoCompleteTerraforming: preset.autoCompleteTerraforming !== false,
        waitForSpecialization: !!preset.waitForSpecialization,
        skipEquilibration: !!preset.skipEquilibration,
        skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
        blockIfNoStoredFromArtificial: preset.blockIfNoStoredFromArtificial !== false
      }))
    };
  }

  loadState(data = {}) {
    this.enabled = !!data.enabled;
    this.collapsed = !!data.collapsed;
    this.nextPresetId = Math.max(1, Number(data.nextPresetId) || 1);
    this.presets = Array.isArray(data.presets)
      ? data.presets.map((preset) => this._normalizePreset(preset, Number(preset.id)))
      : [];
    this.presets = this.presets.filter((preset) => Number.isFinite(preset.id) && preset.id > 0);
    if (this.presets.length > 0) {
      const maxId = this.presets.reduce((max, preset) => Math.max(max, preset.id), 0);
      this.nextPresetId = Math.max(this.nextPresetId, maxId + 1);
    }
    this.selectedPresetId = Number(data.selectedPresetId) || null;
    this.ensureDefaultPreset();
    if (!this.presets.find((preset) => preset.id === Number(this.selectedPresetId))) {
      this.selectedPresetId = this.presets[0].id;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutoTravelAutomation };
}
