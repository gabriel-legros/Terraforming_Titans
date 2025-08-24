const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

describe('inactive build land handling', () => {
  beforeEach(() => {
    global.resources = {
      colony: {},
      surface: {
        land: {
          value: 5,
          reserved: 0,
          isAvailable(amount) { return this.value - this.reserved >= amount; },
          reserve(amount) { if (this.isAvailable(amount)) { this.reserved += amount; return true; } return false; },
          release(amount) { this.reserved = Math.max(this.reserved - amount, 0); }
        }
      }
    };
  });

  test('does not reserve land when built inactive', () => {
    const config = { name:'test', category:'resource', cost:{}, consumption:{}, production:{}, storage:{}, dayNightActivity:false, canBeToggled:false, requiresMaintenance:false, requiresDeposit:false, requiresWorker:0, maintenanceFactor:1, unlocked:true, requiresLand:2 };
    const building = new Building(config, 'test');
    const result = building.build(1, false);
    expect(result).toBe(true);
    expect(resources.surface.land.reserved).toBe(0);
    expect(building.count).toBe(1);
    expect(building.active).toBe(0);
  });

  test('reserves land when built active', () => {
    const config = { name:'test', category:'resource', cost:{}, consumption:{}, production:{}, storage:{}, dayNightActivity:false, canBeToggled:false, requiresMaintenance:false, requiresDeposit:false, requiresWorker:0, maintenanceFactor:1, unlocked:true, requiresLand:2 };
    const building = new Building(config, 'test');
    const result = building.build(1, true);
    expect(result).toBe(true);
    expect(resources.surface.land.reserved).toBe(2);
    expect(building.count).toBe(1);
    expect(building.active).toBe(1);
  });

  test('fails to build inactive without enough land', () => {
    resources.surface.land.value = 0;
    const config = { name:'test', category:'resource', cost:{}, consumption:{}, production:{}, storage:{}, dayNightActivity:false, canBeToggled:false, requiresMaintenance:false, requiresDeposit:false, requiresWorker:0, maintenanceFactor:1, unlocked:true, requiresLand:1 };
    const building = new Building(config, 'test');
    const result = building.build(1, false);
    expect(result).toBe(false);
    expect(resources.surface.land.reserved).toBe(0);
    expect(building.count).toBe(0);
  });
});
