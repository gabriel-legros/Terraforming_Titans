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
  let metal;
  let oneillCount;
  let wgcUpdates;
  let warpGateNetworkUpdates;

  beforeEach(() => {
    superalloys = {
      productionRate: 2,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };
    superalloys.productionRateByType = { building: { 'Superalloy Foundry': superalloys.productionRate } };

    superconductors = {
      productionRate: 0.5,
      unlocked: true,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };
    superconductors.productionRateByType = { building: { 'Superconductor Factory': superconductors.productionRate } };

    advancedResearch = {
      productionRate: 1,
      unlocked: true,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };

    metal = {
      productionRate: 5,
      consumptionRate: 2,
      value: 0,
      increase(amount) {
        this.value += amount;
      },
    };

    oneillCount = 10;
    wgcUpdates = [];
    warpGateNetworkUpdates = [];

    global.resources = {
      colony: {
        metal,
        superalloys,
        superconductors,
        advancedResearch,
      },
    };
    global.buildings = {};

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
    global.warpGateNetworkManager = {
      update: (deltaMs) => {
        warpGateNetworkUpdates.push(deltaMs);
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
    delete global.warpGateNetworkManager;
    delete global.buildings;
  });

  test('spending patience rewards metal, superalloys, superconductors, advanced research, and O\'Neill cylinders', () => {
    const success = patienceManager.spendPatience(2);

    expect(success).toBe(true);
    expect(patienceManager.currentHours).toBe(8);
    expect(metal.value).toBeCloseTo(21600);
    expect(superalloys.value).toBeCloseTo(14400);
    expect(superconductors.value).toBeCloseTo(3600);
    expect(advancedResearch.value).toBeCloseTo(7200);
    expect(oneillCount).toBeCloseTo(10.18, 2);
    expect(wgcUpdates.length).toBe(120);
    expect(wgcUpdates.every(ms => ms === 60000)).toBe(true);
    expect(warpGateNetworkUpdates.length).toBe(120);
    expect(warpGateNetworkUpdates.every(ms => ms === 60000)).toBe(true);
  });

  test('metal gains ignore negative net production', () => {
    metal.productionRate = 1;
    metal.consumptionRate = 2;

    const gains = patienceManager.calculateSpendGains(1);

    expect(gains.metalGain).toBe(0);
  });
});
