const EffectableEntity = require('../src/js/effectable-entity');

const setupGlobals = () => {
  global.EffectableEntity = EffectableEntity;
  global.resources = {
    surface: {
      biomass: { value: 0 },
    },
  };
  global.terraforming = {
    celestialParameters: { surfaceArea: 1 },
  };
  global.colonies = {
    t7_colony: {
      count: 0,
      active: 0,
      adjustLand: jest.fn(),
      updateResourceStorage: jest.fn(),
    },
  };
  global.getEcumenopolisLandFraction = () => 0;
  global.researchManager = {
    completeResearchInstant: jest.fn(),
    addAndReplace: jest.fn(),
    removeEffect: jest.fn(),
  };
};

const createProject = () => {
  const BioworldProject = require('../src/js/projects/BioworldProject.js');
  return new BioworldProject(
    {
      name: 'Bioworld',
      category: 'mega',
      cost: {},
      duration: 300000,
      description: '',
      repeatable: false,
      unlocked: true,
      attributes: {},
    },
    'bioworld'
  );
};

describe('BioworldProject', () => {
  beforeEach(() => {
    jest.resetModules();
    setupGlobals();
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.resources;
    delete global.terraforming;
    delete global.colonies;
    delete global.getEcumenopolisLandFraction;
    delete global.lifeDesigner;
    delete global.researchManager;
    jest.resetModules();
  });

  it('requires biomass density above 1 and fewer than 1000 ecumenopolis districts', () => {
    const project = createProject();

    global.resources.surface.biomass.value = 2;
    global.colonies.t7_colony.count = 999;
    expect(project.canStart()).toBe(true);

    global.colonies.t7_colony.count = 1000;
    expect(project.canStart()).toBe(false);

    global.colonies.t7_colony.count = 0;
    global.resources.surface.biomass.value = 1;
    expect(project.canStart()).toBe(false);
  });

  it('awards evolution points when travelling after completion', () => {
    const project = createProject();
    project.isCompleted = true;

    global.resources.surface.biomass.value = 1e13;
    project.prepareTravelState();

    expect(project.evolutionPoints).toBeCloseTo(3, 5);
    expect(global.researchManager.removeEffect).toHaveBeenCalledWith({ sourceId: 'bioworld' });
  });

  it('applies attribute max bonuses from evolution purchases', () => {
    const { LifeDesigner } = require('../src/js/life.js');
    global.lifeDesigner = new LifeDesigner();
    const project = createProject();

    const baseMax = global.lifeDesigner.currentDesign.maxTemperatureTolerance.maxUpgrades;
    project.shopPurchases.temperatureToleranceMax = 1;
    project.applyEvolutionEffects();

    expect(global.lifeDesigner.currentDesign.maxTemperatureTolerance.maxUpgrades).toBe(baseMax + 1);
  });

  it('unlocks the life designer by completing its research', () => {
    const { LifeDesigner } = require('../src/js/life.js');
    global.lifeDesigner = new LifeDesigner();
    const project = createProject();

    project.shopPurchases.lifeDesignerUnlock = 1;
    project.applyEvolutionEffects();

    expect(global.researchManager.completeResearchInstant).toHaveBeenCalledWith('life');
  });

  it('permanently disables ecumenopolis once flagged', () => {
    const { LifeDesigner } = require('../src/js/life.js');
    global.lifeDesigner = new LifeDesigner();
    const project = createProject();

    project.ecumenopolisDisabled = true;
    project.applyEvolutionEffects();

    expect(global.colonies.t7_colony.unlocked).toBe(false);
    expect(global.researchManager.addAndReplace).toHaveBeenCalled();
  });
});
