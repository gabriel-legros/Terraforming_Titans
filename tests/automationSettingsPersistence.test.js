const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory } = require('../src/js/buildings/GhgFactory.js');
const { OxygenFactory } = require('../src/js/buildings/OxygenFactory.js');

describe('Factory automation settings persistence', () => {
  beforeEach(() => {
    GhgFactory.loadAutomationSettings({});
    OxygenFactory.loadAutomationSettings({});
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
});
