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

class BuildingAutomation {
  constructor() {
    this.presets = [];
    this.assignments = [];
    this.combinations = [];
    this.collapsed = false;
    this.masterEnabled = true;
    this.applyOnNextTravel = false;
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
    return automationManager.enabled && automationManager.hasFeature('automationBuildings');
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
  }

  applyCombination(id) {
    const combo = this.getCombinationById(id);
    this.setAssignments(combo.assignments);
  }

  addPreset(name, buildingIds, options = {}) {
    const preset = this.buildPreset(name, buildingIds, options);
    this.presets.push(preset);
    return preset.id;
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

  buildPreset(name, buildingIds, options = {}, idOverride) {
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
    return {
      autoBuildEnabled: building.autoBuildEnabled,
      autoBuildPriority: building.autoBuildPriority,
      autoBuildBasis: building.autoBuildBasis,
      autoBuildPercent: building.autoBuildPercent,
      autoBuildFixed: building.autoBuildFixed,
      autoBuildFillPercent: building.autoBuildFillPercent,
      autoBuildFillResourcePrimary: building.autoBuildFillResourcePrimary,
      autoBuildFillResourceSecondary: building.autoBuildFillResourceSecondary,
      autoActiveEnabled: building.autoActiveEnabled
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

  applyPresetOnce(presetId) {
    const preset = this.getPresetById(presetId);
    const controlMap = {};
    const automationMap = {};
    const entries = preset.buildings;
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
    if (building.autoBuildBasis !== automation.autoBuildBasis) {
      building.autoBuildBasis = automation.autoBuildBasis;
      changed = true;
    }
    if (building.autoBuildPercent !== automation.autoBuildPercent) {
      building.autoBuildPercent = automation.autoBuildPercent;
      changed = true;
    }
    if (building.autoBuildFixed !== automation.autoBuildFixed) {
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
  }

  saveState() {
    return {
      presets: this.presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        includeControl: !!preset.includeControl,
        includeAutomation: !!preset.includeAutomation,
        scopeAll: !!preset.scopeAll,
        buildings: Object.fromEntries(
          Object.entries(preset.buildings).map(([key, entry]) => [
            key,
            {
              control: entry.control ? { ...entry.control } : null,
              automation: entry.automation ? { ...entry.automation } : null
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
      applyOnNextTravel: !!this.applyOnNextTravel,
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
      buildings: preset.buildings || {}
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
    this.applyOnNextTravel = !!data.applyOnNextTravel;
    this.nextPresetId = data.nextPresetId || this.presets.length + 1;
    this.nextAssignmentId = data.nextAssignmentId || this.assignments.length + 1;
    this.nextCombinationId = data.nextCombinationId || this.combinations.length + 1;
  }
}

try {
  module.exports = { BuildingAutomation };
} catch (error) {}
