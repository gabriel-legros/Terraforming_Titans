describe('SpaceStorageProject continuous cost gating', () => {
  let SpaceStorageProject;
  let resources;

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
    resources = {
      colony: {
        metal: createResource(5),
      },
    };
    global.resources = resources;
  });

  afterEach(() => {
    delete global.Project;
    delete global.SpaceshipProject;
    delete global.SpaceStorageProject;
    delete global.EffectableEntity;
    delete global.resources;
  });

  it('halts continuous expansion when the base cost is unavailable', () => {
    const project = createProject();
    project.isActive = true;

    project.applyCostAndGain(1000, null, 1);

    expect(project.expansionProgress).toBe(0);
    expect(project.repeatCount).toBe(0);
    expect(project.shortfallLastTick).toBe(true);
    expect(resources.colony.metal.decrease).not.toHaveBeenCalled();
  });
});
