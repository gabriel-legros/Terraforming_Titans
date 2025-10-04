const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

const originalFormatNumber = global.formatNumber;

global.Colony = class {
  constructor(config) {
    this.consumption = config.consumption || {};
    this.production = config.production || {};
    this.storage = config.storage || {};
    this.cost = config.cost || {};
    this.dayNightActivity = !!config.dayNightActivity;
    this.canBeToggled = !!config.canBeToggled;
    this.requiresMaintenance = !!config.requiresMaintenance;
    this.maintenanceFactor = config.maintenanceFactor || 0;
    this.requiresDeposit = config.requiresDeposit || null;
    this.requiresWorker = config.requiresWorker || 0;
    this.unlocked = config.unlocked !== undefined ? config.unlocked : true;
    this.surfaceArea = config.surfaceArea || 0;
    this.requiresProductivity =
      typeof config.requiresProductivity !== 'undefined'
        ? config.requiresProductivity
        : true;
    this.requiresLand = config.requiresLand || 0;
  }

  updateResourceStorage() {}
  adjustLand() {}
  getEffectiveStorageMultiplier() { return 1; }
};

const { Aerostat } = require('../src/js/buildings/aerostat.js');

describe('Aerostat lift safeguards', () => {
  let aerostat;
  let currentLift;

  beforeEach(() => {
    currentLift = 0.1;
    global.resources = {
      atmospheric: {},
      colony: {}
    };
    global.terraforming = {
      calculateTotalPressure: jest.fn(() => 101)
    };
    global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT = 0.2;
    global.calculateMolecularWeight = jest.fn(() => 44);
    global.calculateSpecificLift = jest.fn(() => currentLift);
    global.formatNumber = (value, _useSuffix = false, decimals = 0) => {
      if (!Number.isFinite(value)) {
        return `${value}`;
      }
      return Number(value).toFixed(decimals);
    };

    const config = {
      name: 'Aerostat Colony',
      category: 'Colony',
      description: '',
      cost: { colony: {} },
      consumption: { colony: {} },
      production: { colony: {} },
      storage: { colony: { colonists: 10 } },
      baseComfort: 0,
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      maintenanceFactor: 0,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      requiresLand: 0
    };

    aerostat = new Aerostat(config, 'aerostat_colony');
    aerostat.count = 100;
    aerostat.active = 100;
    aerostat.updateResourceStorage = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.terraforming;
  });

  afterAll(() => {
    delete global.Colony;
    delete global.calculateMolecularWeight;
    delete global.calculateSpecificLift;
    delete global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
    if (typeof originalFormatNumber === 'undefined') {
      delete global.formatNumber;
    } else {
      global.formatNumber = originalFormatNumber;
    }
  });

  test('automatically disables aerostats when lift falls below the threshold', () => {
    currentLift = 0.05;
    aerostat.count = 200;
    aerostat.active = 200;

    aerostat.update(1000);

    expect(aerostat.active).toBe(198);
    expect(aerostat.updateResourceStorage).toHaveBeenCalled();
  });

  test('automatically disables aerostats when pressure falls below the buoyancy threshold', () => {
    currentLift = 0.5;
    global.terraforming.calculateTotalPressure.mockReturnValue(40);
    aerostat.count = 200;
    aerostat.active = 200;

    aerostat.update(1000);

    expect(aerostat.active).toBe(198);
    expect(aerostat.updateResourceStorage).toHaveBeenCalled();
  });

  test('accumulates fractional disable rates across multiple updates', () => {
    currentLift = 0.05;
    aerostat.updateResourceStorage.mockClear();

    aerostat.update(250);
    expect(aerostat.active).toBe(100);
    expect(aerostat.updateResourceStorage).not.toHaveBeenCalled();

    aerostat.update(250);
    aerostat.update(250);
    expect(aerostat.active).toBe(100);

    aerostat.update(250);
    expect(aerostat.active).toBe(99);
    expect(aerostat.updateResourceStorage).toHaveBeenCalledTimes(1);
  });

  test('does not disable aerostats when lift is sufficient', () => {
    currentLift = 0.5;
    aerostat._liftDisableAccumulator = 3;

    aerostat.update(1000);

    expect(aerostat.active).toBe(100);
    expect(aerostat._liftDisableAccumulator).toBe(0);
  });

  test('prevents activation increases while lift is below threshold', () => {
    currentLift = 0.05;
    expect(aerostat.filterActivationChange(5)).toBe(0);
    expect(aerostat.filterActivationChange(-3)).toBe(-3);

    currentLift = 0.5;
    expect(aerostat.filterActivationChange(4)).toBe(4);
  });
});

