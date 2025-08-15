const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource, produceResources } = require('../src/js/resource.js');

describe('project rates reflect productivity', () => {
  test('resource tooltip rates scale with project productivity', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 100 });
    const metal = new Resource({ name: 'metal', category: 'colony', initialValue: 0 });

    global.resources = { colony: { energy, metal } };
    global.structures = {};
    global.dayNightCycle = { isDay: () => true };
    global.fundingModule = null;
    global.terraforming = null;
    global.lifeManager = null;
    global.researchManager = null;
    global.updateShipReplication = null;
    global.updateAndroidResearch = null;
    global.globalEffects = {};

    class DummyProject {
      constructor() {
        this.displayName = 'Dummy';
        this.isActive = true;
        this.isCompleted = false;
      }
      estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
        const cost = { colony: { energy: 200 } };
        const gain = { colony: { metal: 10 } };
        if (applyRates) {
          resources.colony.energy.modifyRate(-200 * productivity, this.displayName, 'project');
          resources.colony.metal.modifyRate(10 * productivity, this.displayName, 'project');
        }
        return { cost, gain };
      }
      applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
        accumulatedChanges.colony.energy -= 200 * productivity;
        accumulatedChanges.colony.metal += 10 * productivity;
      }
    }

    const project = new DummyProject();
    global.projectManager = { projectOrder: ['dummy'], projects: { dummy: project } };

    produceResources(1000, {});

    expect(energy.value).toBeCloseTo(0);
    expect(metal.value).toBeCloseTo(5);
    expect(energy.consumptionRate).toBeCloseTo(100);
    expect(metal.productionRate).toBeCloseTo(5);
  });
});
