const { autoBuild, setStrategicReserve, constructionOfficeState } = require('../src/js/autobuild.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.maintenanceFraction = 0;
const { Building } = require('../src/js/building.js');

describe('autobuild respects strategic reserve', () => {
  test('avoids building below reserve', () => {
    const config = {
      name: 'Test',
      category: 'colony',
      cost: { colony: { metal: 50 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: {},
      canBeToggled: false,
      maintenanceFactor: 1,
      requiresMaintenance: false,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
    };

    const b = new Building(config, 'test');
    b.autoBuildEnabled = true;
    b.autoBuildPercent = 100;

    global.resources = {
      colony: {
        colonists: { value: 100 },
        metal: { value: 80, cap: 100, decrease(v) { this.value -= v; } },
      },
      surface: {},
      underground: {},
    };

    setStrategicReserve(50);
    autoBuild({ t: b });
    expect(b.count).toBe(0);

    resources.colony.metal.value = 150;
    resources.colony.metal.cap = 200;
    autoBuild({ t: b });
    expect(b.count).toBe(1);
    expect(resources.colony.metal.value).toBe(100);
  });

  test('stores decimal strategic reserve values', () => {
    setStrategicReserve('12.5');
    expect(constructionOfficeState.strategicReserve).toBe(12.5);
    setStrategicReserve('105.75');
    expect(constructionOfficeState.strategicReserve).toBe(100);
  });
});
