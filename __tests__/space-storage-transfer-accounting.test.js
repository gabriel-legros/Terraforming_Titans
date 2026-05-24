const path = require('path');
const { createGameDom, loadSaveFromRelativePath, advanceTicks } = require('./helpers/jsdom-game-harness');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function cleanupGlobals(original) {
  Object.keys(original).forEach((name) => {
    if (original[name] === undefined) {
      delete global[name];
    } else {
      global[name] = original[name];
    }
  });
}

function createResource(value = 0, cap = Infinity) {
  return {
    value,
    cap,
    hasCap: Number.isFinite(cap),
    rateEntries: [],
    modifyRate(amount, source, type) {
      this.rateEntries.push({ amount, source, type });
    }
  };
}

function loadSpaceStorageProjectClass() {
  jest.resetModules();
  const originalGlobals = {};

  class MockSpaceshipProject {}
  class MockContinuousExpansionProject {}
  [
    'isExpansionContinuous',
    'isContinuous',
    'startContinuousExpansion',
    'getExpansionProgressField',
    'getExpansionCompletedField',
    'getExpansionProgressValue',
    'setExpansionProgressValue',
    'getExpansionCompletedValue',
    'setExpansionCompletedValue',
    'getExpansionCompletedTotal',
    'getContinuousExpansionTickState',
    'applyExpansionColonyChange',
    'applyExpansionCostForProgress',
    'applyExpansionSpentRates',
    'applyRequestedExpansionProgress',
    'estimateExpansionCostForProgress',
    'mergeResourceTotals',
    'createExpansionStorageState',
    'getAffordableExpansionProgress',
    'getRemainingExpansionCapacity',
    'applyFractionalProgress',
    'carryDiscreteExpansionProgress',
    'applyExpansionProgress',
  ].forEach((methodName) => {
    MockContinuousExpansionProject.prototype[methodName] = function mockContinuousExpansionMethod() {};
  });

  setGlobal('SpaceshipProject', MockSpaceshipProject, originalGlobals);
  setGlobal('ContinuousExpansionProject', MockContinuousExpansionProject, originalGlobals);
  setGlobal('MEGA_PROJECT_RESOURCE_MODES', { SPACE_FIRST: 'space-first' }, originalGlobals);
  setGlobal('resources', {}, originalGlobals);

  const SpaceStorageProject = require(path.resolve(__dirname, '../src/js/projects/SpaceStorageProject.js'));
  return { SpaceStorageProject, cleanup: () => cleanupGlobals(originalGlobals) };
}

function createBareSpaceStorageProject(SpaceStorageProject, maxStorage = Infinity) {
  const project = Object.create(SpaceStorageProject.prototype);
  Object.defineProperty(project, 'maxStorage', {
    configurable: true,
    get() {
      return maxStorage;
    }
  });
  project.usedStorage = 0;
  project.reconcileUsedStorage = function reconcileUsedStorage() {
    this.usedStorage = Object.values(resources.spaceStorage || {})
      .reduce((sum, resource) => sum + Math.max(0, resource.value || 0), 0);
  };
  return project;
}

describe('Space Storage transfer accounting', () => {
  it('shows active withdraw transfer cost rates even when expansion autoStart is disabled', async () => {
    const dom = await createGameDom();
    const window = dom.window;

    loadSaveFromRelativePath(window, 'test_saves/debug/no_energy_consumption.json');
    advanceTicks(window, 5, 1000);

    const spaceStorage = window.projectManager.projects.spaceStorage;
    const energyProjectConsumption = window.resources.colony.energy.consumptionRateByType.project || {};
    const metalProjectProduction = window.resources.colony.metal.productionRateByType.project || {};

    expect(spaceStorage.autoStart).toBe(false);
    expect(spaceStorage.shipTransferMode).toBe('withdraw');
    expect(spaceStorage.shipOperationIsActive).toBe(true);
    expect(energyProjectConsumption['Space storage transfer']).toBeGreaterThan(0);
    expect(metalProjectProduction['Space storage transfer']).toBeGreaterThan(0);

    dom.window.close();
  }, 40000);

  it('does not estimate store transfer cost when storage cannot accept anything', () => {
    const { SpaceStorageProject, cleanup } = loadSpaceStorageProjectClass();
    const originalResources = global.resources;

    resources = {
      colony: {
        energy: createResource(1000),
        metal: createResource(1000)
      },
      spaceStorage: {
        metal: createResource(100, 100)
      }
    };

    const project = createBareSpaceStorageProject(SpaceStorageProject, 100);
    project.shipOperationIsActive = true;
    project.shipOperationIsPaused = false;
    project.assignedSpaceships = 1000;
    project.shipTransferMode = 'store';
    project.isActive = false;
    project.isShipOperationContinuous = () => true;
    project.getHazardousMachineryWorkerAvailabilityRatio = () => 1;
    project.getShipOperationDuration = () => 1000;
    project.calculateTransferAmount = () => 100;
    project.calculateTransferPlanForTick = () => ({ transfers: [], total: 0 });
    project.calculateSpaceshipTotalCost = () => {
      throw new Error('store cost should not be estimated without accepted transfer');
    };

    const totals = project.estimateProjectCostAndGain(1000, true, 1, {
      colony: { energy: 0, metal: 0 },
      spaceStorage: { metal: 0 }
    });

    expect(totals.cost).toEqual({});
    expect(resources.colony.energy.rateEntries).toEqual([]);
    expect(resources.colony.metal.rateEntries).toEqual([]);

    resources = originalResources;
    cleanup();
  });

  it('refunds withdraw overflow energy and metal proportional to accepted delivered resource', () => {
    const { SpaceStorageProject, cleanup } = loadSpaceStorageProjectClass();
    const originalResources = global.resources;

    resources = {
      colony: {
        energy: createResource(100, 1000),
        metal: createResource(50, 1000)
      },
      spaceStorage: {
        metal: createResource(40, 100)
      }
    };

    const project = createBareSpaceStorageProject(SpaceStorageProject, 100);
    const accumulatedSpecialChanges = {};
    project.recordTentativeWithdrawal(
      accumulatedSpecialChanges,
      { category: 'colony', resource: 'metal', storageKey: 'metal' },
      30,
      { energy: 2, metal: 0.5 }
    );

    project.applyTentativeWithdrawalRefunds(
      accumulatedSpecialChanges,
      { colony: { metal: 20 } },
      { metal: 55 },
      10
    );

    expect(resources.spaceStorage.metal.value).toBe(55);
    expect(resources.colony.energy.value).toBe(130);
    expect(resources.colony.metal.value).toBe(57.5);
    expect(resources.colony.energy.rateEntries).toEqual([
      { amount: 3, source: 'Space storage transfer', type: 'project' }
    ]);
    expect(resources.colony.metal.rateEntries).toEqual([
      { amount: 0.75, source: 'Space storage transfer', type: 'project' }
    ]);

    resources = originalResources;
    cleanup();
  });
});
