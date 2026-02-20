const path = require('path');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function createResource(value = 0) {
  return {
    value,
    _rateTotal: 0,
    increase(amount) {
      this.value += amount;
    },
    decrease(amount) {
      this.value = Math.max(0, this.value - amount);
    },
    modifyRate(amount) {
      this._rateTotal += amount;
    },
  };
}

function createHarness() {
  const originalGlobals = {};

  class MockProject {
    constructor(config, name) {
      this.name = name;
      this.displayName = name;
      this.attributes = config.attributes || {};
      this.duration = config.duration || 1000;
      this.cost = config.cost || {};
      this.isActive = false;
      this.isCompleted = false;
      this.isPaused = false;
      this.autoStart = true;
      this.run = true;
      this.repeatCount = 0;
      this.maxRepeatCount = Infinity;
      this.remainingTime = this.duration;
      this.startingDuration = this.duration;
      this.shortfallLastTick = false;
      this.enabled = true;
      this.unlocked = true;
    }

    canStart() {
      return true;
    }

    start() {
      this.isActive = true;
      return true;
    }

    update() {}

    complete() {
      this.isActive = false;
      this.isCompleted = true;
    }

    getEffectiveDuration() {
      return this.duration;
    }

    getEffectiveCostMultiplier() {
      return 1;
    }

    getEffectiveSpaceshipCostMultiplier() {
      return 1;
    }

    getEffectiveSpaceshipCostPerTon() {
      return 0;
    }

    getScaledCost() {
      return this.cost || {};
    }

    saveAutomationSettings() {
      return {};
    }

    loadAutomationSettings() {}

    saveState() {
      return {};
    }

    loadState() {}
  }

  setGlobal('Project', MockProject, originalGlobals);
  setGlobal('shipEfficiency', 1, originalGlobals);
  setGlobal('projectElements', {}, originalGlobals);
  setGlobal('projectManager', { projects: {} }, originalGlobals);
  setGlobal('updateProjectUI', () => {}, originalGlobals);
  setGlobal('hazardManager', {
    parameters: { kessler: {}, pulsar: false },
    kesslerHazard: {
      getSuccessChance: () => 1,
      addDebris: () => {},
    },
  }, originalGlobals);
  setGlobal('resources', {
    colony: {
      energy: createResource(0),
      metal: createResource(0),
      ore: createResource(0),
      funding: createResource(0),
      trash: createResource(0),
    },
    special: {
      orbitalDebris: createResource(0),
      spaceships: createResource(0),
    },
    surface: {
      trash: createResource(0),
    },
  }, originalGlobals);
  setGlobal('getZones', () => [], originalGlobals);
  setGlobal('getZonePercentage', () => 0, originalGlobals);
  setGlobal('terraforming', { zonalSurface: {} }, originalGlobals);

  const cleanup = () => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  };

  return { cleanup };
}

function cloneChanges(changes) {
  return JSON.parse(JSON.stringify(changes));
}

function ensureChangeMaps() {
  return {
    colony: {
      energy: 0,
      metal: 0,
      ore: 0,
      funding: 0,
      trash: 0,
    },
    special: {
      orbitalDebris: 0,
      spaceships: 0,
    },
    surface: {
      trash: 0,
    },
  };
}

function runScenario(scenario) {
  jest.resetModules();
  const { cleanup } = createHarness();
  const SpaceshipProject = require(path.resolve(__dirname, '../src/js/projects/SpaceshipProject.js'));

  class TestProject extends SpaceshipProject {
    constructor(config, name, options) {
      super(config, name);
      this.options = options;
      this.costCalls = 0;
      this.gainCalls = 0;
      this.lastRemoved = null;
    }

    calculateSpaceshipCost() {
      this.costCalls += 1;
      return super.calculateSpaceshipCost();
    }

    calculateSpaceshipGainPerShip() {
      this.gainCalls += 1;
      return super.calculateSpaceshipGainPerShip();
    }

    getKesslerSuccessChance() {
      return this.options.successChance;
    }

    shouldAutomationDisable() {
      return this.options.shouldDisable === true;
    }

    getContinuousGainScaleLimit(context, gainBase, accumulatedChanges, productivity) {
      const base = super.getContinuousGainScaleLimit(context, gainBase, accumulatedChanges, productivity);
      return Math.min(base, this.options.outputLimitRatio);
    }

    removeZonalResource(category, resource, amount) {
      this.lastRemoved = { category, resource, amount };
      return amount;
    }
  }

  const attrs = {
    spaceMining: true,
    spaceExport: !!scenario.exportResource,
    costPerShip: {
      colony: {
        energy: 10,
        metal: 5,
      },
    },
    resourceGainPerShip: {
      colony: {
        ore: 20,
      },
    },
    disposalAmount: 10,
    fundingGainAmount: 2,
    defaultDisposal: scenario.exportResource
      ? { category: 'colony', resource: scenario.exportResource }
      : null,
  };

  const project = new TestProject({ duration: 1000, attributes: attrs }, 'testScaledProject', {
    successChance: scenario.successChance ?? 1,
    outputLimitRatio: scenario.outputLimitRatio ?? 1,
    shouldDisable: scenario.shouldDisable,
  });

  project.assignedSpaceships = 200;
  project.isActive = true;
  project.autoStart = true;
  project.run = true;
  if (scenario.exportResource) {
    project.selectedDisposalResource = { category: 'colony', resource: scenario.exportResource };
  }

  resources.colony.energy.value = scenario.energyAvailable ?? 100000;
  resources.colony.metal.value = scenario.metalAvailable ?? 100000;
  resources.colony.trash.value = scenario.trashAvailable ?? 100000;
  resources.colony.ore.value = scenario.oreAvailable ?? 0;
  resources.colony.funding.value = scenario.fundingAvailable ?? 0;

  const accumulatedChanges = ensureChangeMaps();
  accumulatedChanges.colony.energy += scenario.pendingEnergy ?? 0;
  accumulatedChanges.colony.metal += scenario.pendingMetal ?? 0;
  accumulatedChanges.colony.trash += scenario.pendingTrash ?? 0;
  accumulatedChanges.colony.ore += scenario.pendingOre ?? 0;
  accumulatedChanges.colony.funding += scenario.pendingFunding ?? 0;
  const before = cloneChanges(accumulatedChanges);

  const deltaTime = scenario.deltaTime ?? 1000;
  const productivity = scenario.productivity ?? 1;
  const estimate = project.estimateCostAndGain(deltaTime, true, productivity, accumulatedChanges);
  const callsAfterEstimate = { cost: project.costCalls, gain: project.gainCalls };
  project.applyCostAndGain(deltaTime, accumulatedChanges, productivity);
  const callsAfterApply = { cost: project.costCalls, gain: project.gainCalls };

  const deltas = {
    energy: accumulatedChanges.colony.energy - before.colony.energy,
    metal: accumulatedChanges.colony.metal - before.colony.metal,
    trash: accumulatedChanges.colony.trash - before.colony.trash,
    ore: accumulatedChanges.colony.ore - before.colony.ore,
    funding: accumulatedChanges.colony.funding - before.colony.funding,
  };

  cleanup();
  return {
    estimate,
    project,
    deltas,
    callsAfterEstimate,
    callsAfterApply,
  };
}

function expectApprox(received, expected, tolerance = 1e-3) {
  expect(Math.abs(received - expected)).toBeLessThanOrEqual(tolerance);
}

describe('Spaceship scaled cost/gain execution', () => {
  const basePotential = {
    energy: 2000,
    metal: 1000,
    disposal: 2000,
    oreGain: 4000,
  };

  const variations = [
    {
      name: 'no limit, full affordability',
      ratio: 1,
    },
    {
      name: 'output limit 50%',
      outputLimitRatio: 0.5,
      ratio: 0.5,
    },
    {
      name: 'output limit 10%',
      outputLimitRatio: 0.1,
      ratio: 0.1,
    },
    {
      name: 'energy shortage 25%',
      energyAvailable: 500,
      ratio: 0.25,
    },
    {
      name: 'metal shortage 25%',
      metalAvailable: 250,
      ratio: 0.25,
    },
    {
      name: 'combined energy+metal shortage (min ratio)',
      energyAvailable: 800,
      metalAvailable: 300,
      ratio: 0.3,
    },
    {
      name: 'disposal shortage 20%',
      exportResource: 'trash',
      trashAvailable: 400,
      ratio: 0.2,
    },
    {
      name: 'disposal shortage with positive pending trash',
      exportResource: 'trash',
      trashAvailable: 500,
      pendingTrash: 100,
      ratio: 0.3,
    },
    {
      name: 'disposal shares metal with shipment cost (50%)',
      exportResource: 'metal',
      metalAvailable: 1500,
      ratio: 0.5,
    },
    {
      name: 'disposal shares metal with shipment cost (80%)',
      exportResource: 'metal',
      metalAvailable: 2400,
      ratio: 0.8,
    },
    {
      name: 'pending energy increases effective affordability',
      energyAvailable: 1000,
      pendingEnergy: 500,
      ratio: 0.75,
    },
    {
      name: 'output limit zero',
      outputLimitRatio: 0,
      ratio: 0,
    },
    {
      name: 'productivity scaling under shortage',
      productivity: 2,
      energyAvailable: 1000,
      ratio: 0.25,
    },
  ];

  test.each(variations)('applies proportional scaling: %s', (variation) => {
    const scenario = { successChance: 1, ...variation };
    const result = runScenario(scenario);
    const productivity = scenario.productivity ?? 1;
    const ratio = scenario.ratio;

    const expectedEnergySpent = basePotential.energy * productivity * ratio;
    const expectedMetalShipmentCost = basePotential.metal * productivity * ratio;
    const expectedDisposal = scenario.exportResource
      ? (basePotential.disposal * productivity * ratio)
      : 0;
    const expectedOreGain = basePotential.oreGain * productivity * ratio;
    const expectedFundingGain = scenario.exportResource
      ? expectedDisposal * 2
      : 0;

    const expectedMetalSpent = expectedMetalShipmentCost +
      (scenario.exportResource === 'metal' ? expectedDisposal : 0);

    expectApprox(-result.deltas.energy, expectedEnergySpent);
    expectApprox(-result.deltas.metal, expectedMetalSpent);
    if (scenario.exportResource === 'trash') {
      expectApprox(-result.deltas.trash, expectedDisposal);
    } else {
      expectApprox(result.deltas.trash, 0);
    }
    expectApprox(result.deltas.ore, expectedOreGain);
    expectApprox(result.deltas.funding, expectedFundingGain);

    expectApprox(result.estimate.cost?.colony?.energy || 0, expectedEnergySpent);
    expectApprox(result.estimate.gain?.colony?.ore || 0, expectedOreGain);
    if (scenario.exportResource === 'trash') {
      expectApprox(result.estimate.cost?.colony?.trash || 0, expectedDisposal);
    }
    if (scenario.exportResource) {
      expectApprox(result.estimate.gain?.colony?.funding || 0, expectedFundingGain);
    }
  });

  it('reuses cached continuous estimate for apply in the same tick/context', () => {
    const result = runScenario({
      successChance: 1,
      exportResource: 'trash',
      trashAvailable: 50000,
      energyAvailable: 50000,
      metalAvailable: 50000,
    });

    expect(result.callsAfterEstimate.cost).toBeGreaterThan(0);
    expect(result.callsAfterEstimate.gain).toBeGreaterThan(0);
    expect(result.callsAfterApply.cost).toBe(result.callsAfterEstimate.cost);
    expect(result.callsAfterApply.gain).toBe(result.callsAfterEstimate.gain);
  });

  it('keeps productivity estimate based on unscaled shipment cost only', () => {
    jest.resetModules();
    const { cleanup } = createHarness();
    const SpaceshipProject = require(path.resolve(__dirname, '../src/js/projects/SpaceshipProject.js'));

    class TestProject extends SpaceshipProject {
      getKesslerSuccessChance() {
        return 1;
      }

      getContinuousGainScaleLimit() {
        return 0.1;
      }
    }

    const project = new TestProject({
      duration: 1000,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 10, metal: 5 } },
        resourceGainPerShip: { colony: { ore: 20 } },
      },
    }, 'productivityCostOnly');

    project.assignedSpaceships = 200;
    project.isActive = true;

    const scaledEstimate = project.estimateCostAndGain(1000, false, 1, null);
    const productivityEstimate = project.estimateProductivityCostAndGain(1000);

    expectApprox(scaledEstimate.cost?.colony?.energy || 0, 200);
    expectApprox(productivityEstimate.cost?.colony?.energy || 0, 2000);
    expectApprox(productivityEstimate.cost?.colony?.metal || 0, 1000);
    cleanup();
  });
});
