class AutoTravelAutomation {
  constructor() {
    this.enabled = false;
    this.collapsed = false;
    this.presets = [];
    this.selectedPresetId = null;
    this.nextPresetId = 1;
    this._cooldownMs = 0;
    this._travelInProgress = false;
    this._equilibrationInProgress = false;
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
      randomTypeExclusions: ['jupiter-like'],
      hazards: [],
      autoCompleteTerraforming: true,
      waitForSpecialization: false,
      skipEquilibration: false,
      skipWorldVisualizerInitialization: false,
      blockIfNoStoredFromArtificial: true,
      turnOffAfterTravel: false,
      runScriptAfterTravelEnabled: false,
      runScriptAfterTravelScriptId: null
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

  getPresetById(id) {
    const numericId = Number(id);
    return this.presets.find((preset) => preset.id === numericId) || null;
  }

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return false;
    }
    this.selectedPresetId = preset.id;
    queueAutomationUIRefresh();
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
      randomTypeExclusions: ['jupiter-like'],
      hazards: [],
      autoCompleteTerraforming: true,
      waitForSpecialization: false,
      skipEquilibration: false,
      skipWorldVisualizerInitialization: false,
      blockIfNoStoredFromArtificial: true,
      turnOffAfterTravel: false,
      runScriptAfterTravelEnabled: false,
      runScriptAfterTravelScriptId: null
    };
  }

  _normalizePreset(rawPreset = {}, idOverride = null) {
    const id = Number(idOverride || rawPreset.id || this.nextPresetId);
    return {
      id,
      name: rawPreset.name || `Preset ${id}`,
      target: rawPreset.target || 'random',
      type: this._normalizeTypeId(rawPreset.type),
      orbitPreset: rawPreset.orbitPreset || 'random',
      dominion: rawPreset.dominion || 'random',
      randomTypeExclusions: this._normalizeRandomTypeExclusions(rawPreset.randomTypeExclusions),
      hazards: this._normalizeHazards(rawPreset.hazards),
      autoCompleteTerraforming: rawPreset.autoCompleteTerraforming !== false,
      waitForSpecialization: !!rawPreset.waitForSpecialization,
      skipEquilibration: !!rawPreset.skipEquilibration,
      skipWorldVisualizerInitialization: !!rawPreset.skipWorldVisualizerInitialization,
      blockIfNoStoredFromArtificial: rawPreset.blockIfNoStoredFromArtificial !== false,
      turnOffAfterTravel: !!rawPreset.turnOffAfterTravel,
      runScriptAfterTravelEnabled: !!rawPreset.runScriptAfterTravelEnabled,
      runScriptAfterTravelScriptId: rawPreset.runScriptAfterTravelScriptId ? Number(rawPreset.runScriptAfterTravelScriptId) : null
    };
  }

  getSelectedPresetTravelScriptOverrideId() {
    const preset = this.getSelectedPreset();
    if (!preset || !preset.runScriptAfterTravelEnabled) {
      return null;
    }
    const scriptId = Number(preset.runScriptAfterTravelScriptId);
    if (!Number.isFinite(scriptId) || scriptId <= 0) {
      return null;
    }
    return scriptId;
  }

  _finishTravelAttempt(preset, traveled) {
    if (!traveled) {
      autoTravelContext.active = false;
    } else if (preset.turnOffAfterTravel) {
      this.enabled = false;
    }
    this._travelInProgress = false;
    this._cooldownMs = 1000;
    queueAutomationUIRefresh();
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
    if (automationManager && automationManager.scriptAutomation) {
      automationManager.scriptAutomation.clearDeletedAutomationTargetReference('autoTravel', 'preset', numericId);
    }
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

  _normalizeTypeId(typeId) {
    const normalized = String(typeId || '').trim();
    if (!normalized || normalized === 'random') {
      return 'random';
    }
    if (normalized === 'water-rich') {
      return 'icy-moon';
    }
    return normalized;
  }

  _normalizeRandomTypeExclusions(typeIds) {
    const list = Array.isArray(typeIds) ? typeIds : ['jupiter-like'];
    const seen = new Set();
    const normalized = [];
    for (let index = 0; index < list.length; index += 1) {
      const typeId = this._normalizeTypeId(list[index]);
      if (!typeId || typeId === 'random' || seen.has(typeId)) {
        continue;
      }
      seen.add(typeId);
      normalized.push(typeId);
    }
    return normalized;
  }

  _getRandomTypeCandidates(preset) {
    const exclusions = new Set(this._normalizeRandomTypeExclusions(preset.randomTypeExclusions));
    const typeIds = RWG_WORLD_TYPES ? Object.keys(RWG_WORLD_TYPES) : [];
    const candidates = [];
    for (let index = 0; index < typeIds.length; index += 1) {
      const typeId = typeIds[index];
      if (exclusions.has(typeId) || rwgManager.isTypeLocked(typeId)) {
        continue;
      }
      candidates.push(typeId);
    }
    return candidates;
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

  _hasCompletedSpecialization() {
    const projects = projectManager?.projects;
    if (!projects) {
      return false;
    }
    if (projects.bioworld && projects.bioworld.isCompleted) {
      return true;
    }
    if (projects.manufacturingWorld && projects.manufacturingWorld.isCompleted) {
      return true;
    }
    if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) {
      return true;
    }
    if (projects.foundryWorld && projects.foundryWorld.isCompleted) {
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

  _runAfterLoadingPaint(callback) {
    if (document.hidden) {
      window.setTimeout(callback, 80);
      return;
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(callback, 80);
    });
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
    showAutoTravelLoadingPopup();
    this._runAfterLoadingPaint(() => {
      const traveled = artificialManager && artificialManager.travelToStoredWorld
        ? artificialManager.travelToStoredWorld(seed)
        : false;
      this._finishTravelAttempt(preset, traveled);
    });
    return true;
  }

  _buildRandomWorldResult(preset) {
    const randomSeed = String((Math.random() * 1e9) >>> 0);
    const typeId = this._normalizeTypeId(preset.type);
    const options = {
      target: this._resolveRandomWorldSelection(preset.target, 'auto'),
      orbitPreset: this._resolveRandomWorldSelection(preset.orbitPreset, 'auto'),
      type: this._resolveRandomWorldSelection(typeId, 'auto'),
      hazards: this._normalizeHazards(preset.hazards)
    };
    if (typeId === 'random') {
      options.availableTypes = this._getRandomTypeCandidates(preset);
    }
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
    if (!preset.skipEquilibration) {
      if (this._equilibrationInProgress) {
        return false;
      }
      if (typeof runAutoTravelEquilibrationPopup === 'function') {
        this._equilibrationInProgress = true;
        runAutoTravelEquilibrationPopup(res)
          .then((equilibratedRes) => {
            if (!equilibratedRes) {
              this._travelInProgress = false;
              return;
            }
            autoTravelContext = {
              active: true,
              skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
              suppressTabSwitch: true,
              restoreTabState: this._captureCurrentTabState()
            };
            showAutoTravelLoadingPopup();
            this._runAfterLoadingPaint(() => {
              const travelSeed = String(equilibratedRes.seedString || equilibratedRes.original?.seedString || equilibratedRes.original?.seed || '');
              const traveled = spaceManager && spaceManager.travelToRandomWorld
                ? spaceManager.travelToRandomWorld(equilibratedRes, travelSeed)
                : false;
              this._finishTravelAttempt(preset, traveled);
            });
          })
          .catch((error) => {
            console.error('Auto travel equilibration failed:', error);
            this._travelInProgress = false;
          })
          .finally(() => {
            this._equilibrationInProgress = false;
            this._cooldownMs = 1000;
            queueAutomationUIRefresh();
          });
        return true;
      }
    }
    autoTravelContext = {
      active: true,
      skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
      suppressTabSwitch: true,
      restoreTabState: this._captureCurrentTabState()
    };
    showAutoTravelLoadingPopup();
    this._runAfterLoadingPaint(() => {
      const travelSeed = String(res.seedString || res.original?.seedString || res.original?.seed || '');
      const traveled = spaceManager && spaceManager.travelToRandomWorld
        ? spaceManager.travelToRandomWorld(res, travelSeed)
        : false;
      this._finishTravelAttempt(preset, traveled);
    });
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
    if (preset.waitForSpecialization && !this._hasCompletedSpecialization()) {
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
    if (globalGameIsTraveling || globalGameIsLoadingFromSave || isEquilibrating) {
      return;
    }
    const preset = this.getSelectedPreset();
    if (preset && preset.autoCompleteTerraforming && !this._isCurrentWorldTerraformed()) {
      this._attemptAutoCompleteTerraforming();
    }
    if (!this.enabled) {
      return;
    }
    if (this._equilibrationInProgress) {
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
      if (!didTravel) {
        this._travelInProgress = false;
      }
    } finally {
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
        randomTypeExclusions: this._normalizeRandomTypeExclusions(preset.randomTypeExclusions),
        hazards: this._normalizeHazards(preset.hazards),
        autoCompleteTerraforming: preset.autoCompleteTerraforming !== false,
        waitForSpecialization: !!preset.waitForSpecialization,
        skipEquilibration: !!preset.skipEquilibration,
        skipWorldVisualizerInitialization: !!preset.skipWorldVisualizerInitialization,
        blockIfNoStoredFromArtificial: preset.blockIfNoStoredFromArtificial !== false,
        turnOffAfterTravel: !!preset.turnOffAfterTravel,
        runScriptAfterTravelEnabled: !!preset.runScriptAfterTravelEnabled,
        runScriptAfterTravelScriptId: preset.runScriptAfterTravelScriptId ? Number(preset.runScriptAfterTravelScriptId) : null
      }))
    };
  }

  loadState(data = {}) {
    this.enabled = false;
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
