const { BuildingAutomation } = require('../src/js/automation/building-automation.js');

function createBuilding() {
  return {
    name: 'testBuilding',
    unlocked: true,
    autoBuildEnabled: true,
    autoBuildPriority: 4,
    autoBuildBasis: 'population',
    autoBuildPercent: 12,
    autoBuildFixed: 500,
    autoBuildFillPercent: 80,
    autoBuildFillResourcePrimary: 'metal',
    autoBuildFillResourceSecondary: 'glass',
    autoActiveEnabled: true,
    autoUpgradeEnabled: false,
    workerPriority: 2,
    isHidden: false,
    active: 0n,
    normalizeAutoBuildBasis: jest.fn()
  };
}

describe('Building automation empty settings', () => {
  let originalGlobals;

  beforeEach(() => {
    originalGlobals = {
      buildings: global.buildings,
      automationManager: global.automationManager,
      updateBuildingDisplay: global.updateBuildingDisplay,
      updateStructureHiddenPreference: global.updateStructureHiddenPreference
    };
    global.automationManager = {
      enabled: true,
      hasFeature() {
        return true;
      }
    };
    global.updateBuildingDisplay = jest.fn();
    global.updateStructureHiddenPreference = jest.fn();
  });

  afterEach(() => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  });

  it('does not apply missing automation fields from empty or partial preset entries', () => {
    const automation = new BuildingAutomation();
    const building = createBuilding();
    global.buildings = { testBuilding: building };
    automation.presets = [{
      id: 1,
      name: 'Partial',
      includeControl: true,
      includeAutomation: true,
      scopeAll: false,
      projects: {},
      buildings: {
        testBuilding: {
          control: null,
          automation: {
            autoUpgradeEnabled: true
          }
        }
      }
    }];

    automation.applyPresetOnce(1);

    expect(building.autoUpgradeEnabled).toBe(true);
    expect(building.autoBuildEnabled).toBe(true);
    expect(building.autoBuildPriority).toBe(4);
    expect(building.autoBuildBasis).toBe('population');
    expect(building.autoBuildPercent).toBe(12);
    expect(building.autoBuildFixed).toBe(500);
    expect(building.autoBuildFillPercent).toBe(80);
    expect(building.autoBuildFillResourcePrimary).toBe('metal');
    expect(building.autoBuildFillResourceSecondary).toBe('glass');
    expect(building.autoActiveEnabled).toBe(true);
  });

  it('migrates legacy control autoUpgradeEnabled without creating empty automation settings', () => {
    const automation = new BuildingAutomation();
    const building = createBuilding();
    global.buildings = { testBuilding: building };

    automation.loadState({
      presets: [{
        id: 1,
        name: 'Legacy',
        includeControl: true,
        includeAutomation: true,
        buildings: {
          testBuilding: {
            control: {
              autoUpgradeEnabled: true
            },
            automation: null
          }
        }
      }]
    });

    expect(automation.presets[0].buildings.testBuilding.control).toBeNull();
    expect(automation.presets[0].buildings.testBuilding.automation).toEqual({
      autoUpgradeEnabled: true
    });
  });
});
