const EffectableEntity = require('../src/js/effectable-entity');
const { formatNumber } = require('../src/js/numbers');

let Building;
let getProdConsSections;

function createResource({ unlocked, hideWhenSmall, value = 0, productionRate = 0, consumptionRate = 0, displayName }) {
  return {
    unlocked,
    hideWhenSmall,
    value,
    productionRate,
    consumptionRate,
    displayName
  };
}

describe('structures UI production/consumption visibility', () => {
  beforeEach(() => {
    global.EffectableEntity = EffectableEntity;
    global.formatNumber = formatNumber;
    ({ Building } = require('../src/js/building'));
    ({ getProdConsSections } = require('../src/js/structuresUI'));
    global.resources = {
      colony: {
        energy: createResource({
          unlocked: true,
          hideWhenSmall: false,
          value: 1,
          displayName: 'Energy'
        })
      },
      surface: {
        garbage: createResource({
          unlocked: false,
          hideWhenSmall: true,
          displayName: 'Garbage'
        }),
        trash: createResource({
          unlocked: false,
          hideWhenSmall: true,
          displayName: 'Trash'
        }),
        junk: createResource({
          unlocked: false,
          hideWhenSmall: true,
          displayName: 'Junk'
        }),
        scrapMetal: createResource({
          unlocked: false,
          hideWhenSmall: true,
          displayName: 'Scrap Metal'
        })
      }
    };
  });

  afterEach(() => {
    global.resources = {};
  });

  test('filters hidden resources unless alwaysShow flags are set', () => {
    const baseConfig = {
      name: 'Garbage Sorter',
      category: 'waste',
      description: '',
      cost: {},
      consumption: { colony: { energy: 1000000 }, surface: { garbage: 100 } },
      production: { surface: { trash: 33.33, junk: 33.33, scrapMetal: 33.34 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true
    };

    const hiddenBuilding = new Building(baseConfig, 'garbageSorter');
    const hiddenSections = getProdConsSections(hiddenBuilding, 1);
    const hiddenConsumption = hiddenSections.find(section => section.key === 'consumption');

    expect(hiddenSections.some(section => section.key === 'production')).toBe(false);
    expect(hiddenConsumption.keys).toContain('colony.energy');
    expect(hiddenConsumption.keys).not.toContain('surface.garbage');

    const alwaysShowBuilding = new Building({
      ...baseConfig,
      alwaysShowProduction: true,
      alwaysShowConsumption: true
    }, 'garbageSorter');
    const showSections = getProdConsSections(alwaysShowBuilding, 1);
    const showProduction = showSections.find(section => section.key === 'production');
    const showConsumption = showSections.find(section => section.key === 'consumption');

    expect(showProduction.keys).toEqual([
      'surface.trash',
      'surface.junk',
      'surface.scrapMetal'
    ]);
    expect(showConsumption.keys).toContain('surface.garbage');
  });
});
