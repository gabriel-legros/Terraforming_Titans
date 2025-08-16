const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource, produceResources } = require('../src/js/resource.js');

describe('resource tooltip hides non-auto-start project rates', () => {
  function setupGlobals(energy) {
    global.resources = { colony: { energy } };
    global.structures = {};
    global.dayNightCycle = { isDay: () => true };
    global.fundingModule = null;
    global.terraforming = null;
    global.lifeManager = null;
    global.researchManager = null;
    global.updateShipReplication = null;
    global.updateAndroidResearch = null;
    global.globalEffects = {};
  }

  test('project without auto start hidden', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 200 });
    setupGlobals(energy);
    const project = {
      displayName: 'Dummy',
      isActive: true,
      isCompleted: false,
      autoStart: false,
      estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
        const cost = { colony: { energy: 100 } };
        if (applyRates) {
          resources.colony.energy.modifyRate(-100 * productivity, this.displayName, 'project');
        }
        return { cost, gain: {} };
      },
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy -= 100 * productivity;
      }
    };
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(energy.consumptionRate).toBeCloseTo(0);
    expect(energy.consumptionRateBySource.Dummy).toBeUndefined();
    expect(energy.value).toBeCloseTo(100);
  });

  test('project production without auto start hidden', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0 });
    setupGlobals(energy);
    const project = {
      displayName: 'Dummy',
      isActive: true,
      isCompleted: false,
      autoStart: false,
      estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
        const gain = { colony: { energy: 100 } };
        if (applyRates) {
          resources.colony.energy.modifyRate(100 * productivity, this.displayName, 'project');
        }
        return { cost: {}, gain };
      },
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy += 100 * productivity;
      }
    };
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(energy.productionRate).toBeCloseTo(0);
    expect(energy.productionRateBySource.Dummy).toBeUndefined();
    expect(energy.value).toBeCloseTo(100);
  });

  test('project with auto start shown', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 200 });
    setupGlobals(energy);
    const project = {
      displayName: 'Dummy',
      isActive: true,
      isCompleted: false,
      autoStart: true,
      estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
        const cost = { colony: { energy: 100 } };
        if (applyRates) {
          resources.colony.energy.modifyRate(-100 * productivity, this.displayName, 'project');
        }
        return { cost, gain: {} };
      },
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy -= 100 * productivity;
      }
    };
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(energy.consumptionRate).toBeCloseTo(100);
    expect(energy.consumptionRateBySource.Dummy).toBeCloseTo(100);
  });

  test('treat-as-building project shown without auto start', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 200 });
    setupGlobals(energy);
    const project = {
      displayName: 'Dummy',
      isActive: true,
      isCompleted: false,
      autoStart: false,
      treatAsBuilding: true,
      estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
        const cost = { colony: { energy: 100 } };
        if (applyRates) {
          resources.colony.energy.modifyRate(-100 * productivity, this.displayName, 'project');
        }
        return { cost, gain: {} };
      },
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy -= 100 * productivity;
      }
    };
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(energy.consumptionRate).toBeCloseTo(100);
    expect(energy.consumptionRateBySource.Dummy).toBeCloseTo(100);
  });

  test('auto-start disabled projects skip rate estimation', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 200 });
    setupGlobals(energy);
    const estimateCostAndGain = jest.fn(() => ({ cost: { colony: { energy: 100 } }, gain: {} }));
    const project = {
      displayName: 'Dummy',
      isActive: true,
      isCompleted: false,
      autoStart: false,
      estimateCostAndGain,
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy -= 100 * productivity;
      }
    };
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(estimateCostAndGain).toHaveBeenCalledTimes(1);
    expect(estimateCostAndGain.mock.calls[0][1]).toBe(false);
    expect(energy.value).toBeCloseTo(100);
  });
});
