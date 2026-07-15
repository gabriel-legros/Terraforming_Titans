global.t = global.t || ((_key, _vars, fallback) => fallback);

const { ColonyAutomation } = require('../src/js/automation/colony-automation.js');

function createColony() {
  return {
    name: 't1_colony',
    displayName: 'Research Outpost',
    unlocked: true,
    autoBuildEnabled: true,
    autoBuildPriority: 3,
    autoBuildBasis: 'population',
    autoBuildPercent: 8,
    autoBuildFixed: 250,
    autoBuildFillPercent: 70,
    autoBuildFillResourcePrimary: 'metal',
    autoBuildFillResourceSecondary: 'glass',
    autoActiveEnabled: true,
    autoUpgradeEnabled: false,
    workerPriority: 1,
    isHidden: false,
    active: 0n,
    luxuryResourcesEnabled: {}
  };
}

describe('Colony automation empty settings', () => {
  let originalGlobals;

  beforeEach(() => {
    originalGlobals = {
      colonies: global.colonies,
      automationManager: global.automationManager,
      updateStructureHiddenPreference: global.updateStructureHiddenPreference
    };
    global.colonies = { t1_colony: createColony() };
    global.automationManager = {
      enabled: true,
      hasFeature() {
        return true;
      }
    };
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
    const automation = new ColonyAutomation();
    automation.presets = [{
      id: 1,
      name: 'Partial',
      includeControl: true,
      includeAutomation: true,
      scopeAll: false,
      targets: {
        'colony:t1_colony': {
          categoryId: 'colonyBuildings',
          control: null,
          automation: {
            autoUpgradeEnabled: true
          }
        }
      }
    }];

    automation.applyPresetOnce(1);

    const colony = global.colonies.t1_colony;
    expect(colony.autoUpgradeEnabled).toBe(true);
    expect(colony.autoBuildEnabled).toBe(true);
    expect(colony.autoBuildPriority).toBe(3);
    expect(colony.autoBuildBasis).toBe('population');
    expect(colony.autoBuildPercent).toBe(8);
    expect(colony.autoBuildFixed).toBe(250);
    expect(colony.autoBuildFillPercent).toBe(70);
    expect(colony.autoBuildFillResourcePrimary).toBe('metal');
    expect(colony.autoBuildFillResourceSecondary).toBe('glass');
    expect(colony.autoActiveEnabled).toBe(true);
  });

  it('migrates legacy control autoUpgradeEnabled without creating empty automation settings', () => {
    const automation = new ColonyAutomation();

    automation.loadState({
      presets: [{
        id: 1,
        name: 'Legacy',
        includeControl: true,
        includeAutomation: true,
        targets: {
          'colony:t1_colony': {
            categoryId: 'colonyBuildings',
            control: {
              autoUpgradeEnabled: true
            },
            automation: null
          }
        }
      }]
    });

    expect(automation.presets[0].targets['colony:t1_colony'].control).toBeNull();
    expect(automation.presets[0].targets['colony:t1_colony'].automation).toEqual({
      autoUpgradeEnabled: true
    });
  });
});
