const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory } = require('../src/js/buildings/GhgFactory.js');

function createGHGFactory(){
  const config = {
    name: 'Greenhouse Gas factory',
    category: 'terraforming',
    cost: {},
    consumption: {},
    production: { atmospheric: { greenhouseGas: 10 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true,
    reversalAvailable: true,
    defaultRecipe: 'ghg',
    recipes: {
      ghg: { production: { atmospheric: { greenhouseGas: 10 } }, reverseTarget: { category: 'atmospheric', resource: 'greenhouseGas' } },
      calcite: { production: { atmospheric: { calciteAerosol: 10 } }, reverseTarget: { category: 'atmospheric', resource: 'calciteAerosol' } }
    }
  };
  return new GhgFactory(config, 'ghgFactory');
}

function createDustFactory(){
  const config = {
    name: 'Black Dust Factory',
    category: 'terraforming',
    cost: {},
    consumption: {},
    production: { special: { albedoUpgrades: 100 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true,
    reversalAvailable: true,
    defaultRecipe: 'black',
    recipes: {
      black: { production: { special: { albedoUpgrades: 100 } }, reverseTarget: { category: 'special', resource: 'albedoUpgrades' } },
      white: { production: { special: { whiteDust: 100 } }, reverseTarget: { category: 'special', resource: 'whiteDust' } }
    }
  };
  return new Building(config, 'dustFactory');
}

describe('Reverse button toggles recipe when no factories are built', () => {
  test('GHG factory recipe swaps', () => {
    const fac = createGHGFactory();
    expect(fac.currentRecipeKey).toBe('ghg');
    fac.setReverseEnabled(true);
    expect(fac.currentRecipeKey).toBe('calcite');
    fac.setReverseEnabled(true);
    expect(fac.currentRecipeKey).toBe('ghg');
  });

  test('Dust factory recipe swaps', () => {
    const fac = createDustFactory();
    expect(fac.currentRecipeKey).toBe('black');
    fac.setReverseEnabled(true);
    expect(fac.currentRecipeKey).toBe('white');
    fac.setReverseEnabled(true);
    expect(fac.currentRecipeKey).toBe('black');
  });
});
