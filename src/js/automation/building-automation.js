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
  BuildingAutomationPresetManagerBaseRef = AutomationPresetManagerBase;
} catch (error) {}
try {
  BuildingAutomationPresetManagerBaseRef = BuildingAutomationPresetManagerBaseRef
    || require('./automation-preset-manager-base.js').AutomationPresetManagerBase;
} catch (error) {}
const BuildingAutomationPresetManagerBaseClass = BuildingAutomationPresetManagerBaseRef || class BuildingAutomationPresetManagerBaseFallback {};

class BuildingAutomation extends BuildingAutomationPresetManagerBaseClass {
  constructor() {
    super({
      featureKey: 'automationBuildings',
      presetLabel: 'Preset',
      combinationLabel: 'Combination',
      useMasterEnabled: true,
      useAssignments: true,
      useCombinations: true,
      nextTravelKind: 'combination'
    });
    this.everEnabledBuildings = new Set();
    this.elapsed = 0;
  }

  setCollapsed(collapsed) {
    super.setCollapsed(collapsed);
  }

  setMasterEnabled(enabled) {
    super.setMasterEnabled(enabled);
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
    if (!building || !building.automationRequiresEverEnabled) {
      return false;
    }
    this.everEnabledBuildings.add(buildingId);
    return true;
  }

  hasEverEnabledBuilding(buildingId) {
    return this.everEnabledBuildings.has(buildingId);
  }

  shouldShowBuildingInAutomation(building) {
    if (!building) {
      return false;
    }
    if (!building.automationRequiresEverEnabled) {
      return this.isBuildingAvailableNow(building);
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
      if (!building || !building.automationRequiresEverEnabled) {
        continue;
      }
      if (this.isBuildingAvailableNow(building)) {
        this.recordBuildingEnabled(building.name);
      }
    }
  }

  isActive() {
    return super.isActive();
  }

  getPresetById(id) {
    return super.getPresetById(id);
  }

  getSelectedPresetId() {
    return super.getSelectedPresetId();
  }

  getSelectedPreset() {
    return super.getSelectedPreset();
  }

  setSelectedPresetId(id) {
    return super.setSelectedPresetId(id);
  }

  getAssignments() {
    return super.getAssignments();
  }

  getCombinations() {
    return super.getCombinations();
  }

  getCombinationById(id) {
    return super.getCombinationById(id);
  }

  getSelectedCombinationId() {
    return super.getSelectedCombinationId();
  }

  getSelectedCombination() {
    return super.getSelectedCombination();
  }

  setSelectedCombinationId(id) {
    return super.setSelectedCombinationId(id);
  }

  addAssignment(presetId) {
    return super.addAssignment(presetId);
  }

  setAssignments(assignments) {
    super.setAssignments(assignments);
  }

  removeAssignment(assignmentId) {
    super.removeAssignment(assignmentId);
  }

  moveAssignment(assignmentId, direction) {
    super.moveAssignment(assignmentId, direction);
  }

  setAssignmentPreset(assignmentId, presetId) {
    super.setAssignmentPreset(assignmentId, presetId);
  }

  setAssignmentEnabled(assignmentId, enabled) {
    super.setAssignmentEnabled(assignmentId, enabled);
  }

  moveCombination(id, direction) {
    return super.moveCombination(id, direction);
  }

  addCombination(name, assignments) {
    return super.addCombination(name, assignments);
  }

  updateCombination(id, name, assignments) {
    return super.updateCombination(id, name, assignments);
  }

  deleteCombination(id) {
    super.deleteCombination(id);
  }

  setCombinationShowInSidebar(id, showInSidebar) {
    return super.setCombinationShowInSidebar(id, showInSidebar);
  }

  applyCombination(id) {
    super.applyCombination(id);
  }

  addPreset(name, buildingIds, options = {}) {
    const shouldCreateEmpty = options.createEmpty === true;
    const preset = this.buildPreset(
      name,
      shouldCreateEmpty ? [] : buildingIds,
      shouldCreateEmpty ? { ...options, scopeAll: false } : options
    );
    this.presets.push(preset);
    this.selectedPresetId = preset.id;
    return preset.id;
  }

  movePreset(id, direction) {
    return super.movePreset(id, direction);
  }

  updatePreset(id, name, buildingIds, options = {}) {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index < 0) {
      return false;
    }
    const preset = this.buildPreset(name, buildingIds, options, id);
    this.presets.splice(index, 1, preset);
    return true;
  }

  deletePreset(id) {
    super.deletePreset(id);
  }

  renamePreset(id, name) {
    super.renamePreset(id, name);
  }

  setPresetShowInSidebar(id, showInSidebar) {
    return super.setPresetShowInSidebar(id, showInSidebar);
  }

  deepClone(value) {
    return super.deepClone(value);
  }

  exportPreset(presetId) {
    const preset = this.getPresetById(Number(presetId));
    if (!preset) {
      return null;
    }
    return {
      name: preset.name,
      showInSidebar: preset.showInSidebar !== false,
      includeControl: preset.includeControl !== false,
      includeAutomation: preset.includeAutomation !== false,
      scopeAll: preset.scopeAll === true,
      buildings: Object.fromEntries(
        Object.entries(preset.buildings || {}).map(([buildingId, entry]) => [
          buildingId,
          {
            control: entry.control ? this.deepClone(entry.control) : null,
            automation: entry.automation ? {
              ...this.deepClone(entry.automation),
              autoBuildBasis: entry.automation.autoBuildBasis === 'initialLand' ? 'geometricLand' : entry.automation.autoBuildBasis
            } : null
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
      showInSidebar: presetData.showInSidebar !== false,
      includeControl: presetData.includeControl !== false,
      includeAutomation: presetData.includeAutomation !== false,
      scopeAll: presetData.scopeAll === true,
      buildings: {}
    };
    const importedBuildings = presetData.buildings || {};
    for (const buildingId in importedBuildings) {
      const entry = importedBuildings[buildingId] || {};
      const control = entry.control ? this.deepClone(entry.control) : null;
      const automation = entry.automation ? this.deepClone(entry.automation) : null;
      if (automation && automation.autoBuildBasis === 'initialLand') {
        automation.autoBuildBasis = 'geometricLand';
      }
      if (!control && !automation) {
        continue;
      }
      importedPreset.buildings[buildingId] = { control, automation };
    }
    this.presets.push(importedPreset);
    this.selectedPresetId = importedPreset.id;
    return importedPreset.id;
  }

  buildPreset(name, buildingIds, options = {}, idOverride) {
    const includeControl = options.includeControl !== false;
    const includeAutomation = options.includeAutomation !== false;
    const scopeAll = options.scopeAll === true;
    const id = idOverride || this.nextPresetId++;
    const preset = {
      id,
      name: name || `Preset ${id}`,
      showInSidebar: options.showInSidebar !== false,
      includeControl,
      includeAutomation,
      scopeAll,
      buildings: {}
    };
    const ids = Array.isArray(buildingIds) ? buildingIds : [];
    for (let index = 0; index < ids.length; index += 1) {
      const buildingId = ids[index];
      const building = buildings[buildingId];
      if (!building) {
        continue;
      }
      const entry = this.captureBuildingSettings(building, includeControl, includeAutomation);
      if (entry.control || entry.automation) {
        preset.buildings[buildingId] = entry;
      }
    }
    return preset;
  }

  mergeMissingBuildingsIntoPreset(presetId, buildingIds = []) {
    const preset = this.getPresetById(Number(presetId));
    if (!preset) {
      return false;
    }
    const ids = Array.isArray(buildingIds) ? buildingIds : [];
    let changed = false;
    for (let index = 0; index < ids.length; index += 1) {
      const buildingId = ids[index];
      if (preset.buildings[buildingId]) {
        continue;
      }
      const building = buildings[buildingId];
      if (!building) {
        continue;
      }
      const entry = this.captureBuildingSettings(
        building,
        preset.includeControl !== false,
        preset.includeAutomation !== false
      );
      if (!entry.control && !entry.automation) {
        continue;
      }
      preset.buildings[buildingId] = entry;
      changed = true;
    }
    return changed;
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
    const control = {};
    control.workerPriority = building.workerPriority;
    control.hidden = building.isHidden === true;
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
    const settings = {
      autoBuildEnabled: building.autoBuildEnabled,
      autoBuildPriority: building.autoBuildPriority,
      autoBuildBasis: building.autoBuildBasis === 'initialLand' ? 'geometricLand' : building.autoBuildBasis,
      autoBuildPercent: building.autoBuildPercent,
      autoBuildFixed: building.autoBuildFixed,
      autoBuildFillPercent: building.autoBuildFillPercent,
      autoBuildFillResourcePrimary: building.autoBuildFillResourcePrimary,
      autoBuildFillResourceSecondary: building.autoBuildFillResourceSecondary,
      autoActiveEnabled: building.autoActiveEnabled,
      autoUpgradeEnabled: building.autoUpgradeEnabled === true
    };
    if (building.name === 'dysonReceiver') {
      settings.capActiveToDysonCapacity = building.capActiveToDysonCapacity === true;
    }
    return settings;
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
      const entries = preset.buildings;
      for (const buildingId in entries) {
        const entry = entries[buildingId];
        if (preset.includeControl && entry.control) {
          resolved.control[buildingId] = entry.control;
        }
        if (preset.includeAutomation && entry.automation) {
          resolved.automation[buildingId] = entry.automation;
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
    const entries = preset.buildings || {};
    for (const buildingId in entries) {
      const entry = entries[buildingId];
      if (preset.includeControl && entry.control) {
        controlMap[buildingId] = entry.control;
      }
      if (preset.includeAutomation && entry.automation) {
        automationMap[buildingId] = entry.automation;
      }
    }
    this.applyResolvedMaps(controlMap, automationMap);
  }

  applyResolvedMaps(controlMap, automationMap) {
    const buildingList = Object.values(buildings);
    let changed = false;

    for (let index = 0; index < buildingList.length; index += 1) {
      const building = buildingList[index];
      const control = controlMap[building.name];
      const automation = automationMap[building.name];
      if (control) {
        if (this.applyControlSettings(building, control)) {
          changed = true;
        }
      }
      if (automation) {
        if (this.applyAutomationSettings(building, automation)) {
          changed = true;
        }
      }
    }

    if (changed) {
      updateBuildingDisplay(buildings);
    }
  }

  applyControlSettings(building, control) {
    let changed = false;
    if ('workerPriority' in control && building.workerPriority !== control.workerPriority) {
      building.workerPriority = control.workerPriority;
      changed = true;
    }
    if ('hidden' in control) {
      const shouldHide = control.hidden === true && building.active <= 0n;
      if (building.isHidden !== shouldHide) {
        building.isHidden = shouldHide;
        updateStructureHiddenPreference(building.name, shouldHide);
        changed = true;
      }
    }
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
        DustFactoryClass.loadAutomationSettings(control.dustFactory);
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
    let changed = false;
    if (building.autoBuildEnabled !== automation.autoBuildEnabled) {
      building.autoBuildEnabled = automation.autoBuildEnabled;
      changed = true;
    }
    if (building.autoBuildPriority !== automation.autoBuildPriority) {
      building.autoBuildPriority = automation.autoBuildPriority;
      changed = true;
    }
    const automationBasis = automation.autoBuildBasis === 'initialLand' ? 'geometricLand' : automation.autoBuildBasis;
    if (building.autoBuildBasis !== automationBasis) {
      building.autoBuildBasis = automationBasis;
      if (typeof building.normalizeAutoBuildBasis === 'function') {
        building.normalizeAutoBuildBasis();
      }
      changed = true;
    }
    if (building.autoBuildPercent !== automation.autoBuildPercent) {
      building.autoBuildPercent = automation.autoBuildPercent;
      changed = true;
    }
    if ('autoBuildFixed' in automation && building.autoBuildFixed !== automation.autoBuildFixed) {
      building.autoBuildFixed = automation.autoBuildFixed;
      changed = true;
    }
    if (building.autoBuildFillPercent !== automation.autoBuildFillPercent) {
      building.autoBuildFillPercent = automation.autoBuildFillPercent;
      changed = true;
    }
    if (building.autoBuildFillResourcePrimary !== automation.autoBuildFillResourcePrimary) {
      building.autoBuildFillResourcePrimary = automation.autoBuildFillResourcePrimary;
      changed = true;
    }
    if (building.autoBuildFillResourceSecondary !== automation.autoBuildFillResourceSecondary) {
      building.autoBuildFillResourceSecondary = automation.autoBuildFillResourceSecondary;
      changed = true;
    }
    if (building.autoActiveEnabled !== automation.autoActiveEnabled) {
      building.autoActiveEnabled = automation.autoActiveEnabled;
      changed = true;
    }
    if ('autoUpgradeEnabled' in automation && building.autoUpgradeEnabled !== automation.autoUpgradeEnabled) {
      building.autoUpgradeEnabled = automation.autoUpgradeEnabled === true;
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

  areSettingsEqual(left, right) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (left[key] !== right[key]) {
        return false;
      }
    }
    return true;
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

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        showInSidebar: preset.showInSidebar !== false,
        includeControl: !!preset.includeControl,
        includeAutomation: !!preset.includeAutomation,
        scopeAll: !!preset.scopeAll,
        buildings: Object.fromEntries(
          Object.entries(preset.buildings).map(([key, entry]) => [
            key,
            {
              control: entry.control ? { ...entry.control } : null,
              automation: entry.automation ? {
                ...entry.automation,
                autoBuildBasis: entry.automation.autoBuildBasis === 'initialLand' ? 'geometricLand' : entry.automation.autoBuildBasis
              } : null
            }
          ])
        )
      })),
      assignments: this.serializeAssignments(),
      combinations: this.serializeCombinations(),
      everEnabledBuildings: Array.from(this.everEnabledBuildings),
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
      showInSidebar: preset.showInSidebar !== false,
      includeControl: preset.includeControl !== false,
      includeAutomation: preset.includeAutomation !== false,
      scopeAll: preset.scopeAll === true,
      buildings: Object.fromEntries(
        Object.entries(preset.buildings || {}).map(([buildingId, entry]) => {
          const control = entry?.control ? { ...entry.control } : null;
          let automation = entry?.automation ? { ...entry.automation } : null;
          if (control && 'autoUpgradeEnabled' in control && !automation) {
            automation = {};
          }
          if (control && 'autoUpgradeEnabled' in control && automation && !('autoUpgradeEnabled' in automation)) {
            automation.autoUpgradeEnabled = control.autoUpgradeEnabled === true;
            delete control.autoUpgradeEnabled;
          }
          if (automation && automation.autoBuildBasis === 'initialLand') {
            automation.autoBuildBasis = 'geometricLand';
          }
          return [buildingId, {
            control,
            automation
          }];
        })
      )
    })) : [];
    this.loadAssignmentsFromState(data.assignments);
    this.loadCombinationsFromState(data.combinations);
    this.everEnabledBuildings = new Set(
      Array.isArray(data.everEnabledBuildings) ? data.everEnabledBuildings : []
    );
    this.loadCommonListState(data, { allowLegacyApplyOnNextTravel: true });
    this.recordCurrentlyAvailableBuildings();
  }
}

try {
  module.exports = { BuildingAutomation };
} catch (error) {}
