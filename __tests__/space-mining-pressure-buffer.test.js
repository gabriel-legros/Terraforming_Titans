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

    isContinuous() {
      return this.assignedSpaceships > 100;
    }

    applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
      Object.entries(gain.atmospheric || {}).forEach(([key, value]) => {
        const delta = value * fraction * productivity;
        const pending = accumulatedChanges?.atmospheric?.[key] || 0;
        resources.atmospheric[key].value += delta + pending;
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
      carbonDioxide: { value: 4, automationLimited: false },
      oxygen: { value: 0, automationLimited: false },
    },
    surface: {
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
  it('keeps 10 Pa after life consumes 100 Pa from a low-CO2 start', () => {
    const cleanup = setupGlobals();
    const SpaceMiningProject = require(path.resolve(__dirname, '../src/js/projects/SpaceMiningProject.js'));
    const project = new SpaceMiningProject({
      attributes: {
        resourceGainPerShip: { atmospheric: { carbonDioxide: 1 } },
        maxPressure: 0.01, // 10 Pa
      },
    }, 'carbonSpaceMining');

    project.flags.atmosphericMonitoring = true;
    project.disableAbovePressure = true;
    project.assignedSpaceships = 1000;
    project.currentTickDeltaTime = 1000;

    const gain = { atmospheric: { carbonDioxide: 1000 } };
    project.applySpaceshipResourceGain(gain, 1, null, 1);

    const afterMiningPa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    expect(afterMiningPa).toBeCloseTo(110, 8);

    const consumed = lifeManager.estimateAtmosphericIdealNeed(1000).carbonDioxide || 0;
    resources.atmospheric.carbonDioxide.value = Math.max(0, resources.atmospheric.carbonDioxide.value - consumed);

    const finalPa = calculateAtmosphericPressure(
      resources.atmospheric.carbonDioxide.value,
      terraforming.celestialParameters.gravity,
      terraforming.celestialParameters.radius
    );
    expect(finalPa).toBeCloseTo(10, 8);

    cleanup();
  });
});
