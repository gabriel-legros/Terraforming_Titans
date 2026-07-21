const COLONY_AUTOMATION_CATEGORY_ORDER = [
  'colonyBuildings',
  'colonySliders',
  'constructionOffice',
  'nanocolony',
  'orbitals'
];

const COLONY_AUTOMATION_CATEGORY_LABELS = {
  colonyBuildings: t('ui.hope.automationCards.colonyCategoryColonyBuildings', {}, 'Colony Buildings'),
  colonySliders: t('ui.hope.automationCards.colonyCategoryColonySliders', {}, 'Colony Sliders'),
  constructionOffice: t('ui.hope.automationCards.colonyTargetConstructionOffice', {}, 'Construction Office'),
  nanocolony: t('ui.hope.automationCards.colonyTargetNanocolony', {}, 'Nanocolony'),
  orbitals: t('ui.hope.automationCards.colonyTargetOrbitals', {}, 'Orbitals')
};

const COLONY_AUTOMATION_SLIDER_TARGETS = {
  workforceRatio: {
    label: t('ui.hope.automationCards.colonySliderWorkforceAllocation', {}, 'Workforce Allocation'),
    isAvailable: () => true,
    capture: () => colonySliderSettings.workerRatio,
    apply: (value) => colonySliderSettings.setWorkforceRatio(value)
  },
  foodConsumption: {
    label: t('ui.hope.automationCards.colonySliderFoodConsumption', {}, 'Food Consumption'),
    isAvailable: () => true,
    capture: () => colonySliderSettings.foodConsumption,
    apply: (value) => colonySliderSettings.setFoodConsumptionMultiplier(value)
  },
  luxuryWater: {
    label: t('ui.hope.automationCards.colonySliderLuxuryWaterUse', {}, 'Luxury Water Use'),
    isAvailable: () => true,
    capture: () => colonySliderSettings.luxuryWater,
    apply: (value) => colonySliderSettings.setLuxuryWaterMultiplier(value)
  },
  oreMineWorkers: {
    label: t('ui.hope.automationCards.colonySliderOreMineWorkers', {}, 'Ore Mine Workers'),
    isAvailable: () => true,
    capture: () => colonySliderSettings.oreMineWorkers,
    apply: (value) => colonySliderSettings.setOreMineWorkerAssist(value)
  },
  mechanicalAssistance: {
    label: t('ui.hope.automationCards.colonySliderMechanicalAssistance', {}, 'Mechanical Assistance'),
    isAvailable: () => colonySliderSettings.isBooleanFlagSet('mechanicalAssistance') && terraforming.celestialParameters.gravity > 10,
    capture: () => colonySliderSettings.mechanicalAssistance,
    apply: (value) => colonySliderSettings.setMechanicalAssistance(value)
  },
  warpnetLevel: {
    label: t('ui.hope.automationCards.colonySliderWarpnet', {}, 'Warpnet'),
    isAvailable: () => colonySliderSettings.isBooleanFlagSet('warpnet'),
    capture: () => colonySliderSettings.warpnetLevel,
    apply: (value) => colonySliderSettings.setWarpnetLevel(value)
  }
};
let ColonyAutomationPresetManagerBaseRef;
try {
  ColonyAutomationPresetManagerBaseRef = AutomationTwoBucketPresetManagerBase;
} catch (error) {}
try {
  ColonyAutomationPresetManagerBaseRef = ColonyAutomationPresetManagerBaseRef
    || require('./automation-preset-manager-base.js').AutomationTwoBucketPresetManagerBase;
} catch (error) {}
const ColonyAutomationPresetManagerBaseClass = ColonyAutomationPresetManagerBaseRef || class ColonyAutomationPresetManagerBaseFallback {};

class ColonyAutomation extends ColonyAutomationPresetManagerBaseClass {
  constructor(encounteredTargets = null) {
    super({
      featureKey: 'automationColony',
      presetLabel: 'Preset',
      combinationLabel: 'Combination',
      useMasterEnabled: true,
      useAssignments: true,
      useCombinations: true,
      nextTravelKind: 'combination',
      presetCollectionKey: 'targets',
      bucketKeys: ['control', 'automation'],
      includeKeys: ['includeControl', 'includeAutomation'],
      allowLegacyApplyOnNextTravel: false
    });
    this.encounteredTargets = encounteredTargets;
    this.elapsed = 0;
  }

  capturePresetEntry(targetId, includeControl, includeAutomation) {
    return this.captureTargetSettings(targetId, includeControl, includeAutomation);
  }

  normalizePresetCollection(collection = {}) {
    const normalized = {};
    for (const targetId in collection) {
      const entry = collection[targetId] || {};
      let control = entry.control && entry.control.constructor === Object
        ? this.deepClone(entry.control)
        : null;
      let automation = entry.automation && entry.automation.constructor === Object
        ? this.deepClone(entry.automation)
        : null;
      if (control && Object.prototype.hasOwnProperty.call(control, 'autoUpgradeEnabled')) {
        automation ||= {};
        if (!Object.prototype.hasOwnProperty.call(automation, 'autoUpgradeEnabled')) {
          automation.autoUpgradeEnabled = control.autoUpgradeEnabled === true;
        }
        delete control.autoUpgradeEnabled;
      }
      if (automation && automation.autoBuildBasis === 'initialLand') {
        automation.autoBuildBasis = 'geometricLand';
      }
      if (control && Object.keys(control).length === 0) {
        control = null;
      }
      if (automation && Object.keys(automation).length === 0) {
        automation = null;
      }
      if (control || automation) {
        normalized[targetId] = {
          categoryId: entry.categoryId || this.getTargetCategoryId(targetId),
          control,
          automation
        };
      }
    }
    return normalized;
  }

  serializePresetCollection(preset) {
    return this.normalizePresetCollection(preset.targets);
  }

  recordPresetTargets(preset) {
    if (!this.encounteredTargets) {
      return;
    }
    this.encounteredTargets.recordAll('colony', Object.keys(preset.targets || {}));
  }

  isPresetParameterPathEligible(preset, path) {
    if (!Array.isArray(path) || path[0] !== 'targets') {
      return true;
    }
    const section = path[2];
    const leafKey = path[path.length - 1];
    if (section === 'control' && path[3] === 'workerPriority') {
      return false;
    }
    if (section !== 'automation') {
      return true;
    }
    if (leafKey === 'autoBuildPriority') {
      return false;
    }
    const targetId = path[1];
    const automation = preset.targets[targetId]?.automation || {};
    const mode = automation.autoBuildBasis || '';
    if (leafKey === 'autoBuildFixed') {
      return mode === 'fixed';
    }
    if (leafKey === 'autoBuildFillPercent') {
      return mode === 'fill';
    }
    if (leafKey === 'autoBuildPercent') {
      return mode !== 'fixed' && mode !== 'fill' && mode !== 'max';
    }
    return true;
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
      const config = this.getSliderTargetConfig(targetId);
      return config ? { value: config.capture() } : null;
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
    const control = this.captureStructureControlSettings(colony);
    control.luxuryResourcesEnabled = this.deepClone(colony.luxuryResourcesEnabled);
    if (colony.name === 'aerostat_colony') {
      control.landAsResearchOutpost = colony.landAsResearchOutpost === true;
      control.capWorkersToAerostatCapacity =
        colony.capWorkersToAerostatCapacity === true;
      control.capSupportedBuildingsToAerostatCapacity =
        colony.capSupportedBuildingsToAerostatCapacity === true;
      control.androidCapacityShare = colony.getAndroidCapacityShare();
    }
    return control;
  }

  captureColonyAutomationSettings(colony) {
    if (!colony) {
      return null;
    }
    return this.captureStructureAutomationSettings(colony);
  }

  captureNanocolonyControlSettings() {
    return {
      maintenanceSlider: nanotechManager.maintenanceSlider,
      glassSlider: nanotechManager.glassSlider,
      maintenance2Slider: nanotechManager.maintenance2Slider,
      componentsSlider: nanotechManager.componentsSlider,
      maintenance3Slider: nanotechManager.maintenance3Slider,
      electronicsSlider: nanotechManager.electronicsSlider,
      stage3Resource: nanotechManager.stage3Resource,
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

  applyResolvedMaps(controlMap, automationMap) {
    for (const targetId in controlMap) {
      if (this.applyControlSettings(targetId, controlMap[targetId])) {
        if (targetId === 'nanocolony') {
          nanotechManager.reapplyEffects();
        }
      }
    }

    for (const targetId in automationMap) {
      this.applyAutomationSettings(targetId, automationMap[targetId]);
    }
  }

  applyControlSettings(targetId, control) {
    if (this.isColonyTarget(targetId)) {
      return this.applyColonyControlSettings(this.getColonyTarget(targetId), control);
    }
    if (this.isSliderTarget(targetId)) {
      const config = this.getSliderTargetConfig(targetId);
      if (!config) {
        return false;
      }
      const current = this.captureControlSettings(targetId);
      if (this.areSettingsEqual(current, control)) {
        return false;
      }
      config.apply(control.value);
      return true;
    }
    if (targetId === 'constructionOffice') {
      const current = captureConstructionOfficeSettings();
      const merged = this.mergeSettings(current, control);
      if (this.areSettingsEqual(current, merged)) {
        return false;
      }
      restoreConstructionOfficeSettings(merged);
      return true;
    }
    if (targetId === 'nanocolony') {
      return this.applyNanocolonyControlSettings(control);
    }
    if (targetId === 'orbitals') {
      return this.applyOrbitalsControlSettings(control);
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
    let changed = this.applyStructureControlSettings(colony, control);
    if (control.luxuryResourcesEnabled) {
      const nextLuxury = this.deepClone(control.luxuryResourcesEnabled);
      if (!this.areSettingsEqual(colony.luxuryResourcesEnabled, nextLuxury)) {
        colony.luxuryResourcesEnabled = nextLuxury;
        changed = true;
      }
    }
    if ('landAsResearchOutpost' in control && colony.landAsResearchOutpost !== control.landAsResearchOutpost) {
      colony.landAsResearchOutpost = control.landAsResearchOutpost === true;
      changed = true;
    }
    if (
      'capWorkersToAerostatCapacity' in control &&
      colony.capWorkersToAerostatCapacity !== control.capWorkersToAerostatCapacity
    ) {
      colony.capWorkersToAerostatCapacity =
        control.capWorkersToAerostatCapacity === true;
      colony.refreshWorkerCapacityCapState?.();
      changed = true;
    }
    if (
      'capSupportedBuildingsToAerostatCapacity' in control &&
      colony.capSupportedBuildingsToAerostatCapacity !==
        control.capSupportedBuildingsToAerostatCapacity
    ) {
      colony.capSupportedBuildingsToAerostatCapacity =
        control.capSupportedBuildingsToAerostatCapacity === true;
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
    return this.applyStructureAutomationSettings(colony, automation);
  }

  applyNanocolonyControlSettings(control) {
    const before = this.captureNanocolonyControlSettings();
    const zeroDefaultKeys = [
      'maintenanceSlider',
      'glassSlider',
      'maintenance2Slider',
      'componentsSlider',
      'maintenance3Slider',
      'electronicsSlider',
      'maintenance4Slider',
      'grapheneSlider'
    ];
    const numericDefaultKeys = {
      maxEnergyPercent: 10,
      maxEnergyAbsolute: 1e6,
      maxSiliconPercent: 10,
      maxSiliconAbsolute: 1e6,
      maxMetalPercent: 10,
      maxMetalAbsolute: 1e6,
      maxBiomassPercent: 10,
      maxBiomassAbsolute: 1e6,
      maxGraphitePercent: 10,
      maxGraphiteAbsolute: 1e6
    };
    const modeKeys = [
      'energyLimitMode',
      'siliconLimitMode',
      'metalLimitMode',
      'biomassLimitMode',
      'graphiteLimitMode'
    ];
    const booleanKeys = [
      'onlyScrap',
      'onlyTrash',
      'onlyJunk',
      'uncappedScrap',
      'uncappedTrash',
      'uncappedJunk'
    ];
    for (let index = 0; index < zeroDefaultKeys.length; index += 1) {
      const key = zeroDefaultKeys[index];
      if (Object.prototype.hasOwnProperty.call(control, key)) {
        nanotechManager[key] = control[key] || 0;
      }
    }
    for (const key in numericDefaultKeys) {
      if (Object.prototype.hasOwnProperty.call(control, key)) {
        nanotechManager[key] = control[key] ?? numericDefaultKeys[key];
      }
    }
    for (let index = 0; index < modeKeys.length; index += 1) {
      const key = modeKeys[index];
      if (Object.prototype.hasOwnProperty.call(control, key)) {
        nanotechManager[key] = control[key] || 'percent';
      }
    }
    for (let index = 0; index < booleanKeys.length; index += 1) {
      const key = booleanKeys[index];
      if (Object.prototype.hasOwnProperty.call(control, key)) {
        nanotechManager[key] = control[key] === true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(control, 'stage3Resource')) {
      const alternateRecipeUnlocked = projectManager.projects.nanoworld.getShopPurchaseCount('alternateElectronicsRecipe') > 0;
      nanotechManager.stage3Resource = control.stage3Resource === 'graphite' && alternateRecipeUnlocked
        ? 'graphite'
        : 'biomass';
    }
    return !this.areSettingsEqual(before, this.captureNanocolonyControlSettings());
  }

  applyOrbitalsControlSettings(control) {
    const before = this.captureOrbitalsControlSettings();
    if (Object.prototype.hasOwnProperty.call(control, 'assignmentMode')) {
      followersManager.assignmentMode = control.assignmentMode === 'weight' ? 'weight' : 'manual';
    }
    if (Object.prototype.hasOwnProperty.call(control, 'assignmentStep')) {
      followersManager.assignmentStep = Number.isFinite(control.assignmentStep)
        ? Math.max(1, Math.floor(control.assignmentStep))
        : 1;
    }
    if (Object.prototype.hasOwnProperty.call(control, 'autoAssignId')) {
      followersManager.autoAssignId = control.autoAssignId || null;
    }
    if (Object.prototype.hasOwnProperty.call(control, 'manualAssignments')) {
      followersManager.manualAssignments = this.deepClone(control.manualAssignments || {});
    }
    if (Object.prototype.hasOwnProperty.call(control, 'weights')) {
      followersManager.weights = this.deepClone(control.weights || {});
    }
    followersManager.ensureTrackedOrbitals();
    return !this.areSettingsEqual(before, this.captureOrbitalsControlSettings());
  }

  recordCurrentlyAvailableTargets() {
    if (!this.encounteredTargets) {
      return;
    }
    const colonyList = Object.values(colonies || {});
    for (let index = 0; index < colonyList.length; index += 1) {
      const colony = colonyList[index];
      if (!colony || !colony.unlocked || colony.permanentlyDisabled) {
        continue;
      }
      this.encounteredTargets.record('colony', `colony:${colony.name}`);
    }
    for (const sliderId in COLONY_AUTOMATION_SLIDER_TARGETS) {
      if (COLONY_AUTOMATION_SLIDER_TARGETS[sliderId].isAvailable()) {
        this.encounteredTargets.record('colony', `slider:${sliderId}`);
      }
    }
    if (globalEffects.isBooleanFlagSet('automateConstruction')) {
      this.encounteredTargets.record('colony', 'constructionOffice');
    }
    if (nanotechManager && nanotechManager.enabled) {
      this.encounteredTargets.record('colony', 'nanocolony');
    }
    if (followersManager && followersManager.enabled) {
      this.encounteredTargets.record('colony', 'orbitals');
    }
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
        label: t('ui.hope.automationCards.colonyTargetConstructionOffice', {}, 'Construction Office'),
        supportsAutomation: false
      });
    }

    if (nanotechManager && nanotechManager.enabled) {
      targets.push({
        id: 'nanocolony',
        categoryId: 'nanocolony',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.nanocolony,
        label: t('ui.hope.automationCards.colonyTargetNanocolony', {}, 'Nanocolony'),
        supportsAutomation: false
      });
    }

    if (followersManager && followersManager.enabled) {
      targets.push({
        id: 'orbitals',
        categoryId: 'orbitals',
        categoryLabel: COLONY_AUTOMATION_CATEGORY_LABELS.orbitals,
        label: t('ui.hope.automationCards.colonyTargetOrbitals', {}, 'Orbitals'),
        supportsAutomation: false
      });
    }

    if (this.encounteredTargets) {
      const currentTargetIds = new Set(targets.map(target => target.id));
      const encounteredTargetIds = this.encounteredTargets.getIds('colony');
      for (let index = 0; index < encounteredTargetIds.length; index += 1) {
        const targetId = encounteredTargetIds[index];
        if (currentTargetIds.has(targetId)) {
          continue;
        }
        targets.push({
          id: targetId,
          categoryId: this.getTargetCategoryId(targetId),
          categoryLabel: this.getCategoryLabel(this.getTargetCategoryId(targetId)),
          label: this.getTargetLabel(targetId),
          supportsAutomation: this.targetSupportsAutomation(targetId)
        });
      }
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
      const config = this.getSliderTargetConfig(targetId);
      return config ? config.label : this.getSliderTargetId(targetId);
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

  update(delta) {
    this.elapsed += delta || 0;
    if (this.elapsed >= 1000) {
      this.elapsed = 0;
      this.recordCurrentlyAvailableTargets();
    }
  }
}

try {
  module.exports = { ColonyAutomation };
} catch (error) {}
