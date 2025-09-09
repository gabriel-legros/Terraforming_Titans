const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
const { Biodome } = require('../src/js/buildings/Biodome.js');
global.initializeBuildingTabs = () => {};

describe('initializeBuildings biodome mapping', () => {
  test('returns Biodome instance for biodome', () => {
    const params = {
      biodome: {
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
      }
    };
    const buildings = initializeBuildings(params);
    expect(buildings.biodome).toBeInstanceOf(Biodome);
  });
});
