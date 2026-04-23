const COLONY_AUTOMATION_CATEGORY_ORDER = [
  'colonyBuildings',
  'colonySliders',
  'constructionOffice',
  'nanocolony',
  'orbitals'
];

const COLONY_AUTOMATION_CATEGORY_LABELS = {
  colonyBuildings: 'Colony Buildings',
  colonySliders: 'Colony Sliders',
  constructionOffice: 'Construction Office',
  nanocolony: 'Nanocolony',
  orbitals: 'Orbitals'
};

const COLONY_AUTOMATION_SLIDER_TARGETS = {
  workforceRatio: {
    label: 'Workforce Allocation',
    isAvailable: () => true,
    capture: () => colonySliderSettings.workerRatio,
    apply: (value) => colonySliderSettings.setWorkforceRatio(value)
  },
  foodConsumption: {
    label: 'Food Consumption',
    isAvailable: () => true,
    capture: () => colonySliderSettings.foodConsumption,
    apply: (value) => colonySliderSettings.setFoodConsumptionMultiplier(value)
  },
  luxuryWater: {
    label: 'Luxury Water Use',
    isAvailable: () => true,
    capture: () => colonySliderSettings.luxuryWater,
    apply: (value) => colonySliderSettings.setLuxuryWaterMultiplier(value)
  },
  oreMineWorkers: {
    label: 'Ore Mine Workers',
    isAvailable: () => true,
    capture: () => colonySliderSettings.oreMineWorkers,
    apply: (value) => colonySliderSettings.setOreMineWorkerAssist(value)
  },
  mechanicalAssistance: {
    label: 'Mechanical Assistance',
    isAvailable: () => colonySliderSettings.isBooleanFlagSet('mechanicalAssistance') && terraforming.celestialParameters.gravity > 10,
    capture: () => colonySliderSettings.mechanicalAssistance,
    apply: (value) => colonySliderSettings.setMechanicalAssistance(value)
  },
  warpnetLevel: {
    label: 'Warpnet',
    isAvailable: () => colonySliderSettings.isBooleanFlagSet('warpnet'),
    capture: () => colonySliderSettings.warpnetLevel,
    apply: (value) => colonySliderSettings.setWarpnetLevel(value)
  }
};

class ColonyAutomation {
  constructor() {
    this.presets = [];
    this.assignments = [];
    this.combinations = [];
    this.selectedPresetId = null;
    this.selectedCombinationId = null;
    this.collapsed = false;
    this.masterEnabled = true;
    this.nextTravelCombinationId = null;
    this.nextTravelCombinationPersistent = false;
    this.nextPresetId = 1;
    this.nextAssignmentId = 1;
    this.nextCombinationId = 1;
  }

  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
  }

  setMasterEnabled(enabled) {
    this.masterEnabled = !!enabled;
  }

  isActive() {
    return automationManager.enabled && automationManager.hasFeature('automationColony');
  }

  getPresetById(id) {
    return this.presets.find(preset => preset.id === id) || null;
  }

  getSelectedPresetId() {
    const preset = this.getSelectedPreset();
    return preset ? preset.id : null;
  }

  getSelectedPreset() {
    if (!this.selectedPresetId) {
      return null;
    }
    const preset = this.getPresetById(Number(this.selectedPresetId));
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
    const preset = this.getPresetById(Number(id));
    this.selectedPresetId = preset ? preset.id : null;
    return preset;
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

  getSelectedCombinationId() {
    const combo = this.getSelectedCombination();
    return combo ? combo.id : null;
  }

  getSelectedCombination() {
    if (!this.selectedCombinationId) {
      return null;
    }
    const combo = this.getCombinationById(Number(this.selectedCombinationId));
    if (!combo) {
      this.selectedCombinationId = null;
      return null;
    }
    return combo;
  }

  setSelectedCombinationId(id) {
    if (id === null || id === undefined || id === '') {
      this.selectedCombinationId = null;
      return null;
    }
    const combo = this.getCombinationById(Number(id));
    this.selectedCombinationId = combo ? combo.id : null;
    return combo;
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
    const [item] = this.assignments.splice(index, 1);
    this.assignments.splice(nextIndex, 0, item);
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
    this.selectedCombinationId = combo.id;
    return combo.id;
  }

  updateCombination(id, name, assignments) {
    const index = this.combinations.findIndex(combo => combo.id === id);
    if (index < 0) {
      return false;
    }
    const combo = {
      id,
      name: name || `Combination ${id}`,
      assignments: (assignments || []).map(entry => ({
        presetId: entry.presetId,
        enabled: entry.enabled !== false
      }))
    };
    this.combinations.splice(index, 1, combo);
    return true;
  }

  deleteCombination(id) {
    this.combinations = this.combinations.filter(combo => combo.id !== id);
    if (this.selectedCombinationId === id) {
      this.selectedCombinationId = null;
    }
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
    this.selectedCombinationId = combo.id;
    this.setAssignments(combo.assignments);
  }

  addPreset(name, targetIds, options = {}) {
    const preset = this.buildPreset(name, targetIds, options);
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
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

  updatePreset(id, name, targetIds, options = {}) {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index < 0) {
      return false;
    }
    const preset = this.buildPreset(name, targetIds, options, id);
    this.presets.splice(index, 1, preset);
    return true;
  }

  deletePreset(id) {
    this.presets = this.presets.filter(preset => preset.id !== id);
    this.assignments = this.assignments.filter(item => item.presetId !== id);
    if (this.selectedPresetId === id) {
      this.selectedPresetId = null;
    }
  }

  renamePreset(id, name) {
    const preset = this.getPresetById(id);
    if (!preset) {
      return;
    }
    preset.name = name;
  }

  exportPreset(presetId) {
    const preset = this.getPresetById(Number(presetId));
    if (!preset) {
      return null;
    }
    return {
      name: preset.name,
      includeControl: preset.includeControl !== false,
      includeAutomation: preset.includeAutomation !== false,
      scopeAll: preset.scopeAll === true,
      targets: Object.fromEntries(
        Object.entries(preset.targets || {}).map(([targetId, entry]) => [
          targetId,
          {
            categoryId: entry.categoryId,
            control: entry.control ? this.deepClone(entry.control) : null,
            automation: entry.automation ? this.deepClone(entry.automation) : null
          }
        ])
      )
    };
  }

  importPreset(presetData = {}) {
    const id = this.nextPresetId++;
    const importedPreset = {
      id,
      name: presetData.name || `Preset ${id}`,
      includeControl: presetData.includeControl !== false,
      includeAutomation: presetData.includeAutomation !== false,
      scopeAll: presetData.scopeAll === true,
      targets: {}
    };
    const importedTargets = presetData.targets || {};
    for (const targetId in importedTargets) {
      const entry = importedTargets[targetId] || {};
      const control = entry.control ? this.deepClone(entry.control) : null;
      const automation = entry.automation ? this.deepClone(entry.automation) : null;
      if (!control && !automation) {
        continue;
      }
      importedPreset.targets[targetId] = {
        categoryId: entry.categoryId || this.getTargetCategoryId(targetId),
        control,
        automation
      };
    }
    this.presets.push(importedPreset);
    this.selectedPresetId = importedPreset.id;
    return importedPreset.id;
  }

  buildPreset(name, targetIds, options = {}, idOverride) {
    const includeControl = options.includeControl !== false;
    const includeAutomation = options.includeAutomation !== false;
    const scopeAll = options.scopeAll === true;
    const id = idOverride || this.nextPresetId++;
    const preset = {
      id,
      name: name || `Preset ${id}`,
      includeControl,
      includeAutomation,
      scopeAll,
      targets: {}
    };
    const ids = Array.isArray(targetIds) ? targetIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      const targetId = ids[index];
      const entry = this.captureTargetSettings(targetId, includeControl, includeAutomation);
      if (entry.control || entry.automation) {
        preset.targets[targetId] = entry;
      }
    }
    return preset;
  }

  captureTargetSettings(targetId, includeControl, includeAutomation) {
    const entry = {
      categoryId: this.getTargetCategoryId(targetId),
      control: null,
      automation: null
    };
    if (includeControl) {
      entry.control = this.captureControlSettings(targetId);
    }
    if (includeAutomation && this.targetSupportsAutomation(targetId)) {
      entry.automation = this.captureAutomationSettings(targetId);
    }
    return entry;
  }

  captureControlSettings(targetId) {
    if (this.isColonyTarget(targetId)) {
      return this.captureColonyControlSettings(this.getColonyTarget(targetId));
    }
    if (this.isSliderTarget(targetId)) {
      return { value: this.getSliderTargetConfig(targetId).capture() };
    }
    if (targetId === 'constructionOffice') {
      return captureConstructionOfficeSettings();
    }
    if (targetId === 'nanocolony') {
      return this.captureNanocolonyControlSettings();
    }
    if (targetId === 'orbitals') {
      return this.captureOrbitalsControlSettings();
    }
    return null;
  }

  captureAutomationSettings(targetId) {
    if (!this.isColonyTarget(targetId)) {
      return null;
    }
    return this.captureColonyAutomationSettings(this.getColonyTarget(targetId));
  }

  captureColonyControlSettings(colony) {
    if (!colony) {
      return null;
    }
    const control = {
      workerPriority: colony.workerPriority,
      hidden: colony.isHidden === true,
      luxuryResourcesEnabled: this.deepClone(colony.luxuryResourcesEnabled),
      autoUpgradeEnabled: colony.autoUpgradeEnabled === true
    };
    if (colony.name === 'aerostat_colony') {
      control.landAsResearchOutpost = colony.landAsResearchOutpost === true;
      control.androidCapacityShare = colony.getAndroidCapacityShare();
    }
    return control;
  }

  captureColonyAutomationSettings(colony) {
    if (!colony) {
      return null;
    }
    return {
      autoBuildEnabled: colony.autoBuildEnabled,
      autoBuildPriority: colony.autoBuildPriority,
      autoBuildBasis: colony.autoBuildBasis,
      autoBuildPercent: colony.autoBuildPercent,
      autoBuildFixed: colony.autoBuildFixed,
      autoBuildFillPercent: colony.autoBuildFillPercent,
      autoBuildFillResourcePrimary: colony.autoBuildFillResourcePrimary,
      autoBuildFillResourceSecondary: colony.autoBuildFillResourceSecondary,
      autoActiveEnabled: colony.autoActiveEnabled
    };
  }

  captureNanocolonyControlSettings() {
    return {
      maintenanceSlider: nanotechManager.maintenanceSlider,
      glassSlider: nanotechManager.glassSlider,
      maintenance2Slider: nanotechManager.maintenance2Slider,
      componentsSlider: nanotechManager.componentsSlider,
      maintenance3Slider: nanotechManager.maintenance3Slider,
      electronicsSlider: nanotechManager.electronicsSlider,
      maintenance4Slider: nanotechManager.maintenance4Slider,
      grapheneSlider: nanotechManager.grapheneSlider,
      maxEnergyPercent: nanotechManager.maxEnergyPercent,
      maxEnergyAbsolute: nanotechManager.maxEnergyAbsolute,
      energyLimitMode: nanotechManager.energyLimitMode,
      maxSiliconPercent: nanotechManager.maxSiliconPercent,
      maxSiliconAbsolute: nanotechManager.maxSiliconAbsolute,
      siliconLimitMode: nanotechManager.siliconLimitMode,
      maxMetalPercent: nanotechManager.maxMetalPercent,
      maxMetalAbsolute: nanotechManager.maxMetalAbsolute,
      metalLimitMode: nanotechManager.metalLimitMode,
      maxBiomassPercent: nanotechManager.maxBiomassPercent,
      maxBiomassAbsolute: nanotechManager.maxBiomassAbsolute,
      biomassLimitMode: nanotechManager.biomassLimitMode,
      maxGraphitePercent: nanotechManager.maxGraphitePercent,
      maxGraphiteAbsolute: nanotechManager.maxGraphiteAbsolute,
      graphiteLimitMode: nanotechManager.graphiteLimitMode,
      onlyScrap: nanotechManager.onlyScrap,
      onlyTrash: nanotechManager.onlyTrash,
      onlyJunk: nanotechManager.onlyJunk,
      uncappedScrap: nanotechManager.uncappedScrap,
      uncappedTrash: nanotechManager.uncappedTrash,
      uncappedJunk: nanotechManager.uncappedJunk
    };
  }

  captureOrbitalsControlSettings() {
    return {
      assignmentMode: followersManager.assignmentMode,
      assignmentStep: followersManager.assignmentStep,
      autoAssignId: followersManager.autoAssignId,
      manualAssignments: this.deepClone(followersManager.manualAssignments),
      weights: this.deepClone(followersManager.weights)
    };
  }

  resolveAssignments() {
    const resolved = {
      control: {},
      automation: {}
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
      const entries = preset.targets;
      for (const targetId in entries) {
        const entry = entries[targetId];
        if (preset.includeControl && entry.control) {
          resolved.control[targetId] = entry.control;
        }
        if (preset.includeAutomation && entry.automation) {
          resolved.automation[targetId] = entry.automation;
        }
      }
    }
    return resolved;
  }

  applyPresets() {
    const resolved = this.resolveAssignments();
    this.applyResolvedMaps(resolved.control, resolved.automation);
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
    const controlMap = {};
    const automationMap = {};
    const entries = preset.targets;
    for (const targetId in entries) {
      const entry = entries[targetId];
      if (preset.includeControl && entry.control) {
        controlMap[targetId] = entry.control;
      }
      if (preset.includeAutomation && entry.automation) {
        automationMap[targetId] = entry.automation;
      }
    }
    this.applyResolvedMaps(controlMap, automationMap);
  }

  applyResolvedMaps(controlMap, automationMap) {
    let coloniesChanged = false;
    let slidersChanged = false;
    let constructionChanged = false;
    let nanocolonyChanged = false;
    let orbitalsChanged = false;

    for (const targetId in controlMap) {
      if (this.applyControlSettings(targetId, controlMap[targetId])) {
        if (this.isColonyTarget(targetId)) {
          coloniesChanged = true;
        } else if (this.isSliderTarget(targetId)) {
          slidersChanged = true;
        } else if (targetId === 'constructionOffice') {
          constructionChanged = true;
        } else if (targetId === 'nanocolony') {
          nanocolonyChanged = true;
        } else if (targetId === 'orbitals') {
          orbitalsChanged = true;
        }
      }
    }

    for (const targetId in automationMap) {
      if (this.applyAutomationSettings(targetId, automationMap[targetId])) {
        if (this.isColonyTarget(targetId)) {
          coloniesChanged = true;
        }
      }
    }

    if (coloniesChanged) {
      updateColonyDisplay(colonies);
    }
    if (slidersChanged) {
      updateColonySlidersUI();
    }
    if (constructionChanged) {
      updateConstructionOfficeUI();
    }
    if (nanocolonyChanged) {
      nanotechManager.reapplyEffects();
      nanotechManager.updateUI();
    }
    if (orbitalsChanged) {
      followersManager.updateUI();
    }
  }

  applyControlSettings(targetId, control) {
    if (this.isColonyTarget(targetId)) {
      return this.applyColonyControlSettings(this.getColonyTarget(targetId), control);
    }
    if (this.isSliderTarget(targetId)) {
      const current = this.captureControlSettings(targetId);
      if (this.areSettingsEqual(current, control)) {
        return false;
      }
      this.getSliderTargetConfig(targetId).apply(control.value);
      return true;
    }
    if (targetId === 'constructionOffice') {
      const current = captureConstructionOfficeSettings();
      if (this.areSettingsEqual(current, control)) {
        return false;
      }
      restoreConstructionOfficeSettings(control);
      return true;
    }
    if (targetId === 'nanocolony') {
      const current = this.captureNanocolonyControlSettings();
      if (this.areSettingsEqual(current, control)) {
        return false;
      }
      this.applyNanocolonyControlSettings(control);
      return true;
    }
    if (targetId === 'orbitals') {
      const current = this.captureOrbitalsControlSettings();
      if (this.areSettingsEqual(current, control)) {
        return false;
      }
      this.applyOrbitalsControlSettings(control);
      return true;
    }
    return false;
  }

  applyAutomationSettings(targetId, automation) {
    if (!this.isColonyTarget(targetId)) {
      return false;
    }
    return this.applyColonyAutomationSettings(this.getColonyTarget(targetId), automation);
  }

  applyColonyControlSettings(colony, control) {
    if (!colony) {
      return false;
    }
    let changed = false;
    if ('workerPriority' in control && colony.workerPriority !== control.workerPriority) {
      colony.workerPriority = control.workerPriority;
      changed = true;
    }
    if ('hidden' in control) {
      const shouldHide = control.hidden === true && colony.active <= 0n;
      if (colony.isHidden !== shouldHide) {
        colony.isHidden = shouldHide;
        updateStructureHiddenPreference(colony.name, shouldHide);
        changed = true;
      }
    }
    if (control.luxuryResourcesEnabled) {
      const nextLuxury = this.deepClone(control.luxuryResourcesEnabled);
      if (!this.areSettingsEqual(colony.luxuryResourcesEnabled, nextLuxury)) {
        colony.luxuryResourcesEnabled = nextLuxury;
        changed = true;
      }
    }
    if ('autoUpgradeEnabled' in control && colony.autoUpgradeEnabled !== control.autoUpgradeEnabled) {
      colony.autoUpgradeEnabled = control.autoUpgradeEnabled === true;
      changed = true;
    }
    if ('landAsResearchOutpost' in control && colony.landAsResearchOutpost !== control.landAsResearchOutpost) {
      colony.landAsResearchOutpost = control.landAsResearchOutpost === true;
      changed = true;
    }
    if ('androidCapacityShare' in control) {
      const currentShare = colony.getAndroidCapacityShare ? colony.getAndroidCapacityShare() : 0;
      if (currentShare !== control.androidCapacityShare) {
        colony.setAndroidCapacityShare(control.androidCapacityShare);
        changed = true;
      }
    }
    return changed;
  }

  applyColonyAutomationSettings(colony, automation) {
    if (!colony) {
      return false;
    }
    let changed = false;
    if (colony.autoBuildEnabled !== automation.autoBuildEnabled) {
      colony.autoBuildEnabled = automation.autoBuildEnabled;
      changed = true;
    }
    if (colony.autoBuildPriority !== automation.autoBuildPriority) {
      colony.autoBuildPriority = automation.autoBuildPriority;
      changed = true;
    }
    if (colony.autoBuildBasis !== automation.autoBuildBasis) {
      colony.autoBuildBasis = automation.autoBuildBasis;
      changed = true;
    }
    if (colony.autoBuildPercent !== automation.autoBuildPercent) {
      colony.autoBuildPercent = automation.autoBuildPercent;
      changed = true;
    }
    if ('autoBuildFixed' in automation && colony.autoBuildFixed !== automation.autoBuildFixed) {
      colony.autoBuildFixed = automation.autoBuildFixed;
      changed = true;
    }
    if (colony.autoBuildFillPercent !== automation.autoBuildFillPercent) {
      colony.autoBuildFillPercent = automation.autoBuildFillPercent;
      changed = true;
    }
    if (colony.autoBuildFillResourcePrimary !== automation.autoBuildFillResourcePrimary) {
      colony.autoBuildFillResourcePrimary = automation.autoBuildFillResourcePrimary;
      changed = true;
    }
    if (colony.autoBuildFillResourceSecondary !== automation.autoBuildFillResourceSecondary) {
      colony.autoBuildFillResourceSecondary = automation.autoBuildFillResourceSecondary;
      changed = true;
    }
    if (colony.autoActiveEnabled !== automation.autoActiveEnabled) {
      colony.autoActiveEnabled = automation.autoActiveEnabled;
      changed = true;
    }
    return changed;
  }

  applyNanocolonyControlSettings(control) {
    nanotechManager.maintenanceSlider = control.maintenanceSlider || 0;
    nanotechManager.glassSlider = control.glassSlider || 0;
    nanotechManager.maintenance2Slider = control.maintenance2Slider || 0;
    nanotechManager.componentsSlider = control.componentsSlider || 0;
    nanotechManager.maintenance3Slider = control.maintenance3Slider || 0;
    nanotechManager.electronicsSlider = control.electronicsSlider || 0;
    nanotechManager.maintenance4Slider = control.maintenance4Slider || 0;
    nanotechManager.grapheneSlider = control.grapheneSlider || 0;
    nanotechManager.maxEnergyPercent = control.maxEnergyPercent ?? 10;
    nanotechManager.maxEnergyAbsolute = control.maxEnergyAbsolute ?? 1e6;
    nanotechManager.energyLimitMode = control.energyLimitMode || 'percent';
    nanotechManager.maxSiliconPercent = control.maxSiliconPercent ?? 10;
    nanotechManager.maxSiliconAbsolute = control.maxSiliconAbsolute ?? 1e6;
    nanotechManager.siliconLimitMode = control.siliconLimitMode || 'percent';
    nanotechManager.maxMetalPercent = control.maxMetalPercent ?? 10;
    nanotechManager.maxMetalAbsolute = control.maxMetalAbsolute ?? 1e6;
    nanotechManager.metalLimitMode = control.metalLimitMode || 'percent';
    nanotechManager.maxBiomassPercent = control.maxBiomassPercent ?? 10;
    nanotechManager.maxBiomassAbsolute = control.maxBiomassAbsolute ?? 1e6;
    nanotechManager.biomassLimitMode = control.biomassLimitMode || 'percent';
    nanotechManager.maxGraphitePercent = control.maxGraphitePercent ?? 10;
    nanotechManager.maxGraphiteAbsolute = control.maxGraphiteAbsolute ?? 1e6;
    nanotechManager.graphiteLimitMode = control.graphiteLimitMode || 'percent';
    nanotechManager.onlyScrap = control.onlyScrap === true;
    nanotechManager.onlyTrash = control.onlyTrash === true;
    nanotechManager.onlyJunk = control.onlyJunk === true;
    nanotechManager.uncappedScrap = control.uncappedScrap === true;
    nanotechManager.uncappedTrash = control.uncappedTrash === true;
    nanotechManager.uncappedJunk = control.uncappedJunk === true;
  }

  applyOrbitalsControlSettings(control) {
    followersManager.assignmentMode = control.assignmentMode === 'weight' ? 'weight' : 'manual';
    followersManager.assignmentStep = Number.isFinite(control.assignmentStep)
      ? Math.max(1, Math.floor(control.assignmentStep))
      : 1;
    followersManager.autoAssignId = control.autoAssignId || null;
    followersManager.manualAssignments = this.deepClone(control.manualAssignments || {});
    followersManager.weights = this.deepClone(control.weights || {});
    followersManager.ensureTrackedOrbitals();
  }

  deepClone(value) {
    if (Array.isArray(value)) {
      return value.map(item => this.deepClone(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const clone = {};
    for (const key in value) {
      clone[key] = this.deepClone(value[key]);
    }
    return clone;
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
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (!this.areSettingsEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }

  getAvailableTargets() {
    const targets = [];
    const colonyList = Object.values(colonies || {});
    for (let index = 0; index < colonyList.length; index += 1) {
      const colony = colonyList[index];
      if (!colony || !colony.unlocked || colony.permanentlyDisabled) {
        continue;
      }
      targets.push({
        id: `colony:${colony.name}`,
        categoryId: 'colonyBuildings',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.colonyBuildings,
        label: colony.displayName || colony.name,
        supportsAutomation: true
      });
    }

    for (const sliderId in COLONY_AUTOMATION_SLIDER_TARGETS) {
      const config = COLONY_AUTOMATION_SLIDER_TARGETS[sliderId];
      if (!config.isAvailable()) {
        continue;
      }
      targets.push({
        id: `slider:${sliderId}`,
        categoryId: 'colonySliders',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.colonySliders,
        label: config.label,
        supportsAutomation: false
      });
    }

    if (globalEffects.isBooleanFlagSet('automateConstruction')) {
      targets.push({
        id: 'constructionOffice',
        categoryId: 'constructionOffice',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.constructionOffice,
        label: 'Construction Office',
        supportsAutomation: false
      });
    }

    if (nanotechManager && nanotechManager.enabled) {
      targets.push({
        id: 'nanocolony',
        categoryId: 'nanocolony',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.nanocolony,
        label: 'Nanocolony',
        supportsAutomation: false
      });
    }

    if (followersManager && followersManager.enabled) {
      targets.push({
        id: 'orbitals',
        categoryId: 'orbitals',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.orbitals,
        label: 'Orbitals',
        supportsAutomation: false
      });
    }

    targets.sort((left, right) => {
      const leftCategory = COLONY_AUTOMATION_CATEGORY_ORDER.indexOf(left.categoryId);
      const rightCategory = COLONY_AUTOMATION_CATEGORY_ORDER.indexOf(right.categoryId);
      if (leftCategory !== rightCategory) {
        return leftCategory - rightCategory;
      }
      return left.label.localeCompare(right.label);
    });

    return targets;
  }

  getCategoryIds() {
    return COLONY_AUTOMATION_CATEGORY_ORDER.slice();
  }

  getCategoryLabel(categoryId) {
    return COLONY_AUTOMATION_CATEGORY_LABELS[categoryId] || categoryId;
  }

  getTargetCategoryId(targetId) {
    if (this.isColonyTarget(targetId)) {
      return 'colonyBuildings';
    }
    if (this.isSliderTarget(targetId)) {
      return 'colonySliders';
    }
    if (targetId === 'constructionOffice') {
      return 'constructionOffice';
    }
    if (targetId === 'nanocolony') {
      return 'nanocolony';
    }
    if (targetId === 'orbitals') {
      return 'orbitals';
    }
    return 'colonyBuildings';
  }

  getTargetLabel(targetId) {
    if (this.isColonyTarget(targetId)) {
      const colony = this.getColonyTarget(targetId);
      return colony ? (colony.displayName || colony.name) : this.getColonyTargetId(targetId);
    }
    if (this.isSliderTarget(targetId)) {
      return this.getSliderTargetConfig(targetId).label;
    }
    if (targetId === 'constructionOffice') {
      return 'Construction Office';
    }
    if (targetId === 'nanocolony') {
      return 'Nanocolony';
    }
    if (targetId === 'orbitals') {
      return 'Orbitals';
    }
    return targetId;
  }

  isColonyTarget(targetId) {
    return String(targetId || '').indexOf('colony:') === 0;
  }

  getColonyTargetId(targetId) {
    return String(targetId || '').slice(7);
  }

  getColonyTarget(targetId) {
    return colonies[this.getColonyTargetId(targetId)] || null;
  }

  isSliderTarget(targetId) {
    return String(targetId || '').indexOf('slider:') === 0;
  }

  getSliderTargetId(targetId) {
    return String(targetId || '').slice(7);
  }

  getSliderTargetConfig(targetId) {
    return COLONY_AUTOMATION_SLIDER_TARGETS[this.getSliderTargetId(targetId)];
  }

  targetSupportsAutomation(targetId) {
    return this.isColonyTarget(targetId);
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeControl: !!preset.includeControl,
        includeAutomation: !!preset.includeAutomation,
        scopeAll: !!preset.scopeAll,
        targets: Object.fromEntries(
          Object.entries(preset.targets).map(([key, entry]) => [
            key,
            {
              categoryId: entry.categoryId,
              control: entry.control ? this.deepClone(entry.control) : null,
              automation: entry.automation ? this.deepClone(entry.automation) : null
            }
          ])
        )
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
      includeControl: preset.includeControl !== false,
      includeAutomation: preset.includeAutomation !== false,
      scopeAll: preset.scopeAll === true,
      targets: preset.targets || {}
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
    const hasSelectedPresetId = Object.prototype.hasOwnProperty.call(data, 'selectedPresetId');
    const hasSelectedCombinationId = Object.prototype.hasOwnProperty.call(data, 'selectedCombinationId');
    this.selectedPresetId = hasSelectedPresetId
      ? (data.selectedPresetId ? Number(data.selectedPresetId) : null)
      : (this.presets[0] ? this.presets[0].id : null);
    this.selectedCombinationId = hasSelectedCombinationId
      ? (data.selectedCombinationId ? Number(data.selectedCombinationId) : null)
      : (this.combinations[0] ? this.combinations[0].id : null);
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.nextAssignmentId = data.nextAssignmentId || this.assignments.length + 1;
    this.nextCombinationId = data.nextCombinationId || this.combinations.length + 1;
    this.getSelectedPreset();
    this.getSelectedCombination();
  }

  update() {}
}

try {
  module.exports = { ColonyAutomation };
} catch (error) {}
