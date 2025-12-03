global.EffectableEntity = class {
  constructor() {
    this.activeEffects = [];
    this.booleanFlags = new Set();
  }
  applyActiveEffects() {}
  addEffect(effect) {
    this.activeEffects.push(effect);
  }
  isBooleanFlagSet(id) {
    return this.booleanFlags.has(id);
  }
};

const PatienceManager = require('../src/js/hope/patience.js');

describe('PatienceManager spending', () => {
  let patienceManager;
  let superalloys;
  let advancedResearch;
  let oneillCount;

  beforeEach(() => {
    superalloys = {
      productionRate: 2,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };

    advancedResearch = {
      productionRate: 1,
      unlocked: true,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };

    oneillCount = 10;

    global.resources = {
      colony: {
        superalloys,
        advancedResearch,
      },
    };

    global.spaceManager = {
      isBooleanFlagSet: (flag) => flag === 'oneillCylinders',
      getTerraformedPlanetCount: () => 10,
      getOneillCylinderCount: () => oneillCount,
      setOneillCylinderCount: (value) => {
        oneillCount = value;
        return oneillCount;
      },
    };

    global.galaxyManager = {};
    global.getOneillCylinderCapacity = () => 100;
    global.updateOneillCylinderStatsUI = () => {};

    patienceManager = new PatienceManager();
    patienceManager.enable();
    patienceManager.currentHours = 10;
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.resources;
    delete global.spaceManager;
    delete global.galaxyManager;
    delete global.getOneillCylinderCapacity;
    delete global.updateOneillCylinderStatsUI;
  });

  test('spending patience rewards superalloys, advanced research, and O\'Neill cylinders', () => {
    const success = patienceManager.spendPatience(2);

    expect(success).toBe(true);
    expect(patienceManager.currentHours).toBe(8);
    expect(superalloys.value).toBeCloseTo(14400);
    expect(advancedResearch.value).toBeCloseTo(7200);
    expect(oneillCount).toBeCloseTo(10.18, 2);
  });
});
