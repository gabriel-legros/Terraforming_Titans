const EffectableEntity = require('../src/js/effectable-entity');

describe('autobuild percent clamping', () => {
  let Building;

  beforeEach(() => {
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0.001;
    ({ Building } = require('../src/js/building'));
  });

  test('clamps negative autobuild percent on load', () => {
    const building = new Building({
      name: 'Test Structure',
      category: 'production',
      description: '',
      cost: { colony: { metal: 1 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true
    }, 'testStructure');

    building.loadState({ autoBuildPercent: -5, autoBuildStep: 0.01 });

    expect(building.autoBuildPercent).toBe(0);
  });
});
