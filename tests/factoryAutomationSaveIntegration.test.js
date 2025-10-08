const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory } = require('../src/js/buildings/GhgFactory.js');
const { OxygenFactory } = require('../src/js/buildings/OxygenFactory.js');
const { getGameState } = require('../src/js/save.js');

function createGhgFactory() {
  const config = {
    name: 'GHG Factory',
    category: 'terraforming',
    description: '',
    cost: {},
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: true,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 0,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true,
    surfaceArea: 0,
    requiresProductivity: true,
    requiresLand: 0,
    temperatureMaintenanceImmune: false,
    powerPerBuilding: 0
  };
  return new GhgFactory(config, 'ghgFactory');
}

function createOxygenFactory() {
  const config = {
    name: 'O2 Factory',
    category: 'terraforming',
    description: '',
    cost: {},
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: true,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 0,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true,
    surfaceArea: 0,
    requiresProductivity: true,
    requiresLand: 0,
    temperatureMaintenanceImmune: false,
    powerPerBuilding: 0
  };
  return new OxygenFactory(config, 'oxygenFactory');
}

describe('factory automation settings integrate with save system', () => {
  beforeEach(() => {
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.resources = { colony: {}, atmospheric: {}, surface: {}, underground: {} };
    global.registerBuildingUnlockAlert = () => {};
    global.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    global.colonies = {};
    global.projectManager = { saveState: () => ({}) };
    global.researchManager = { saveState: () => ({}) };
    global.oreScanner = { saveState: () => ({}) };
    global.terraforming = { saveState: () => ({}) };
    global.storyManager = { saveState: () => ({}), loadState: () => {}, appliedEffects: [], reapplyEffects: () => {} };
    global.nanotechManager = { saveState: () => ({}) };
    global.solisManager = { saveState: () => ({}) };
    global.warpGateCommand = { saveState: () => ({}) };
    global.lifeDesigner = { saveState: () => ({}) };
    global.milestonesManager = { saveState: () => ({}) };
    global.skillManager = { saveState: () => ({}) };
    global.spaceManager = { saveState: () => ({}) };
    global.galaxyManager = { saveState: () => ({}) };
    global.selectedBuildCounts = {};
    global.gameSettings = {};
    global.colonySliderSettings = { saveState: () => ({}) };
    global.saveConstructionOfficeState = () => ({});
    global.playTimeSeconds = 0;
    global.totalPlayTimeSeconds = 0;
  });

  test('automation settings persist through building save data', () => {
    const ghgFactory = createGhgFactory();
    const oxygenFactory = createOxygenFactory();

    global.buildings = {
      ghgFactory,
      oxygenFactory
    };

    GhgFactory.loadAutomationSettings({
      autoDisableAboveTemp: true,
      disableTempThreshold: 287,
      reverseTempThreshold: 292
    });
    OxygenFactory.loadAutomationSettings({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 21
    });

    const snapshot = getGameState();

    expect(snapshot.ghgFactorySettings).toBeUndefined();
    expect(snapshot.oxygenFactorySettings).toBeUndefined();

    expect(snapshot.buildings.ghgFactory.automationSettings).toEqual({
      autoDisableAboveTemp: true,
      disableTempThreshold: 287,
      reverseTempThreshold: 292
    });
    expect(snapshot.buildings.oxygenFactory.automationSettings).toEqual({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 21
    });
  });
});
