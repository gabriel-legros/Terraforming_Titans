const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.maintenanceFraction = 0;
const { Building } = require('../src/js/building.js');

describe('enableReversal method on Building', () => {
  test('enableReversal flips reversalAvailable flag and refreshes UI', () => {
    const cfg = {
      name: 'Black Dust Factory',
      category: 'terraforming',
      description: '',
      cost: { colony: { metal: 1 } },
      consumption: { colony: { energy: 1 } },
      production: { special: { albedoUpgrades: 1 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresWorker: 0,
      unlocked: true,
      reversalAvailable: false,
      defaultRecipe: 'black',
      recipes: {
        black: {
          displayName: 'Black Dust Factory',
          production: { special: { albedoUpgrades: 1 } },
          reverseTarget: { category: 'special', resource: 'albedoUpgrades' }
        },
        white: {
          displayName: 'White Dust Factory',
          production: { special: { whiteDust: 1 } },
          reverseTarget: { category: 'special', resource: 'whiteDust' }
        }
      }
    };
    const b = new Building(cfg, 'dustFactory');
    global.buildings = { dustFactory: b };
    const calls = [];
    global.updateBuildingDisplay = () => { calls.push('update'); };
    expect(b.reversalAvailable).toBe(false);
    b.enableReversal();
    expect(b.reversalAvailable).toBe(true);
    expect(calls).toEqual(['update']);
  });
});

