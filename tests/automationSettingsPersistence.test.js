const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory } = require('../src/js/buildings/GhgFactory.js');
const { OxygenFactory } = require('../src/js/buildings/OxygenFactory.js');

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

describe('Factory automation settings persistence', () => {
  beforeEach(() => {
    GhgFactory.loadAutomationSettings({});
    OxygenFactory.loadAutomationSettings({});
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.resources = { colony: {}, atmospheric: {}, surface: {}, underground: {} };
    global.registerBuildingUnlockAlert = () => {};
  });

  test('GHG factory saves and loads automation settings', () => {
    GhgFactory.loadAutomationSettings({
      autoDisableAboveTemp: true,
      disableTempThreshold: 290,
      reverseTempThreshold: 296
    });
    const snapshot = GhgFactory.saveAutomationSettings();
    expect(snapshot).toEqual({
      autoDisableAboveTemp: true,
      disableTempThreshold: 290,
      reverseTempThreshold: 296
    });
    snapshot.autoDisableAboveTemp = false;
    const current = GhgFactory.getAutomationSettings();
    expect(current.autoDisableAboveTemp).toBe(true);

    GhgFactory.loadAutomationSettings({
      autoDisableAboveTemp: false,
      disableTempThreshold: 275
    });
    const adjusted = GhgFactory.getAutomationSettings();
    expect(adjusted.autoDisableAboveTemp).toBe(false);
    expect(adjusted.disableTempThreshold).toBe(275);
    const partialSnapshot = GhgFactory.saveAutomationSettings();
    expect(partialSnapshot.reverseTempThreshold).toBeCloseTo(adjusted.reverseTempThreshold, 5);
    expect(Number.isFinite(adjusted.reverseTempThreshold)).toBe(true);
  });

  test('Oxygen factory saves and loads automation settings', () => {
    OxygenFactory.loadAutomationSettings({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 25
    });
    const snapshot = OxygenFactory.saveAutomationSettings();
    expect(snapshot).toEqual({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 25
    });
    snapshot.disablePressureThreshold = 99;
    const current = OxygenFactory.getAutomationSettings();
    expect(current.disablePressureThreshold).toBe(25);

    OxygenFactory.loadAutomationSettings({});
    const reset = OxygenFactory.getAutomationSettings();
    expect(reset.autoDisableAbovePressure).toBe(false);
    expect(reset.disablePressureThreshold).toBe(15);
  });

  test('GHG factory state serialization includes automation settings', () => {
    const factory = createGhgFactory();
    GhgFactory.loadAutomationSettings({
      autoDisableAboveTemp: true,
      disableTempThreshold: 288,
      reverseTempThreshold: 293
    });

    const snapshot = factory.saveState();
    expect(snapshot.automationSettings).toEqual({
      autoDisableAboveTemp: true,
      disableTempThreshold: 288,
      reverseTempThreshold: 293
    });

    GhgFactory.loadAutomationSettings({});
    factory.loadState({ automationSettings: { autoDisableAboveTemp: false, disableTempThreshold: 279, reverseTempThreshold: 285 } });

    const settings = GhgFactory.getAutomationSettings();
    expect(settings.autoDisableAboveTemp).toBe(false);
    expect(settings.disableTempThreshold).toBe(279);
    expect(settings.reverseTempThreshold).toBe(285);
  });

  test('Oxygen factory state serialization includes automation settings', () => {
    const factory = createOxygenFactory();
    OxygenFactory.loadAutomationSettings({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 22
    });

    const snapshot = factory.saveState();
    expect(snapshot.automationSettings).toEqual({
      autoDisableAbovePressure: true,
      disablePressureThreshold: 22
    });

    OxygenFactory.loadAutomationSettings({});
    factory.loadState({ automationSettings: { autoDisableAbovePressure: true, disablePressureThreshold: 19 } });

    const settings = OxygenFactory.getAutomationSettings();
    expect(settings.autoDisableAbovePressure).toBe(true);
    expect(settings.disablePressureThreshold).toBe(19);
  });
});
