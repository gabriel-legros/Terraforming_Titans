const { describe, beforeEach, test, expect } = global;

describe('BuildingAutomation presets', () => {
  let BuildingAutomation;
  let automation;
  let building;
  let ChemicalReactor;

  beforeEach(() => {
    jest.resetModules();
    class MultiRecipesBuilding {}
    ChemicalReactor = class ChemicalReactor extends MultiRecipesBuilding {};
    ChemicalReactor.settings = { autoDisable: true, amount: 15 };
    ChemicalReactor.saveAutomationSettings = () => ({ ...ChemicalReactor.settings });
    ChemicalReactor.loadAutomationSettings = (data) => {
      ChemicalReactor.settings = { ...data };
    };

    global.MultiRecipesBuilding = MultiRecipesBuilding;
    global.ChemicalReactor = ChemicalReactor;
    global.GhgFactory = class GhgFactory {};
    global.OxygenFactory = class OxygenFactory {};
    global.DustFactory = class DustFactory {};
    global.updateBuildingDisplay = jest.fn();

    class StubBuilding extends ChemicalReactor {
      constructor() {
        super();
        this.name = 'chemicalReactor';
        this.displayName = 'Chemical Reactor';
        this.category = 'terraforming';
        this.unlocked = true;
        this.isHidden = false;
        this.currentRecipeKey = 'recipe1';
        this.autoBuildEnabled = false;
        this.autoBuildPriority = false;
        this.autoBuildBasis = 'population';
        this.autoBuildPercent = 25;
        this.autoBuildFillPercent = 95;
        this.autoBuildFillResourcePrimary = 'any';
        this.autoBuildFillResourceSecondary = 'none';
        this.autoActiveEnabled = false;
      }

      isVisible() {
        return this.unlocked && !this.isHidden;
      }

      setRecipe(key) {
        this.currentRecipeKey = key;
      }
    }

    building = new StubBuilding();
    global.buildings = { chemicalReactor: building };

    ({ BuildingAutomation } = require('../src/js/automation/building-automation.js'));
    automation = new BuildingAutomation();
  });

  test('captures and reapplies control and automation settings', () => {
    const presetId = automation.addPreset('Base', ['chemicalReactor'], {
      includeControl: true,
      includeAutomation: true
    });

    building.currentRecipeKey = 'recipe2';
    building.autoBuildEnabled = true;
    building.autoBuildPriority = true;
    building.autoBuildBasis = 'workers';
    building.autoBuildPercent = 40;
    building.autoActiveEnabled = true;
    ChemicalReactor.settings = { autoDisable: false, amount: 2 };

    automation.addAssignment(presetId);
    automation.applyPresets();

    expect(building.currentRecipeKey).toBe('recipe1');
    expect(building.autoBuildEnabled).toBe(false);
    expect(building.autoBuildPriority).toBe(false);
    expect(building.autoBuildBasis).toBe('population');
    expect(building.autoBuildPercent).toBe(25);
    expect(building.autoActiveEnabled).toBe(false);
    expect(ChemicalReactor.settings.autoDisable).toBe(true);
    expect(updateBuildingDisplay).toHaveBeenCalled();
  });

  test('lower assignments override higher presets for automation settings', () => {
    const firstId = automation.addPreset('First', ['chemicalReactor'], {
      includeControl: false,
      includeAutomation: true
    });

    building.autoBuildBasis = 'workers';
    building.autoBuildPercent = 60;

    const secondId = automation.addPreset('Second', ['chemicalReactor'], {
      includeControl: false,
      includeAutomation: true
    });

    building.autoBuildBasis = 'population';
    building.autoBuildPercent = 10;

    automation.addAssignment(firstId);
    automation.addAssignment(secondId);
    automation.applyPresets();

    expect(building.autoBuildBasis).toBe('workers');
    expect(building.autoBuildPercent).toBe(60);
  });

  test('disabled assignments skip application', () => {
    const presetId = automation.addPreset('Disabled', ['chemicalReactor'], {
      includeControl: false,
      includeAutomation: true
    });

    building.autoBuildBasis = 'workers';
    building.autoBuildPercent = 33;

    const assignmentId = automation.addAssignment(presetId);
    automation.setAssignmentEnabled(assignmentId, false);
    automation.applyPresets();

    expect(building.autoBuildBasis).toBe('workers');
    expect(building.autoBuildPercent).toBe(33);
  });

  test('applyPresetOnce applies settings immediately', () => {
    const presetId = automation.addPreset('One Off', ['chemicalReactor'], {
      includeControl: true,
      includeAutomation: true
    });

    building.currentRecipeKey = 'recipe2';
    building.autoBuildEnabled = true;
    building.autoBuildPriority = true;
    building.autoBuildBasis = 'workers';
    building.autoBuildPercent = 40;
    building.autoActiveEnabled = true;
    ChemicalReactor.settings = { autoDisable: false, amount: 2 };

    automation.applyPresetOnce(presetId);

    expect(building.currentRecipeKey).toBe('recipe1');
    expect(building.autoBuildEnabled).toBe(false);
    expect(building.autoBuildPriority).toBe(false);
    expect(building.autoBuildBasis).toBe('population');
    expect(building.autoBuildPercent).toBe(25);
    expect(building.autoActiveEnabled).toBe(false);
    expect(ChemicalReactor.settings.autoDisable).toBe(true);
    expect(updateBuildingDisplay).toHaveBeenCalled();
  });

  test('combinations restore assignment lists', () => {
    const firstId = automation.addPreset('First', ['chemicalReactor'], {
      includeControl: false,
      includeAutomation: true
    });
    const secondId = automation.addPreset('Second', ['chemicalReactor'], {
      includeControl: false,
      includeAutomation: true
    });

    automation.addAssignment(firstId);
    const secondAssignmentId = automation.addAssignment(secondId);
    automation.setAssignmentEnabled(secondAssignmentId, false);

    const comboId = automation.addCombination('Combo', automation.getAssignments());
    automation.setAssignments([]);
    automation.applyCombination(comboId);

    const restoredAssignments = automation.getAssignments();
    expect(restoredAssignments).toHaveLength(2);
    expect(restoredAssignments[0].presetId).toBe(firstId);
    expect(restoredAssignments[1].presetId).toBe(secondId);
    expect(restoredAssignments[1].enabled).toBe(false);

    const state = automation.saveState();
    const restored = new BuildingAutomation();
    restored.loadState(state);
    const combo = restored.getCombinationById(comboId);
    expect(combo.assignments).toHaveLength(2);
  });

  test('scopeAll persists through save/load', () => {
    const presetId = automation.addPreset('All', ['chemicalReactor'], {
      includeControl: true,
      includeAutomation: true,
      scopeAll: true
    });

    const state = automation.saveState();
    const restored = new BuildingAutomation();
    restored.loadState(state);

    const preset = restored.getPresetById(presetId);
    expect(preset.scopeAll).toBe(true);
  });
});
