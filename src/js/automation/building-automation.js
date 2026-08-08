let MultiRecipesBuildingRef;
try {
  MultiRecipesBuildingRef = MultiRecipesBuilding;
} catch (error) {}
try {
  MultiRecipesBuildingRef = MultiRecipesBuildingRef || require('../buildings/MultiRecipesBuilding.js').MultiRecipesBuilding;
} catch (error) {}

let ChemicalReactorRef;
try {
  ChemicalReactorRef = ChemicalReactor;
} catch (error) {}
try {
  ChemicalReactorRef = ChemicalReactorRef || require('../buildings/ChemicalReactor.js').ChemicalReactor;
} catch (error) {}

let GhgFactoryRef;
try {
  GhgFactoryRef = GhgFactory;
} catch (error) {}
try {
  GhgFactoryRef = GhgFactoryRef || require('../buildings/GhgFactory.js').GhgFactory;
} catch (error) {}

let OxygenFactoryRef;
try {
  OxygenFactoryRef = OxygenFactory;
} catch (error) {}
try {
  OxygenFactoryRef = OxygenFactoryRef || require('../buildings/OxygenFactory.js').OxygenFactory;
} catch (error) {}

let DustFactoryRef;
try {
  DustFactoryRef = DustFactory;
} catch (error) {}
try {
  DustFactoryRef = DustFactoryRef || require('../buildings/DustFactory.js').DustFactory;
} catch (error) {}

const MultiRecipesBuildingClass = MultiRecipesBuildingRef || class MultiRecipesBuildingFallback {};
const ChemicalReactorClass = ChemicalReactorRef || class ChemicalReactorFallback {};
const GhgFactoryClass = GhgFactoryRef || class GhgFactoryFallback {};
const OxygenFactoryClass = OxygenFactoryRef || class OxygenFactoryFallback {};
const DustFactoryClass = DustFactoryRef || class DustFactoryFallback {};
let BuildingAutomationPresetManagerBaseRef;
try {
  BuildingAutomationPresetManagerBaseRef = AutomationTwoBucketPresetManagerBase;
} catch (error) {}
try {
  BuildingAutomationPresetManagerBaseRef = BuildingAutomationPresetManagerBaseRef
    || require('./automation-preset-manager-base.js').AutomationTwoBucketPresetManagerBase;
} catch (error) {}
const BuildingAutomationPresetManagerBaseClass = BuildingAutomationPresetManagerBaseRef || class BuildingAutomationPresetManagerBaseFallback {};

class BuildingAutomation extends BuildingAutomationPresetManagerBaseClass {
  constructor(encounteredTargets = null) {
    super({
      featureKey: 'automationBuildings',
      presetLabel: 'Preset',
      combinationLabel: 'Combination',
      useMasterEnabled: true,
      useAssignments: true,
      useCombinations: true,
      nextTravelKind: 'combination',
      presetCollectionKey: 'buildings',
      bucketKeys: ['control', 'automation'],
      includeKeys: ['includeControl', 'includeAutomation'],
      allowLegacyApplyOnNextTravel: true
    });
    this.encounteredTargets = encounteredTargets;
    this.everEnabledBuildings = new Set();
    this.elapsed = 0;
  }

  isBuildingAvailableNow(building) {
    if (!building) {
      return false;
    }
    if (building.permanentlyDisabled) {
      return false;
    }
    return building.unlocked;
  }

  recordBuildingEnabled(buildingId) {
    const building = buildings?.[buildingId];
    if (!building) {
      return false;
    }
    this.everEnabledBuildings.add(buildingId);
    if (this.encounteredTargets) {
      this.encounteredTargets.record('buildings', buildingId);
    }
    return true;
  }

  hasEverEnabledBuilding(buildingId) {
    return this.everEnabledBuildings.has(buildingId)
      || (this.encounteredTargets && this.encounteredTargets.has('buildings', buildingId));
  }

  shouldShowBuildingInAutomation(building) {
    if (!building) {
      return false;
    }
    if (this.isBuildingAvailableNow(building)) {
      this.recordBuildingEnabled(building.name);
      return true;
    }
    return this.hasEverEnabledBuilding(building.name);
  }

  recordCurrentlyAvailableBuildings() {
    const buildingList = Object.values(buildings || {});
    for (let index = 0; index < buildingList.length; index += 1) {
      const building = buildingList[index];
      if (!building) {
        continue;
      }
      if (this.isBuildingAvailableNow(building)) {
        this.recordBuildingEnabled(building.name);
      }
    }
  }

  capturePresetEntry(buildingId, includeControl, includeAutomation) {
    const building = buildings[buildingId];
    return building
      ? this.captureBuildingSettings(building, includeControl, includeAutomation)
      : null;
  }

  normalizePresetCollection(collection = {}) {
    const normalized = {};
    for (const buildingId in collection) {
      const entry = collection[buildingId] || {};
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
      if (buildingId === 'dysonReceiver'
        && automation
        && automation.autoBuildBasis === 'max'
        && !Object.prototype.hasOwnProperty.call(automation, 'autoBuildMaxPercent')
        && Object.prototype.hasOwnProperty.call(automation, 'autoBuildPercent')) {
        automation.autoBuildMaxPercent = automation.autoBuildPercent;
      }
      if (control && Object.keys(control).length === 0) {
        control = null;
      }
      if (automation && Object.keys(automation).length === 0) {
        automation = null;
      }
      if (control || automation) {
        normalized[buildingId] = { control, automation };
      }
    }
    return normalized;
  }

  serializePresetCollection(preset) {
    return this.normalizePresetCollection(preset.buildings);
  }

  recordPresetTargets(preset) {
    const buildingIds = Object.keys(preset.buildings || {});
    for (let index = 0; index < buildingIds.length; index += 1) {
      const buildingId = buildingIds[index];
      this.everEnabledBuildings.add(buildingId);
      if (this.encounteredTargets) {
        this.encounteredTargets.record('buildings', buildingId);
      }
    }
  }

  isPresetParameterPathEligible(preset, path) {
    if (!Array.isArray(path) || path[0] !== 'buildings') {
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
    const buildingId = path[1];
    const automation = preset.buildings[buildingId]?.automation || {};
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
    if (leafKey === 'autoBuildMaxPercent') {
      const building = buildings[buildingId];
      return mode === 'max' && !!building && building.hasAdjustableAutoBuildMaxTarget();
    }
    return true;
  }

  captureBuildingSettings(building, includeControl, includeAutomation) {
    const entry = {
      control: null,
      automation: null
    };
    if (includeControl) {
      entry.control = this.captureControlSettings(building);
    }
    if (includeAutomation) {
      entry.automation = this.captureAutomationSettings(building);
    }
    return entry;
  }

  captureControlSettings(building) {
    const control = this.captureStructureControlSettings(building);
    if (building.name === 'antimatterBattery') {
      control.autoFillingEnabled = building.autoFillingEnabled === true;
    }
    if (building instanceof MultiRecipesBuildingClass) {
      control.recipeKey = building.currentRecipeKey;
    }
    if (building instanceof ChemicalReactorClass) {
      control.chemicalReactor = ChemicalReactorClass.saveAutomationSettings();
    }
    if (building instanceof GhgFactoryClass) {
      control.ghgFactory = GhgFactoryClass.saveAutomationSettings();
    }
    if (building instanceof OxygenFactoryClass) {
      control.oxygenFactory = OxygenFactoryClass.saveAutomationSettings();
    }
    if (building instanceof DustFactoryClass) {
      control.dustFactory = DustFactoryClass.saveAutomationSettings();
    }
    return Object.keys(control).length ? control : null;
  }

  captureAutomationSettings(building) {
    const settings = this.captureStructureAutomationSettings(building);
    if (building.name === 'dysonReceiver') {
      settings.autoBuildMaxPercent = building.autoBuildMaxPercent;
      settings.capActiveToDysonCapacity = building.capActiveToDysonCapacity === true;
    }
    return settings;
  }

  applyResolvedMaps(controlMap, automationMap) {
    const buildingList = Object.values(buildings);

    for (let index = 0; index < buildingList.length; index += 1) {
      const building = buildingList[index];
      const control = controlMap[building.name];
      const automation = automationMap[building.name];
      if (control) {
        this.applyControlSettings(building, control);
      }
      if (automation) {
        this.applyAutomationSettings(building, automation);
      }
    }
  }

  applyControlSettings(building, control) {
    let changed = this.applyStructureControlSettings(building, control);
    if (control.recipeKey && building.currentRecipeKey !== control.recipeKey) {
      const applied = building.setRecipe(control.recipeKey);
      if (applied) {
        changed = true;
      }
    }
    if (control.chemicalReactor && building instanceof ChemicalReactorClass) {
      if (!this.areSettingsEqual(ChemicalReactorClass.saveAutomationSettings(), control.chemicalReactor)) {
        ChemicalReactorClass.loadAutomationSettings(control.chemicalReactor);
        changed = true;
      }
    }
    if (control.ghgFactory && building instanceof GhgFactoryClass) {
      if (!this.areSettingsEqual(GhgFactoryClass.saveAutomationSettings(), control.ghgFactory)) {
        GhgFactoryClass.loadAutomationSettings(control.ghgFactory);
        changed = true;
      }
    }
    if (control.oxygenFactory && building instanceof OxygenFactoryClass) {
      if (!this.areSettingsEqual(OxygenFactoryClass.saveAutomationSettings(), control.oxygenFactory)) {
        OxygenFactoryClass.loadAutomationSettings(control.oxygenFactory);
        changed = true;
      }
    }
    if (control.dustFactory && building instanceof DustFactoryClass) {
      if (!this.areSettingsEqual(DustFactoryClass.saveAutomationSettings(), control.dustFactory)) {
        building.applyDustAutomationSettings(control.dustFactory, true);
        changed = true;
      }
    }
    if (building.name === 'antimatterBattery' && 'autoFillingEnabled' in control) {
      const nextAutoFillingEnabled = control.autoFillingEnabled === true;
      if (building.autoFillingEnabled !== nextAutoFillingEnabled) {
        building.autoFillingEnabled = nextAutoFillingEnabled;
        changed = true;
      }
    }
    return changed;
  }

  applyAutomationSettings(building, automation) {
    let changed = this.applyStructureAutomationSettings(building, automation);
    if ('autoBuildMaxPercent' in automation && building.autoBuildMaxPercent !== automation.autoBuildMaxPercent) {
      building.autoBuildMaxPercent = automation.autoBuildMaxPercent;
      changed = true;
    }
    if (
      building.name === 'dysonReceiver' &&
      'capActiveToDysonCapacity' in automation &&
      building.capActiveToDysonCapacity !== automation.capActiveToDysonCapacity
    ) {
      building.capActiveToDysonCapacity = automation.capActiveToDysonCapacity === true;
      changed = true;
    }
    return changed;
  }

  update(delta) {
    if (!this.isActive()) {
      return;
    }
    this.elapsed += delta || 0;
    if (this.elapsed >= 1000) {
      this.elapsed = 0;
      this.recordCurrentlyAvailableBuildings();
    }
  }

  getAdditionalSaveState() {
    return {
      everEnabledBuildings: Array.from(this.everEnabledBuildings)
    };
  }

  loadAdditionalState(data = {}) {
    this.everEnabledBuildings = new Set(
      Array.isArray(data.everEnabledBuildings) ? data.everEnabledBuildings : []
    );
    this.everEnabledBuildings.forEach(buildingId => {
      if (this.encounteredTargets) {
        this.encounteredTargets.record('buildings', buildingId);
      }
    });
  }

  afterLoadState() {
    this.recordCurrentlyAvailableBuildings();
  }
}

try {
  module.exports = { BuildingAutomation };
} catch (error) {}
