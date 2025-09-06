const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(gravity) {
  const ctx = { console };
  ctx.milestonesManager = { getHappinessBonus: () => 0 };
  ctx.colonySliderSettings = { mechanicalAssistance: 0 };
  ctx.resources = { colony: { metal: { updateStorageCap: () => {}, maintenanceMultiplier: 1 } } };
  ctx.buildings = {};
  ctx.terraforming = { celestialParameters: { gravity } };
  ctx.maintenanceFraction = 0;
  vm.createContext(ctx);

  const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
  vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
  const buildingCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
  vm.runInContext(buildingCode + '; this.Building = Building;', ctx);
  const colonyCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');
  vm.runInContext(colonyCode + '; this.Colony = Colony;', ctx);

  const config = {
    name: 'Base',
    category: 'Colony',
    cost: { colony: { metal: 1 } },
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: false,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true,
    baseComfort: 0
  };

  const colony = new ctx.Colony(config, 'base');
  colony.updateNeedsRatio = () => {};
  colony.filledNeeds.food = 1;
  colony.filledNeeds.energy = 1;
  return colony;
}

describe('gravity happiness penalty', () => {
  test('reduces happiness above 10 m/s²', () => {
    const colony = setup(12);
    colony.updateHappiness(1);
    expect(colony.happiness).toBeCloseTo(0.45);
  });

  test('caps happiness at zero when penalty reaches 100%', () => {
    const colony = setup(35);
    colony.updateHappiness(1);
    expect(colony.happiness).toBe(0);
  });
});

