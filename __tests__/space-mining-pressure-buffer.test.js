const path = require('path');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function setupGlobals() {
  const originalGlobals = {};

  class MockSpaceshipProject {
    constructor(config, name) {
      this.attributes = config.attributes || {};
      this.name = name;
      this.assignedSpaceships = 0;
      this.currentTickDeltaTime = 1000;
      this.flags = {};
    }

    isBooleanFlagSet(flagId) {
      return !!this.flags[flagId];
    }

    getShipOperationDuration() {
      return 1000;
    }

    getEffectiveDuration() {
      return 1000;
    }

    getContinuousGainScaleLimit() {
      return 1;
    }

    calculateSpaceshipCost() {
      return this.attributes.costPerShip || {};
    }

    isContinuous() {
      return this.assignedSpaceships > 100;
    }

    applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
      Object.entries(gain.atmospheric || {}).forEach(([key, value]) => {
        const delta = value * fraction * productivity;
        if (accumulatedChanges) {
          if (!accumulatedChanges.atmospheric) accumulatedChanges.atmospheric = {};
          accumulatedChanges.atmospheric[key] = (accumulatedChanges.atmospheric[key] || 0) + delta;
          return;
        }
        resources.atmospheric[key].value += delta;
      });
    }
  }

  setGlobal('SpaceshipProject', MockSpaceshipProject, originalGlobals);
  setGlobal('projectElements', {}, originalGlobals);
  setGlobal('calculateAverageCoverage', () => 0, originalGlobals);
  setGlobal('calculateAtmosphericPressure', (amount, gravity, radiusKm) => {
    const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
    return amount * 1000 * gravity / surfaceArea;
  }, originalGlobals);
  setGlobal('terraforming', {
    celestialParameters: {
      gravity: 1,
      // Gives exactly 1000 m^2 surface area, so 1 ton == 1 Pa.
      radius: Math.sqrt(1000 / (4 * Math.PI)) / 1000,
    },
    liquidCoverageTargets: [],
    zonalSurface: {},
    temperature: { zones: {} },
    synchronizeGlobalResources: () => {},
  }, originalGlobals);
  setGlobal('resources', {
    atmospheric: {
      hydrogen: { value: 0, automationLimited: false, modifyRate: () => {} },
      carbonDioxide: { value: 4, automationLimited: false, modifyRate: () => {} },
      oxygen: { value: 0, automationLimited: false, modifyRate: () => {} },
    },
    colony: {
      water: { value: 0, cap: 100, hasCap: true },
      colonyHydrogen: { value: 90, cap: 100, hasCap: true },
    },
    surface: {
      ice: { automationLimited: false },
      liquidWater: { automationLimited: false },
      liquidCO2: { automationLimited: false },
    },
  }, originalGlobals);
  setGlobal('lifeManager', {
    estimateAtmosphericIdealNeed: () => ({ carbonDioxide: 100, oxygen: 0 }),
    estimateAtmosphericConsumption: () => ({ carbonDioxide: 100, oxygen: 0 }),
  }, originalGlobals);
  setGlobal('getZones', () => [], originalGlobals);
  setGlobal('getZonePercentage', () => 0, originalGlobals);
  setGlobal('estimateAmountForCoverage', () => 0, originalGlobals);
  setGlobal('formatNumber', (value) => String(value), originalGlobals);
  setGlobal('wireStringNumberInput', () => {}, originalGlobals);
  setGlobal('parseFlexibleNumber', (value) => Number(value), originalGlobals);

  return () => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  };
}

describe('SpaceMiningProject pressure limiter with life buffer', () => {
  it('stays 1 Pa below target buffer after life consumes 100 Pa from a low-CO2 start in continuous tick order', () => {
    const cleanup = setupGlobals();
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        costPerShip: { colony: { energy: 10, metal: 2 } },
        resourceGainPerShip: { atmospheric: { carbonDioxide: 1 } },
        maxPressure: 0.01, // 10 Pa
      },
    }, 'carbonSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.disableAbovePressure = true;
    project.assignedSpaceships = 1000;
    project.currentTickDeltaTime = 1000;

    const gain = { atmospheric: { carbonDioxide: 1000 } };
    const accumulatedChanges = {
      atmospheric: { carbonDioxide: 0 },
      colony: { energy: 0, metal: 0 },
    };

    const pressureLimitPa = project.disablePressureThreshold * 1000;
    const currentPressurePa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    const lifeConsumption = lifeManager.estimateAtmosphericIdealNeed(1000).carbonDioxide || 0;
    const expectedImported = Math.max(0, pressureLimitPa - currentPressurePa) + lifeConsumption - 1;

    project.applySpaceshipResourceGain(gain, 1, accumulatedChanges, 1);

    const afterProjectApplyPa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    expect(afterProjectApplyPa).toBeCloseTo(4, 8);
    expect(expectedImported).toBeCloseTo(105, 8);
    expect(expectedImported).toBeGreaterThan(Math.max(0, pressureLimitPa - currentPressurePa));
    expect(accumulatedChanges.atmospheric.carbonDioxide).toBeCloseTo(expectedImported, 8);

    resources.atmospheric.carbonDioxide.value += accumulatedChanges.atmospheric.carbonDioxide;
    accumulatedChanges.atmospheric.carbonDioxide = 0;

    const afterMiningPa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    expect(afterMiningPa).toBeCloseTo(109, 8);
    expect(accumulatedChanges.atmospheric.carbonDioxide).toBeCloseTo(0, 8);

    resources.atmospheric.carbonDioxide.value = Math.max(0, resources.atmospheric.carbonDioxide.value - lifeConsumption);

    const finalPa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    expect(finalPa).toBeCloseTo(9, 8);

    cleanup();
  });

  it('uses life ideal demand instead of current limited consumption for continuous pressure buffering', () => {
    const cleanup = setupGlobals();
    lifeManager.estimateAtmosphericIdealNeed = () => ({ carbonDioxide: 100, oxygen: 0 });
    lifeManager.estimateAtmosphericConsumption = () => ({ carbonDioxide: 20, oxygen: 0 });

    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        costPerShip: { colony: { energy: 10, metal: 2 } },
        resourceGainPerShip: { atmospheric: { carbonDioxide: 1 } },
        maxPressure: 0.01,
      },
    }, 'carbonSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.disableAbovePressure = true;

    const ratio = project.getContinuousGainScaleLimit(
      {
        duration: 1000,
        fraction: 1,
        successChance: 1,
      },
      { atmospheric: { carbonDioxide: 1000 } },
      { atmospheric: { carbonDioxide: 0 } },
      1
    );

    expect(ratio).toBeCloseTo(0.105, 8);

    cleanup();
  });

  it('caps direct colony-only hydrogen completion without an accumulated special ledger', () => {
    const cleanup = setupGlobals();
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        costPerShip: { colony: { energy: 10, metal: 2 } },
        resourceGainPerShip: {
          atmospheric: { hydrogen: 1 },
          colony: { colonyHydrogen: 25 },
        },
      },
    }, 'hydrogenSpaceMining');

    project.gasImportTarget = 'colonyOnly';

    expect(() => {
      project.applySpaceshipResourceGain({ colony: { colonyHydrogen: 25 } }, 1);
    }).not.toThrow();
    expect(resources.colony.colonyHydrogen.value).toBe(100);

    cleanup();
  });

  it('ignores water coverage when importing water to colony only', () => {
    const cleanup = setupGlobals();
    calculateAverageCoverage = () => 1;
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        dynamicWaterImport: true,
        resourceGainPerShip: {
          surface: { ice: 100 },
        },
      },
    }, 'waterSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.flags.waterImportTargeting = true;
    project.disableAboveWaterCoverage = true;
    project.waterImportTarget = 'colonyOnly';

    project.applySpaceshipResourceGain({ colony: { water: 100 } }, 1);

    expect(resources.colony.water.value).toBe(100);
    expect(resources.surface.ice.automationLimited).toBe(false);

    cleanup();
  });

  it('ignores water coverage when colony tanks can receive the full water import', () => {
    const cleanup = setupGlobals();
    calculateAverageCoverage = () => 1;
    resources.colony.water.value = 10;
    resources.colony.water.cap = 200;
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        dynamicWaterImport: true,
        resourceGainPerShip: {
          surface: { ice: 100 },
        },
      },
    }, 'waterSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.flags.waterImportTargeting = true;
    project.disableAboveWaterCoverage = true;
    project.waterImportTarget = 'colony';

    project.applySpaceshipResourceGain({ colony: { water: 100 } }, 1);

    expect(resources.colony.water.value).toBe(110);
    expect(resources.surface.ice.automationLimited).toBe(false);

    cleanup();
  });

  it('limits only the overflowing portion of colony water import when coverage is already full', () => {
    const cleanup = setupGlobals();
    calculateAverageCoverage = () => 1;
    resources.colony.water.value = 150;
    resources.colony.water.cap = 200;
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        dynamicWaterImport: true,
        resourceGainPerShip: {
          surface: { ice: 100 },
        },
      },
    }, 'waterSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.flags.waterImportTargeting = true;
    project.disableAboveWaterCoverage = true;
    project.waterImportTarget = 'colony';

    project.applySpaceshipResourceGain({ colony: { water: 100 } }, 1);

    expect(resources.colony.water.value).toBe(200);
    expect(resources.surface.ice.automationLimited).toBe(true);

    cleanup();
  });
});
