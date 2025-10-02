const EffectableEntity = require('../src/js/effectable-entity.js');
// expose globally before requiring Building
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { Biodome } = require('../src/js/buildings/Biodome.js');

function createBiodome(){
  const config = {
    name: 'Biodome',
    category: 'terraforming',
    cost: {},
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Biodome(config, 'biodome');
}

describe('biodome productivity requires survivable environment', () => {
  beforeEach(() => {
    global.resources = { colony:{}, surface:{}, underground:{}, atmospheric:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
  });

  test('productivity zero when life cannot survive anywhere', () => {
    global.lifeDesigner = { currentDesign: { canSurviveAnywhere: () => false } };
    const fac = createBiodome();
    fac.active = 1;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBe(0);
  });

  test('produces when life can survive somewhere', () => {
    global.lifeDesigner = { currentDesign: { canSurviveAnywhere: () => true } };
    const fac = createBiodome();
    fac.active = 1;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });
});
