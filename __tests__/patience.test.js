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
  let superconductors;
  let advancedResearch;
  let oneillCount;
  let wgcUpdates;

  beforeEach(() => {
    superalloys = {
      productionRate: 2,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };

    superconductors = {
      productionRate: 0.5,
      unlocked: true,
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
    wgcUpdates = [];

    global.resources = {
      colony: {
        superalloys,
        superconductors,
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
    global.warpGateCommand = {
      enabled: true,
      update: (deltaMs) => {
        wgcUpdates.push(deltaMs);
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
    delete global.warpGateCommand;
  });

  test('spending patience rewards superalloys, superconductors, advanced research, and O\'Neill cylinders', () => {
    const success = patienceManager.spendPatience(2);

    expect(success).toBe(true);
    expect(patienceManager.currentHours).toBe(8);
    expect(superalloys.value).toBeCloseTo(14400);
    expect(superconductors.value).toBeCloseTo(3600);
    expect(advancedResearch.value).toBeCloseTo(7200);
    expect(oneillCount).toBeCloseTo(10.18, 2);
    expect(wgcUpdates.length).toBe(120);
    expect(wgcUpdates.every(ms => ms === 60000)).toBe(true);
  });
});
