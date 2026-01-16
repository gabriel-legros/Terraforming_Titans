describe('SpaceStorageProject storage caps', () => {
  let SpaceStorageProject;

  const loadProject = () => {
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    global.SpaceshipProject = SpaceshipProject;
    SpaceStorageProject = require('../src/js/projects/SpaceStorageProject.js');
  };

  const createResource = (value = 0) => {
    const resource = {
      value,
      decrease: jest.fn((amount) => {
        resource.value = Math.max(0, resource.value - amount);
      }),
      modifyRate: jest.fn(),
    };
    return resource;
  };

  const createProject = () => new SpaceStorageProject({
    name: 'Space Storage',
    category: 'mega',
    cost: { colony: { metal: 10 } },
    duration: 500,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: { canUseSpaceStorage: false },
  }, 'spaceStorage');

  beforeEach(() => {
    jest.resetModules();
    loadProject();
    global.resources = {
      colony: {
        metal: createResource(1000),
      },
      surface: {
        biomass: createResource(0),
        liquidWater: createResource(0),
      },
    };
  });

  afterEach(() => {
    delete global.Project;
    delete global.SpaceshipProject;
    delete global.SpaceStorageProject;
    delete global.EffectableEntity;
    delete global.resources;
  });

  it('prevents storing above an amount cap', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.capacityPerCompletion = 200;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.resourceUsage = { metal: 60 };
    project.usedStorage = 60;
    project.resourceCaps = { metal: { mode: 'amount', value: 75 } };

    const plan = project.calculateTransferPlan(true, 100);

    expect(plan.total).toBeCloseTo(15);
    expect(plan.transfers[0].amount).toBeCloseTo(15);
  });

  it('prevents storing above a percent cap', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.capacityPerCompletion = 200;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.resourceUsage = { metal: 10 };
    project.usedStorage = 10;
    project.resourceCaps = { metal: { mode: 'percent', value: 10 } };

    const plan = project.calculateTransferPlan(true, 100);

    expect(plan.total).toBeCloseTo(10);
    expect(plan.transfers[0].amount).toBeCloseTo(10);
  });

  it('persists caps in save/load state', () => {
    const project = createProject();
    project.resourceCaps = {
      metal: { mode: 'amount', value: 1200 },
    };

    const saved = project.saveState();
    const restored = createProject();
    restored.loadState(saved);

    expect(restored.resourceCaps).toEqual(project.resourceCaps);
  });
});
