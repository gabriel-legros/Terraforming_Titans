const EffectableEntity = require('../src/js/effectable-entity');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc/wgc.js');

describe('Warp Gate Command facility upgrades', () => {
  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('facility upgrades are not available when all facilities are maxed', () => {
    const manager = new WarpGateCommand();
    Object.keys(manager.facilities).forEach(key => {
      manager.facilities[key] = 100;
    });
    manager.facilityCooldown = 0;

    expect(manager.areFacilitiesMaxed()).toBe(true);
    expect(manager.isFacilityUpgradeReady()).toBe(false);
  });

  test('facility cooldown clears when facilities are maxed', () => {
    const manager = new WarpGateCommand();
    Object.keys(manager.facilities).forEach(key => {
      manager.facilities[key] = 100;
    });
    manager.facilityCooldown = 120;

    manager.update(1000);

    expect(manager.facilityCooldown).toBe(0);
  });

  test('facility upgrade is available when cooldown elapses and not maxed', () => {
    const manager = new WarpGateCommand();
    manager.facilityCooldown = 0;

    expect(manager.isFacilityUpgradeReady()).toBe(true);
  });
});
