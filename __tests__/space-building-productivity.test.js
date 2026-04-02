const path = require('path');

function setGlobal(name, value, originalGlobals) {
  if (!(name in originalGlobals)) {
    originalGlobals[name] = global[name];
  }
  global[name] = value;
}

function restoreGlobals(originalGlobals) {
  Object.keys(originalGlobals).forEach((name) => {
    if (originalGlobals[name] === undefined) {
      delete global[name];
      return;
    }
    global[name] = originalGlobals[name];
  });
}

function createResource(name, value = 0, hasCap = false, cap = Infinity) {
  return {
    name,
    value,
    hasCap,
    cap,
    reserved: 0,
    availabilityRatio: 1,
    productionRate: 0,
    consumptionRate: 0,
    projectedProductionRate: 0,
    projectedConsumptionRate: 0,
    productionRateByType: {},
    consumptionRateByType: {},
    increase(amount) {
      this.value += amount;
    },
    decrease(amount) {
      this.value = Math.max(0, this.value - amount);
    },
    resetRates({ keepProjected } = {}) {
      this.productionRate = 0;
      this.consumptionRate = 0;
      this.productionRateByType = {};
      this.consumptionRateByType = {};
      if (!keepProjected) {
        this.projectedProductionRate = 0;
        this.projectedConsumptionRate = 0;
      }
    },
    modifyRate(amount, source = 'Unknown', rateType = 'unknown') {
      if (amount > 0) {
        this.productionRate += amount;
        this.productionRateByType[rateType] ||= {};
        this.productionRateByType[rateType][source] =
          (this.productionRateByType[rateType][source] || 0) + amount;
        return;
      }
      if (amount < 0) {
        const abs = -amount;
        this.consumptionRate += abs;
        this.consumptionRateByType[rateType] ||= {};
        this.consumptionRateByType[rateType][source] =
          (this.consumptionRateByType[rateType][source] || 0) + abs;
      }
    },
    saveProjectedRates() {
      this.projectedProductionRate = this.productionRate;
      this.projectedConsumptionRate = this.consumptionRate;
    },
    recalculateTotalRates() {},
    updateStorageCap() {},
  };
}

function createResources(initial = {}) {
  return {
    colony: {
      funding: createResource('funding', 0),
      energy: createResource('energy', 0, true, initial.colonyEnergyCap || Infinity),
      workers: createResource('workers', 0),
    },
    surface: {
      land: createResource('land', 0),
      liquidWater: createResource('liquidWater', 0),
      ice: createResource('ice', 0),
    },
    atmospheric: {
      atmosphericWater: createResource('atmosphericWater', 0),
    },
    space: {
      energy: createResource('energy', initial.spaceEnergy || 0, true, initial.spaceEnergyCap || Infinity),
    },
    spaceStorage: {
      hydrogen: createResource('hydrogen', initial.hydrogen || 0),
      metal: createResource('metal', initial.metal || 0),
      silicon: createResource('silicon', initial.silicon || 0),
      graphite: createResource('graphite', initial.graphite || 0),
      oxygen: createResource('oxygen', 0),
      inertGas: createResource('inertGas', 0),
      glass: createResource('glass', 0),
      components: createResource('components', 0),
      electronics: createResource('electronics', 0),
      superconductors: createResource('superconductors', 0),
      superalloys: createResource('superalloys', initial.superalloys || 0),
    },
  };
}

function createDysonReceiverBuilding(energyPerSecond = 0) {
  return {
    active: energyPerSecond > 0 ? 1 : 0,
    productivity: energyPerSecond > 0 ? 1 : 0,
    displayProductivity: energyPerSecond > 0 ? 1 : 0,
    dayNightActivity: false,
    consumption: { space: { energy: energyPerSecond } },
    getTargetProductivity() {
      return this.active > 0 ? 1 : 0;
    },
    updateProductivity() {
      this.productivity = this.active > 0 ? 1 : 0;
      this.displayProductivity = this.productivity;
    },
    produce() {},
    consume(accumulatedChanges, deltaTime) {
      if (!(this.active > 0) || !(this.productivity > 0) || !(deltaTime > 0)) {
        return;
      }
      const seconds = deltaTime / 1000;
      const amount = this.consumption.space.energy * this.active * this.productivity * seconds;
      accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) - amount;
      resources.space.energy.modifyRate(-(amount / seconds), 'Dyson Receiver', 'building');
    },
    applyMaintenance() {},
  };
}

function createSpaceStorageProducerBuilding(resourceKey, amountPerSecond = 0, name = 'Space Storage Producer') {
  return {
    active: amountPerSecond > 0 ? 1 : 0,
    productivity: amountPerSecond > 0 ? 1 : 0,
    displayProductivity: amountPerSecond > 0 ? 1 : 0,
    dayNightActivity: false,
    production: { spaceStorage: { [resourceKey]: amountPerSecond } },
    consumption: {},
    getTargetProductivity() {
      return this.active > 0 ? 1 : 0;
    },
    updateProductivity() {
      this.productivity = this.active > 0 ? 1 : 0;
      this.displayProductivity = this.productivity;
    },
    getProductionRatio() {
      return 1;
    },
    getEffectiveProductionMultiplier() {
      return 1;
    },
    getEffectiveResourceProductionMultiplier() {
      return 1;
    },
    getConsumption() {
      return {};
    },
    getTotalWorkerNeed() {
      return 0;
    },
    getAutomationActivityMultiplier() {
      return 1;
    },
    produce(accumulatedChanges, deltaTime) {
      if (!(this.active > 0) || !(this.productivity > 0) || !(deltaTime > 0)) {
        return;
      }
      const seconds = deltaTime / 1000;
      const amount = amountPerSecond * this.active * this.productivity * seconds;
      accumulatedChanges.spaceStorage[resourceKey] = (accumulatedChanges.spaceStorage[resourceKey] || 0) + amount;
      resources.spaceStorage[resourceKey].modifyRate(amount / seconds, name, 'building');
    },
    consume() {},
    applyMaintenance() {},
  };
}

function createDysonCollectorProject(collectorPowerPerSecond = 0) {
  return {
    name: 'dysonSwarmReceiver',
    displayName: 'Dyson Swarm Receiver',
    attributes: { spaceBuilding: true, spaceEnergyProducer: true },
    autoStart: false,
    operationPreRunThisTick: false,
    unlocked: true,
    collectors: collectorPowerPerSecond > 0 ? 1 : 0,
    energyPerCollector: collectorPowerPerSecond,
    isContinuous() {
      return false;
    },
    estimateCostAndGain() {
      return { cost: {}, gain: {} };
    },
    applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges = null) {
      if (!accumulatedChanges || accumulatedChanges.dysonSpaceEnergyInjected === true) {
        return;
      }
      const seconds = deltaTime / 1000;
      const amount = this.collectors * this.energyPerCollector * seconds;
      accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) + amount;
      if (amount > 0) {
        resources.space.energy.modifyRate(amount / seconds, 'Dyson Collectors', 'project');
      }
      accumulatedChanges.dysonSpaceEnergyInjected = true;
    },
    applyCostAndGain() {
      this.operationPreRunThisTick = false;
    },
  };
}

function createSpaceEnergyDrainProject(energyPerSecond = 0, name = 'Dyson Receiver') {
  return {
    name,
    displayName: name,
    attributes: { spaceBuilding: true },
    autoStart: false,
    operationPreRunThisTick: false,
    unlocked: true,
    isContinuous() {
      return false;
    },
    estimateCostAndGain() {
      return { cost: {}, gain: {} };
    },
    applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges = null) {
      if (!accumulatedChanges || !(energyPerSecond > 0)) {
        return;
      }
      const seconds = deltaTime / 1000;
      const amount = energyPerSecond * seconds;
      accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) - amount;
      resources.space.energy.modifyRate(-(amount / seconds), this.displayName, 'project');
    },
    applyCostAndGain() {
      this.operationPreRunThisTick = false;
    },
  };
}

function createSpaceStorageProject(resources) {
  return {
    megaProjectResourceMode: 'spaceFirst',
    maxStorage: resources._spaceStorageMaxStorage ?? Infinity,
    usedStorage: 0,
    isContinuous() {
      return false;
    },
    getStoredResourceValue(resourceKey) {
      return resources.spaceStorage[resourceKey]?.value || 0;
    },
    getAvailableStoredResource(resourceKey) {
      return Math.max(0, this.getStoredResourceValue(resourceKey));
    },
    spendStoredResource(resourceKey, amount) {
      const resource = resources.spaceStorage[resourceKey];
      if (!resource || !(amount > 0)) {
        return 0;
      }
      const used = Math.min(resource.value, amount);
      resource.value -= used;
      return used;
    },
    addStoredResource(resourceKey, amount) {
      const resource = resources.spaceStorage[resourceKey];
      if (!resource || !(amount > 0)) {
        return 0;
      }
      resource.value += amount;
      return amount;
    },
    getResourceCapLimit(resourceKey) {
      return resources.spaceStorage[resourceKey]?.cap || Infinity;
    },
    reconcileUsedStorage() {
      let total = 0;
      for (const resourceKey in resources.spaceStorage) {
        total += resources.spaceStorage[resourceKey]?.value || 0;
      }
      this.usedStorage = total;
    },
    isPermanentlyDisabled() {
      return false;
    },
  };
}

class MockDemandProject {
  constructor(resourceKey, demandPerTick, projectName = '') {
    this.name = projectName || `mockDemand-${resourceKey}`;
    this.displayName = this.name;
    this.attributes = { spaceBuilding: true };
    this.resourceKey = resourceKey;
    this.demandPerTick = demandPerTick;
    this.autoStart = false;
    this.operationPreRunThisTick = false;
    this.unlocked = true;
  }

  isContinuous() {
    return false;
  }

  applyOperationCostAndGain() {}

  estimateCostAndGain(deltaTime = 1000, applyRates = true) {
    const seconds = deltaTime / 1000;
    const amount = this.demandPerTick * seconds;
    const totals = { cost: { spaceStorage: {} }, gain: {} };
    totals.cost.spaceStorage[this.resourceKey] = amount;
    if (applyRates && amount > 0) {
      resources.spaceStorage[this.resourceKey].modifyRate(-this.demandPerTick, this.displayName, 'project');
    }
    return totals;
  }

  applyCostAndGain() {
    this.operationPreRunThisTick = false;
  }
}

function setupHarness(initialStorage = {}) {
  jest.resetModules();
  const originalGlobals = {};

  class EffectableEntity {
    constructor() {
      this.activeEffects = [];
      this.booleanFlags = new Set();
    }

    isBooleanFlagSet(flag) {
      return this.booleanFlags.has(flag);
    }
  }

  class BaseProject extends EffectableEntity {
    constructor(config = {}, name = '') {
      super();
      this.name = name;
      this.displayName = config.name || name;
      this.attributes = config.attributes || {};
      this.cost = config.cost || {};
      this.duration = config.duration || 1000;
      this.repeatCount = 0;
      this.maxRepeatCount = Infinity;
      this.autoStart = false;
      this.isActive = false;
      this.isCompleted = false;
      this.isPaused = false;
      this.unlocked = true;
      this.remainingTime = this.duration;
      this.startingDuration = this.duration;
      this.operationPreRunThisTick = false;
    }

    isPermanentlyDisabled() {
      return false;
    }

    isContinuous() {
      return false;
    }

    getDurationWithTerraformBonus(duration) {
      return duration;
    }

    getEffectiveDuration() {
      return this.duration;
    }

    getScaledCost() {
      return this.cost || {};
    }

    getEffectiveCost() {
      return this.cost || {};
    }

    showsInResourcesRate() {
      return true;
    }

    update() {}

    saveAutomationSettings() {
      return {};
    }

    loadAutomationSettings() {}

    saveState() {
      return {};
    }

    loadState() {}

    saveTravelState() {
      return {};
    }

    loadTravelState() {}

    start() {
      this.isActive = true;
      return true;
    }
  }

  class TerraformingDurationProject extends BaseProject {}

  class SpecializationProject extends BaseProject {
    constructor(config, name, options = {}) {
      super(config, name);
      this.shopItems = options.shopItems || [];
      this.shopPurchases = {};
    }

    getShopPurchaseCount(id) {
      return this.shopPurchases[id] || 0;
    }

    canStart() {
      return true;
    }

    updateUI() {}

    loadSpecializationState() {}

    applySpecializationEffects() {}
  }

  const resourcesObj = createResources(initialStorage);
  resourcesObj._spaceStorageMaxStorage = initialStorage.spaceStorageMaxStorage;

  setGlobal('EffectableEntity', EffectableEntity, originalGlobals);
  setGlobal('TerraformingDurationProject', TerraformingDurationProject, originalGlobals);
  setGlobal('SpecializationProject', SpecializationProject, originalGlobals);
  setGlobal('MEGA_PROJECT_RESOURCE_MODES', { SPACE_FIRST: 'spaceFirst' }, originalGlobals);
  setGlobal('getMegaProjectResourceAvailability', (storage, storageKey, colonyAvailable) => {
    const colony = Math.max(0, colonyAvailable || 0);
    const space = storage?.getAvailableStoredResource ? storage.getAvailableStoredResource(storageKey) : 0;
    return colony + Math.max(0, space);
  }, originalGlobals);
  setGlobal('getMegaProjectResourceAllocation', (storage, storageKey, amount, colonyAvailable) => {
    const colony = Math.max(0, colonyAvailable || 0);
    const fromColony = Math.min(amount, colony);
    const fromStorage = Math.max(0, amount - fromColony);
    return { fromColony, fromStorage };
  }, originalGlobals);
  setGlobal('resources', resourcesObj, originalGlobals);
  setGlobal('dayNightCycle', { isDay: () => true }, originalGlobals);
  setGlobal('followersManager', null, originalGlobals);
  setGlobal('fundingModule', null, originalGlobals);
  setGlobal('terraforming', {
    initialLand: 0,
    zonalSurface: {},
    temperature: { zones: {} },
    updateResources: () => {},
    distributeGlobalChangesToZones: () => {},
  }, originalGlobals);
  setGlobal('lifeManager', null, originalGlobals);
  setGlobal('researchManager', null, originalGlobals);
  setGlobal('globalEffects', {}, originalGlobals);
  setGlobal('updateArtificialEcosystems', () => {}, originalGlobals);
  setGlobal('updateAntimatterStorageCap', () => {}, originalGlobals);
  setGlobal('produceAntimatter', null, originalGlobals);
  setGlobal('updateSpaceStorageUI', () => {}, originalGlobals);
  setGlobal('warpGateCommand', { getMultiplier: () => 1 }, originalGlobals);
  setGlobal('formatNumber', (value) => `${value}`, originalGlobals);
  setGlobal('attachDynamicInfoTooltip', () => {}, originalGlobals);
  setGlobal('getZones', () => [], originalGlobals);
  setGlobal('getZonePercentage', () => 0, originalGlobals);
  setGlobal('buildings', {}, originalGlobals);

  const projectManager = {
    projects: {},
    projectOrder: [],
    isProjectRelevantToCurrentPlanet: () => true,
    isBooleanFlagSet: () => false,
  };
  setGlobal('projectManager', projectManager, originalGlobals);

  const resourceModule = require(path.resolve(__dirname, '../src/js/resource.js'));
  jest.doMock(path.resolve(__dirname, '../src/js/projects/SpecializationProject.js'), () => ({
    SpecializationProject,
  }));
  const NuclearAlchemyFurnaceProject = require(path.resolve(__dirname, '../src/js/projects/NuclearAlchemyFurnaceProject.js'));
  const SuperalloyGigafoundryProject = require(path.resolve(__dirname, '../src/js/projects/SuperalloyGigafoundryProject.js'));
  const ManufacturingWorldProject = require(path.resolve(__dirname, '../src/js/projects/ManufacturingWorldProject.js'));
  const LiftersProject = require(path.resolve(__dirname, '../src/js/projects/LiftersProject.js'));

  const spaceStorage = createSpaceStorageProject(resourcesObj);
  projectManager.projects.spaceStorage = spaceStorage;

  return {
    produceResources: resourceModule.produceResources,
    projectManager,
    resources: resourcesObj,
    NuclearAlchemyFurnaceProject,
    SuperalloyGigafoundryProject,
    ManufacturingWorldProject,
    LiftersProject,
    cleanup: () => restoreGlobals(originalGlobals),
  };
}

function expectApprox(received, expected, tolerance = 1e-6) {
  expect(Math.abs(received - expected)).toBeLessThanOrEqual(tolerance);
}

describe('Space building productivity via produceResources', () => {
  test.each([
    { hydrogen: 0, expectedRatio: 0 },
    { hydrogen: 50, expectedRatio: 0.25 },
    { hydrogen: 100, expectedRatio: 0.5 },
    { hydrogen: 200, expectedRatio: 1 },
    { hydrogen: 500, expectedRatio: 1 },
  ])('Nuclear Alchemical Furnace runs at expected ratio with hydrogen=$hydrogen', ({ hydrogen, expectedRatio }) => {
    const harness = setupHarness({ hydrogen, metal: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      NuclearAlchemyFurnaceProject,
      cleanup,
    } = harness;

    const furnace = new NuclearAlchemyFurnaceProject({
      name: 'Nuclear Alchemical Furnace',
      duration: 36000000,
      cost: {},
      attributes: {
        canUseSpaceStorage: true,
        spaceBuilding: true,
        alchemyParameter: 1,
      },
    }, 'nuclearAlchemyFurnace');

    furnace.repeatCount = 2000;
    furnace.furnaceAssignments.metal = 2000; // 200 hydrogen/s demand at productivity=1
    furnace.isRunning = true;
    furnace.isActive = false;
    furnace.autoStart = false;

    projectManager.projects.nuclearAlchemyFurnace = furnace;
    projectManager.projectOrder = ['nuclearAlchemyFurnace'];

    produceResources(1000, {});

    const expectedConsumed = 200 * expectedRatio;
    const consumed = hydrogen - resources.spaceStorage.hydrogen.value;
    const producedMetal = resources.spaceStorage.metal.value;

    expectApprox(consumed, expectedConsumed);
    expectApprox(producedMetal, expectedConsumed);
    cleanup();
  });

  test.each([
    { extraDemand: 0, expectedProductivity: 1 },
    { extraDemand: 200, expectedProductivity: 0.5 },
    { extraDemand: 600, expectedProductivity: 0.25 },
  ])('Nuclear Alchemical Furnace productivity reflects shared demand (extra=$extraDemand/s)', ({ extraDemand, expectedProductivity }) => {
    const harness = setupHarness({ hydrogen: 200, metal: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      NuclearAlchemyFurnaceProject,
      cleanup,
    } = harness;

    const furnace = new NuclearAlchemyFurnaceProject({
      name: 'Nuclear Alchemical Furnace',
      duration: 36000000,
      cost: {},
      attributes: {
        canUseSpaceStorage: true,
        spaceBuilding: true,
        alchemyParameter: 1,
      },
    }, 'nuclearAlchemyFurnace');

    furnace.repeatCount = 2000;
    furnace.furnaceAssignments.metal = 2000; // 200 hydrogen/s demand
    furnace.isRunning = true;
    furnace.autoStart = false;
    furnace.isActive = false;

    projectManager.projects.nuclearAlchemyFurnace = furnace;
    if (extraDemand > 0) {
      projectManager.projects.mockHydrogenDemand = new MockDemandProject('hydrogen', extraDemand, 'lifters');
      projectManager.projectOrder = ['nuclearAlchemyFurnace', 'mockHydrogenDemand'];
    } else {
      projectManager.projectOrder = ['nuclearAlchemyFurnace'];
    }

    produceResources(1000, {});

    const expectedConsumed = 200 * expectedProductivity;
    const consumed = 200 - resources.spaceStorage.hydrogen.value;
    expectApprox(furnace.operationProductivity, expectedProductivity);
    expectApprox(consumed, expectedConsumed);
    cleanup();
  });

  test('Nuclear Alchemical Furnace operation productivity is based on operation demand, not expansion demand', () => {
    const harness = setupHarness({ hydrogen: 200, metal: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      NuclearAlchemyFurnaceProject,
      cleanup,
    } = harness;

    const furnace = new NuclearAlchemyFurnaceProject({
      name: 'Nuclear Alchemical Furnace',
      duration: 36000000,
      cost: { colony: { funding: 1000 } },
      attributes: {
        canUseSpaceStorage: true,
        spaceBuilding: true,
        alchemyParameter: 1,
      },
    }, 'nuclearAlchemyFurnace');

    furnace.repeatCount = 2000;
    furnace.furnaceAssignments.metal = 2000; // 200 hydrogen/s demand
    furnace.isRunning = true;
    furnace.isActive = true; // Expansion is active but unaffordable.
    furnace.autoStart = true;

    projectManager.projects.nuclearAlchemyFurnace = furnace;
    projectManager.projectOrder = ['nuclearAlchemyFurnace'];

    produceResources(1000, {});

    const consumed = 200 - resources.spaceStorage.hydrogen.value;
    expectApprox(furnace.operationProductivity, 1);
    expectApprox(consumed, 200);
    cleanup();
  });

  test.each([
    { metal: 0 },
    { metal: 50 },
    { metal: 100 },
    { metal: 200 },
    { metal: 500 },
  ])('Manufacturing World superalloy recipe runs at expected ratio with metal=$metal', ({ metal }) => {
    const harness = setupHarness({ metal, superalloys: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      ManufacturingWorldProject,
      cleanup,
    } = harness;

    const manufacturing = new ManufacturingWorldProject({
      name: 'Manufacturing World',
      duration: 300000,
      cost: {},
      attributes: {
        projectGroup: 'specializedWorlds',
        keepStartBarVisible: true,
        spaceBuilding: true,
      },
    }, 'manufacturingWorld');

    manufacturing.isRunning = true;
    manufacturing.cumulativePopulation = 200000;
    manufacturing.manufacturingAssignments.superalloys = 200000;
    manufacturing.autoStart = false;
    manufacturing.isActive = false;

    projectManager.projects.manufacturingWorld = manufacturing;
    projectManager.projectOrder = ['manufacturingWorld'];

    const recipe = manufacturing.getRecipe('superalloys');
    const assigned = manufacturing.manufacturingAssignments.superalloys;
    const seconds = 1;
    const inputRateAtProductivityOne =
      (assigned * recipe.inputs.metal * manufacturing.getRecipeConsumptionMultiplier('superalloys'))
      / recipe.complexity;
    const outputRateAtProductivityOne =
      (assigned * recipe.baseOutput * manufacturing.getRecipeOutputMultiplier('superalloys'))
      / recipe.complexity;
    const expectedRatio = inputRateAtProductivityOne > 0
      ? Math.min(1, metal / (inputRateAtProductivityOne * seconds))
      : 1;

    produceResources(1000, {});

    const expectedMetalConsumed = inputRateAtProductivityOne * seconds * expectedRatio;
    const expectedSuperalloyProduced = outputRateAtProductivityOne * seconds * expectedRatio;
    const consumedMetal = metal - resources.spaceStorage.metal.value;
    const producedSuperalloy = resources.spaceStorage.superalloys.value;

    expectApprox(consumedMetal, expectedMetalConsumed);
    expectApprox(producedSuperalloy, expectedSuperalloyProduced);
    cleanup();
  });

  test.each([
    { extraDemand: 0 },
    { extraDemand: 200 },
    { extraDemand: 600 },
  ])('Manufacturing World productivity reflects shared metal demand (extra=$extraDemand/s)', ({ extraDemand }) => {
    const initialMetal = 200;
    const harness = setupHarness({ metal: initialMetal, superalloys: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      ManufacturingWorldProject,
      cleanup,
    } = harness;

    const manufacturing = new ManufacturingWorldProject({
      name: 'Manufacturing World',
      duration: 300000,
      cost: {},
      attributes: {
        projectGroup: 'specializedWorlds',
        keepStartBarVisible: true,
        spaceBuilding: true,
      },
    }, 'manufacturingWorld');

    manufacturing.isRunning = true;
    manufacturing.cumulativePopulation = 200000;
    manufacturing.manufacturingAssignments.superalloys = 200000;
    manufacturing.autoStart = false;
    manufacturing.isActive = false;

    projectManager.projects.manufacturingWorld = manufacturing;
    if (extraDemand > 0) {
      projectManager.projects.mockMetalDemand = new MockDemandProject('metal', extraDemand, 'lifters');
      projectManager.projectOrder = ['manufacturingWorld', 'mockMetalDemand'];
    } else {
      projectManager.projectOrder = ['manufacturingWorld'];
    }

    const recipe = manufacturing.getRecipe('superalloys');
    const assigned = manufacturing.manufacturingAssignments.superalloys;
    const seconds = 1;
    const inputRateAtProductivityOne =
      (assigned * recipe.inputs.metal * manufacturing.getRecipeConsumptionMultiplier('superalloys'))
      / recipe.complexity;
    const outputRateAtProductivityOne =
      (assigned * recipe.baseOutput * manufacturing.getRecipeOutputMultiplier('superalloys'))
      / recipe.complexity;
    const totalDemand = inputRateAtProductivityOne + extraDemand;
    const expectedProductivity = totalDemand > 0
      ? Math.min(1, initialMetal / totalDemand)
      : 1;

    produceResources(1000, {});

    const expectedMetalConsumed = inputRateAtProductivityOne * seconds * expectedProductivity;
    const expectedSuperalloyProduced = outputRateAtProductivityOne * seconds * expectedProductivity;
    const consumedMetal = initialMetal - resources.spaceStorage.metal.value;
    const producedSuperalloy = resources.spaceStorage.superalloys.value;

    expectApprox(
      manufacturing.operationProductivity?.superalloys,
      expectedProductivity
    );
    expectApprox(consumedMetal, expectedMetalConsumed);
    expectApprox(producedSuperalloy, expectedSuperalloyProduced);
    cleanup();
  });

  test('Superalloy Gigafoundry uses stored metal plus production before throttling', () => {
    const initialMetal = 1e15;
    const metalProductionPerSecond = 12e12;
    const harness = setupHarness({
      metal: initialMetal,
      superalloys: 0,
      spaceEnergy: 1e30,
    });
    const {
      produceResources,
      projectManager,
      resources,
      SuperalloyGigafoundryProject,
      cleanup,
    } = harness;

    const gigafoundry = new SuperalloyGigafoundryProject({
      name: 'Superalloy Gigafoundry',
      duration: 36000000,
      cost: {},
      attributes: {
        canUseSpaceStorage: true,
        spaceBuilding: true,
        alchemyParameter: 1,
      },
    }, 'superalloyGigafoundry');

    gigafoundry.repeatCount = 100;
    gigafoundry.furnaceAssignments.superalloys = 100;
    gigafoundry.isRunning = true;
    gigafoundry.isActive = false;
    gigafoundry.autoStart = false;

    projectManager.projects.superalloyGigafoundry = gigafoundry;
    projectManager.projectOrder = ['superalloyGigafoundry'];

    const buildings = {
      metalProducer: createSpaceStorageProducerBuilding('metal', metalProductionPerSecond, 'Metal Producer'),
    };

    produceResources(1000, buildings);

    const consumedMetal = initialMetal + metalProductionPerSecond - resources.spaceStorage.metal.value;
    const fullDemandPerSecond = gigafoundry.furnaceAssignments.superalloys
      * gigafoundry.getAlchemyParameter()
      * gigafoundry.getRecipe().inputs.spaceStorage.metal;
    const expectedProductivity = 1;

    expectApprox(gigafoundry.operationProductivity, expectedProductivity);
    expectApprox(consumedMetal, fullDemandPerSecond);
    cleanup();
  });

  test('Lifters use stored space energy after unused Dyson power is exhausted', () => {
    const harness = setupHarness({ hydrogen: 0, spaceEnergy: 100 });
    const {
      produceResources,
      projectManager,
      resources,
      LiftersProject,
      cleanup,
    } = harness;

    buildings.dysonReceiver = createDysonReceiverBuilding(5);
    projectManager.projects.dysonSwarmReceiver = createDysonCollectorProject(10);
    projectManager.projects.dysonReceiverDrain = createSpaceEnergyDrainProject(5, 'Dyson Receiver');

    const lifters = new LiftersProject({
      name: 'Lifters',
      duration: 60000,
      cost: {},
      attributes: {
        spaceBuilding: true,
        lifterUnitRate: 1,
        lifterEnergyPerUnit: 10,
        lifterHarvestRecipes: {
          hydrogen: {
            label: 'Hydrogen',
            storageKey: 'hydrogen',
            outputMultiplier: 1,
            complexity: 1,
            displayOrder: 1,
          },
        },
      },
    }, 'lifters');

    lifters.repeatCount = 1;
    lifters.lifterAssignments.hydrogen = 1;
    lifters.isRunning = true;

    projectManager.projects.lifters = lifters;
    projectManager.projectOrder = ['dysonSwarmReceiver', 'dysonReceiverDrain', 'lifters'];

    produceResources(1000, {});

    expectApprox(resources.space.energy.value, 95);
    expectApprox(resources.spaceStorage.hydrogen.value, 1);
    expectApprox(lifters.operationProductivity?.hydrogen, 1);
    expectApprox(lifters.lastEnergyPerSecond, 10);
    expectApprox(lifters.lastDysonEnergyPerSecond, 5);
    cleanup();
  });

  test('Lifters stop when receivers consume all live Dyson power and storage is empty', () => {
    const harness = setupHarness({ hydrogen: 0, spaceEnergy: 0 });
    const {
      produceResources,
      projectManager,
      resources,
      LiftersProject,
      cleanup,
    } = harness;

    buildings.dysonReceiver = createDysonReceiverBuilding(10);
    projectManager.projects.dysonSwarmReceiver = createDysonCollectorProject(10);
    projectManager.projects.dysonReceiverDrain = createSpaceEnergyDrainProject(10, 'Dyson Receiver');

    const lifters = new LiftersProject({
      name: 'Lifters',
      duration: 60000,
      cost: {},
      attributes: {
        spaceBuilding: true,
        lifterUnitRate: 1,
        lifterEnergyPerUnit: 10,
        lifterHarvestRecipes: {
          hydrogen: {
            label: 'Hydrogen',
            storageKey: 'hydrogen',
            outputMultiplier: 1,
            complexity: 1,
            displayOrder: 1,
          },
        },
      },
    }, 'lifters');

    lifters.repeatCount = 1;
    lifters.lifterAssignments.hydrogen = 1;
    lifters.isRunning = true;

    projectManager.projects.lifters = lifters;
    projectManager.projectOrder = ['dysonSwarmReceiver', 'dysonReceiverDrain', 'lifters'];

    produceResources(1000, {});

    expectApprox(resources.space.energy.value, 0);
    expectApprox(resources.spaceStorage.hydrogen.value, 0);
    expectApprox(lifters.operationProductivity?.hydrogen, 0);
    expectApprox(lifters.lastEnergyPerSecond, 0);
    cleanup();
  });

  test('Lifters keep full energy use and displayed hydrogen rate when storage is capped', () => {
    const harness = setupHarness({
      hydrogen: 0,
      spaceEnergy: 100,
      spaceStorageMaxStorage: 0,
    });
    const {
      produceResources,
      projectManager,
      resources,
      LiftersProject,
      cleanup,
    } = harness;

    buildings.dysonReceiver = createDysonReceiverBuilding(5);
    projectManager.projects.dysonSwarmReceiver = createDysonCollectorProject(10);
    projectManager.projects.dysonReceiverDrain = createSpaceEnergyDrainProject(5, 'Dyson Receiver');

    const lifters = new LiftersProject({
      name: 'Lifters',
      duration: 60000,
      cost: {},
      attributes: {
        spaceBuilding: true,
        lifterUnitRate: 1,
        lifterEnergyPerUnit: 10,
        lifterHarvestRecipes: {
          hydrogen: {
            label: 'Hydrogen',
            storageKey: 'hydrogen',
            outputMultiplier: 1,
            complexity: 1,
            displayOrder: 1,
          },
        },
      },
    }, 'lifters');

    lifters.repeatCount = 1;
    lifters.lifterAssignments.hydrogen = 1;
    lifters.isRunning = true;

    projectManager.projects.lifters = lifters;
    projectManager.projectOrder = ['dysonSwarmReceiver', 'dysonReceiverDrain', 'lifters'];

    produceResources(1000, {});

    expectApprox(resources.space.energy.value, 95);
    expectApprox(resources.spaceStorage.hydrogen.value, 0);
    expectApprox(lifters.operationProductivity?.hydrogen, 1);
    expectApprox(lifters.lastEnergyPerSecond, 10);
    expectApprox(lifters.lastHydrogenPerSecond, 1);
    cleanup();
  });

  test('Lifters preserve supercharge across save/load before Star Lifting effects are reapplied', () => {
    const harness = setupHarness({ hydrogen: 0, spaceEnergy: 100 });
    const { LiftersProject, cleanup } = harness;

    const savedLifters = new LiftersProject({
      name: 'Lifters',
      duration: 60000,
      cost: {},
      attributes: {
        spaceBuilding: true,
        lifterUnitRate: 1,
        lifterEnergyPerUnit: 10,
        lifterHarvestRecipes: {
          hydrogen: {
            label: 'Hydrogen',
            storageKey: 'hydrogen',
            outputMultiplier: 1,
            complexity: 1,
            displayOrder: 1,
          },
        },
      },
    }, 'lifters');

    savedLifters.booleanFlags.add('starLifting');
    savedLifters.setSuperchargeMultiplier(7);
    const state = savedLifters.saveState();

    const loadedLifters = new LiftersProject({
      name: 'Lifters',
      duration: 60000,
      cost: {},
      attributes: {
        spaceBuilding: true,
        lifterUnitRate: 1,
        lifterEnergyPerUnit: 10,
        lifterHarvestRecipes: {
          hydrogen: {
            label: 'Hydrogen',
            storageKey: 'hydrogen',
            outputMultiplier: 1,
            complexity: 1,
            displayOrder: 1,
          },
        },
      },
    }, 'lifters');

    loadedLifters.loadState(state);

    expect(loadedLifters.superchargeMultiplier).toBe(7);
    expect(loadedLifters.getEffectiveSuperchargeMultiplier()).toBe(1);

    loadedLifters.booleanFlags.add('starLifting');

    expect(loadedLifters.superchargeMultiplier).toBe(7);
    expect(loadedLifters.getEffectiveSuperchargeMultiplier()).toBe(7);
    cleanup();
  });
});
