const EffectableEntity = require('../src/js/effectable-entity');

const setupGlobals = () => {
  global.EffectableEntity = EffectableEntity;
  global.colonies = {
    t6_colony: {
      count: 0,
      active: 0,
      adjustLand: jest.fn(),
      updateResourceStorage: jest.fn(),
    },
    t7_colony: {
      count: 0,
      active: 0,
      adjustLand: jest.fn(),
      updateResourceStorage: jest.fn(),
    },
  };
  global.projectManager = {
    projects: {
      deeperMining: {
        averageDepth: 0,
      },
      bioworld: {
        isActive: false,
        isCompleted: false,
      },
    },
  };
  global.addEffect = jest.fn();
  global.warpGateNetworkManager = {
    addAndReplace: jest.fn(),
  };
  global.researchManager = {
    addAndReplace: jest.fn(),
  };
};

const createProject = () => {
  const FoundryWorldProject = require('../src/js/projects/FoundryWorldProject.js');
  return new FoundryWorldProject(
    {
      name: 'Foundry World',
      category: 'mega',
      cost: {},
      duration: 300000,
      description: '',
      repeatable: false,
      unlocked: true,
      attributes: {},
    },
    'foundryWorld'
  );
};

describe('FoundryWorldProject', () => {
  beforeEach(() => {
    jest.resetModules();
    setupGlobals();
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.colonies;
    delete global.projectManager;
    delete global.addEffect;
    delete global.warpGateNetworkManager;
    delete global.researchManager;
    jest.resetModules();
  });

  it('requires deeper mining depth of at least 50000 and no completed bioworld', () => {
    const project = createProject();

    global.projectManager.projects.deeperMining.averageDepth = 9999;
    expect(project.canStart()).toBe(false);

    global.projectManager.projects.deeperMining.averageDepth = 50000;
    expect(project.canStart()).toBe(true);

    global.projectManager.projects.bioworld.isCompleted = true;
    expect(project.canStart()).toBe(false);
  });

  it('converts ecumenopolis districts into metropolises on completion', () => {
    const project = createProject();
    global.colonies.t7_colony.count = 4;
    global.colonies.t7_colony.active = 3;
    global.colonies.t6_colony.count = 2;
    global.colonies.t6_colony.active = 1;

    project.complete();

    expect(global.colonies.t6_colony.count).toBe(6);
    expect(global.colonies.t6_colony.active).toBe(4);
    expect(global.colonies.t7_colony.count).toBe(0);
    expect(global.colonies.t7_colony.active).toBe(0);
    expect(global.colonies.t7_colony.unlocked).toBe(false);
    expect(global.colonies.t7_colony.adjustLand).toHaveBeenCalledWith(-3);
    expect(global.colonies.t6_colony.adjustLand).toHaveBeenCalledWith(3);
    expect(global.colonies.t7_colony.updateResourceStorage).toHaveBeenCalled();
    expect(global.colonies.t6_colony.updateResourceStorage).toHaveBeenCalled();
    expect(global.researchManager.addAndReplace).toHaveBeenCalled();
  });

  it('awards foundry points based on deeper mining depth when travelling', () => {
    const project = createProject();
    project.isCompleted = true;
    global.projectManager.projects.deeperMining.averageDepth = 10000;

    project.prepareTravelState();

    expect(project.foundryPoints).toBeCloseTo(20, 5);
  });

  it('applies foundry shop bonuses to mining caps, ore output, and deeper mining speed', () => {
    const project = createProject();
    project.shopPurchases.galacticMetalMiningCap = 2;
    project.shopPurchases.galacticSilicaMiningCap = 3;
    project.shopPurchases.oreMiningOutput = 5;
    project.shopPurchases.silicaMiningOutput = 4;
    project.shopPurchases.deeperMiningSpeed = 3;

    project.applyFoundryEffects();

    expect(global.warpGateNetworkManager.addAndReplace).toHaveBeenCalledWith({
      type: 'importCapMultiplier',
      resourceKey: 'metal',
      value: 1.2,
      effectId: 'foundry-metal-cap',
      sourceId: 'foundryWorld',
    });
    expect(global.warpGateNetworkManager.addAndReplace).toHaveBeenCalledWith({
      type: 'importCapMultiplier',
      resourceKey: 'silicon',
      value: 1.3,
      effectId: 'foundry-silica-cap',
      sourceId: 'foundryWorld',
    });
    expect(global.addEffect).toHaveBeenCalledWith({
      target: 'building',
      targetId: 'oreMine',
      type: 'productionMultiplier',
      effectId: 'foundry-ore-mine-output',
      value: 1.05,
      sourceId: 'foundryWorld',
    });
    expect(global.addEffect).toHaveBeenCalledWith({
      target: 'building',
      targetId: 'sandQuarry',
      type: 'productionMultiplier',
      effectId: 'foundry-silica-output',
      value: 1.04,
      sourceId: 'foundryWorld',
    });
    expect(global.addEffect).toHaveBeenCalledWith({
      target: 'project',
      targetId: 'deeperMining',
      type: 'projectDurationMultiplier',
      effectId: 'foundry-deeper-mining-speed',
      value: 1 / 1.03,
      sourceId: 'foundryWorld',
    });
  });
});
